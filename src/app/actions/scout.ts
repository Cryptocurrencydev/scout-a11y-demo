"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { stripe, siteUrl } from "@/lib/stripe";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return siteUrl(host ? `${proto}://${host}` : null);
}

export type OnboardState = { errors: Record<string, string>; formError?: string };

const Input = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  city: z.string().trim().min(2, "Enter the city you know best").max(60),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
}

/** Creates a Stripe Express connected account and sends the scout to Stripe-hosted onboarding. */
export async function startOnboarding(_prev: OnboardState, form: FormData): Promise<OnboardState> {
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  let url: string;
  try {
    const s = stripe();
    const platform = await s.accounts.retrieveCurrent();
    const account = await s.accounts.create({
      type: "express",
      country: platform.country,
      business_type: "individual",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: { product_description: "Accessible travel advice for Ramplight travelers", mcc: "4722" },
      metadata: { ramplight_scout: parsed.data.name },
    });
    const slug = `${slugify(parsed.data.name)}-${account.id.slice(-6).toLowerCase()}`;
    await db.insert(schema.scouts).values({
      slug,
      name: parsed.data.name,
      city: parsed.data.city,
      country: platform.country ?? "",
      lat: 0,
      lng: 0,
      headline: "New Ramplight scout",
      bio: "Profile coming soon.",
      specialties: [],
      languages: [],
      listed: false,
      stripeAccountId: account.id,
      stripeDashboard: "express",
    });
    const o = await origin();
    const link = await s.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: `${o}/become-a-scout/return?scout=${slug}&refresh=1`,
      return_url: `${o}/become-a-scout/return?scout=${slug}`,
    });
    url = link.url;
  } catch (err) {
    console.error("onboarding failed", err);
    return { errors: {}, formError: "We couldn't reach Stripe to start onboarding. Please try again." };
  }
  redirect(url);
}

export async function resumeOnboarding(form: FormData) {
  const slug = String(form.get("scout"));
  const scout = await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) });
  if (!scout?.stripeAccountId) redirect("/become-a-scout");
  const o = await origin();
  const link = await stripe().accountLinks.create({
    account: scout.stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${o}/become-a-scout/return?scout=${slug}&refresh=1`,
    return_url: `${o}/become-a-scout/return?scout=${slug}`,
  });
  redirect(link.url);
}

/** Express dashboard login link for a scout (demo: any visitor can open it for seeded scouts). */
export async function openExpressDashboard(form: FormData) {
  const slug = String(form.get("scout"));
  const scout = await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) });
  if (!scout?.stripeAccountId) redirect(`/earnings?scout=${slug}`);
  const link = await stripe().accounts.createLoginLink(scout.stripeAccountId);
  redirect(link.url);
}

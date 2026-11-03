import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { stripe } from "@/lib/stripe";
import { resumeOnboarding } from "@/app/actions/scout";

export const metadata: Metadata = { title: "Onboarding status" };

export default async function ReturnPage({ searchParams }: PageProps<"/become-a-scout/return">) {
  const sp = await searchParams;
  const slug = typeof sp.scout === "string" ? sp.scout : "";
  const scout = slug ? await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) }) : undefined;
  let status: { details: boolean; charges: boolean; due: number } | null = null;
  if (scout?.stripeAccountId) {
    const acct = await stripe().accounts.retrieve(scout.stripeAccountId);
    status = {
      details: Boolean(acct.details_submitted),
      charges: Boolean(acct.charges_enabled),
      due: acct.requirements?.currently_due?.length ?? 0,
    };
    if (scout.chargesEnabled !== status.charges) {
      await db.update(schema.scouts).set({ chargesEnabled: status.charges }).where(eq(schema.scouts.id, scout.id));
    }
  }
  return (
    <div className="wrap page">
      <h1>Onboarding status</h1>
      {!scout || !status ? (
        <p>
          We couldn&apos;t find that onboarding session. <Link href="/become-a-scout">Start again</Link>.
        </p>
      ) : status.charges ? (
        <div className="notice notice-success">
          <p>
            <strong>You&apos;re set up, {scout.name.split(" ")[0]}.</strong> Your Stripe Express account can accept
            payments. In the full product you&apos;d now build your profile and packages.
          </p>
        </div>
      ) : (
        <div className="card">
          <p>
            {status.details
              ? "Stripe is reviewing your details. This usually takes a moment in test mode."
              : `Your onboarding isn't finished yet${status.due ? ` (${status.due} items still needed)` : ""}.`}
          </p>
          <form action={resumeOnboarding}>
            <input type="hidden" name="scout" value={scout.slug} />
            <button type="submit" className="btn">
              Continue onboarding with Stripe
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

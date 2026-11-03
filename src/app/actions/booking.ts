"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ensureTraveler, travelerId } from "@/lib/traveler";
import { splitPayment } from "@/lib/money";
import { stripe, CURRENCY, siteUrl } from "@/lib/stripe";
import { checkoutParams } from "@/lib/checkout";
import { composeDate } from "@/lib/dates";

export type CheckoutState = { errors: Record<string, string>; formError?: string };

const BookingInput = z.object({
  packageId: z.uuid(),
  tripDate: z.string({ message: "Enter the date of your trip" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Trip date must be a real date, like 15 6 2027"),
  accessNotes: z.string().trim().min(10, "Access needs must be at least 10 characters").max(2000),
});

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return siteUrl(host ? `${proto}://${host}` : null);
}

export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const tripDate = composeDate(raw.tripDay ?? "", raw.tripMonth ?? "", raw.tripYear ?? "") ?? undefined;
  const parsed = BookingInput.safeParse({ ...raw, tripDate });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  if (parsed.data.tripDate < yesterday) return { errors: { tripDate: "Trip date must be today or in the future" } };

  const rows = await db
    .select({ pkg: schema.packages, scout: schema.scouts })
    .from(schema.packages)
    .innerJoin(schema.scouts, eq(schema.scouts.id, schema.packages.scoutId))
    .where(eq(schema.packages.id, parsed.data.packageId));
  const row = rows[0];
  if (!row) return { errors: {}, formError: "That package no longer exists." };
  if (!row.scout.stripeAccountId || !row.scout.chargesEnabled) {
    return { errors: {}, formError: `${row.scout.name} hasn't finished setting up payments yet. Try messaging them instead.` };
  }

  const tid = await ensureTraveler();
  const split = splitPayment(row.pkg.priceCents);
  const [booking] = await db
    .insert(schema.bookings)
    .values({
      travelerId: tid,
      scoutId: row.scout.id,
      packageId: row.pkg.id,
      amountCents: split.amountCents,
      applicationFeeCents: split.applicationFeeCents,
      transferCents: split.transferCents,
      currency: CURRENCY,
      tripDate: parsed.data.tripDate,
      accessNotes: parsed.data.accessNotes,
    })
    .returning({ id: schema.bookings.id });

  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create(
      checkoutParams({
        bookingId: booking.id,
        amountCents: split.amountCents,
        currency: CURRENCY,
        destinationAccount: row.scout.stripeAccountId,
        packageTitle: row.pkg.title,
        scoutName: row.scout.name,
        origin: await origin(),
        scoutSlug: row.scout.slug,
      }),
      { idempotencyKey: `checkout-${booking.id}` },
    );
    await db.update(schema.bookings).set({ checkoutSessionId: session.id }).where(eq(schema.bookings.id, booking.id));
    url = session.url;
  } catch (err) {
    console.error("checkout session failed", err);
    await db.update(schema.bookings).set({ status: "cancelled" }).where(eq(schema.bookings.id, booking.id));
    return { errors: {}, formError: "We couldn't start the payment. Nothing was charged; please try again." };
  }
  redirect(url!);
}

/** Demo shortcut standing in for the scout delivering the package. */
export async function completeBooking(form: FormData) {
  const id = String(form.get("bookingId"));
  const tid = await travelerId();
  if (!tid) return;
  await db
    .update(schema.bookings)
    .set({ status: "completed", completedAt: sql`now()` })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.travelerId, tid), eq(schema.bookings.status, "paid")));
  revalidatePath(`/bookings/${id}`);
  redirect(`/bookings/${id}?completed=1`);
}

export type ReviewState = { errors: Record<string, string>; ok?: boolean; formError?: string };

const ReviewInput = z.object({
  bookingId: z.uuid(),
  rating: z.coerce.number({ message: "Choose a rating from 1 to 5 stars" }).int().min(1, "Choose a rating from 1 to 5 stars").max(5),
  body: z.string().trim().min(20, "Your review must be at least 20 characters").max(2000, "Keep your review under 2000 characters"),
  authorName: z.string().trim().min(1, "Enter the name to show on your review").max(40),
});

export async function submitReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const raw = Object.fromEntries(form);
  const parsed = ReviewInput.safeParse({ ...raw, rating: raw.rating ?? "" });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  const tid = await travelerId();
  const booking = tid
    ? await db.query.bookings.findFirst({
        where: and(eq(schema.bookings.id, parsed.data.bookingId), eq(schema.bookings.travelerId, tid)),
      })
    : undefined;
  if (!booking || booking.status !== "completed") {
    return { errors: {}, formError: "You can review a scout once your booking is completed." };
  }
  const inserted = await db
    .insert(schema.reviews)
    .values({
      scoutId: booking.scoutId,
      bookingId: booking.id,
      authorName: parsed.data.authorName,
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
    .onConflictDoNothing()
    .returning({ id: schema.reviews.id });
  if (!inserted.length) return { errors: {}, formError: "You've already reviewed this booking." };
  revalidatePath(`/bookings/${booking.id}`);
  redirect(`/bookings/${booking.id}?reviewed=1`);
}

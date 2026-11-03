import type Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type WebhookResult = { status: "processed" | "duplicate" | "ignored"; bookingId?: string };

/**
 * Applies a verified Stripe event. Idempotent in two layers:
 *  1. the event id is recorded in stripe_events inside the same transaction, so a
 *     redelivered event is a no-op;
 *  2. the booking update only moves pending -> paid, so a second event for the same
 *     checkout session (e.g. async_payment_succeeded after completed) changes nothing.
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<WebhookResult> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: schema.stripeEvents.id });
    if (inserted.length === 0) return { status: "duplicate" };

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") return { status: "ignored" };
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
        const updated = await tx
          .update(schema.bookings)
          .set({ status: "paid", paidAt: sql`now()`, paymentIntentId })
          .where(and(eq(schema.bookings.checkoutSessionId, session.id), eq(schema.bookings.status, "pending")))
          .returning({ id: schema.bookings.id });
        return updated[0] ? { status: "processed", bookingId: updated[0].id } : { status: "ignored" };
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await tx
          .update(schema.bookings)
          .set({ status: "cancelled" })
          .where(and(eq(schema.bookings.checkoutSessionId, session.id), eq(schema.bookings.status, "pending")));
        return { status: "processed" };
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await tx
          .update(schema.scouts)
          .set({ chargesEnabled: Boolean(account.charges_enabled) })
          .where(eq(schema.scouts.stripeAccountId, account.id));
        return { status: "processed" };
      }
      default:
        return { status: "ignored" };
    }
  });
}

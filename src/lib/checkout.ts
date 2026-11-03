import type Stripe from "stripe";
import { splitPayment } from "./money";

/**
 * Builds the Checkout Session params for a destination charge: the traveler pays the
 * platform, Stripe moves (amount - application fee) to the scout's connected account,
 * and the platform keeps the application fee as its commission.
 */
export function checkoutParams(input: {
  bookingId: string;
  amountCents: number;
  currency: string;
  destinationAccount: string;
  packageTitle: string;
  scoutName: string;
  origin: string;
  scoutSlug: string;
}): Stripe.Checkout.SessionCreateParams {
  const split = splitPayment(input.amountCents);
  return {
    mode: "payment",
    client_reference_id: input.bookingId,
    metadata: { booking_id: input.bookingId },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: split.amountCents,
          product_data: { name: `${input.packageTitle} with ${input.scoutName}` },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: split.applicationFeeCents,
      transfer_data: { destination: input.destinationAccount },
      metadata: { booking_id: input.bookingId },
      description: `Ramplight booking ${input.bookingId}`,
    },
    success_url: `${input.origin}/bookings/${input.bookingId}?checkout=success`,
    cancel_url: `${input.origin}/scouts/${input.scoutSlug}?checkout=cancelled`,
  };
}

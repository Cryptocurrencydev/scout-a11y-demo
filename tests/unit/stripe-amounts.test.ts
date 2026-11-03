// Hits the real Stripe test-mode API: proves a destination charge built with our params
// yields exactly the expected application fee and transfer to the scout's account.
import { describe, it, expect, afterAll } from "vitest";
import Stripe from "stripe";

import { pool } from "@/db";
import { checkoutParams } from "@/lib/checkout";
import { splitPayment } from "@/lib/money";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const stripe = new Stripe(key);
const run = key.startsWith("sk_test_") ? describe : describe.skip;

async function destination() {
  if (process.env.TEST_DESTINATION_ACCOUNT) return process.env.TEST_DESTINATION_ACCOUNT;
  // Use a seeded scout account from the dev database.
  const { Pool } = await import("pg");
  const dev = new Pool({ connectionString: "postgres://localhost/scout_dev" });
  const r = await dev.query("select stripe_account_id from scouts where charges_enabled and stripe_account_id is not null limit 1");
  await dev.end();
  return r.rows[0].stripe_account_id as string;
}
afterAll(async () => { await pool.end(); });


run("Stripe Connect amounts (test mode)", () => {
  it.each([500, 3500, 6000, 2510])("charge of %i cents: fee and transfer are exact", async (amount) => {
    const dest = await destination();
    const params = checkoutParams({
      bookingId: crypto.randomUUID(), amountCents: amount, currency: "usd", destinationAccount: dest,
      packageTitle: "Test package", scoutName: "Test Scout", origin: "https://example.com", scoutSlug: "test",
    });
    const pid = params.payment_intent_data!;
    const expected = splitPayment(amount);
    expect(pid.application_fee_amount).toBe(expected.applicationFeeCents);
    expect(pid.transfer_data!.destination).toBe(dest);

    const pi = await stripe.paymentIntents.create({
      amount, currency: "usd", payment_method: "pm_card_visa", confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      application_fee_amount: pid.application_fee_amount, transfer_data: pid.transfer_data, metadata: pid.metadata,
    });
    expect(pi.status).toBe("succeeded");
    // The application fee object is created asynchronously; poll briefly.
    let charge!: Stripe.Charge;
    for (let i = 0; i < 20; i++) {
      charge = await stripe.charges.retrieve(pi.latest_charge as string, { expand: ["transfer", "application_fee"] });
      if (charge.application_fee && charge.transfer) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const transfer = charge.transfer as Stripe.Transfer;
    const fee = charge.application_fee as Stripe.ApplicationFee;
    expect(charge.amount).toBe(amount);
    expect(charge.application_fee_amount).toBe(expected.applicationFeeCents);
    expect(fee.amount).toBe(expected.applicationFeeCents);
    // Destination charge: Stripe transfers the full charge, then collects the fee back.
    expect(transfer.amount).toBe(amount);
    expect(transfer.destination).toBe(dest);
    // What the scout actually nets, read from their connected account's ledger.
    const payment = await stripe.charges.retrieve(
      transfer.destination_payment as string,
      { expand: ["balance_transaction"] },
      { stripeAccount: dest },
    );
    const bt = payment.balance_transaction as Stripe.BalanceTransaction;
    expect(bt.net).toBe(expected.transferCents);
    expect(fee.amount + bt.net).toBe(amount);
  });

  it("Stripe accepts the full Checkout Session params", async () => {
    const dest = await destination();
    const session = await stripe.checkout.sessions.create(checkoutParams({
      bookingId: crypto.randomUUID(), amountCents: 3500, currency: "usd", destinationAccount: dest,
      packageTitle: "Test package", scoutName: "Test Scout", origin: "https://example.com", scoutSlug: "test",
    }));
    expect(session.amount_total).toBe(3500);
    expect(session.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    await stripe.checkout.sessions.expire(session.id);
  });
});

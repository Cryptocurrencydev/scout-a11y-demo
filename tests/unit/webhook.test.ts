import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/db";
import { splitPayment } from "@/lib/money";
import { POST } from "@/app/api/stripe/webhook/route";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const stripe = new Stripe("sk_test_dummy_for_signing");
let bookingId = "";
const RUN = Date.now().toString(36);
const sessionId = `cs_test_unit_${RUN}`;
const E = (name: string) => `evt_${name}_${RUN}`;

function event(id: string, type: string, object: Record<string, unknown>) {
  return { id, object: "event", type, api_version: "2026-10-28", created: Math.floor(Date.now() / 1000), data: { object }, livemode: false, pending_webhooks: 1, request: null };
}
function signed(payload: string, secret = SECRET) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}
async function send(payload: string, signature: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers["stripe-signature"] = signature;
  const res = await POST(new Request("http://test/api/stripe/webhook", { method: "POST", body: payload, headers }));
  return { status: res.status, body: await res.json() };
}
const booking = () => db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });

beforeAll(async () => {
  const travelerId = crypto.randomUUID();
  await db.insert(schema.travelers).values({ id: travelerId });
  const [scout] = await db.insert(schema.scouts).values({
    slug: `unit-${Date.now()}`, name: "Unit Scout", city: "Testville", country: "US", lat: 0, lng: 0,
    headline: "h", bio: "b", specialties: ["wheelchair"], languages: ["English"], stripeAccountId: "acct_unit", chargesEnabled: false,
  }).returning();
  const [pkg] = await db.insert(schema.packages).values({ scoutId: scout.id, title: "Call", description: "d", format: "f", priceCents: 3500 }).returning();
  const split = splitPayment(3500);
  const [b] = await db.insert(schema.bookings).values({
    travelerId, scoutId: scout.id, packageId: pkg.id, ...split, currency: "usd", tripDate: "2027-01-01", accessNotes: "power chair 70cm", checkoutSessionId: sessionId,
  }).returning();
  bookingId = b.id;
});
afterAll(async () => { await pool.end(); });

describe("Stripe webhook", () => {
  const completed = (id: string) =>
    JSON.stringify(event(id, "checkout.session.completed", { id: sessionId, object: "checkout.session", payment_status: "paid", payment_intent: "pi_unit_123" }));

  it("rejects a request without a signature", async () => {
    const r = await send(completed(E("nosig")), null);
    expect(r.status).toBe(400);
    expect((await booking())!.status).toBe("pending");
  });

  it("rejects a signature made with the wrong secret", async () => {
    const p = completed(E("wrongsecret"));
    const r = await send(p, signed(p, "whsec_someone_else"));
    expect(r.status).toBe(400);
    expect((await booking())!.status).toBe("pending");
  });

  it("rejects a tampered body with an otherwise valid signature", async () => {
    const p = completed(E("tamper"));
    const sig = signed(p);
    const r = await send(p.replace("pi_unit_123", "pi_attacker"), sig);
    expect(r.status).toBe(400);
  });

  it("marks the booking paid for a valid signed event", async () => {
    const p = completed(E("ok_1"));
    const r = await send(p, signed(p));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ received: true, status: "processed", bookingId });
    const b = (await booking())!;
    expect(b.status).toBe("paid");
    expect(b.paymentIntentId).toBe("pi_unit_123");
    expect(b.paidAt).toBeInstanceOf(Date);
  });

  it("is idempotent: a redelivered event is a no-op", async () => {
    const before = (await booking())!;
    const p = completed(E("ok_1"));
    const r = await send(p, signed(p));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("duplicate");
    const after = (await booking())!;
    expect(after.paidAt!.getTime()).toBe(before.paidAt!.getTime());
    const rows = await db.select().from(schema.stripeEvents).where(eq(schema.stripeEvents.id, E("ok_1")));
    expect(rows).toHaveLength(1);
  });

  it("ignores a second, different event for the same session", async () => {
    const before = (await booking())!;
    const p = JSON.stringify(event(E("async_2"), "checkout.session.async_payment_succeeded", { id: sessionId, object: "checkout.session", payment_status: "paid", payment_intent: "pi_other" }));
    const r = await send(p, signed(p));
    expect(r.body.status).toBe("ignored");
    const after = (await booking())!;
    expect(after.paymentIntentId).toBe("pi_unit_123");
    expect(after.paidAt!.getTime()).toBe(before.paidAt!.getTime());
  });

  it("handles concurrent duplicate deliveries exactly once", async () => {
    const p = completed(E("race"));
    const results = await Promise.all(Array.from({ length: 5 }, () => send(p, signed(p))));
    expect(results.every((r) => r.status === 200)).toBe(true);
    const rows = await db.select().from(schema.stripeEvents).where(eq(schema.stripeEvents.id, E("race")));
    expect(rows).toHaveLength(1);
  });

  it("does not mark unpaid sessions as paid", async () => {
    const p = JSON.stringify(event(E("unpaid"), "checkout.session.completed", { id: "cs_test_other", object: "checkout.session", payment_status: "unpaid", payment_intent: null }));
    const r = await send(p, signed(p));
    expect(r.body.status).toBe("ignored");
  });
});

// Gives every seeded scout a test-mode connected account that can receive destination-charge
// transfers. Stripe's hosted Express onboarding is protected by a captcha, so seeded scouts are
// onboarded through the API instead (dashboard: none, platform collects requirements, test
// data). Real scouts use Express hosted onboarding at /become-a-scout.
import "./load-env.ts";
import Stripe from "stripe";
import { eq, isNull, and } from "drizzle-orm";
import { db, pool, schema } from "../src/db/index.ts";

const s = new Stripe(process.env.STRIPE_SECRET_KEY!);
if (!process.env.STRIPE_SECRET_KEY!.startsWith("sk_test_")) throw new Error("test keys only");

const scouts = await db.select().from(schema.scouts).where(and(isNull(schema.scouts.stripeAccountId), eq(schema.scouts.listed, true)));
for (const sc of scouts) {
  const [first, ...rest] = sc.name.normalize("NFKD").replace(/[̀-ͯ]/g, "").split(" ");
  const acct = await s.accounts.create({
    country: "US",
    email: `scout+${sc.slug}@example.com`,
    business_type: "individual",
    controller: {
      stripe_dashboard: { type: "none" },
      requirement_collection: "application",
      fees: { payer: "application" },
      losses: { payments: "application" },
    },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { mcc: "4722", product_description: "Accessible travel advice", url: "https://dctechltd.com" },
    individual: {
      first_name: first, last_name: rest.join(" ") || "Scout", email: `scout+${sc.slug}@example.com`, phone: "+12015550123",
      dob: { day: 1, month: 1, year: 1901 }, ssn_last_4: "0000", id_number: "000000000",
      address: { line1: "address_full_match", city: "San Francisco", state: "CA", postal_code: "94103", country: "US" },
    },
    external_account: "btok_us_verified",
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "127.0.0.1" },
    metadata: { ramplight_scout: sc.slug, seeded: "true" },
  }, { idempotencyKey: `seed-acct-${sc.slug}-v1` });
  await db.update(schema.scouts).set({ stripeAccountId: acct.id, chargesEnabled: acct.charges_enabled }).where(eq(schema.scouts.id, sc.id));
  console.log(sc.slug, acct.id, "charges:", acct.charges_enabled, "due:", acct.requirements?.currently_due?.join(",") || "-");
}
// Refresh status for all (verification can lag a few seconds in test mode).
const all = await db.select().from(schema.scouts);
for (const sc of all) {
  if (!sc.stripeAccountId) continue;
  const a = await s.accounts.retrieve(sc.stripeAccountId);
  if (a.charges_enabled !== sc.chargesEnabled) {
    await db.update(schema.scouts).set({ chargesEnabled: a.charges_enabled }).where(eq(schema.scouts.id, sc.id));
    console.log("updated", sc.slug, a.charges_enabled);
  }
}
await pool.end();

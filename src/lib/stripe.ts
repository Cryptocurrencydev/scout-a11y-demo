import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
      throw new Error("This demo only runs with Stripe test-mode keys");
    }
    client = new Stripe(key, { appInfo: { name: "ramplight-demo" } });
  }
  return client;
}

export const CURRENCY = (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase();

export function siteUrl(headersOrigin?: string | null) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? headersOrigin ?? "http://localhost:3000";
}

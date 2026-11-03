// Registers the production Stripe webhook endpoint and pushes Stripe env vars to Vercel.
// Secret values go straight from .env.local / the Stripe API into `vercel env add` via stdin.
import "./load-env.ts";
import Stripe from "stripe";
import { spawnSync } from "node:child_process";

const SITE = "https://scout-a11y-demo.vercel.app";
const s = new Stripe(process.env.STRIPE_SECRET_KEY!);

function setEnv(name: string, value: string, envs = ["production", "preview"]) {
  for (const e of envs) {
    spawnSync("vercel", ["env", "rm", name, e, "--yes"], { stdio: "ignore" });
    const r = spawnSync("vercel", ["env", "add", name, e], { input: value, stdio: ["pipe", "ignore", "pipe"] });
    console.log(`${name} -> ${e}: ${r.status === 0 ? "ok" : r.stderr.toString().slice(0, 200)}`);
  }
}

const url = `${SITE}/api/stripe/webhook`;
const existing = (await s.webhookEndpoints.list({ limit: 100 })).data.filter((w) => w.url === url);
for (const w of existing) await s.webhookEndpoints.del(w.id);
const hook = await s.webhookEndpoints.create({
  url,
  enabled_events: [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.expired",
    "account.updated",
  ],
  connect: false,
  description: "Ramplight demo (scout-a11y-demo)",
});
console.log("webhook endpoint", hook.id, hook.url);
// account.updated for connected accounts arrives on a Connect endpoint.
const connectHook = await s.webhookEndpoints.create({ url, enabled_events: ["account.updated"], connect: true, description: "Ramplight demo Connect events" });
console.log("connect endpoint", connectHook.id);

setEnv("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY!);
setEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
setEnv("STRIPE_WEBHOOK_SECRET", hook.secret!);
setEnv("STRIPE_CONNECT_WEBHOOK_SECRET", connectHook.secret!);
setEnv("NEXT_PUBLIC_SITE_URL", SITE, ["production"]);

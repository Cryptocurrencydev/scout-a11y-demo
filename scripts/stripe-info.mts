import "./load-env.ts";
import Stripe from "stripe";
const s = new Stripe(process.env.STRIPE_SECRET_KEY!);
const a = await s.accounts.retrieveCurrent();
console.log({ id: a.id, country: a.country, currency: a.default_currency, name: a.settings?.dashboard?.display_name, charges: a.charges_enabled });
const list = await s.accounts.list({ limit: 5 });
console.log("connected accounts:", list.data.length, list.data.map((x) => [x.id, x.type, x.country, x.charges_enabled]));
const hooks = await s.webhookEndpoints.list({ limit: 10 });
console.log("webhooks:", hooks.data.map((h) => [h.url, h.status]));

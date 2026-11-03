// Reports which env vars are set (never their values).
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
const keys = ["DATABASE_URL", "STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"];
for (const k of keys) {
  const v = process.env[k] ?? "";
  const kind = v ? (v.match(/^(sk|pk|rk|whsec)_(test|live)_/)?.[0] ?? "set") : "MISSING";
  console.log(`${k}: ${kind}`);
}

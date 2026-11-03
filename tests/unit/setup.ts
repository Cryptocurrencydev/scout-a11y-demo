import { config } from "dotenv";
// Unit/integration tests always use the local test database, never Neon.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost/scout_test";
config({ path: [".env.local"], quiet: true });
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_unit_only_secret";

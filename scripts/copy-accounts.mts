// Copies seeded scouts' Stripe test account ids from the local dev DB to the target DB.
import pg from "pg";
const src = new pg.Pool({ connectionString: "postgres://localhost/scout_dev" });
const dst = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await src.query("select slug, stripe_account_id, charges_enabled from scouts where stripe_account_id is not null and listed");
for (const r of rows) await dst.query("update scouts set stripe_account_id=$2, charges_enabled=$3 where slug=$1", [r.slug, r.stripe_account_id, r.charges_enabled]);
const c = await dst.query("select count(*) filter (where charges_enabled) as on, count(*) as all from scouts");
console.log("target:", c.rows[0]);
await src.end(); await dst.end();

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __scoutPool?: Pool };

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export const pool =
  globalForDb.__scoutPool ??
  new Pool({
    connectionString: connectionString(),
    max: process.env.VERCEL ? 3 : 10,
    ssl: /sslmode=require|neon\.tech/.test(process.env.DATABASE_URL ?? "")
      ? { rejectUnauthorized: false }
      : undefined,
  });
if (process.env.NODE_ENV !== "production") globalForDb.__scoutPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

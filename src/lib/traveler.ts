import "server-only";
import { cookies } from "next/headers";
import { db, schema } from "@/db";

/** Returns the visitor's anonymous traveler id (set by proxy.ts). */
export async function travelerId(): Promise<string | null> {
  const id = (await cookies()).get("tid")?.value;
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

/** Same as travelerId but guarantees a row exists, for writes. */
export async function ensureTraveler(): Promise<string> {
  const id = await travelerId();
  if (!id) throw new Error("Missing traveler cookie");
  await db.insert(schema.travelers).values({ id }).onConflictDoNothing();
  return id;
}

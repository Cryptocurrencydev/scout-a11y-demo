import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ensureTraveler, travelerId } from "@/lib/traveler";
import { getThread } from "@/lib/queries";
import { simulatedReply } from "@/lib/replies";

async function scoutBySlug(slug: string) {
  return db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("scout") ?? "";
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  const tid = await travelerId();
  const scout = await scoutBySlug(slug);
  if (!tid || !scout) return NextResponse.json({ messages: [] });
  const messages = await getThread(tid, scout.id, after);
  return NextResponse.json({ messages }, { headers: { "cache-control": "no-store" } });
}

const Body = z.object({ scout: z.string().min(1).max(80), body: z.string().trim().min(1).max(1000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a message before sending" }, { status: 400 });
  const scout = await scoutBySlug(parsed.data.scout);
  if (!scout) return NextResponse.json({ error: "Scout not found" }, { status: 404 });
  const tid = await ensureTraveler();

  const [msg] = await db
    .insert(schema.messages)
    .values({ scoutId: scout.id, travelerId: tid, sender: "traveler", body: parsed.data.body })
    .returning({ id: schema.messages.id, sender: schema.messages.sender, body: schema.messages.body, createdAt: schema.messages.visibleAt });

  // Demo: the scout "replies" a few seconds later. Only the first two traveler messages
  // in a thread get an automatic reply, so the conversation doesn't feel robotic.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.messages)
    .where(and(eq(schema.messages.travelerId, tid), eq(schema.messages.scoutId, scout.id), eq(schema.messages.sender, "traveler")));
  if (count <= 2) {
    const [cheapest] = await db
      .select({ title: schema.packages.title })
      .from(schema.packages)
      .where(eq(schema.packages.scoutId, scout.id))
      .orderBy(asc(schema.packages.priceCents))
      .limit(1);
    await db.insert(schema.messages).values({
      scoutId: scout.id,
      travelerId: tid,
      sender: "scout",
      body: simulatedReply(scout.name.split(" ")[0], parsed.data.body, cheapest?.title ?? "first package"),
      visibleAt: sql`now() + interval '3 seconds'`,
    });
  }
  return NextResponse.json({ message: msg });
}

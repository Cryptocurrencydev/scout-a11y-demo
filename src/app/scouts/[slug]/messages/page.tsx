import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getThread } from "@/lib/queries";
import { travelerId } from "@/lib/traveler";
import { Chat } from "@/components/Chat";

export async function generateMetadata({ params }: PageProps<"/scouts/[slug]/messages">): Promise<Metadata> {
  const scout = await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, (await params).slug) });
  return { title: scout ? `Message ${scout.name}` : "Scout not found" };
}

export default async function MessagesPage({ params }: PageProps<"/scouts/[slug]/messages">) {
  const { slug } = await params;
  const scout = await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) });
  if (!scout) notFound();
  const tid = await travelerId();
  const initial = tid ? await getThread(tid, scout.id) : [];
  const firstName = scout.name.split(" ")[0];
  return (
    <div className="wrap page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/scouts">Scouts</Link>
          </li>
          <li>
            <Link href={`/scouts/${scout.slug}`}>{scout.name}</Link>
          </li>
          <li>
            <span aria-current="page">Messages</span>
          </li>
        </ol>
      </nav>
      <h1>Message {scout.name}</h1>
      <p className="lede">
        Ask {firstName} anything before you book. {firstName} usually replies {scout.responseTime}; in this demo, a
        simulated reply arrives after a few seconds.
      </p>
      <Chat
        scoutSlug={scout.slug}
        scoutFirstName={firstName}
        initial={initial.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
      <p style={{ marginTop: "1.5rem" }}>
        <Link href={`/scouts/${scout.slug}#packages-heading`}>See {firstName}&apos;s packages and book</Link>
      </p>
    </div>
  );
}

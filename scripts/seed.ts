// Seeds scouts, packages and reviews. Idempotent: existing scouts (by slug) keep their
// Stripe account ids; packages and seeded reviews are replaced.
import "./load-env";
import { eq, and, isNull } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { SEED_SCOUTS } from "./seed-data";

async function main() {
  for (const s of SEED_SCOUTS) {
    const [row] = await db
      .insert(schema.scouts)
      .values({
        slug: s.slug,
        name: s.name,
        pronouns: s.pronouns,
        city: s.city,
        country: s.country,
        lat: s.lat,
        lng: s.lng,
        headline: s.headline,
        bio: s.bio,
        specialties: s.specialties,
        languages: s.languages,
        responseTime: s.responseTime,
      })
      .onConflictDoUpdate({
        target: schema.scouts.slug,
        set: {
          name: s.name,
          pronouns: s.pronouns,
          city: s.city,
          country: s.country,
          lat: s.lat,
          lng: s.lng,
          headline: s.headline,
          bio: s.bio,
          specialties: s.specialties,
          languages: s.languages,
          responseTime: s.responseTime,
        },
      })
      .returning({ id: schema.scouts.id });

    const existing = await db
      .select({ id: schema.packages.id, title: schema.packages.title })
      .from(schema.packages)
      .where(eq(schema.packages.scoutId, row.id));
    for (const p of s.packages) {
      const match = existing.find((e) => e.title === p.title);
      if (match) {
        await db.update(schema.packages).set(p).where(eq(schema.packages.id, match.id));
      } else {
        await db.insert(schema.packages).values({ ...p, scoutId: row.id });
      }
    }

    await db
      .delete(schema.reviews)
      .where(and(eq(schema.reviews.scoutId, row.id), isNull(schema.reviews.bookingId)));
    for (const r of s.reviews) {
      await db.insert(schema.reviews).values({
        scoutId: row.id,
        authorName: r.authorName,
        rating: r.rating,
        body: r.body,
        createdAt: new Date(Date.now() - r.daysAgo * 86400_000),
      });
    }
  }
  console.log(`Seeded ${SEED_SCOUTS.length} scouts`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

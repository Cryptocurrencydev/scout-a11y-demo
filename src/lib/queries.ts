import "server-only";
import { sql, eq, and, asc, desc, lte, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { SPECIALTIES, LANGUAGES } from "./catalog";

export type Filters = {
  destination: string;
  specialties: string[];
  language: string;
  maxPrice: string;
  minRating: string;
};

const asArray = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const allowedSpecialties = new Set<string>(SPECIALTIES.map((s) => s.id));
  const language = first(sp.language);
  const maxPrice = first(sp.maxPrice);
  const minRating = first(sp.minRating);
  return {
    destination: first(sp.destination).slice(0, 60),
    specialties: asArray(sp.specialty).filter((s) => allowedSpecialties.has(s)),
    language: (LANGUAGES as readonly string[]).includes(language) ? language : "",
    maxPrice: ["10", "25", "40", "60"].includes(maxPrice) ? maxPrice : "",
    minRating: ["4", "4.5"].includes(minRating) ? minRating : "",
  };
}

export type ScoutCard = {
  id: string;
  slug: string;
  name: string;
  pronouns: string | null;
  city: string;
  country: string;
  lat: number;
  lng: number;
  headline: string;
  specialties: string[];
  languages: string[];
  fromCents: number;
  rating: number | null;
  reviewCount: number;
};

export async function searchScouts(f: Filters): Promise<ScoutCard[]> {
  const conds = [sql`s.listed = true`];
  if (f.destination) conds.push(sql`s.city = ${f.destination}`);
  if (f.specialties.length)
    conds.push(sql`s.specialties @> string_to_array(${f.specialties.join(",")}, ',')`);
  if (f.language) conds.push(sql`${f.language} = ANY(s.languages)`);
  const having = [sql`true`];
  if (f.maxPrice) having.push(sql`min(p.price_cents) <= ${Number(f.maxPrice) * 100}`);
  if (f.minRating) having.push(sql`coalesce(avg(r.rating), 0) >= ${Number(f.minRating)}`);

  const rows = await db.execute<{
    id: string; slug: string; name: string; pronouns: string | null; city: string; country: string;
    lat: number; lng: number; headline: string; specialties: string[]; languages: string[];
    from_cents: number; rating: string | null; review_count: string;
  }>(sql`
    select s.id, s.slug, s.name, s.pronouns, s.city, s.country, s.lat, s.lng, s.headline,
           s.specialties, s.languages,
           min(p.price_cents)::int as from_cents,
           round(avg(r.rating)::numeric, 1) as rating,
           count(distinct r.id) as review_count
    from scouts s
    join packages p on p.scout_id = s.id
    left join reviews r on r.scout_id = s.id
    where ${sql.join(conds, sql` and `)}
    group by s.id
    having ${sql.join(having, sql` and `)}
    order by avg(r.rating) desc nulls last, count(distinct r.id) desc, s.name asc
  `);
  return rows.rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, pronouns: r.pronouns, city: r.city, country: r.country,
    lat: r.lat, lng: r.lng, headline: r.headline, specialties: r.specialties, languages: r.languages,
    fromCents: r.from_cents, rating: r.rating === null ? null : Number(r.rating), reviewCount: Number(r.review_count),
  }));
}

export async function listDestinations(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: schema.scouts.city })
    .from(schema.scouts)
    .where(eq(schema.scouts.listed, true))
    .orderBy(asc(schema.scouts.city));
  return rows.map((r) => r.city);
}

export async function getScout(slug: string) {
  const scout = await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) });
  if (!scout) return null;
  const [pkgs, revs] = await Promise.all([
    db.select().from(schema.packages).where(eq(schema.packages.scoutId, scout.id)).orderBy(asc(schema.packages.priceCents)),
    db.select().from(schema.reviews).where(eq(schema.reviews.scoutId, scout.id)).orderBy(desc(schema.reviews.createdAt)),
  ]);
  const rating = revs.length ? Math.round((revs.reduce((a, r) => a + r.rating, 0) / revs.length) * 10) / 10 : null;
  return { scout, packages: pkgs, reviews: revs, rating };
}

export async function getThread(travelerId: string, scoutId: string, afterId = 0) {
  return db
    .select({
      id: schema.messages.id,
      sender: schema.messages.sender,
      body: schema.messages.body,
      createdAt: schema.messages.visibleAt,
    })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.travelerId, travelerId),
        eq(schema.messages.scoutId, scoutId),
        gt(schema.messages.id, afterId),
        lte(schema.messages.visibleAt, sql`now()`),
      ),
    )
    .orderBy(asc(schema.messages.id));
}

export async function getBookingForTraveler(id: string, travelerId: string) {
  const rows = await db
    .select({
      booking: schema.bookings,
      scout: { name: schema.scouts.name, slug: schema.scouts.slug, city: schema.scouts.city },
      pkg: { title: schema.packages.title, format: schema.packages.format },
    })
    .from(schema.bookings)
    .innerJoin(schema.scouts, eq(schema.scouts.id, schema.bookings.scoutId))
    .innerJoin(schema.packages, eq(schema.packages.id, schema.bookings.packageId))
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.travelerId, travelerId)));
  if (!rows[0]) return null;
  const review = await db.query.reviews.findFirst({ where: eq(schema.reviews.bookingId, id) });
  return { ...rows[0], review: review ?? null };
}

export async function listBookingsForTraveler(travelerId: string) {
  return db
    .select({
      id: schema.bookings.id,
      status: schema.bookings.status,
      amountCents: schema.bookings.amountCents,
      currency: schema.bookings.currency,
      tripDate: schema.bookings.tripDate,
      createdAt: schema.bookings.createdAt,
      scoutName: schema.scouts.name,
      pkgTitle: schema.packages.title,
    })
    .from(schema.bookings)
    .innerJoin(schema.scouts, eq(schema.scouts.id, schema.bookings.scoutId))
    .innerJoin(schema.packages, eq(schema.packages.id, schema.bookings.packageId))
    .where(eq(schema.bookings.travelerId, travelerId))
    .orderBy(desc(schema.bookings.createdAt));
}

export async function getEarnings(scoutId: string) {
  return db
    .select({
      id: schema.bookings.id,
      status: schema.bookings.status,
      amountCents: schema.bookings.amountCents,
      applicationFeeCents: schema.bookings.applicationFeeCents,
      transferCents: schema.bookings.transferCents,
      currency: schema.bookings.currency,
      paidAt: schema.bookings.paidAt,
      createdAt: schema.bookings.createdAt,
      pkgTitle: schema.packages.title,
    })
    .from(schema.bookings)
    .innerJoin(schema.packages, eq(schema.packages.id, schema.bookings.packageId))
    .where(eq(schema.bookings.scoutId, scoutId))
    .orderBy(desc(schema.bookings.createdAt))
    .limit(50);
}

export async function listScoutsBasic() {
  return db
    .select({ id: schema.scouts.id, slug: schema.scouts.slug, name: schema.scouts.name, city: schema.scouts.city })
    .from(schema.scouts)
    .where(eq(schema.scouts.listed, true))
    .orderBy(asc(schema.scouts.name));
}

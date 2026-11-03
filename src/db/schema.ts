import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  boolean,
  bigserial,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const travelers = pgTable("travelers", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().default("Guest traveler"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scouts = pgTable(
  "scouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    pronouns: text("pronouns"),
    city: text("city").notNull(),
    country: text("country").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    specialties: text("specialties").array().notNull(),
    languages: text("languages").array().notNull(),
    responseTime: text("response_time").notNull().default("within a day"),
    listed: boolean("listed").notNull().default(true),
    stripeAccountId: text("stripe_account_id"),
    // "express": Stripe-hosted onboarding + Express dashboard. "none": seeded demo scouts
    // onboarded through the API (Stripe's hosted flow is captcha-protected against automation).
    stripeDashboard: text("stripe_dashboard", { enum: ["express", "none"] }).notNull().default("none"),
    chargesEnabled: boolean("charges_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("scouts_slug_idx").on(t.slug)],
);

export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => scouts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    format: text("format").notNull(),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [
    index("packages_scout_idx").on(t.scoutId),
    check("packages_price_range", sql`${t.priceCents} between 500 and 6000`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => scouts.id, { onDelete: "cascade" }),
    travelerId: uuid("traveler_id")
      .notNull()
      .references(() => travelers.id, { onDelete: "cascade" }),
    sender: text("sender", { enum: ["traveler", "scout"] }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Simulated scout replies are written ahead of time and only become visible after a short delay.
    visibleAt: timestamp("visible_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_thread_idx").on(t.travelerId, t.scoutId, t.id)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travelerId: uuid("traveler_id")
      .notNull()
      .references(() => travelers.id, { onDelete: "cascade" }),
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => scouts.id),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    amountCents: integer("amount_cents").notNull(),
    applicationFeeCents: integer("application_fee_cents").notNull(),
    transferCents: integer("transfer_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status", { enum: ["pending", "paid", "completed", "cancelled"] })
      .notNull()
      .default("pending"),
    tripDate: text("trip_date").notNull(),
    accessNotes: text("access_notes").notNull(),
    checkoutSessionId: text("checkout_session_id"),
    paymentIntentId: text("payment_intent_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookings_checkout_session_idx").on(t.checkoutSessionId),
    index("bookings_scout_idx").on(t.scoutId),
    index("bookings_traveler_idx").on(t.travelerId),
    check("bookings_split", sql`${t.applicationFeeCents} + ${t.transferCents} = ${t.amountCents}`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => scouts.id, { onDelete: "cascade" }),
    // Seeded reviews have no booking; reviews written in the app always come from a completed booking.
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_booking_idx").on(t.bookingId),
    index("reviews_scout_idx").on(t.scoutId),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

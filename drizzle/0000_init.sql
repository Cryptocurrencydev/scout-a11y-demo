CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveler_id" uuid NOT NULL,
	"scout_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"application_fee_cents" integer NOT NULL,
	"transfer_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trip_date" text NOT NULL,
	"access_notes" text NOT NULL,
	"checkout_session_id" text,
	"payment_intent_id" text,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_split" CHECK ("bookings"."application_fee_cents" + "bookings"."transfer_cents" = "bookings"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scout_id" uuid NOT NULL,
	"traveler_id" uuid NOT NULL,
	"sender" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visible_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"format" text NOT NULL,
	"price_cents" integer NOT NULL,
	CONSTRAINT "packages_price_range" CHECK ("packages"."price_cents" between 500 and 6000)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_id" uuid NOT NULL,
	"booking_id" uuid,
	"author_name" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "scouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"pronouns" text,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"specialties" text[] NOT NULL,
	"languages" text[] NOT NULL,
	"response_time" text DEFAULT 'within a day' NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"stripe_account_id" text,
	"charges_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT 'Guest traveler' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_traveler_id_travelers_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."travelers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_traveler_id_travelers_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."travelers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_scout_id_scouts_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."scouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_checkout_session_idx" ON "bookings" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "bookings_scout_idx" ON "bookings" USING btree ("scout_id");--> statement-breakpoint
CREATE INDEX "bookings_traveler_idx" ON "bookings" USING btree ("traveler_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("traveler_id","scout_id","id");--> statement-breakpoint
CREATE INDEX "packages_scout_idx" ON "packages" USING btree ("scout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_scout_idx" ON "reviews" USING btree ("scout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scouts_slug_idx" ON "scouts" USING btree ("slug");
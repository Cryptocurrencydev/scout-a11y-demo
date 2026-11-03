# Ramplight: accessible travel scouts (demo)

A working demo of an accessible travel-advice marketplace. Travelers with disabilities find local
**scouts** (locals with lived experience of disability), message them before booking, and buy advice
packages from $5 to $60. Payments run on **Stripe Connect** (test mode) with destination charges and a
platform application fee. WCAG 2.1 AA is built into the code, with no overlay widget.

Ramplight is a fictional brand; scouts, reviews and bookings are invented.

- **Live:** https://scout-a11y-demo.vercel.app
- **Stack:** Next.js 16 (App Router, TypeScript), Postgres on Neon with Drizzle ORM, Stripe Connect,
  MapLibre GL with OpenFreeMap tiles, Playwright + axe-core, Vitest
- **Testing:** see [a11y/TESTING.md](a11y/TESTING.md); per-phase build times in [TIMELOG.md](TIMELOG.md)

## Test results (2026-11-03)

- **Unit + integration (Vitest):** 18/18 passing (money split, dates, signed webhook + idempotency,
  real Stripe test-mode fee/transfer/scout-net checks).
- **Playwright, local production build, 390px + desktop:** 107 passed, 3 skipped (the live-only pay
  flow and the desktop-only 200% zoom check on mobile). **axe: 0 violations** across every page, both
  themes and all key states. Zero console errors.
- **Live (https://scout-a11y-demo.vercel.app):** keyboard-only flow from search to review, paying on
  Stripe Checkout, **passes at 390px and desktop**. A full live rerun was cut short when Vercel's
  Security Checkpoint started challenging the headless browser (bot protection, not an app failure).

## Try it

1. **Find scouts** → pick Lisbon and *Wheelchair access*; the result count is announced as you filter.
2. Toggle **Map and list**. Every pin is in the list; choosing a pin moves focus to that scout's card.
3. Open **Inês Carvalho** → **Message Inês** (a simulated reply arrives after about 3 seconds).
4. **Book** a package and pay on Stripe Checkout with `4242 4242 4242 4242`, any future date, any CVC.
5. Back on the booking page the webhook confirms payment and shows the split. Choose **Mark booking as
   completed**, then leave a review.
6. **Scout earnings** shows the traveler price, Ramplight's application fee and the scout's net for
   every booking.

## Architecture

```
Browser (server-rendered HTML, small client islands)
  │  Next.js App Router on Vercel (Node runtime)
  │   ├─ Server Components: search, profile, bookings, earnings (SQL via Drizzle)
  │   ├─ Server Actions: start checkout, complete booking, submit review, scout onboarding
  │   ├─ /api/messages        GET poll / POST send (+ simulated scout reply)
  │   └─ /api/stripe/webhook  raw-body signature check → idempotent booking update
  ├─ Neon Postgres: travelers, scouts, packages, messages, bookings, reviews, stripe_events
  └─ Stripe (test mode): Checkout Sessions, Connect accounts, webhooks
```

- **Rendering:** pages render on the server and work before JavaScript loads. The search form is a
  real `GET` form, enhanced with in-place updates. Client components are limited to the filters and
  map, the dialogs, chat and form validation. MapLibre loads only when the map is shown.
- **Data:** `src/db/schema.ts` (Drizzle). Money is stored in integer cents, and a check constraint
  enforces `application_fee_cents + transfer_cents = amount_cents`. Package prices are constrained to
  500–6000 cents.
- **Identity:** each visitor gets an anonymous traveler id cookie (`src/proxy.ts`), so messages and
  bookings are private to that browser. The full MVP replaces this with real accounts.
- **Messaging:** polling every 2 s (simple and reliable on serverless). Scout replies in the demo are
  written with a `visible_at` a few seconds in the future, so they "arrive" like a real reply.
- **PWA:** `app/manifest.ts` (installable, standalone, maskable icon), `public/sw.js` (network-first
  pages with an offline fallback page, cache-first for immutable build assets).

## Accessibility approach, page by page

Global: `lang`, a skip link as the first tab stop, `header` / `nav[aria-label=Main]` / `main` /
`footer` landmarks, exactly one `h1` per page with no skipped heading levels, and `aria-current="page"`
in the nav. One focus style everywhere (3 px dark outline plus a bright halo, visible on every
surface). On client-side route changes focus moves to the new `h1`. The **High contrast** toggle
(`aria-pressed`, stored in a cookie so the server renders it without a flash) and
`prefers-contrast: more` switch to a black/white/yellow theme. `forced-colors` gets system colours and
explicit borders. `prefers-reduced-motion` disables transitions, smooth scroll and map fly animations.
Sizes are in rem, layouts reflow to a single column at 320 px, and every control is at least 44×44 px.
Tokens are AA in the standard theme and AAA in high contrast.

- **Home:** the hero quick search is a labelled `role="search"` form that works without JS. "How it
  works" is an ordered list.
- **Find scouts:** the filters are native controls: a `select` for destination, language and price, a
  `fieldset`/`legend` checkbox group for specialties (with a hint tied by `aria-describedby`) and a
  radio group for rating, inside a native `details` disclosure. Changing a filter updates results in
  place without moving focus, and the count (`role="status"`) announces, for example, "1 scout found in
  Lisbon, Wheelchair access". The **List only / Map and list** toggle is a pair of `aria-pressed`
  buttons. The **map is supplementary**: it has a "Skip map" link, pins are real buttons named
  "Inês Carvalho, Lisbon. Go to Inês Carvalho in the list", and activating one moves focus to that card
  in the list. Each card's **Show on map** button selects the pin and keeps focus where it is.
  Overlapping pins merge into a cluster button ("3 scouts in this area: … Zoom in"), so no target is
  obscured. Nothing traps Tab.
- **Scout profile:** a breadcrumb `nav`, then `section`s labelled by their `h2` (About, Accessibility
  specialties, Packages, Reviews) and an `aside` for messaging. Ratings show stars visually and read as
  "Rated 4.7 out of 5 from 3 reviews". **Booking dialog:** a native `<dialog>` opened with
  `showModal()`, named by its heading and described by its price line. Escape, Close and Cancel all
  close it, and focus returns to the button that opened it. Form errors are validated on the client
  and the server. A summary is focused on submit and links to each field, and each field has
  `aria-invalid` and an error message tied with `aria-describedby`.
- **Messages:** the textarea is labelled with a hint. Ctrl/⌘+Enter or the Send button sends, and focus
  stays in the textarea. Incoming scout messages are announced once through a dedicated polite live
  region ("New message from Inês: …"), so the whole thread isn't live and your own messages aren't read
  back. The thread is a scrollable, focusable, labelled list.
- **Checkout:** Stripe-hosted Checkout (Stripe maintains its accessibility). The keyboard-only e2e test
  pays on it with Tab and typing.
- **Booking page:** payment status sits in one persistent `role="status"` region, so "Payment
  confirmed" is announced when the webhook lands. The split is a definition list. The review form uses
  a `fieldset`/`legend` radio group with full-text labels ("5 stars, excellent"), an error summary, and
  focus moves to the confirmation after publishing.
- **Scout earnings:** a labelled select with an explicit submit button (no surprise context change),
  a money-flow explainer as an ordered list, and a data table with `caption` and `scope="col"` inside a
  focusable, labelled scroll region for narrow screens.
- **Become a scout:** a labelled form with an error summary, then Stripe-hosted Express onboarding.
- **Accessibility statement:** the standard, what works, known third-party limits, and how to give
  feedback.

## Stripe Connect money flow

```
Traveler ──$25.00──▶ Ramplight platform (Checkout Session, destination charge)
                          │ payment_intent_data.transfer_data.destination = scout's acct_
                          │ payment_intent_data.application_fee_amount  = $3.75 (15%)
                          ▼
                     Scout's connected account receives $25.00, Stripe collects $3.75 back
                     as Ramplight's application fee → scout nets $21.25
                     Stripe's processing fee is paid by the platform out of its fee
```

- `src/lib/money.ts`: `splitPayment()`, integer cents, 15% fee rounded half-up, always sums.
- `src/lib/checkout.ts`: builds the Checkout Session params for the destination charge.
- `src/app/actions/booking.ts`: creates a `pending` booking with the split, creates the session with an
  idempotency key, then redirects to Stripe.
- `src/app/api/stripe/webhook/route.ts` + `src/lib/webhook.ts`: verifies `Stripe-Signature` against the
  **raw body**. In one transaction it inserts the event id into `stripe_events` (a duplicate is a
  no-op) and moves the booking `pending → paid` only. A redelivery, a second event for the same session,
  or concurrent deliveries all change nothing. On a processing error it returns 500 so Stripe retries,
  and the transaction rollback means the event wasn't recorded.
- **Onboarding:** `/become-a-scout` creates an **Express** account and sends the scout to Stripe-hosted
  onboarding through an Account Link, and the return page reads `charges_enabled`. Stripe protects the
  hosted flow with a captcha, so the 18 **seeded** demo scouts can't be onboarded by a script. They use
  test accounts created through the API with `controller.requirement_collection = application`, the
  same destination-charge behaviour without the Express dashboard (`scripts/stripe-provision.mts`).
  Their earnings page says so.
- Tests prove the amounts against the real Stripe test API, down to what the scout nets on their
  connected account's ledger (`tests/unit/stripe-amounts.test.ts`).

## Run locally

```bash
npm install
createdb scout_dev && createdb scout_test
export DATABASE_URL=postgres://localhost/scout_dev
npm run db:migrate && npm run db:seed
# .env.local: STRIPE_SECRET_KEY=sk_test_…, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
npx tsx scripts/stripe-provision.mts   # test-mode accounts for seeded scouts
npm run dev
npm test                               # unit + webhook + Stripe amount tests
npm run build && npm run test:e2e      # axe, keyboard, layout, PWA (local)
BASE_URL=https://scout-a11y-demo.vercel.app npx playwright test   # includes the keyboard-only pay flow
```

## What the full MVP would add

- Real accounts (traveler and scout sign-in, passkeys), roles, and scouts editing their own profile,
  packages and availability.
- A scout inbox and delivery workflow: the scout delivers files, a call link or an itinerary, and the
  traveler confirms, replacing the demo's "mark completed" shortcut. Disputes and refunds go through
  Stripe refunds with reverse transfers.
- Real-time messaging over SSE or a managed channel, with email/push notifications, attachments, alt
  text prompts for photos and moderation.
- Embedded Connect components (account management, payouts, notification banner) and scout payout
  schedules. Live-mode KYC, tax forms (1099/DAC7), multi-currency pricing.
- Search at scale: Postgres full-text and PostGIS, geocoded destinations and saved searches. Map
  clustering moves server-side.
- WordPress MVP migration: an import script for users, scouts, packages and reviews with redirects
  from old URLs, plus a content model for guides.
- An accessibility programme: axe in CI on every PR, a manual screen-reader pass per release, usability
  testing with disabled travelers, and a public accessibility statement with a feedback route.

---

Demo by [DC Tech](https://dctechltd.com).

# Timelog: scout-a11y-demo (Ramplight)

Times are local (WAT), 2026-11-03.

| Phase | Start | End | Duration | Notes |
|---|---|---|---|---|
| 0. Setup: tooling check, scaffold Next.js 16, deps, local DBs | 12:07 | 12:21 | 14 min | Stripe keys requested; MapLibre chosen |
| 1. Schema, seed data, money/webhook/checkout logic, all pages and components | 12:21 | 12:42 | 21 min | Drizzle schema, 18 fictional scouts, search/map/profile/dialog/chat/bookings/earnings/onboarding |
| 2. Stripe Connect setup | 12:36 | 12:49 | 13 min | Waited on user to enable Connect + acknowledge platform loss liability; hosted Express onboarding blocked by hCaptcha for automation, so seeded scouts use API-onboarded accounts |
| 3. Unit + integration tests | 12:49 | 12:53 | 4 min | money split, signed webhook + idempotency, real Stripe fee/transfer/scout-net checks |
| 4. Playwright axe, keyboard, layout, PWA suites + fixes | 12:53 | 13:04 | 11 min | pin clustering for overlapping targets, MapLibre worker, 320px reflow fix |
| 5. Deploy: gitleaks, public GitHub repo, Vercel link, Neon, webhooks, env | 13:04 | 13:13 | 9 min | Neon via Vercel Marketplace; push to main deploys |
| 6. Live keyboard-only pay flow + fixes | 13:13 | 13:29 | 16 min | pre-hydration filter fix, day/month/year date fields, review confirmation focus; flow green at 390px + desktop |
| 7. Full live suite, docs | 13:29 | 13:50 | 21 min | Vercel Security Checkpoint challenged headless traffic mid-run (not an app failure); a11y/TESTING.md, README |
| **Total** | 12:07 | 13:50 | **1 h 43 min** | |

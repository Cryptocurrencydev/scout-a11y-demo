# Accessibility testing

Target: WCAG 2.1 AA (axe also runs the 2.2 AA and best-practice rules). Automated tools catch roughly a
third to a half of real issues, so automated checks gate every change and the manual screen-reader
pass below covers the rest.

## Automated

| Suite | What it proves | Command |
|---|---|---|
| `tests/e2e/a11y.spec.ts` | axe-core (`@axe-core/playwright`, tags wcag2a/aa, wcag21a/aa, wcag22aa, best-practice) on **every page** in the standard and high-contrast themes, plus key states: filters open with a filter applied, map view, map with a scout selected, booking dialog open, booking dialog with errors, chat error, chat with a reply, onboarding errors, forced colours plus reduced motion, `prefers-contrast: more`. Zero violations required. | `npx playwright test a11y` |
| `tests/e2e/booking-flow.spec.ts` | **Keyboard only, no mouse:** home search → filter → open a scout from the list → message the scout and hear the reply announced → book (dialog) → pay on Stripe Checkout with `4242…` → webhook confirms → mark completed → review (incl. error summary) → review on profile → split in earnings. Every step uses Tab/Shift+Tab, Enter, Space and typing; `tabTo()` fails if a control can't be reached by Tab. axe runs at seven points along the way. Needs the deployed webhook, so it runs against `BASE_URL`. | `BASE_URL=https://scout-a11y-demo.vercel.app npx playwright test booking-flow` |
| `tests/e2e/keyboard.spec.ts` | Skip link first and working; a visible focus outline on every tab stop; **no keyboard trap** (Tab walks each page and leaves it, map included); filters keep focus while the live count updates; map pin → focus moves to the list card; "Show on map" keeps focus; "Skip map" link; dialog focus in, Escape/Close/Cancel return focus to the trigger; error summary focused and linked to fields (`aria-invalid`, `aria-describedby`); route change focuses the new `h1`; chat send with Ctrl+Enter and live announcements. | `npx playwright test keyboard` |
| `tests/e2e/layout.spec.ts` | No horizontal scroll at **320 px** (1.4.10); **200% text size** with no overflow or clipped text (1.4.4); every control **≥ 44×44 px**; one `h1`, landmarks, no skipped heading levels on every page; DC Tech footer link; **PWA** manifest, service worker control and the offline fallback page. | `npx playwright test layout` |
| Console | Every Playwright test fails on any `console.error` or uncaught exception on our pages. | (built into the fixtures) |
| `tests/unit/*.test.ts` | Money split (every price from $5 to $60), date parsing, **webhook** signature checks (missing, wrong secret, tampered body), **idempotency** (redelivery, second event for the same session, 5 concurrent duplicates), and **Stripe amounts** against the real test API: application fee, transfer, and the scout's net from their connected-account ledger. | `npm test` |

All Playwright suites run in two projects: **mobile-390** (390×844, touch, DPR 3) and **desktop**
(1280×860), locally and against the live URL. Results for the latest run are in the README and the
delivery notes.

## Manual: VoiceOver on macOS

Setup: Safari, VoiceOver on (⌘F5). VO = Control+Option. Turn on Safari › Settings › Advanced › "Press
Tab to highlight each item on a webpage".

1. **Landmarks and headings.** On any page, VO+U → Landmarks: banner, Main navigation, main,
   contentinfo (plus Breadcrumb and Search where present). VO+U → Headings: one heading level 1, then
   levels in order.
2. **Skip link.** Load a page and press Tab: you hear "Skip to main content, link". Enter moves VO into
   main.
3. **Search filters.** On Find scouts: Tab to Filters, the summary should read "collapsed". Tick
   *Wheelchair access* with Space. Without moving, you should hear "N scouts found …" once. Check the
   specialty group reads its legend and hint.
4. **Map and list.** Activate *Map and list* (you should hear "selected" or "pressed"). Tab into the
   map: pins read "Inês Carvalho, Lisbon. Go to Inês Carvalho in the list, button". Activate one:
   focus lands on the scout's name link in the list. "Show on map" announces "pressed" and focus stays
   put. "Skip map" jumps to the list. Confirm you can Tab out of the map.
5. **Profile.** VO+U → Headings shows About, Accessibility specialties, Packages (each package an
   h3), Reviews. The rating reads "Rated 4.7 out of 5 from 3 reviews".
6. **Booking dialog.** Activate "Book 30-minute planning call for $25.00": you hear the dialog name and
   description, and focus is inside. VO can't wander behind the dialog. Submit empty: you hear "There
   are 2 problems with your form". The links move to each field. Day/Month/Year read as a group "Trip
   date" with its hint and error. Escape closes and focus returns to the Book button.
7. **Chat.** On Message Inês, send a message: "Message sent." is announced. About 3 s later: "New
   message from Inês: …" is announced once, and VO focus stays in the text area.
8. **Checkout.** On Stripe Checkout, check the fields are labelled and the card errors are announced
   (Stripe owns this page; log any issues for Stripe).
9. **Payment confirmation.** Back on the booking page: "Payment received by Stripe. Waiting for
   confirmation…" then "Payment confirmed." are announced without moving focus.
10. **Review.** Submit empty: the error summary is announced. The rating radios read "5 stars,
    excellent, radio button, 1 of 5". After Publish, focus moves to "Thank you. Your review … is
    published."
11. **Earnings.** The table announces its caption, column headers are read as you move between cells
    (VO+arrows), and the scroll region is labelled.
12. **Display settings.** System Settings › Accessibility › Display: *Increase contrast* switches the
    site to the black/yellow theme. *Reduce motion* stops the map fly animations. Zoom Safari to 200%
    (⌘+): nothing is cut off. Also try the in-page **High contrast** button (reads "toggle button,
    not pressed/pressed").

## Manual: VoiceOver on iOS

Setup: Settings › Accessibility › VoiceOver. Use the rotor (two-finger twist) for Headings, Landmarks,
Form controls.

1. Swipe through the home page: a logical order, the header nav, and the search form labels read
   before their controls.
2. Rotor → Headings on each page: a single level-1 heading.
3. Find scouts: open Filters (double-tap), toggle a checkbox, and listen for the result count. The
   "Map and list" button reports its state, and the list stays the primary way to browse.
4. Booking dialog: the content behind it isn't reachable while it's open. The Day/Month/Year fields
   bring up the numeric keypad. Errors are announced on submit.
5. Chat: incoming messages are announced while the keyboard is up.
6. Text size: Settings › Display & Text Size › Larger Text at max. The pages reflow with no sideways
   scroll. Pinch zoom works (it isn't disabled).
7. Add to Home Screen: the app opens standalone with the Ramplight icon. In airplane mode, a page load
   shows "You're offline".

## Windows: NVDA and JAWS (what that pass would cover)

Not run for this demo (macOS-only environment). The full MVP's release checklist would add:

- **NVDA + Firefox and NVDA + Chrome, JAWS + Chrome/Edge:** the steps above in browse and focus mode,
  in particular:
  - the `role="status"` result count and chat announcements (NVDA and JAWS handle polite live regions
    differently from VoiceOver);
  - `details`/`summary` state;
  - the `aria-pressed` toggles;
  - dialog virtual-cursor containment with `showModal()`;
  - error summary focus;
  - table navigation (Ctrl+Alt+arrows).
- **Forms mode switching:** typing in the chat and date fields must not trigger single-key navigation
  (forms or focus mode engages automatically on the native controls).
- **Windows High Contrast / Contrast themes** (forced colours): check boundaries, focus rings,
  pressed toggles, map pins and error icons stay visible (`@media (forced-colors: active)` rules are in
  `globals.css`; Playwright emulates this, but a real theme is the true test).
- **Windows Magnifier and 400% zoom with reflow, Dragon NaturallySpeaking** "click Book" by visible
  label (label-in-name is enforced; axe checks it).

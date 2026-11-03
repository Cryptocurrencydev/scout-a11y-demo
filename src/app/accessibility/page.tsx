import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accessibility statement" };

export default function AccessibilityPage() {
  return (
    <div className="wrap page" style={{ maxWidth: "48rem" }}>
      <h1>Accessibility statement</h1>
      <p className="lede">Ramplight is for travelers with disabilities, so accessibility is part of the product, not an add-on.</p>

      <h2>Standard</h2>
      <p>
        We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA. We don&apos;t use accessibility
        overlays; accessibility is built into the code.
      </p>

      <h2>What you can do on this site</h2>
      <ul>
        <li>Use every feature with a keyboard alone, including search filters, the map, booking dialogs, chat and checkout.</li>
        <li>Use a screen reader such as VoiceOver, NVDA or JAWS. Result counts and new messages are announced.</li>
        <li>Switch on high contrast with the button in the header. We also follow your system&apos;s contrast and forced-colours settings.</li>
        <li>Zoom text to 200% and use the site on screens as narrow as 320 pixels without scrolling sideways.</li>
        <li>Turn off motion: we follow your reduced-motion setting, including map animations.</li>
      </ul>

      <h2>The map</h2>
      <p>
        The map on the search page is optional. Everything on it is also in the results list, which is the main way to
        browse scouts.
      </p>

      <h2>Payments</h2>
      <p>
        Payment happens on Stripe Checkout, which is maintained by Stripe. We test it with a keyboard as part of our
        booking test, and we&apos;d like to hear from you if it causes problems.
      </p>

      <h2>How we test</h2>
      <p>
        Automated axe-core checks run on every page and key state, a keyboard-only test books a scout from search to
        review, and we test manually with VoiceOver on macOS and iOS.
      </p>

      <h2>Feedback</h2>
      <p>
        If something doesn&apos;t work for you, tell us and we&apos;ll fix it. This is a demo, so feedback goes to the{" "}
        <a href="https://dctechltd.com" target="_blank" rel="noopener">
          team at DC Tech<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        .
      </p>
    </div>
  );
}

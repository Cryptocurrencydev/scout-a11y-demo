import type { Metadata } from "next";
import { OnboardForm } from "@/components/OnboardForm";
import { feePercentLabel } from "@/lib/money";

export const metadata: Metadata = { title: "Become a scout" };

export default function BecomeAScoutPage() {
  return (
    <div className="wrap page">
      <h1>Become a Ramplight scout</h1>
      <p className="lede">
        Share what you know about getting around your city with a disability, and get paid for it. Set your own
        packages from $5 to $60.
      </p>
      <div className="profile-grid">
        <section className="card" aria-labelledby="start-heading">
          <h2 id="start-heading">Start onboarding</h2>
          <p>
            Payments run on Stripe Connect. We&apos;ll create a Stripe Express account for you and send you to
            Stripe&apos;s onboarding to confirm your identity and bank details.
          </p>
          <div className="notice">
            <p>
              <strong>Test mode:</strong> use Stripe&apos;s test data. For the phone code enter 000000; for bank details use
              the test account Stripe suggests. No real money moves.
            </p>
          </div>
          <OnboardForm />
        </section>
        <aside className="card" aria-labelledby="how-paid-heading">
          <h2 id="how-paid-heading">How you get paid</h2>
          <ul>
            <li>Travelers pay through Ramplight; you never handle card details.</li>
            <li>Ramplight keeps {feePercentLabel} and covers Stripe&apos;s processing fees.</li>
            <li>The rest goes straight to your Stripe Express account.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

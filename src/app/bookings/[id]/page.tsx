import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { travelerId } from "@/lib/traveler";
import { getBookingForTraveler } from "@/lib/queries";
import { formatMoney, feePercentLabel } from "@/lib/money";
import { completeBooking } from "@/app/actions/booking";
import { PaymentWatcher } from "@/components/PaymentWatcher";
import { ReviewForm } from "@/components/ReviewForm";
import { FocusOnMount } from "@/components/FocusOnMount";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tid = await travelerId();
  if (!tid || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getBookingForTraveler(id, tid);
  if (!data) notFound();
  const { booking: b, scout, pkg, review } = data;
  const firstName = scout.name.split(" ")[0];

  return (
    <div className="wrap page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/bookings">My bookings</Link>
          </li>
          <li>
            <span aria-current="page">
              {pkg.title} with {scout.name}
            </span>
          </li>
        </ol>
      </nav>
      <h1>
        {pkg.title} with {scout.name}
      </h1>

      {/* One persistent live region, so the change from "waiting" to "confirmed" is announced. */}
      <div role="status">
        {b.status === "pending" && <PaymentWatcher active={sp.checkout === "success"} />}
        {b.status === "paid" && (
          <div className="notice notice-success">
            <p>
              <strong>Payment confirmed.</strong> {firstName} has been notified and will start on your{" "}
              {pkg.title.toLowerCase()}.
            </p>
          </div>
        )}
      </div>
      {b.status === "completed" && sp.completed === "1" && !review && (
        <div className="notice notice-success" role="status">
          <p>Booking marked as completed. You can now leave a review.</p>
        </div>
      )}
      {b.status === "cancelled" && (
        <div className="notice notice-warn">
          <p>This booking was cancelled and you were not charged.</p>
        </div>
      )}

      <div className="profile-grid">
        <div className="stack">
          <section className="card" aria-labelledby="details-heading">
            <h2 id="details-heading">Booking details</h2>
            <dl className="facts">
              <dt>Scout</dt>
              <dd>
                <Link href={`/scouts/${scout.slug}`}>{scout.name}</Link>, {scout.city}
              </dd>
              <dt>Package</dt>
              <dd>{pkg.title}</dd>
              <dt>Delivery</dt>
              <dd>{pkg.format}</dd>
              <dt>Trip date</dt>
              <dd>{b.tripDate}</dd>
              <dt>Access needs</dt>
              <dd>{b.accessNotes}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge status-${b.status}`}>{b.status[0].toUpperCase() + b.status.slice(1)}</span>
              </dd>
            </dl>
          </section>

          {b.status === "paid" && (
            <section className="card" aria-labelledby="complete-heading">
              <h2 id="complete-heading">When {firstName} has delivered</h2>
              <p>
                In the full product the scout marks delivery and you confirm it. In this demo you can confirm it yourself
                to unlock reviews.
              </p>
              <form action={completeBooking}>
                <input type="hidden" name="bookingId" value={b.id} />
                <button type="submit" className="btn">
                  Mark booking as completed
                </button>
              </form>
            </section>
          )}

          {b.status === "completed" && (
            <section className="card" aria-labelledby="review-heading">
              <h2 id="review-heading">{review ? "Your review" : `Review ${firstName}`}</h2>
              {review ? (
                <>
                  {sp.reviewed === "1" && (
                    <FocusOnMount>
                      <p className="notice notice-success">Thank you. Your review of {firstName} is published.</p>
                    </FocusOnMount>
                  )}
                  <p>
                    You rated {firstName} {review.rating} out of 5.
                  </p>
                  <blockquote style={{ margin: 0 }}>{review.body}</blockquote>
                  <p style={{ marginTop: "1rem" }}>
                    <Link href={`/scouts/${scout.slug}#reviews-heading`}>See it on {firstName}&apos;s profile</Link>
                  </p>
                </>
              ) : (
                <ReviewForm bookingId={b.id} scoutFirstName={firstName} scoutSlug={scout.slug} />
              )}
            </section>
          )}
        </div>

        <aside className="card profile-aside" aria-labelledby="payment-heading">
          <h2 id="payment-heading">Payment</h2>
          <dl className="split">
            <div>
              <dt>You pay</dt>
              <dd>{formatMoney(b.amountCents, b.currency)}</dd>
            </div>
            <div>
              <dt>Ramplight fee ({feePercentLabel})</dt>
              <dd>{formatMoney(b.applicationFeeCents, b.currency)}</dd>
            </div>
            <div>
              <dt>{firstName} receives</dt>
              <dd>{formatMoney(b.transferCents, b.currency)}</dd>
            </div>
          </dl>
          <p className="hint" style={{ marginTop: "0.75rem" }}>
            Paid through Stripe Connect. The fee is included in the price; you pay nothing extra.
          </p>
        </aside>
      </div>
    </div>
  );
}

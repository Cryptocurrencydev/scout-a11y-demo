import type { Metadata } from "next";
import Link from "next/link";
import { travelerId } from "@/lib/traveler";
import { listBookingsForTraveler } from "@/lib/queries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "My bookings" };

const statusText = { pending: "Awaiting payment", paid: "Paid", completed: "Completed", cancelled: "Cancelled" };

export default async function BookingsPage() {
  const tid = await travelerId();
  const bookings = tid ? await listBookingsForTraveler(tid) : [];
  return (
    <div className="wrap page">
      <h1>My bookings</h1>
      <p className="lede">Bookings made from this browser. Ramplight demo accounts are anonymous.</p>
      {bookings.length === 0 ? (
        <div className="card">
          <p>You haven&apos;t booked a scout yet.</p>
          <Link className="btn" href="/scouts">
            Find a scout
          </Link>
        </div>
      ) : (
        <ul className="plain-list">
          {bookings.map((b) => (
            <li key={b.id} className="card">
              <h2 style={{ fontSize: "1.2rem" }}>
                <Link href={`/bookings/${b.id}`}>
                  {b.pkgTitle} with {b.scoutName}
                </Link>
              </h2>
              <p style={{ margin: 0 }}>
                <span className={`status-badge status-${b.status}`}>{statusText[b.status]}</span> ·{" "}
                {formatMoney(b.amountCents, b.currency)} · Trip date {b.tripDate}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

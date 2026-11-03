import Link from "next/link";
import { listDestinations, searchScouts } from "@/lib/queries";
import { SPECIALTIES, specialtyLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { Rating } from "@/components/Rating";

export default async function Home() {
  const [destinations, top] = await Promise.all([
    listDestinations(),
    searchScouts({ destination: "", specialties: [], language: "", maxPrice: "", minRating: "" }),
  ]);
  const featured = top.slice(0, 3);
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="wrap">
          <h1 id="hero-heading">Travel advice from locals who know access first-hand</h1>
          <p className="lede">
            Ramplight scouts are disabled locals and access experts. Book a quick answer, a planning call or a full
            itinerary, from $5 to $60.
          </p>
          <form className="quick-search" action="/scouts" method="get" role="search" aria-label="Quick scout search">
            <div className="field">
              <label htmlFor="home-destination">Where are you going?</label>
              <select id="home-destination" name="destination" defaultValue="">
                <option value="">Anywhere</option>
                {destinations.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="home-specialty">What should they specialise in?</label>
              <select id="home-specialty" name="specialty" defaultValue="">
                <option value="">Any specialty</option>
                {SPECIALTIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn">
              Find scouts
            </button>
          </form>
        </div>
      </section>

      <div className="wrap">
        <section className="section" aria-labelledby="how-heading">
          <h2 id="how-heading">How Ramplight works</h2>
          <ol className="steps">
            <li className="card">
              <h3>Find a scout</h3>
              <p>Filter by destination, access specialty, language, price and rating.</p>
            </li>
            <li className="card">
              <h3>Message before you book</h3>
              <p>Ask about door widths, quiet hours or sign language. Messaging is free.</p>
            </li>
            <li className="card">
              <h3>Book and pay securely</h3>
              <p>Pay through Stripe. Your scout is paid automatically, and you can review them afterwards.</p>
            </li>
          </ol>
        </section>

        <section className="section" aria-labelledby="featured-heading">
          <h2 id="featured-heading">Top-rated scouts</h2>
          <ul className="scout-list" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" }}>
            {featured.map((s) => (
              <li key={s.id} className="card scout-card">
                <h3>
                  <Link href={`/scouts/${s.slug}`}>{s.name}</Link>
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  {s.city}, {s.country}
                </p>
                <p style={{ margin: "0.4rem 0" }}>{s.headline}</p>
                <ul className="tags" aria-label={`${s.name}'s specialties`}>
                  {s.specialties.map((sp) => (
                    <li key={sp}>{specialtyLabel(sp)}</li>
                  ))}
                </ul>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <Rating value={s.rating} count={s.reviewCount} /> · from {formatMoney(s.fromCents)}
                </p>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/scouts">Browse all scouts</Link>
          </p>
        </section>

        <section className="section" aria-labelledby="built-heading">
          <h2 id="built-heading">Accessible by design, not by overlay</h2>
          <p style={{ maxWidth: "44rem" }}>
            Every page is built to WCAG 2.1 AA in the code itself: semantic HTML, full keyboard support, visible focus,
            a high-contrast mode, and tests that run axe on every screen. There is no overlay widget.{" "}
            <Link href="/accessibility">Read our accessibility statement</Link>.
          </p>
        </section>
      </div>
    </>
  );
}

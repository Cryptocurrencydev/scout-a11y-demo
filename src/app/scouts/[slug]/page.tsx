import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScout } from "@/lib/queries";
import { specialtyLabel, languageLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { Rating } from "@/components/Rating";
import { BookingDialog } from "@/components/BookingDialog";

export async function generateMetadata({ params }: PageProps<"/scouts/[slug]">): Promise<Metadata> {
  const data = await getScout((await params).slug);
  return { title: data ? `${data.scout.name}, ${data.scout.city} scout` : "Scout not found" };
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function ScoutPage({ params, searchParams }: PageProps<"/scouts/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getScout(slug);
  if (!data) notFound();
  const { scout, packages, reviews, rating } = data;
  const firstName = scout.name.split(" ")[0];

  return (
    <div className="wrap page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/scouts">Scouts</Link>
          </li>
          <li>
            <Link href={`/scouts?destination=${encodeURIComponent(scout.city)}`}>{scout.city}</Link>
          </li>
          <li>
            <span aria-current="page">{scout.name}</span>
          </li>
        </ol>
      </nav>

      {sp.checkout === "cancelled" && (
        <div className="notice notice-warn" role="status">
          <p>Payment cancelled. You have not been charged, and you can book again whenever you are ready.</p>
        </div>
      )}

      <header className="profile-head">
        <h1>{scout.name}</h1>
        <p className="pron">
          {scout.pronouns ? `${scout.pronouns} · ` : ""}Local scout in {scout.city}, {scout.country}
        </p>
        <p className="lede" style={{ margin: "0.25rem 0" }}>
          {scout.headline}
        </p>
        <p style={{ margin: 0 }}>
          <Rating value={rating} count={reviews.length} />
        </p>
      </header>

      <div className="profile-grid">
        <div className="stack">
          <section aria-labelledby="about-heading" className="card">
            <h2 id="about-heading">About {firstName}</h2>
            <p>{scout.bio}</p>
            <dl className="facts">
              <dt>Languages</dt>
              <dd>{scout.languages.map(languageLabel).join(", ")}</dd>
              <dt>Usually replies</dt>
              <dd>{scout.responseTime}</dd>
            </dl>
          </section>

          <section aria-labelledby="specialties-heading" className="card">
            <h2 id="specialties-heading">Accessibility specialties</h2>
            <ul className="tags">
              {scout.specialties.map((s) => (
                <li key={s}>{specialtyLabel(s)}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="packages-heading">
            <h2 id="packages-heading">Packages</h2>
            <ul className="package-list">
              {packages.map((p) => (
                <li key={p.id} className="card package">
                  <h3>{p.title}</h3>
                  <p className="price">{formatMoney(p.priceCents)}</p>
                  <p>{p.description}</p>
                  <p className="muted">{p.format}</p>
                  <div>
                    <BookingDialog
                      packageId={p.id}
                      packageTitle={p.title}
                      priceLabel={formatMoney(p.priceCents)}
                      scoutFirstName={firstName}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading">Reviews</h2>
            {reviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              <ul className="review-list">
                {reviews.map((r) => (
                  <li key={r.id} className="card review">
                    <article aria-labelledby={`review-${r.id}`}>
                      <h3 id={`review-${r.id}`}>{r.authorName}</h3>
                      <p className="muted" style={{ margin: 0 }}>
                        <Rating value={r.rating} count={1} /> ·{" "}
                        <time dateTime={r.createdAt.toISOString()}>{dateFmt.format(r.createdAt)}</time>
                        {r.bookingId ? " · Verified booking" : ""}
                      </p>
                      <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>{r.body}</p>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="profile-aside card" aria-labelledby="contact-heading">
          <h2 id="contact-heading">Questions before booking?</h2>
          <p>Message {firstName} about your trip and access needs. Messaging is free.</p>
          <Link className="btn" href={`/scouts/${scout.slug}/messages`}>
            Message {firstName}
          </Link>
        </aside>
      </div>
    </div>
  );
}

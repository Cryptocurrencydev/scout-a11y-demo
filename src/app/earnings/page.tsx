import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getEarnings, listScoutsBasic } from "@/lib/queries";
import { formatMoney, feePercentLabel, splitPayment } from "@/lib/money";
import { openExpressDashboard } from "@/app/actions/scout";

export const metadata: Metadata = { title: "Scout earnings" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function EarningsPage({ searchParams }: PageProps<"/earnings">) {
  const sp = await searchParams;
  const scouts = await listScoutsBasic();
  const slug = typeof sp.scout === "string" && scouts.some((s) => s.slug === sp.scout) ? sp.scout : scouts[0]?.slug;
  const scout = slug ? await db.query.scouts.findFirst({ where: eq(schema.scouts.slug, slug) }) : undefined;
  const rows = scout ? await getEarnings(scout.id) : [];
  const settled = rows.filter((r) => r.status === "paid" || r.status === "completed");
  const totals = settled.reduce(
    (a, r) => ({ gross: a.gross + r.amountCents, fee: a.fee + r.applicationFeeCents, net: a.net + r.transferCents }),
    { gross: 0, fee: 0, net: 0 },
  );
  const example = splitPayment(3500);
  const firstName = scout?.name.split(" ")[0] ?? "the scout";

  return (
    <div className="wrap page">
      <h1>Scout earnings</h1>
      <p className="lede">
        How each booking is split between the scout and Ramplight. In the full product a scout signs in and sees only
        their own earnings; this demo lets you pick any scout.
      </p>

      <form method="get" action="/earnings" className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="field" style={{ maxWidth: "26rem" }}>
          <label htmlFor="scout">Scout</label>
          <select id="scout" name="scout" defaultValue={slug}>
            {scouts.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Show earnings
        </button>
      </form>

      <section aria-labelledby="flow-heading" className="section" style={{ paddingTop: 0 }}>
        <h2 id="flow-heading">Where the money goes</h2>
        <p>
          Ramplight uses Stripe Connect <strong>destination charges</strong>. For a {formatMoney(example.amountCents)}{" "}
          package:
        </p>
        <ol className="flow">
          <li>
            <span>1. The traveler pays Ramplight</span>
            <strong>{formatMoney(example.amountCents)}</strong>
            <span className="muted">Charged on the platform account through Stripe Checkout.</span>
          </li>
          <li>
            <span>2. Ramplight keeps an application fee ({feePercentLabel})</span>
            <strong>{formatMoney(example.applicationFeeCents)}</strong>
            <span className="muted">Stripe&apos;s processing fee comes out of this, not the scout&apos;s share.</span>
          </li>
          <li>
            <span>3. The scout&apos;s Express account nets</span>
            <strong>{formatMoney(example.transferCents)}</strong>
            <span className="muted">Stripe transfers the charge to the scout&apos;s connected account and collects the application fee back, then pays out to their bank.</span>
          </li>
        </ol>
      </section>

      {scout && (
        <section aria-labelledby="scout-earnings-heading" className="section">
          <h2 id="scout-earnings-heading">{scout.name}&apos;s earnings</h2>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <dl className="facts">
              <dt>Stripe account</dt>
              <dd>{scout.stripeAccountId ? `Connected (${scout.stripeAccountId})` : "Not connected yet"}</dd>
              <dt>Can accept bookings</dt>
              <dd>{scout.chargesEnabled ? "Yes" : "No, onboarding incomplete"}</dd>
            </dl>
            {scout.stripeAccountId && scout.stripeDashboard === "express" ? (
              <form action={openExpressDashboard} style={{ marginTop: "0.75rem" }}>
                <input type="hidden" name="scout" value={scout.slug} />
                <button type="submit" className="btn btn-secondary">
                  Open {firstName}&apos;s Stripe Express dashboard
                </button>
              </form>
            ) : scout.stripeAccountId ? (
              <p className="hint" style={{ marginTop: "0.75rem" }}>
                Demo scout: this test account was onboarded through the API, so it has no Express dashboard. Scouts who
                join through <a href="/become-a-scout">Become a scout</a> get Stripe Express onboarding and dashboard.
              </p>
            ) : null}
          </div>

          <dl className="split card" style={{ marginBottom: "1rem" }}>
            <div>
              <dt>Travelers paid</dt>
              <dd>{formatMoney(totals.gross)}</dd>
            </div>
            <div>
              <dt>Ramplight application fees</dt>
              <dd>{formatMoney(totals.fee)}</dd>
            </div>
            <div>
              <dt>Transferred to {firstName}</dt>
              <dd>{formatMoney(totals.net)}</dd>
            </div>
          </dl>

          {rows.length === 0 ? (
            <p>No bookings yet. Book one of {firstName}&apos;s packages to see the split appear here.</p>
          ) : (
            <div className="table-scroll" role="region" aria-labelledby="earnings-caption" tabIndex={0}>
              <table>
                <caption id="earnings-caption">Bookings for {scout.name}, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Package</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">Paid</th>
                    <th scope="col" className="num">Ramplight fee</th>
                    <th scope="col" className="num">To scout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{dateFmt.format(r.paidAt ?? r.createdAt)}</td>
                      <td>{r.pkgTitle}</td>
                      <td>
                        <span className={`status-badge status-${r.status}`}>{r.status}</span>
                      </td>
                      <td className="num">{formatMoney(r.amountCents, r.currency)}</td>
                      <td className="num">{formatMoney(r.applicationFeeCents, r.currency)}</td>
                      <td className="num">{formatMoney(r.transferCents, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

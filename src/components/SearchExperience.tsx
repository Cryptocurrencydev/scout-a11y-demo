"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Filters, ScoutCard } from "@/lib/queries";
import { SPECIALTIES, LANGUAGES, PRICE_OPTIONS, RATING_OPTIONS, specialtyLabel, languageLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { Rating } from "./Rating";

const ScoutMap = dynamic(() => import("./ScoutMap"), {
  ssr: false,
  loading: () => <div className="map-frame" aria-hidden="true" />,
});

type View = "list" | "map";

function toQuery(f: Filters) {
  const qs = new URLSearchParams();
  if (f.destination) qs.set("destination", f.destination);
  f.specialties.forEach((s) => qs.append("specialty", s));
  if (f.language) qs.set("language", f.language);
  if (f.maxPrice) qs.set("maxPrice", f.maxPrice);
  if (f.minRating) qs.set("minRating", f.minRating);
  return qs.toString();
}

function describe(f: Filters) {
  const parts: string[] = [];
  if (f.destination) parts.push(`in ${f.destination}`);
  if (f.specialties.length) parts.push(f.specialties.map(specialtyLabel).join(" and "));
  if (f.language) parts.push(`speaking ${languageLabel(f.language)}`);
  if (f.maxPrice) parts.push(`packages up to $${f.maxPrice}`);
  if (f.minRating) parts.push(`rated ${f.minRating}+`);
  return parts.join(", ");
}

const EMPTY: Filters = { destination: "", specialties: [], language: "", maxPrice: "", minRating: "" };

export function SearchExperience({
  filters: initial,
  destinations,
  results,
}: {
  filters: Filters;
  destinations: string[];
  results: ScoutCard[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initial);
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [mapMessage, setMapMessage] = useState("");
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  const initialQs = toQuery(initial);
  useEffect(() => {
    // Keep local state in step with the URL (back/forward, links to /scouts?...).
    if (!pending) setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQs, pending]);

  useEffect(() => {
    // Desktop: filters start expanded and the map is shown alongside the list.
    if (window.matchMedia("(min-width: 60rem)").matches) {
      setFiltersOpen(true);
      setView("map");
    }
  }, []);

  function apply(next: Filters) {
    setFilters(next);
    const qs = toQuery(next);
    startTransition(() => router.replace(qs ? `/scouts?${qs}` : "/scouts", { scroll: false }));
  }

  function toggleSpecialty(id: string, on: boolean) {
    apply({
      ...filters,
      specialties: on ? [...filters.specialties, id] : filters.specialties.filter((s) => s !== id),
    });
  }

  const activeCount =
    (filters.destination ? 1 : 0) +
    filters.specialties.length +
    (filters.language ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const summary = describe(initial);
  const countText = `${results.length} ${results.length === 1 ? "scout" : "scouts"} found${summary ? ` ${summary}` : ""}`;

  function selectFromMap(slug: string) {
    setSelected(slug);
    const link = document.getElementById(`scout-link-${slug}`);
    link?.closest("li")?.scrollIntoView({ block: "nearest" });
    link?.focus();
  }

  function showOnMap(s: ScoutCard) {
    setSelected(s.slug);
    setMapMessage(`${s.name} is highlighted on the map.`);
  }

  return (
    <div className="search-layout">
      <form
        className="card"
        role="search"
        aria-label="Scouts"
        action="/scouts"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          apply(filters);
          resultsHeading.current?.focus();
        }}
      >
        <details className="filters" open={filtersOpen} onToggle={(e) => setFiltersOpen(e.currentTarget.open)}>
          <summary>
            Filters{activeCount ? ` (${activeCount} active)` : ""}
          </summary>
          <div className="filters-body">
            <div className="field">
              <label htmlFor="destination">Destination</label>
              <select
                id="destination"
                name="destination"
                value={filters.destination}
                onChange={(e) => apply({ ...filters, destination: e.target.value })}
              >
                <option value="">Anywhere</option>
                {destinations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend>Accessibility specialties</legend>
              <p className="hint" id="specialty-hint">
                Scouts must cover every specialty you tick.
              </p>
              {SPECIALTIES.map((s) => (
                <label className="check" key={s.id}>
                  <input
                    type="checkbox"
                    name="specialty"
                    value={s.id}
                    checked={filters.specialties.includes(s.id)}
                    onChange={(e) => toggleSpecialty(s.id, e.target.checked)}
                    aria-describedby="specialty-hint"
                  />
                  {s.label}
                </label>
              ))}
            </fieldset>

            <div className="field">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                name="language"
                value={filters.language}
                onChange={(e) => apply({ ...filters, language: e.target.value })}
              >
                <option value="">Any language</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {languageLabel(l)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="maxPrice">Price</label>
              <select
                id="maxPrice"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={(e) => apply({ ...filters, maxPrice: e.target.value })}
              >
                {PRICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend>Rating</legend>
              {RATING_OPTIONS.map((o) => (
                <label className="check" key={o.value || "any"}>
                  <input
                    type="radio"
                    name="minRating"
                    value={o.value}
                    checked={filters.minRating === o.value}
                    onChange={() => apply({ ...filters, minRating: o.value })}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>

            <div className="filter-actions">
              <button type="submit" className="btn">
                Show results
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => apply(EMPTY)} disabled={activeCount === 0}>
                Clear filters
              </button>
            </div>
          </div>
        </details>
      </form>

      <section aria-labelledby="results-heading">
        <div className="results-head">
          <div>
            <h2 id="results-heading" ref={resultsHeading} tabIndex={-1}>
              Results
            </h2>
            <p className="result-count" role="status" aria-atomic="true">
              {countText}
            </p>
          </div>
          <div className="view-toggle" role="group" aria-label="Results view">
            <button type="button" className="btn btn-quiet" aria-pressed={view === "list"} onClick={() => setView("list")}>
              List only
            </button>
            <button type="button" className="btn btn-quiet" aria-pressed={view === "map"} onClick={() => setView("map")}>
              Map and list
            </button>
          </div>
        </div>

        <div className={`results-grid${view === "map" ? " with-map" : ""}`}>
          {view === "map" && (
            <div className="map-panel">
              <a className="skip-map" href="#scout-list">
                Skip map, go to the list of scouts
              </a>
              <ScoutMap scouts={results} selected={selected} onSelect={selectFromMap} />
              <p className="map-note">
                The map is supplementary: every pin is also in the list. Choosing a pin moves you to that scout in the
                list.
              </p>
              <p className="visually-hidden" role="status">
                {mapMessage}
              </p>
            </div>
          )}

          <div aria-busy={pending}>
            {results.length === 0 ? (
              <div className="card empty">
                <p>No scouts match all of these filters.</p>
                <button type="button" className="btn btn-secondary" onClick={() => apply(EMPTY)}>
                  Clear filters
                </button>
              </div>
            ) : (
              <ul className="scout-list" id="scout-list" tabIndex={-1} aria-label="Scouts">
                {results.map((s) => (
                  <li key={s.id} className="card scout-card" data-selected={selected === s.slug}>
                    <h3>
                      <Link href={`/scouts/${s.slug}`} id={`scout-link-${s.slug}`}>
                        {s.name}
                      </Link>
                    </h3>
                    <p className="muted" style={{ margin: 0 }}>
                      {s.city}, {s.country}
                      {s.pronouns ? ` · ${s.pronouns}` : ""}
                    </p>
                    <p style={{ margin: "0.4rem 0" }}>{s.headline}</p>
                    <ul className="tags" aria-label={`${s.name}'s specialties`}>
                      {s.specialties.map((sp) => (
                        <li key={sp}>{specialtyLabel(sp)}</li>
                      ))}
                    </ul>
                    <dl className="scout-meta">
                      <div>
                        <dt>Rating</dt>
                        <dd>
                          <Rating value={s.rating} count={s.reviewCount} />
                        </dd>
                      </div>
                      <div>
                        <dt>From</dt>
                        <dd>{formatMoney(s.fromCents)}</dd>
                      </div>
                      <div>
                        <dt>Languages</dt>
                        <dd>{s.languages.map(languageLabel).join(", ")}</dd>
                      </div>
                    </dl>
                    {view === "map" && (
                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn btn-quiet"
                          aria-pressed={selected === s.slug}
                          onClick={() => showOnMap(s)}
                          aria-label={`Show on map: ${s.name}`}
                        >
                          Show on map
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

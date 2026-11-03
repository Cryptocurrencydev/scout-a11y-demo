"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitReview, type ReviewState } from "@/app/actions/booking";
import { ErrorSummary, type FieldErrors } from "./ErrorSummary";

const LABELS = ["", "1 star, poor", "2 stars, fair", "3 stars, good", "4 stars, very good", "5 stars, excellent"];

function validate(f: FormData): FieldErrors {
  const e: FieldErrors = {};
  if (!f.get("rating")) e.rating = "Choose a rating from 1 to 5 stars";
  if (!String(f.get("authorName") ?? "").trim()) e.authorName = "Enter the name to show on your review";
  const body = String(f.get("body") ?? "").trim();
  if (body.length < 20) e.body = body ? "Your review must be at least 20 characters" : "Write your review";
  return e;
}

export function ReviewForm({ bookingId, scoutFirstName, scoutSlug }: { bookingId: string; scoutFirstName: string; scoutSlug: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { errors: {} });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const summary = useRef<HTMLDivElement>(null);
  const done = useRef<HTMLParagraphElement>(null);
  const errors = Object.keys(clientErrors).length ? clientErrors : state.errors;

  useEffect(() => {
    if (state.ok) done.current?.focus();
    else if (Object.keys(state.errors).length || state.formError) summary.current?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className="notice notice-success">
        <p ref={done} tabIndex={-1}>
          Thank you. Your review of {scoutFirstName} is published.
        </p>
        <p>
          <Link href={`/scouts/${scoutSlug}#reviews-heading`}>See it on {scoutFirstName}&apos;s profile</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      {state.formError ? (
        <div className="error-summary" ref={summary} tabIndex={-1}>
          <p style={{ margin: 0 }}>{state.formError}</p>
        </div>
      ) : (
        <ErrorSummary ref={summary} errors={errors} headingLevel={3} />
      )}
      <form
        action={action}
        noValidate
        onSubmit={(e) => {
          const errs = validate(new FormData(e.currentTarget));
          setClientErrors(errs);
          if (Object.keys(errs).length) {
            e.preventDefault();
            requestAnimationFrame(() => summary.current?.focus());
          }
        }}
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <fieldset aria-describedby={errors.rating ? "rating-error" : undefined}>
          <legend>Your rating</legend>
          {errors.rating && (
            <p className="field-error" id="rating-error">
              <span className="visually-hidden">Error:</span> {errors.rating}
            </p>
          )}
          {[5, 4, 3, 2, 1].map((n) => (
            <label className="check" key={n}>
              <input type="radio" name="rating" value={n} id={n === 5 ? "rating" : undefined} />
              {LABELS[n]}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="authorName">Name shown on your review</label>
          {errors.authorName && (
            <p className="field-error" id="authorName-error">
              <span className="visually-hidden">Error:</span> {errors.authorName}
            </p>
          )}
          <input
            id="authorName"
            name="authorName"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            aria-invalid={errors.authorName ? true : undefined}
            aria-describedby={errors.authorName ? "authorName-error" : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="body">Your review</label>
          <p className="hint" id="body-hint">
            What did {scoutFirstName} get right about access? At least 20 characters.
          </p>
          {errors.body && (
            <p className="field-error" id="body-error">
              <span className="visually-hidden">Error:</span> {errors.body}
            </p>
          )}
          <textarea
            id="body"
            name="body"
            maxLength={2000}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={`body-hint${errors.body ? " body-error" : ""}`}
          />
        </div>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Publishing…" : "Publish review"}
        </button>
      </form>
    </>
  );
}

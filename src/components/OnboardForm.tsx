"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { startOnboarding, type OnboardState } from "@/app/actions/scout";
import { ErrorSummary, type FieldErrors } from "./ErrorSummary";

function validate(f: FormData): FieldErrors {
  const e: FieldErrors = {};
  if (String(f.get("name") ?? "").trim().length < 2) e.name = "Enter your full name";
  if (String(f.get("city") ?? "").trim().length < 2) e.city = "Enter the city you know best";
  return e;
}

export function OnboardForm() {
  const [state, action, pending] = useActionState<OnboardState, FormData>(startOnboarding, { errors: {} });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const summary = useRef<HTMLDivElement>(null);
  const errors = Object.keys(clientErrors).length ? clientErrors : state.errors;
  useEffect(() => {
    if (Object.keys(state.errors).length || state.formError) summary.current?.focus();
  }, [state]);

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
        <div className="field">
          <label htmlFor="name">Full name</label>
          {errors.name && (
            <p className="field-error" id="name-error">
              <span className="visually-hidden">Error:</span> {errors.name}
            </p>
          )}
          <input id="name" name="name" type="text" autoComplete="name" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : undefined} />
        </div>
        <div className="field">
          <label htmlFor="city">City you scout</label>
          {errors.city && (
            <p className="field-error" id="city-error">
              <span className="visually-hidden">Error:</span> {errors.city}
            </p>
          )}
          <input id="city" name="city" type="text" autoComplete="address-level2" aria-invalid={errors.city ? true : undefined} aria-describedby={errors.city ? "city-error" : undefined} />
        </div>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Opening Stripe…" : "Continue to Stripe onboarding"}
        </button>
      </form>
    </>
  );
}

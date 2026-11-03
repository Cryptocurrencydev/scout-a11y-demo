"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/booking";
import { ErrorSummary, type FieldErrors } from "./ErrorSummary";
import { composeDate } from "@/lib/dates";

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const day = String(form.get("tripDay") ?? "");
  const month = String(form.get("tripMonth") ?? "");
  const year = String(form.get("tripYear") ?? "");
  const notes = String(form.get("accessNotes") ?? "").trim();
  if (!day && !month && !year) errors.tripDate = "Enter the date of your trip";
  else {
    const iso = composeDate(day, month, year);
    if (!iso) errors.tripDate = "Trip date must be a real date, like 15 6 2027";
    else if (iso < today()) errors.tripDate = "Trip date must be today or in the future";
  }
  if (!notes) errors.accessNotes = "Tell the scout about your access needs";
  else if (notes.length < 10) errors.accessNotes = "Access needs must be at least 10 characters";
  return errors;
}

export function BookingDialog({
  packageId,
  packageTitle,
  priceLabel,
  scoutFirstName,
}: {
  packageId: string;
  packageTitle: string;
  priceLabel: string;
  scoutFirstName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { errors: {} });
  const errors = Object.keys(clientErrors).length ? clientErrors : state.errors;
  const ids = `pkg-${packageId.slice(0, 8)}`;

  useEffect(() => {
    if (Object.keys(state.errors).length || state.formError) summary.current?.focus();
  }, [state]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => trigger.current?.focus();
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  function open() {
    setClientErrors({});
    dialog.current?.showModal();
  }

  return (
    <>
      <button ref={trigger} type="button" className="btn" onClick={open} aria-haspopup="dialog">
        Book<span className="visually-hidden">
          {" "}
          {packageTitle}
        </span>{" "}
        for {priceLabel}
      </button>
      <dialog ref={dialog} aria-labelledby={`${ids}-title`} aria-describedby={`${ids}-desc`}>
        <div className="dialog-body">
          <div className="dialog-head">
            <h2 id={`${ids}-title`}>Book: {packageTitle}</h2>
            <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>
              Close<span className="visually-hidden"> booking dialog</span>
            </button>
          </div>
          <p id={`${ids}-desc`}>
            {priceLabel} with {scoutFirstName}. You&apos;ll pay on Stripe&apos;s secure test checkout next, and{" "}
            {scoutFirstName} gets started once payment is confirmed.
          </p>

          {state.formError && (
            <div className="error-summary" ref={summary} tabIndex={-1} role="alert">
              <p style={{ margin: 0 }}>{state.formError}</p>
            </div>
          )}
          {!state.formError && <ErrorSummary ref={summary} errors={errors} headingLevel={3} idPrefix={`${ids}-`} />}

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
            <input type="hidden" name="packageId" value={packageId} />
            <fieldset
              className="date-input"
              aria-describedby={`${ids}-tripDate-hint${errors.tripDate ? ` ${ids}-tripDate-error` : ""}`}
            >
              <legend>Trip date</legend>
              <p className="hint" id={`${ids}-tripDate-hint`}>
                The first day you need {scoutFirstName}&apos;s advice for. For example, 15 6 2027.
              </p>
              {errors.tripDate && (
                <p className="field-error" id={`${ids}-tripDate-error`}>
                  <span className="visually-hidden">Error:</span> {errors.tripDate}
                </p>
              )}
              <div className="date-parts">
                {(
                  [
                    ["tripDay", "Day", 2],
                    ["tripMonth", "Month", 2],
                    ["tripYear", "Year", 4],
                  ] as const
                ).map(([name, label, len]) => {
                  const id = name === "tripDay" ? `${ids}-tripDate` : `${ids}-${name}`;
                  return (
                    <div className="field" key={name}>
                      <label htmlFor={id}>{label}</label>
                      <input
                        id={id}
                        name={name}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={len}
                        className={`w-${len}`}
                        aria-invalid={errors.tripDate ? true : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor={`${ids}-accessNotes`}>Your access needs</label>
              <p className="hint" id={`${ids}-accessNotes-hint`}>
                For example: power wheelchair, 70 cm wide, can manage one small step.
              </p>
              {errors.accessNotes && (
                <p className="field-error" id={`${ids}-accessNotes-error`}>
                  <span className="visually-hidden">Error:</span> {errors.accessNotes}
                </p>
              )}
              <textarea
                id={`${ids}-accessNotes`}
                name="accessNotes"
                required
                aria-invalid={errors.accessNotes ? true : undefined}
                aria-describedby={`${ids}-accessNotes-hint${errors.accessNotes ? ` ${ids}-accessNotes-error` : ""}`}
              />
            </div>
            <div className="dialog-actions">
              <button type="submit" className="btn" disabled={pending}>
                {pending ? "Opening checkout…" : `Continue to payment (${priceLabel})`}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

"use client";
import { forwardRef } from "react";

export type FieldErrors = Record<string, string>;

/**
 * GOV.UK-style error summary: rendered above the form after a failed submit and
 * focused so screen readers announce it. Each link moves focus to its field.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { errors: FieldErrors; headingLevel?: 2 | 3; idPrefix?: string }>(
  function ErrorSummary({ errors, headingLevel = 2, idPrefix = "" }, ref) {
    const entries = Object.entries(errors);
    if (!entries.length) return null;
    const H = headingLevel === 2 ? "h2" : "h3";
    return (
      <div className="error-summary" ref={ref} tabIndex={-1} aria-labelledby={`${idPrefix}error-summary-title`}>
        <H id={`${idPrefix}error-summary-title`}>
          There {entries.length === 1 ? "is a problem" : `are ${entries.length} problems`} with your form
        </H>
        <ul>
          {entries.map(([field, msg]) => (
            <li key={field}>
              <a
                href={`#${idPrefix}${field}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`${idPrefix}${field}`)?.focus();
                }}
              >
                {msg}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

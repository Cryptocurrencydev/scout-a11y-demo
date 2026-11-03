"use client";
import { useEffect, useRef } from "react";

/** Moves focus to a confirmation message after a form submits and the page re-renders. */
export function FocusOnMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status">
      {children}
    </div>
  );
}

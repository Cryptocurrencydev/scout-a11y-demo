"use client";
import { useState } from "react";

export function ContrastToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  function toggle() {
    const next = !on;
    setOn(next);
    // "standard" also overrides an OS-level prefers-contrast: more.
    document.documentElement.dataset.contrast = next ? "high" : "standard";
    document.cookie = `contrast=${next ? "high" : "standard"}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <button type="button" className="btn btn-quiet contrast-toggle" aria-pressed={on} onClick={toggle}>
      High contrast
    </button>
  );
}

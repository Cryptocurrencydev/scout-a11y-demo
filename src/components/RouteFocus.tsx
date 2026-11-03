"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * On client-side route changes, move focus to the new page's h1 so keyboard and
 * screen-reader users start at the top of the new content (Next.js's built-in
 * route announcer also reads the new title). Query-string-only updates, such as
 * filter changes, keep focus where it is.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h1 = document.querySelector<HTMLElement>("main h1");
    const target = h1 ?? document.getElementById("main");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }, [pathname]);
  return null;
}

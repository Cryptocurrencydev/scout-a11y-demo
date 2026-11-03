"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContrastToggle } from "./ContrastToggle";

const NAV = [
  { href: "/scouts", label: "Find scouts" },
  { href: "/bookings", label: "My bookings" },
  { href: "/earnings", label: "Scout earnings" },
  { href: "/become-a-scout", label: "Become a scout" },
];

export function SiteHeader({ initialHighContrast }: { initialHighContrast: boolean }) {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M6 24 L26 12 L26 24 Z" fill="var(--bg)" />
            <circle cx="22" cy="8" r="3" fill="var(--focus-halo)" />
          </svg>
          <span>
            Ramplight <small>accessible travel scouts</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <ul>
            {NAV.map((n) => {
              const current = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <li key={n.href}>
                  <Link href={n.href} aria-current={current ? "page" : undefined}>
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ContrastToggle initial={initialHighContrast} />
      </div>
    </header>
  );
}

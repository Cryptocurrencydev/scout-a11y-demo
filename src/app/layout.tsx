import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteFocus } from "@/components/RouteFocus";
import { ServiceWorker } from "@/components/ServiceWorker";

const font = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "700", "800"],
  adjustFontFallback: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Ramplight: accessible travel scouts", template: "%s · Ramplight" },
  description:
    "Book local scouts with lived experience of disability for accessible travel advice, itineraries and access checks.",
  applicationName: "Ramplight",
  appleWebApp: { capable: true, title: "Ramplight", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b5a52",
  width: "device-width",
  initialScale: 1,
  // Never block pinch zoom (WCAG 1.4.4).
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contrast = (await cookies()).get("contrast")?.value === "high" ? "high" : undefined;
  return (
    <html lang="en" data-contrast={contrast} className={font.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteHeader initialHighContrast={contrast === "high"} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Demo by{" "}
              <a href="https://dctechltd.com" target="_blank" rel="noopener">
                DC Tech<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              . Ramplight is a fictional brand; payments run in Stripe test mode.
            </p>
            <p>
              <a href="/accessibility">Accessibility statement</a>
            </p>
          </div>
        </footer>
        <RouteFocus />
        <ServiceWorker />
      </body>
    </html>
  );
}

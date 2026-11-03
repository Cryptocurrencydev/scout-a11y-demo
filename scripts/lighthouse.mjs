// Lighthouse (mobile, 390x844, default simulated throttling) for key pages.
// Usage: node scripts/lighthouse.mjs https://scout-a11y-demo.vercel.app
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "https://scout-a11y-demo.vercel.app";
const pages = ["/", "/scouts", "/scouts/ines-carvalho", "/scouts/ines-carvalho/messages", "/earnings"];
fs.mkdirSync("lighthouse", { recursive: true });
const rows = [];
for (const p of pages) {
  const out = `lighthouse/${p === "/" ? "home" : p.slice(1).replaceAll("/", "_")}.json`;
  execFileSync("npx", ["lighthouse", base + p, "--quiet", "--output=json", `--output-path=${out}`,
    "--only-categories=accessibility,performance,best-practices", "--form-factor=mobile",
    "--screenEmulation.mobile", "--screenEmulation.width=390", "--screenEmulation.height=844", "--screenEmulation.deviceScaleFactor=3",
    "--chrome-flags=--headless=new --no-sandbox"], { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: "inherit" });
  const r = JSON.parse(fs.readFileSync(out, "utf8"));
  const s = (k) => Math.round(r.categories[k].score * 100);
  rows.push({ page: p, accessibility: s("accessibility"), performance: s("performance"), bestPractices: s("best-practices"),
    lcp: r.audits["largest-contentful-paint"].displayValue, cls: r.audits["cumulative-layout-shift"].displayValue, tbt: r.audits["total-blocking-time"].displayValue });
}
console.table(rows);
fs.writeFileSync("lighthouse/summary.json", JSON.stringify(rows, null, 2));

import { test as base, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

type AxeRecord = { project: string; state: string; url: string; violations: number; passes: number; incomplete: number };
const AXE_LOG = "test-results/axe-log.jsonl";

export const test = base.extend<{ consoleErrors: string[]; axe: (state: string) => Promise<void> }>({
  consoleErrors: async ({ page, baseURL }, use, testInfo) => {
    const errors: string[] = [];
    const origin = new URL(baseURL!).origin;
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      // Only our own pages count; Stripe's hosted Checkout logs are outside our control.
      if (!page.url().startsWith(origin)) return;
      errors.push(`${msg.text()} @ ${page.url()}`);
    });
    page.on("pageerror", (err) => {
      if (page.url().startsWith(origin)) errors.push(`pageerror: ${err.message} @ ${page.url()}`);
    });
    await use(errors);
    if (!testInfo.annotations.some((a) => a.type === "allow-console")) {
      expect(errors, "console errors on our pages").toEqual([]);
    }
  },
  axe: async ({ page }, use, testInfo) => {
    await use(async (state: string) => {
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      const rec: AxeRecord = {
        project: testInfo.project.name,
        state,
        url: page.url(),
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
      };
      fs.mkdirSync("test-results", { recursive: true });
      fs.appendFileSync(AXE_LOG, JSON.stringify(rec) + "\n");
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ") + " :: " + n.failureSummary?.split("\n")[1]),
      }));
      expect(summary, `axe violations in state "${state}"`).toEqual([]);
    });
  },
});

export { expect };

/** Press Tab (or Shift+Tab) until `target` has focus. Fails if it never does: proves keyboard reachability. */
export async function tabTo(page: Page, target: Locator, { max = 80, back = false } = {}) {
  const handle = await target.elementHandle({ timeout: 15_000 });
  if (!handle) throw new Error("tabTo target not found");
  for (let i = 0; i < max; i++) {
    const focused = await handle.evaluate((el) => el === document.activeElement || el.contains(document.activeElement));
    if (focused) return i;
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
  }
  throw new Error(`Could not reach ${target} with ${back ? "Shift+Tab" : "Tab"} in ${max} presses`);
}

export async function focusedText(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? (el.getAttribute("aria-label") ?? el.innerText ?? el.tagName).trim() : "";
  });
}

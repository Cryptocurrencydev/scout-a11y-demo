import { test, expect } from "./fixtures";

const PATHS = ["/", "/scouts", "/scouts/ines-carvalho", "/scouts/ines-carvalho/messages", "/earnings", "/become-a-scout", "/bookings", "/accessibility"];

async function horizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("reflow and resize", () => {
  test("no horizontal scrolling at 320px (WCAG 1.4.10)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const p of PATHS) {
      await page.goto(p);
      expect(await horizontalOverflow(page), `overflow on ${p}`).toBeLessThanOrEqual(0);
    }
  });

  test("text resized to 200% keeps content and controls usable (WCAG 1.4.4)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "desktop zoom check");
    await page.setViewportSize({ width: 1280, height: 860 });
    for (const p of PATHS) {
      await page.goto(p);
      await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      expect(await horizontalOverflow(page), `overflow on ${p}`).toBeLessThanOrEqual(0);
      // Nothing clipped: no element with text overflowing a fixed box.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main *, header *")]
          .filter((el) => {
            const cs = getComputedStyle(el);
            return (cs.overflow === "hidden" || cs.overflowY === "hidden") && el.scrollHeight > el.clientHeight + 2 && el.innerText.trim() && !el.classList.contains("visually-hidden") && !el.closest(".visually-hidden, .map-frame");
          })
          .map((el) => el.className || el.tagName),
      );
      expect(clipped, `clipped text on ${p}`).toEqual([]);
    }
  });

  test("interactive targets are at least 44x44 px", async ({ page }) => {
    for (const p of PATHS) {
      await page.goto(p);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("button, select, input:not([type=hidden]), textarea, summary, nav a, .btn, .site-footer a, label.check")]
          .filter((el) => el.offsetParent !== null && !el.closest(".maplibregl-ctrl-attrib"))
          .filter((el) => {
            if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return false; // whole label is the target
            const r = el.getBoundingClientRect();
            return r.height < 44 || r.width < 44;
          })
          .map((el) => `${el.tagName}.${el.className} "${(el.innerText || el.getAttribute("aria-label") || "").slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
      );
      expect(small, `small targets on ${p}`).toEqual([]);
    }
  });
});

test.describe("landmarks and headings", () => {
  for (const p of PATHS) {
    test(`structure ${p}`, async ({ page }) => {
      await page.goto(p);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("header.site-header")).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
      const levels = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => !h.closest("dialog")).map((h) => Number(h.tagName[1])));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading jump on ${p}: ${levels}`).toBeLessThanOrEqual(1);
      await expect(page.locator(".site-footer").getByRole("link", { name: /DC Tech/ })).toHaveAttribute("href", "https://dctechltd.com");
    });
  }
});

test("PWA: manifest, service worker and offline fallback", async ({ page, context, baseURL }) => {
  const res = await page.request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto(new URL("/scouts/somewhere-offline", baseURL).toString()).catch(() => {});
  await expect(page.locator("h1")).toHaveText("You're offline");
  await context.setOffline(false);
});

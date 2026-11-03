import { test, expect, tabTo } from "./fixtures";

test.describe("keyboard support", () => {
  test("skip link is the first tab stop and moves to main", async ({ page }) => {
    await page.goto("/scouts");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("focus is always visible", async ({ page }) => {
    await page.goto("/scouts/ines-carvalho");
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const ok = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el || el === document.body) return true;
        const cs = getComputedStyle(el);
        return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
      });
      expect(ok, `tab stop ${i} has a visible focus outline`).toBe(true);
    }
  });

  test("no keyboard trap: Tab walks the whole page and wraps", async ({ page }) => {
    for (const path of ["/scouts?destination=Lisbon", "/scouts/ines-carvalho", "/scouts/ines-carvalho/messages"]) {
      await page.goto(path);
      if (path.startsWith("/scouts?")) await page.getByRole("button", { name: "Map and list" }).click();
      await page.locator("body").focus();
      const seen: string[] = [];
      let left = false;
      for (let i = 0; i < 250; i++) {
        await page.keyboard.press("Tab");
        const id = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return "BODY";
          return `${el.tagName}:${el.id}:${(el.textContent ?? "").slice(0, 20)}:${Array.from(el.parentNode?.children ?? []).indexOf(el)}`;
        });
        if (id === "BODY" || (seen.length > 3 && id === seen[0])) {
          left = true;
          break;
        }
        seen.push(id);
      }
      expect(left, `Tab reached the end of ${path} (${seen.length} stops)`).toBe(true);
    }
  });

  test("filters, live count and view toggle work from the keyboard", async ({ page }) => {
    await page.goto("/scouts?destination=Lisbon");
    const summary = page.locator("summary");
    const open = await page.locator("details.filters").evaluate((d: HTMLDetailsElement) => d.open);
    if (!open) {
      await tabTo(page, summary);
      await page.keyboard.press("Enter");
    }
    const status = page.locator(".result-count");
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toContainText("3 scouts found in Lisbon");
    await tabTo(page, page.getByLabel("Wheelchair access"));
    await page.keyboard.press("Space");
    await expect(status).toHaveText("1 scout found in Lisbon, Wheelchair access");
    await expect(page.getByLabel("Wheelchair access")).toBeFocused(); // focus stays put while results update
    const mapBtn = page.getByRole("button", { name: "Map and list" });
    await tabTo(page, mapBtn);
    await page.keyboard.press("Enter");
    await expect(mapBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("map pin hands focus to the matching list item; list button selects the pin", async ({ page }) => {
    await page.goto("/scouts?destination=Lisbon");
    await page.getByRole("button", { name: "Map and list" }).click();
    const pin = page.getByRole("button", { name: /Inês Carvalho, Lisbon. Go to Inês Carvalho in the list/ });
    await expect(pin).toBeVisible();
    await tabTo(page, pin, { max: 120 });
    await page.keyboard.press("Enter");
    await expect(page.locator("#scout-link-ines-carvalho")).toBeFocused();
    const showBtn = page.getByRole("button", { name: /Show on map: Rafael/ });
    await tabTo(page, showBtn);
    await page.keyboard.press("Enter");
    await expect(showBtn).toBeFocused();
    await expect(page.getByRole("button", { name: /Rafael Souza, Lisbon/ })).toHaveAttribute("aria-current", "true");
    // Skip link jumps over the map.
    await tabTo(page, page.getByRole("link", { name: /Skip map/ }), { back: true, max: 120 });
    await page.keyboard.press("Enter");
    await expect(page.locator("#scout-list")).toBeFocused();
  });

  test("booking dialog: focus moves in, Escape closes, focus returns to the trigger", async ({ page }) => {
    await page.goto("/scouts/ines-carvalho");
    const trigger = page.getByRole("button", { name: /Book 30-minute planning call/ });
    await tabTo(page, trigger);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: /Book: 30-minute planning call/ });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    // Tab cycles inside the modal dialog while it is open (a modal is not a trap: Escape and Close leave it).
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body);
      expect(inside).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    // Close button also returns focus.
    await page.keyboard.press("Enter");
    await tabTo(page, dialog.getByRole("button", { name: "Cancel" }));
    await page.keyboard.press("Enter");
    await expect(trigger).toBeFocused();
  });

  test("booking form errors are summarised, focused and tied to inputs", async ({ page }) => {
    await page.goto("/scouts/ines-carvalho");
    await tabTo(page, page.getByRole("button", { name: /Book 3-day accessible itinerary/ }));
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await tabTo(page, dialog.getByRole("button", { name: /Continue to payment/ }));
    await page.keyboard.press("Enter");
    const summary = dialog.locator(".error-summary");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("There are 2 problems");
    const day = dialog.getByLabel("Day");
    await expect(day).toHaveAttribute("aria-invalid", "true");
    const group = dialog.getByRole("group", { name: "Trip date" });
    const describedBy = (await group.getAttribute("aria-describedby"))!.split(" ");
    const errorId = describedBy.find((d) => d.endsWith("-error"))!;
    await expect(dialog.locator(`[id="${errorId}"]`)).toContainText("Enter the date of your trip");
    // Error link moves focus to the field.
    await tabTo(page, summary.getByRole("link", { name: "Enter the date of your trip" }));
    await page.keyboard.press("Enter");
    await expect(day).toBeFocused();
    // An impossible date gets a specific message.
    await page.keyboard.type("31");
    await tabTo(page, dialog.getByLabel("Month"));
    await page.keyboard.type("2");
    await tabTo(page, dialog.getByLabel("Year"));
    await page.keyboard.type("2027");
    await tabTo(page, dialog.getByRole("button", { name: /Continue to payment/ }));
    await page.keyboard.press("Enter");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Trip date must be a real date");
  });

  test("route change moves focus to the new page heading", async ({ page }) => {
    await page.goto("/scouts?destination=Lisbon");
    await tabTo(page, page.locator("#scout-link-ines-carvalho"), { max: 120 });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/scouts\/ines-carvalho$/);
    await expect(page.locator("h1")).toBeFocused();
  });

  test("chat: labelled input, keyboard send, live announcements", async ({ page }) => {
    await page.goto("/scouts/maya-chen/messages");
    const box = page.getByLabel("Your message to Maya");
    await tabTo(page, box);
    await page.keyboard.press("Control+Enter");
    await expect(page.locator("#message-error")).toHaveText(/Write a message before sending/);
    await expect(box).toHaveAttribute("aria-describedby", /message-error/);
    await page.keyboard.type("Are there ASL-interpreted events next week?");
    await page.keyboard.press("Control+Enter");
    const live = page.locator('[role="status"][aria-live="polite"]');
    await expect(live).toHaveText("Message sent.");
    await expect(box).toBeFocused();
    await expect(live).toContainText("New message from Maya:", { timeout: 15_000 });
    await expect(box).toBeFocused();
  });
});

import { describe, it, expect } from "vitest";
import { splitPayment, PLATFORM_FEE_BPS } from "@/lib/money";

describe("splitPayment", () => {
  it("takes a 15% application fee", () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
    expect(splitPayment(3500)).toEqual({ amountCents: 3500, applicationFeeCents: 525, transferCents: 2975 });
    expect(splitPayment(500)).toEqual({ amountCents: 500, applicationFeeCents: 75, transferCents: 425 });
    expect(splitPayment(6000)).toEqual({ amountCents: 6000, applicationFeeCents: 900, transferCents: 5100 });
  });
  it("rounds half up and always sums to the amount", () => {
    expect(splitPayment(510).applicationFeeCents).toBe(77); // 76.5 -> 77
    expect(splitPayment(530).applicationFeeCents).toBe(80); // 79.5 -> 80
    for (let c = 500; c <= 6000; c++) {
      const s = splitPayment(c);
      expect(s.applicationFeeCents + s.transferCents).toBe(c);
      expect(Math.abs(s.applicationFeeCents - c * 0.15)).toBeLessThanOrEqual(0.5);
    }
  });
  it("rejects prices outside $5-$60 and fractional cents", () => {
    expect(() => splitPayment(499)).toThrow();
    expect(() => splitPayment(6001)).toThrow();
    expect(() => splitPayment(1000.5)).toThrow();
  });
});

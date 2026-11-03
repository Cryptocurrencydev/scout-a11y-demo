import { describe, it, expect } from "vitest";
import { composeDate } from "@/lib/dates";

describe("composeDate", () => {
  it("builds ISO dates from day/month/year fields", () => {
    expect(composeDate("15", "6", "2027")).toBe("2027-06-15");
    expect(composeDate("01", "01", "2028")).toBe("2028-01-01");
    expect(composeDate(" 9 ", "12", "2027")).toBe("2027-12-09");
  });
  it("rejects impossible or malformed dates", () => {
    expect(composeDate("31", "2", "2027")).toBeNull();
    expect(composeDate("29", "2", "2027")).toBeNull();
    expect(composeDate("29", "2", "2028")).toBe("2028-02-29");
    expect(composeDate("", "6", "2027")).toBeNull();
    expect(composeDate("15", "13", "2027")).toBeNull();
    expect(composeDate("15", "6", "27")).toBeNull();
    expect(composeDate("aa", "6", "2027")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { firstNameOf, formatHomeDate, greetingFor } from "@/features/dashboard/home-format";

describe("home greeting and date formatting", () => {
  it.each([
    ["2026-10-14T07:59:00.000Z", "evening"],
    ["2026-10-14T08:00:00.000Z", "morning"],
    ["2026-10-14T14:59:00.000Z", "morning"],
    ["2026-10-14T15:00:00.000Z", "afternoon"],
    ["2026-10-14T22:59:00.000Z", "afternoon"],
    ["2026-10-14T23:00:00.000Z", "evening"],
    ["2026-10-14T00:00:00.000Z", "evening"],
    ["2026-10-14T03:00:00.000Z", "evening"],
  ])("returns the Argentina greeting at %s", (iso, expected) => {
    expect(greetingFor(new Date(iso))).toBe(expected);
  });

  it("formats the Argentina calendar date and changes day at midnight", () => {
    expect(formatHomeDate(new Date("2026-10-14T15:00:00.000Z"))).toBe("Miércoles, 14 de octubre");
    expect(formatHomeDate(new Date("2026-10-15T02:59:00.000Z"))).toBe("Miércoles, 14 de octubre");
    expect(formatHomeDate(new Date("2026-10-15T03:00:00.000Z"))).toBe("Jueves, 15 de octubre");
    expect(formatHomeDate(new Date("2026-10-14T15:00:00.000Z"), "en")).toBe(
      "Wednesday, October 14",
    );
    expect(formatHomeDate(new Date("2026-10-15T03:00:00.000Z"), "en")).toBe("Thursday, October 15");
  });

  it("gets the first name and handles a missing name", () => {
    expect(firstNameOf()).toBe("");
    expect(firstNameOf(" Matías ")).toBe("Matías");
    expect(firstNameOf("Matías Oliva Díaz")).toBe("Matías");
  });
});

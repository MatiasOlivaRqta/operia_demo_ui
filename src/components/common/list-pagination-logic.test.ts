import { describe, expect, it } from "vitest";
import { getPageRange, totalPages } from "./list-pagination-logic";

describe("pagination helpers", () => {
  it("calculates page ranges and clamps an out-of-range page", () => {
    expect(getPageRange(2, 25, 60)).toEqual({ from: 26, to: 50 });
    expect(getPageRange(8, 25, 60)).toEqual({ from: 51, to: 60 });
  });

  it("represents empty collections and invalid sizes safely", () => {
    expect(getPageRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
    expect(totalPages(10, 0)).toBe(1);
    expect(totalPages(51, 25)).toBe(3);
  });
});

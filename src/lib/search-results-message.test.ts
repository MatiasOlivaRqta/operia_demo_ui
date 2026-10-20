import { describe, expect, it } from "vitest";
import { getSearchResultsMessage } from "@/lib/search-results-message";

describe("getSearchResultsMessage", () => {
  it("indica cuántos resultados se muestran cuando hay más coincidencias", () => {
    expect(getSearchResultsMessage(10, 37)).toEqual({ shown: 10, total: 37 });
  });

  it.each([
    [4, 4],
    [5, 3],
    [0, 0],
  ])("no muestra un aviso si se muestran %i de %i resultados", (shown, total) => {
    expect(getSearchResultsMessage(shown, total)).toBeNull();
  });
});

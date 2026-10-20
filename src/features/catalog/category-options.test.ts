import { describe, expect, it } from "vitest";
import {
  CREATE_OPTION_ID,
  buildCategoryOptions,
  isCreateOption,
  normalizeCategoryText,
} from "@/features/catalog/category-options";
import type { ElemSubType } from "@/features/catalog/types";

const category = (id: string, description: string): ElemSubType => ({
  description,
  elemTypeId: "PROD_CAT",
  id,
});

describe("normalizeCategoryText", () => {
  it("ignores case, accents and extra spaces", () => {
    expect(normalizeCategoryText("  FerretERÍA   general ")).toBe("ferreteria general");
  });
});

describe("buildCategoryOptions", () => {
  const items = [category("c1", "Ferretería"), category("c2", "Electricidad")];

  it("offers creating the typed text when no category is equivalent", () => {
    const options = buildCategoryOptions(items, " Pinturas ", true);
    expect(options).toHaveLength(3);
    expect(options[2]).toMatchObject({ description: "Pinturas", id: CREATE_OPTION_ID });
    expect(isCreateOption(options[2]!)).toBe(true);
  });

  it("does not offer creating an equivalent of an existing category", () => {
    expect(buildCategoryOptions(items, "ferreteria", true)).toEqual(items);
  });

  it("does not offer creating without text, over the length limit or while the search is not usable", () => {
    expect(buildCategoryOptions(items, "   ", true)).toEqual(items);
    expect(buildCategoryOptions(items, "x".repeat(101), true)).toEqual(items);
    expect(buildCategoryOptions(items, "Pinturas", false)).toEqual(items);
  });

  it("shows at most ten categories", () => {
    const many = Array.from({ length: 12 }, (_, index) => category(`c${index}`, `Cat ${index}`));
    expect(buildCategoryOptions(many, "", true)).toHaveLength(10);
  });
});

import { PRODUCT_CATEGORY_TYPE_ID, type ElemSubType } from "@/features/catalog/types";

export const CREATE_OPTION_ID = "__create__";
export const MAX_CATEGORY_LENGTH = 100;
export const MAX_VISIBLE_CATEGORIES = 10;

export type CategoryOption = ElemSubType;

export function cleanCategoryText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCategoryText(value: string): string {
  return cleanCategoryText(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");
}

export function isCreateOption(option: CategoryOption): boolean {
  return option.id === CREATE_OPTION_ID;
}

/** Visible results plus a create option when the typed text does not match an existing category. */
export function buildCategoryOptions(
  items: readonly ElemSubType[],
  term: string,
  canCreate: boolean,
): CategoryOption[] {
  const shown = items.slice(0, MAX_VISIBLE_CATEGORIES);
  const text = cleanCategoryText(term);
  if (!canCreate || !text || text.length > MAX_CATEGORY_LENGTH) return shown;
  const key = normalizeCategoryText(text);
  if (items.some((item) => normalizeCategoryText(item.description) === key)) return shown;
  return [
    ...shown,
    { description: text, elemTypeId: PRODUCT_CATEGORY_TYPE_ID, id: CREATE_OPTION_ID },
  ];
}

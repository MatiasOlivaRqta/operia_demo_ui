import type { DocumentItem } from "@/features/documents/types";
import { asCents, percentOf, type Cents } from "@/lib/money";

export function calculateItemSubtotal(item: DocumentItem): Cents {
  return asCents(item.quantity * item.unitPriceCents);
}

export function calculateItemDiscount(item: DocumentItem): Cents {
  return percentOf(calculateItemSubtotal(item), item.discountRate);
}

export function calculateItemTax(item: DocumentItem): Cents {
  return percentOf(
    asCents(calculateItemSubtotal(item) - calculateItemDiscount(item)),
    item.taxRate,
  );
}

export function calculateDocumentSubtotal(items: readonly DocumentItem[]): Cents {
  return asCents(items.reduce((total, item) => total + calculateItemSubtotal(item), 0));
}

export function calculateDocumentDiscount(items: readonly DocumentItem[]): Cents {
  return asCents(items.reduce((total, item) => total + calculateItemDiscount(item), 0));
}

export function calculateDocumentTax(items: readonly DocumentItem[]): Cents {
  return asCents(items.reduce((total, item) => total + calculateItemTax(item), 0));
}

export function calculateDocumentTotal(items: readonly DocumentItem[]): Cents {
  return asCents(
    items.reduce(
      (total, item) =>
        total + calculateItemSubtotal(item) - calculateItemDiscount(item) + calculateItemTax(item),
      0,
    ),
  );
}

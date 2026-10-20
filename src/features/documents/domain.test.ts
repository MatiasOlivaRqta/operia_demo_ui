import { describe, expect, it } from "vitest";
import {
  calculateDocumentTotal,
  calculateItemDiscount,
  calculateItemTax,
} from "@/features/documents/domain";
import type { DocumentItem } from "@/features/documents/types";
import { toCents } from "@/lib/money";

const line: DocumentItem = {
  discountRate: 10,
  productId: "p1",
  productName: "Producto",
  quantity: 3,
  sku: "SKU-1",
  taxRate: 21,
  unitPriceCents: toCents(0.05),
};

describe("document calculations", () => {
  it("rounds discount and tax per line in centavos", () => {
    expect(calculateItemDiscount(line)).toBe(2);
    expect(calculateItemTax(line)).toBe(3);
  });

  it("sums rounded line amounts and supports a full discount", () => {
    expect(calculateDocumentTotal([line])).toBe(16);
    expect(calculateDocumentTotal([{ ...line, discountRate: 100 }])).toBe(0);
  });
});

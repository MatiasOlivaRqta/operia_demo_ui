import { afterEach, describe, expect, it, vi } from "vitest";
import { movementQueryString, productQueryString, productsApi } from "@/data/http/products-api";
import type { ProductFormValues } from "@/features/products/schemas";

const productInput: ProductFormValues = {
  barcode: "779123",
  categoryId: "cat-herramientas",
  costPesos: 123.45,
  minimumStock: 2,
  name: "Taladro",
  pricePesos: 250.5,
  sku: "TAL-1",
  status: "active",
  unit: "Unidad",
};

afterEach(() => vi.unstubAllGlobals());

describe("ProductsApi HTTP adapter", () => {
  it("serializes product movement limit and opaque cursor", () => {
    expect(movementQueryString({ limit: 50, cursor: "c/next +" })).toBe(
      "?limit=50&cursor=c%2Fnext+%2B",
    );
    expect(movementQueryString()).toBe("");
  });

  it("omits empty filters and serializes pagination and low stock", () => {
    expect(productQueryString({ search: "  ", status: "all" })).toBe("");
    expect(
      productQueryString({
        search: "taladro",
        status: "active",
        lowStock: true,
        page: 2,
        pageSize: 50,
      }),
    ).toBe("?search=taladro&status=active&lowStock=true&page=2&pageSize=50");
  });

  it("converts peso values to integer cents before sending and encodes ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await productsApi.create(productInput);
    await productsApi.get("id / 1");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({
        barcode: "779123",
        categoryId: "cat-herramientas",
        minimumStock: 2,
        name: "Taladro",
        sku: "TAL-1",
        status: "active",
        unit: "Unidad",
        costCents: 12345,
        priceCents: 25050,
      }),
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/products/id%20%2F%201");
  });
});

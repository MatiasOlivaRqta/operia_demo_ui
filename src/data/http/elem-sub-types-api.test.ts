import { afterEach, describe, expect, it, vi } from "vitest";
import { elemSubTypeQueryString, elemSubTypesApi } from "@/data/http/elem-sub-types-api";

afterEach(() => vi.unstubAllGlobals());

describe("ElemSubTypesApi HTTP adapter", () => {
  it("omits empty search and serializes pagination", () => {
    expect(elemSubTypeQueryString({ search: "  " })).toBe("");
    expect(elemSubTypeQueryString({ search: " ferr ", page: 1, pageSize: 10 })).toBe(
      "?search=ferr&page=1&pageSize=10",
    );
  });

  it("lists and creates sub types under the encoded type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await elemSubTypesApi.list("PROD_CAT", { search: "ele", page: 1, pageSize: 10 });
    await elemSubTypesApi.create("TIPO / X", "Pinturas");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/elem-types/PROD_CAT/sub-types?search=ele&page=1&pageSize=10",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/elem-types/TIPO%20%2F%20X/sub-types");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ description: "Pinturas" }));
  });
});

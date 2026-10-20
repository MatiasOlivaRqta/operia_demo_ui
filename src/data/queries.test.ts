import { describe, expect, it, vi } from "vitest";
import {
  cashQueryKeys,
  cashSessionQueryEnabled,
  loadLocalities,
  loadCustomers,
  loadCashMovements,
  loadCashTotals,
  loadCustomerAccountMovements,
  loadProductMovements,
  productSearchQuery,
  productMovementsQueryKey,
} from "@/data/queries";
import type { DataSnapshot } from "@/data/api";
import { emptyCashTotals } from "@/features/cash/types";
import type { Customer } from "@/features/customers/types";
import { success } from "@/lib/result";
import { QueryClient } from "@tanstack/react-query";
import { invalidateProductMovementQueries } from "@/data/mutations";

describe("cash query keys", () => {
  it("include the company, resource identifiers, pagination, and local snapshots only when supplied", () => {
    const snapshot: DataSnapshot = {
      activeCompanyId: "co-1",
      cashSessions: [],
      companies: [],
      customers: [],
      documents: [],
      products: [],
    };
    expect(cashQueryKeys.session("co-1")).toEqual(["cash-session", "co-1"]);
    expect(cashQueryKeys.session("co-1", snapshot)).toEqual(["cash-session", "co-1", snapshot]);
    expect(cashQueryKeys.totals("co-1", "s1")).toEqual(["cash-totals", "co-1", "s1"]);
    expect(cashQueryKeys.movements("co-1", "s1", 2, 25)).toEqual([
      "cash-movements",
      "co-1",
      "s1",
      2,
      25,
    ]);
    expect(cashQueryKeys.customerAccount("co-1", "c1")).toEqual(["customer-account", "co-1", "c1"]);
  });

  it("disables totals and movements without an open session id", () => {
    expect(cashSessionQueryEnabled(undefined)).toBe(false);
    expect(cashSessionQueryEnabled("")).toBe(false);
    expect(cashSessionQueryEnabled("s1")).toBe(true);
  });

  it("does not invoke cash totals or movement readers without a session", async () => {
    const totals = vi.fn().mockResolvedValue(success(emptyCashTotals));
    const movements = vi
      .fn()
      .mockResolvedValue(success({ items: [], page: 1, pageSize: 25, total: 0 }));
    await loadCashTotals({ totals }, "");
    await loadCashMovements({ movements }, { sessionId: "", page: 1, pageSize: 25 });
    expect(totals).not.toHaveBeenCalled();
    expect(movements).not.toHaveBeenCalled();
  });
});

describe("geo queries", () => {
  it("does not request localities without a province", async () => {
    const localities = vi.fn();
    await expect(loadLocalities({ localities }, "")).resolves.toEqual([]);
    expect(localities).not.toHaveBeenCalled();
  });
});

describe("customer list queries", () => {
  it("requests a filtered page and forwards the cancellation signal", async () => {
    const page = { items: [], page: 1, pageSize: 10, total: 0 };
    const list = vi.fn().mockResolvedValue(success(page));
    const signal = new AbortController().signal;
    const result = await loadCustomers(
      { list },
      {
        search: "perez",
        status: "active",
        vatCondition: "Exento",
        page: 1,
        pageSize: 10,
      },
      signal,
    );
    expect(list).toHaveBeenCalledWith(
      {
        search: "perez",
        status: "active",
        vatCondition: "Exento",
        page: 1,
        pageSize: 10,
      },
      { signal },
    );
    expect(result).toEqual(
      page satisfies { items: readonly Customer[]; page: number; pageSize: number; total: number },
    );
  });
});

describe("customer account movement queries", () => {
  it("requests the next page with the cursor returned by the first page", async () => {
    const movements = vi
      .fn()
      .mockResolvedValueOnce(success({ items: [], nextCursor: "cursor/next" }))
      .mockResolvedValueOnce(success({ items: [], nextCursor: null }));
    const api = { movements };
    const firstPage = await loadCustomerAccountMovements(api, "c1", undefined);
    await loadCustomerAccountMovements(api, "c1", firstPage.nextCursor ?? undefined);
    expect(movements).toHaveBeenNthCalledWith(1, "c1", undefined, { signal: undefined });
    expect(movements).toHaveBeenNthCalledWith(2, "c1", "cursor/next", { signal: undefined });
  });
});

describe("product movement queries", () => {
  it("loads and accumulates cursor pages, forwarding the request signal", async () => {
    const first = { items: [{ id: "m1" }], nextCursor: "c-next" };
    const second = { items: [{ id: "m2" }], nextCursor: null };
    const movements = vi
      .fn()
      .mockResolvedValueOnce(success(first))
      .mockResolvedValueOnce(success(second));
    const api = { movements };
    const signal = new AbortController().signal;
    const firstPage = await loadProductMovements(api, "p1", { limit: 1 }, signal);
    const secondPage = await loadProductMovements(
      api,
      "p1",
      { limit: 1, cursor: firstPage.nextCursor ?? undefined },
      signal,
    );

    expect(movements).toHaveBeenNthCalledWith(1, "p1", { limit: 1 }, { signal });
    expect(movements).toHaveBeenNthCalledWith(2, "p1", { limit: 1, cursor: "c-next" }, { signal });
    expect([...firstPage.items, ...secondPage.items]).toEqual([{ id: "m1" }, { id: "m2" }]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("keys product history by company and product and includes local snapshots only when supplied", () => {
    const snapshot: DataSnapshot = {
      activeCompanyId: "co-1",
      cashSessions: [],
      companies: [],
      customers: [],
      documents: [],
      products: [],
    };
    expect(productMovementsQueryKey("co-1", "p1")).toEqual(["product-movements", "co-1", "p1", 20]);
    expect(productMovementsQueryKey("co-1", "p1", 40, snapshot)).toEqual([
      "product-movements",
      "co-1",
      "p1",
      40,
      snapshot,
    ]);
  });

  it("invalidates product movement pages after a successful movement", async () => {
    const client = new QueryClient();
    const historyKey = ["product-movements", "co-1", "p1", 20] as const;
    const listKey = ["products", "co-1"] as const;
    client.setQueryData(historyKey, {
      pages: [{ items: [{ id: "m1" }] }],
      pageParams: [undefined],
    });
    client.setQueryData(listKey, { items: [] });

    await invalidateProductMovementQueries(client, success({ id: "m2" }));

    expect(client.getQueryState(historyKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    client.clear();
  });
});

describe("product search query", () => {
  it("requests active products by default and omits status when inactive products are included", () => {
    expect(productSearchQuery("tornillo")).toEqual({
      search: "tornillo",
      status: "active",
      page: 1,
      pageSize: 10,
    });
    expect(productSearchQuery("tornillo", true)).toEqual({
      search: "tornillo",
      page: 1,
      pageSize: 10,
    });
  });
});

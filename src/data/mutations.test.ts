import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  cashMutationQueryPlan,
  collectionRelationsInvalidationKeys,
  dashboardInvalidationKeys,
  invalidateCashQueries,
  invalidateProductMovementQueries,
} from "@/data/mutations";
import { cashQueryKeys, dashboardQueryKeys } from "@/data/queries";
import type { CashSession } from "@/features/cash/types";

describe("cash mutation invalidation", () => {
  const session: CashSession = {
    id: "session-1",
    openedAt: "2026-10-10T12:00:00.000Z",
    openingBalanceCents: 10000 as CashSession["openingBalanceCents"],
    openedBy: { name: "Ana" },
    status: "open",
  };
  const nextSession: CashSession = { ...session, id: "session-2" };
  const totalsKey = cashQueryKeys.totals("company-1", session.id);
  const movementsKey = cashQueryKeys.movements("company-1", session.id, 1, 25);

  it("sets the session cache to null synchronously after close without invalidating old reads", async () => {
    const client = new QueryClient();
    const sessionKey = cashQueryKeys.session("company-1");
    client.setQueryData(sessionKey, session);
    client.setQueryData(totalsKey, { movementsCount: 3 });
    client.setQueryData(movementsKey, { items: [{ id: "movement-1" }] });

    const pending = invalidateCashQueries(
      client,
      "close",
      { ok: true, value: { ...session, status: "closed" } },
      "company-1",
    );

    expect(client.getQueryData(sessionKey)).toBeNull();
    expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(movementsKey)?.isInvalidated).toBe(false);
    await pending;
    expect(client.getQueryState(sessionKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(movementsKey)?.isInvalidated).toBe(false);
    client.clear();
  });

  it("sets the returned open session in cache before confirming it from the server", async () => {
    const client = new QueryClient();
    const sessionKey = cashQueryKeys.session("company-1");
    client.setQueryData(sessionKey, null);
    const pending = invalidateCashQueries(
      client,
      "open",
      { ok: true, value: nextSession },
      "company-1",
      sessionKey,
      nextSession,
    );
    expect(client.getQueryData(sessionKey)).toEqual(nextSession);
    await pending;
    client.clear();
  });

  it("invalidates session, totals, movements, account, and customers after a collection", async () => {
    const client = new QueryClient();
    const sessionKey = cashQueryKeys.session("company-1");
    const accountKey = ["customer-account", "company-1", "customer-1"] as const;
    const documentCollectionsKey = ["document-collections", "company-1", "document-1"] as const;
    const collectionApplicationsKey = [
      "collection-applications",
      "company-1",
      "customer-1",
      "movement-1",
    ] as const;
    client.setQueryData(sessionKey, session);
    client.setQueryData(totalsKey, { movementsCount: 3 });
    client.setQueryData(movementsKey, { items: [{ id: "movement-1" }] });
    client.setQueryData(accountKey, { debtCents: 500 });
    client.setQueryData(documentCollectionsKey, { items: [] });
    client.setQueryData(collectionApplicationsKey, { documents: [] });
    const customersKey = ["customers", "api", "company-1", {}] as const;
    const dashboardSummaryKey = dashboardQueryKeys.summary("company-1");
    const dashboardActivityKey = dashboardQueryKeys.activity("company-1");
    client.setQueryData(customersKey, { items: [] });
    client.setQueryData(dashboardSummaryKey, {});
    client.setQueryData(dashboardActivityKey, { items: [] });

    await invalidateCashQueries(client, "collectPayment", { ok: true, value: {} }, "company-1");

    expect(client.getQueryState(sessionKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(movementsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(accountKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(documentCollectionsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(collectionApplicationsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(customersKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(dashboardSummaryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(dashboardActivityKey)?.isInvalidated).toBe(true);
    expect(collectionRelationsInvalidationKeys("company-1")).toEqual([
      ["document-collections", "company-1"],
      ["collection-applications", "company-1"],
    ]);
    client.clear();
  });

  it("refreshes only the session after a conflict without writing cache or reading its message", async () => {
    const client = new QueryClient();
    const sessionKey = cashQueryKeys.session("company-1");
    client.setQueryData(sessionKey, session);
    client.setQueryData(totalsKey, { movementsCount: 3 });
    client.setQueryData(movementsKey, { items: [{ id: "movement-1" }] });

    await invalidateCashQueries(
      client,
      "open",
      { ok: false, error: { code: "conflict", message: "Cualquier texto del servidor." } },
      "company-1",
    );

    expect(client.getQueryState(sessionKey)?.isInvalidated).toBe(true);
    expect(client.getQueryData(sessionKey)).toEqual(session);
    expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(movementsKey)?.isInvalidated).toBe(false);
    client.clear();
  });

  it("does nothing for errors other than conflicts", () => {
    expect(
      cashMutationQueryPlan(
        "open",
        { ok: false, error: { code: "unexpected", message: "Error." } },
        "company-1",
      ),
    ).toEqual({ invalidate: [] });
  });
});

describe("dashboard invalidation", () => {
  it("exports stable summary and activity cache keys", () => {
    expect(dashboardQueryKeys.summary("company-1")).toEqual(["dashboard-summary", "company-1"]);
    expect(dashboardQueryKeys.activity("company-1")).toEqual([
      "dashboard-activity",
      "company-1",
      10,
    ]);
  });

  it("invalidates dashboard summary and activity after stock changes", async () => {
    const client = new QueryClient();
    const summary = dashboardQueryKeys.summary("company-1");
    const activity = dashboardQueryKeys.activity("company-1");
    client.setQueryData(summary, {});
    client.setQueryData(activity, { items: [] });
    await invalidateProductMovementQueries(client, { ok: true, value: {} });
    expect(client.getQueryState(summary)?.isInvalidated).toBe(true);
    expect(client.getQueryState(activity)?.isInvalidated).toBe(true);
    expect(dashboardInvalidationKeys).toEqual([["dashboard-summary"], ["dashboard-activity"]]);
    client.clear();
  });
});

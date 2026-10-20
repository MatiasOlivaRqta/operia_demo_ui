import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardActivityQueryString, dashboardApi } from "@/data/http/dashboard-api";
import { requestApi } from "@/data/http/client";

vi.mock("@/data/http/client", () => ({ requestApi: vi.fn() }));

describe("dashboardApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests summary and activity with the limit parameter", async () => {
    await dashboardApi.summary();
    await dashboardApi.activity(3);
    expect(requestApi).toHaveBeenNthCalledWith(1, "/dashboard/summary", undefined);
    expect(requestApi).toHaveBeenNthCalledWith(2, "/dashboard/activity?limit=3", undefined);
    expect(dashboardActivityQueryString()).toBe("?limit=10");
  });
});

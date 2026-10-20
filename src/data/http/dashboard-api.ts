import type { DashboardApi, RequestControl } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { DashboardActivity, DashboardSummary } from "@/features/dashboard/types";

export function dashboardActivityQueryString(limit = 10): string {
  return `?limit=${encodeURIComponent(String(limit))}`;
}

export const dashboardApi: DashboardApi = {
  summary: (control?: RequestControl) =>
    requestApi<DashboardSummary>("/dashboard/summary", control),
  activity: (limit = 10, control?: RequestControl) =>
    requestApi<DashboardActivity>(
      `/dashboard/activity${dashboardActivityQueryString(limit)}`,
      control,
    ),
};

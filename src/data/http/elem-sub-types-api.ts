import type { ElemSubTypesApi, ListQuery, Page } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { ElemSubType } from "@/features/catalog/types";

export function elemSubTypeQueryString(query?: ListQuery): string {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

const path = (typeId: string) => `/elem-types/${encodeURIComponent(typeId)}/sub-types`;

export const elemSubTypesApi: ElemSubTypesApi = {
  list: (typeId, query, control) =>
    requestApi<Page<ElemSubType>>(`${path(typeId)}${elemSubTypeQueryString(query)}`, control),
  create: (typeId, description) =>
    requestApi<ElemSubType>(path(typeId), { method: "POST", body: { description } }),
};

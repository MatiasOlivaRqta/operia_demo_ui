import type { ListQuery, Page, RequestControl } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { ApiCustomer } from "@/data/bridge/customers-bridge";
import type { Customer } from "@/features/customers/types";
import type { CustomerFormValues } from "@/features/customers/schemas";
import type { Result } from "@/lib/result";

type RawCustomersApi = Readonly<{
  list(query?: ListQuery, control?: RequestControl): Promise<Result<Page<ApiCustomer>>>;
  get(id: string): Promise<Result<ApiCustomer>>;
  create(input: CustomerFormValues): Promise<Result<ApiCustomer>>;
  update(id: string, input: CustomerFormValues): Promise<Result<ApiCustomer>>;
  deactivate(id: string): Promise<Result<ApiCustomer>>;
  setStatus(id: string, status: Customer["status"]): Promise<Result<ApiCustomer>>;
}>;

function queryString(query?: ListQuery): string {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search);
  if (query?.status && query.status !== "all") params.set("status", query.status);
  if (query?.vatCondition && query.vatCondition !== "all") {
    params.set("vatCondition", query.vatCondition);
  }
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const customersApi: RawCustomersApi = {
  list: (query, control) =>
    requestApi<Page<ApiCustomer>>(`/customers${queryString(query)}`, { signal: control?.signal }),
  get: (id) => requestApi<ApiCustomer>(`/customers/${encodeURIComponent(id)}`),
  create: (input) => requestApi<ApiCustomer>("/customers", { method: "POST", body: input }),
  update: (id, input) =>
    requestApi<ApiCustomer>(`/customers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    }),
  deactivate: (id) =>
    requestApi<ApiCustomer>(`/customers/${encodeURIComponent(id)}/deactivation`, {
      method: "POST",
    }),
  setStatus: (id, status) =>
    requestApi<ApiCustomer>(`/customers/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),
};

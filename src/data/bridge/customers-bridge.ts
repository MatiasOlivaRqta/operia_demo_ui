import type { Customer } from "@/features/customers/types";
import type { AppState } from "@/features/store/app-store";
import type { Page } from "@/data/api";

export type ApiCustomer = Omit<Customer, "movements">;

export function mergeApiCustomer(incoming: ApiCustomer, existing: readonly Customer[]): Customer {
  const previous = existing.find(
    (customer) => customer.id === incoming.id && customer.companyId === incoming.companyId,
  );
  return { ...incoming, movements: previous?.movements ?? [] };
}

export function syncApiCustomers(
  state: AppState,
  page: Pick<Page<ApiCustomer>, "items">,
): AppState {
  const incoming = page.items;
  if (incoming.length === 0) return state;
  const byIdentity = new Map<string, ApiCustomer>(
    incoming.map((customer) => [`${customer.companyId}:${customer.id}`, customer] as const),
  );
  const seen = new Set<string>();
  const customers = state.customers.map((customer) => {
    const key = `${customer.companyId}:${customer.id}`;
    const remote = byIdentity.get(key);
    if (!remote) return customer;
    seen.add(key);
    return mergeApiCustomer(remote, state.customers);
  });
  for (const [key, customer] of byIdentity) {
    if (!seen.has(key)) customers.push(mergeApiCustomer(customer, state.customers));
  }
  return { ...state, customers };
}

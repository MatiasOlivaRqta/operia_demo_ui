"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { cashSession } from "@/features/cash/mock-data";
import { cashMovements } from "@/features/cash/mock-data";
import type { LocalCashSession } from "@/features/cash/local-types";
import { companies } from "@/features/companies/mock-data";
import type { Company } from "@/features/companies/types";
import { customers } from "@/features/customers/mock-data";
import type { Customer } from "@/features/customers/types";
import { commercialDocuments } from "@/features/documents/mock-data";
import type { CommercialDocument } from "@/features/documents/types";
import { products } from "@/features/products/mock-data";
import type { Product } from "@/features/products/types";
import { toCents } from "@/lib/money";

export type AppState = {
  activeCompanyId: string;
  cashSessions: LocalCashSession[];
  companies: readonly Company[];
  customers: Customer[];
  documents: CommercialDocument[];
  products: Product[];
};

export type AppAction =
  | { companyId: string; type: "set-company" }
  | {
      companyId: string;
      customerId: string;
      movement: Customer["movements"][number];
      type: "add-customer-movement";
    }
  | { customers: readonly Omit<Customer, "movements">[]; type: "sync-customers" }
  | { state: AppState; type: "replace-state" };

export const initialState: AppState = {
  activeCompanyId: "operia-central",
  cashSessions: [
    { ...cashSession, companyId: "operia-central", movements: cashMovements },
    {
      companyId: "operia-hogar",
      id: "local-cash-operia-hogar-closed",
      openedAt: "2026-08-26T08:00:00.000Z",
      openingBalanceCents: toCents(0),
      openedBy: { name: "Matías Oliva" },
      status: "closed",
      movements: [],
    },
  ],
  companies,
  customers: customers.map((customer): Customer => ({
    ...customer,
    movements: [...customer.movements],
  })),
  documents: commercialDocuments.map((document): CommercialDocument => ({
    ...document,
    items: [...document.items],
  })),
  products: products.map((product): Product => ({ ...product, movements: [...product.movements] })),
};

export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === "replace-state") return action.state;
  if (action.type === "add-customer-movement") {
    const customer = state.customers.find(
      (entry) => entry.id === action.customerId && entry.companyId === action.companyId,
    );
    if (!customer || customer.movements.some((entry) => entry.id === action.movement.id))
      return state;
    return {
      ...state,
      customers: state.customers.map((entry) =>
        entry === customer ? { ...entry, movements: [...entry.movements, action.movement] } : entry,
      ),
    };
  }
  if (action.type === "sync-customers") {
    const incoming = new Map<string, Omit<Customer, "movements">>(
      action.customers.map((customer) => [`${customer.companyId}:${customer.id}`, customer]),
    );
    const currentIds = new Set<string>();
    let changed = false;
    const customers = state.customers.map((current) => {
      const key = `${current.companyId}:${current.id}`;
      const remote = incoming.get(key);
      if (!remote) return current;
      currentIds.add(key);
      const fieldsChanged = Object.entries(remote).some(
        ([field, value]) => current[field as keyof Customer] !== value,
      );
      if (!fieldsChanged) return current;
      changed = true;
      return { ...remote, movements: current.movements };
    });
    for (const [key, remote] of incoming) {
      if (!currentIds.has(key)) {
        changed = true;
        customers.push({ ...remote, movements: [] });
      }
    }
    return changed ? { ...state, customers } : state;
  }
  if (
    action.type === "set-company" &&
    state.companies.some((company) => company.id === action.companyId)
  ) {
    return { ...state, activeCompanyId: action.companyId };
  }
  return state;
}

type AppContextValue = {
  dispatch: Dispatch<AppAction>;
  state: AppState;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ dispatch, state }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore debe usarse dentro de AppStoreProvider");
  return context;
}

"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode } from "react";
import {
  AppStoreProvider,
  useAppStore,
  type AppAction,
  type AppState,
} from "@/features/store/app-store";
import { createLocalApi, snapshotFromState } from "@/data/local/api";
import { DataContext, useDataContext } from "@/data/context";
import type { CompaniesApi, CustomersApi, DataApi } from "@/data/api";
import type { DocumentWithTotal } from "@/features/documents/types";
import type { Result } from "@/data/result";
import { dataSource } from "@/data/config";
import { requestApi } from "@/data/http/client";
import { customersApi as remoteCustomersApi } from "@/data/http/customers-api";
import { productsApi as remoteProductsApi } from "@/data/http/products-api";
import { inventoryApi as remoteInventoryApi } from "@/data/http/inventory-api";
import { documentsApi as remoteDocumentsApi } from "@/data/http/documents-api";
import { cashApi as remoteCashApi } from "@/data/http/cash-api";
import { customerAccountApi as remoteCustomerAccountApi } from "@/data/http/customer-account-api";
import { elemSubTypesApi as remoteElemSubTypesApi } from "@/data/http/elem-sub-types-api";
import { geoApi as remoteGeoApi } from "@/data/http/geo-api";
import { dashboardApi as remoteDashboardApi } from "@/data/http/dashboard-api";
import { notificationsApi as remoteNotificationsApi } from "@/data/http/notifications-api";
import {
  usersApi as remoteUsersApi,
  rolesApi as remoteRolesApi,
} from "@/data/http/users-roles-api";
import { mergeApiCustomer, type ApiCustomer } from "@/data/bridge/customers-bridge";
import type { AuthSession } from "@/features/auth/schemas";
import { success } from "@/lib/result";
import type { Company } from "@/features/companies/types";
import { asCents } from "@/lib/money";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

type IdempotentEntry = {
  fingerprint: string;
  result: Result<DocumentWithTotal>;
};

export function DataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <DataBridge>{children}</DataBridge>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}

function DataBridge({ children }: Readonly<{ children: ReactNode }>) {
  const { state, dispatch } = useAppStore();
  const queryClient = useQueryClient();
  const [idempotency] = useState(() => new Map<string, IdempotentEntry>());
  const api = useMemo<DataApi>(() => {
    const local = createLocalApi(state, dispatch, idempotency, dataSource === "api");
    if (dataSource !== "api") return local;
    return {
      ...local,
      customers: createBridgedCustomersApi(state, dispatch),
      companies: createRemoteCompaniesApi(dispatch),
      products: remoteProductsApi,
      inventory: remoteInventoryApi,
      documents: {
        ...remoteDocumentsApi,
        async create(input, idempotencyKey) {
          const result = await remoteDocumentsApi.create(input, idempotencyKey);
          if (!result.ok) return result;
          dispatch({
            companyId: state.activeCompanyId,
            customerId: result.value.customerId,
            movement: {
              amountCents: result.value.totalCents,
              date: result.value.date,
              description: `Comprobante ${result.value.internalNumber}`,
              documentId: result.value.id,
              id: `account-${result.value.id}`,
              type: "Factura",
            },
            type: "add-customer-movement",
          });
          return result;
        },
        async cancel(id, reason) {
          const result = await remoteDocumentsApi.cancel(id, reason);
          if (!result.ok) return result;
          dispatch({
            companyId: state.activeCompanyId,
            customerId: result.value.customerId,
            movement: {
              amountCents: asCents(-result.value.totalCents),
              date: result.value.date,
              description: `Anulación ${result.value.internalNumber}: ${reason.trim()}`,
              documentId: result.value.id,
              id: `account-cancel-${result.value.id}`,
              type: "Nota de crédito",
            },
            type: "add-customer-movement",
          });
          return result;
        },
      },
      cash: remoteCashApi,
      customerAccount: remoteCustomerAccountApi,
      dashboard: remoteDashboardApi,
      notifications: remoteNotificationsApi,
      elemSubTypes: remoteElemSubTypesApi,
      geo: remoteGeoApi,
      users: remoteUsersApi,
      roles: remoteRolesApi,
    };
  }, [dispatch, idempotency, state]);
  const snapshot = useMemo(() => snapshotFromState(state), [state]);
  const value = useMemo(() => ({ api, snapshot }), [api, snapshot]);

  useEffect(() => {
    if (dataSource !== "api") return;
    let active = true;
    void queryClient
      .fetchQuery({
        queryKey: ["auth-session"],
        queryFn: async () => {
          const result = await requestApi<AuthSession>("/auth/me");
          if (!result.ok) throw result.error;
          return result.value;
        },
        staleTime: 30_000,
      })
      .then((session) => {
        if (active) dispatch({ type: "set-company", companyId: session.activeCompany.id });
      })
      .catch(() => {
        // The shared query exposes authentication errors to its consumers.
      });
    return () => {
      active = false;
    };
  }, [dispatch, queryClient]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function createBridgedCustomersApi(state: AppState, dispatch: Dispatch<AppAction>): CustomersApi {
  function sync(incoming: readonly ApiCustomer[]): void {
    dispatch({ type: "sync-customers", customers: incoming });
  }
  return {
    async list(query, control) {
      const result = await remoteCustomersApi.list(query, control);
      if (!result.ok) return result;
      sync(result.value.items);
      return success({
        ...result.value,
        items: result.value.items.map((customer) => mergeApiCustomer(customer, state.customers)),
      });
    },
    async get(id) {
      const result = await remoteCustomersApi.get(id);
      if (!result.ok) return result;
      sync([result.value]);
      return success(mergeApiCustomer(result.value, state.customers));
    },
    async create(input) {
      const result = await remoteCustomersApi.create(input);
      if (!result.ok) return result;
      sync([result.value]);
      return success(mergeApiCustomer(result.value, state.customers));
    },
    async update(id, input) {
      const result = await remoteCustomersApi.update(id, input);
      if (!result.ok) return result;
      sync([result.value]);
      return success(mergeApiCustomer(result.value, state.customers));
    },
    async deactivate(id) {
      const result = await remoteCustomersApi.deactivate(id);
      if (!result.ok) return result;
      sync([result.value]);
      return success(mergeApiCustomer(result.value, state.customers));
    },
    async setStatus(id, status) {
      const result = await remoteCustomersApi.setStatus(id, status);
      if (!result.ok) return result;
      sync([result.value]);
      return success(mergeApiCustomer(result.value, state.customers));
    },
  };
}

function createRemoteCompaniesApi(dispatch: Dispatch<AppAction>): CompaniesApi {
  return {
    list: () => requestApi<readonly Company[]>("/companies"),
    async setActive(id) {
      const result = await requestApi<AuthSession>(`/session/company/${encodeURIComponent(id)}`, {
        method: "PUT",
      });
      if (!result.ok) return result;
      dispatch({ type: "set-company", companyId: result.value.activeCompany.id });
      return success(result.value.activeCompany);
    },
  };
}

export function useData(): DataApi {
  return useDataContext().api;
}

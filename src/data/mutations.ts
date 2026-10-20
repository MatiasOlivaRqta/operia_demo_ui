"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@/features/customers/types";
import type { CustomerFormValues } from "@/features/customers/schemas";
import { PRODUCT_CATEGORY_TYPE_ID, type ElemSubType } from "@/features/catalog/types";
import type { ProductSummary } from "@/features/products/types";
import type { ProductFormValues } from "@/features/products/schemas";
import type { DocumentFormValues } from "@/features/documents/schemas";
import type { DocumentWithTotal } from "@/features/documents/types";
import type {
  CashCloseValues,
  CashOpenValues,
  CollectPaymentValues,
} from "@/features/cash/schemas";
import type { CashSession } from "@/features/cash/types";
import type { StockMovementInput, StockAdjustmentInput, Receipt } from "@/data/api";
import type { Result } from "@/data/result";
import { useData } from "@/data/provider";
import { useDataContext } from "@/data/context";
import {
  PRODUCT_CATEGORIES_QUERY_KEY,
  cashQueryKeys,
  dashboardQueryKeys,
  notificationQueryKeys,
} from "@/data/queries";
import { dataSource } from "@/data/config";

export type CashMutationAction = "open" | "close" | "collectPayment";
export const dashboardInvalidationKeys = [["dashboard-summary"], ["dashboard-activity"]] as const;

export function collectionRelationsInvalidationKeys(companyId: string) {
  return [
    ["document-collections", companyId],
    ["collection-applications", companyId],
  ] as const;
}

type CashQueryPlan = Readonly<{
  invalidate: readonly (readonly unknown[])[];
  sessionData?: CashSession | null;
}>;

export function cashMutationQueryPlan(
  action: CashMutationAction,
  result: Result<unknown>,
  companyId: string,
  openedSession?: CashSession,
): CashQueryPlan {
  const session = ["cash-session", companyId] as const;
  const totals = ["cash-totals", companyId] as const;
  const movements = ["cash-movements", companyId] as const;
  const account = ["customer-account", companyId] as const;
  const customers = ["customers"] as const;
  const dashboard = [dashboardQueryKeys.summary(companyId), dashboardQueryKeys.activity(companyId)];
  if (result.ok) {
    return action === "collectPayment"
      ? {
          invalidate: [
            session,
            totals,
            movements,
            account,
            customers,
            ...collectionRelationsInvalidationKeys(companyId),
            ...dashboard,
          ],
        }
      : {
          invalidate: [session],
          sessionData: action === "open" ? openedSession : null,
        };
  }
  return result.error.code === "conflict" ? { invalidate: [session] } : { invalidate: [] };
}

export async function invalidateCashQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  action: CashMutationAction,
  result: Result<unknown>,
  companyId: string,
  sessionKey: readonly unknown[] = ["cash-session", companyId],
  openedSession?: CashSession,
): Promise<void> {
  const plan = cashMutationQueryPlan(action, result, companyId, openedSession);
  if (plan.sessionData !== undefined) queryClient.setQueryData(sessionKey, plan.sessionData);
  await Promise.all(plan.invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function useInvalidate(...queryKeys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  return async (result: Result<unknown>): Promise<void> => {
    if (!result.ok) return;
    await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
}

const productMovementInvalidationKeys = [
  ["products"],
  ["product"],
  ["inventory-summary"],
  ["product-movements"],
  ["stock-movements"],
  ...dashboardInvalidationKeys,
] as const;

export async function invalidateProductMovementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  result: Result<unknown>,
): Promise<void> {
  if (!result.ok) return;
  await Promise.all(
    productMovementInvalidationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export function useCustomerMutations() {
  const api = useData();
  const invalidate = useInvalidate(["customers"], ["customer"], ["documents"]);
  const create = useMutation({
    mutationFn: (input: CustomerFormValues) => api.customers.create(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerFormValues }) =>
      api.customers.update(id, input),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api.customers.deactivate(id),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Customer["status"] }) =>
      api.customers.setStatus(id, status),
    onSuccess: invalidate,
  });
  return {
    create: (input: CustomerFormValues) => create.mutateAsync(input),
    update: (id: string, input: CustomerFormValues) => update.mutateAsync({ id, input }),
    deactivate: (id: string) => deactivate.mutateAsync(id),
    setStatus: (id: string, status: Customer["status"]) => setStatus.mutateAsync({ id, status }),
  };
}

export function useUserMutations() {
  const api = useData();
  const invalidate = useInvalidate(["users"], ["roles"]);
  const create = useMutation({ mutationFn: api.users.create, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: import("@/data/api").UpdateManagedUserInput;
    }) => api.users.update(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.users.delete, onSuccess: invalidate });
  return {
    create: (input: import("@/data/api").CreateManagedUserInput) => create.mutateAsync(input),
    update: (id: string, input: import("@/data/api").UpdateManagedUserInput) =>
      update.mutateAsync({ id, input }),
    delete: (id: string) => remove.mutateAsync(id),
  };
}

export function useRoleMutations() {
  const api = useData();
  const invalidate = useInvalidate(["roles"], ["users"]);
  const create = useMutation({ mutationFn: api.roles.create, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<import("@/data/api").SaveManagedRoleInput>;
    }) => api.roles.update(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.roles.delete, onSuccess: invalidate });
  return {
    create: (input: import("@/data/api").SaveManagedRoleInput) => create.mutateAsync(input),
    update: (id: string, input: Partial<import("@/data/api").SaveManagedRoleInput>) =>
      update.mutateAsync({ id, input }),
    delete: (id: string) => remove.mutateAsync(id),
  };
}

export function useProductCategoryMutations() {
  const api = useData();
  const invalidate = useInvalidate([PRODUCT_CATEGORIES_QUERY_KEY]);
  const create = useMutation({
    mutationFn: (description: string) =>
      api.elemSubTypes.create(PRODUCT_CATEGORY_TYPE_ID, description),
    onSuccess: invalidate,
  });
  return { create: (description: string) => create.mutateAsync(description) };
}

export type ProductCategoryMutationResult = Result<ElemSubType>;

export function useProductMutations() {
  const api = useData();
  const queryClient = useQueryClient();
  const invalidateProduct = useInvalidate(["products"], ["product"], ["inventory-summary"]);
  const invalidateMovement = (result: Result<unknown>) =>
    invalidateProductMovementQueries(queryClient, result);
  const create = useMutation({
    mutationFn: (input: ProductFormValues) => api.products.create(input),
    onSuccess: invalidateProduct,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductFormValues }) =>
      api.products.update(id, input),
    onSuccess: invalidateProduct,
  });
  const addStockMovement = useMutation({
    mutationFn: ({ id, input }: { id: string; input: StockMovementInput }) =>
      api.products.addStockMovement(id, input),
    onSuccess: invalidateMovement,
  });
  const adjustStock = useMutation({
    mutationFn: ({ id, input }: { id: string; input: StockAdjustmentInput }) =>
      api.products.adjustStock(id, input),
    onSuccess: invalidateMovement,
  });
  const reverseStockMovement = useMutation({
    mutationFn: ({
      productId,
      movementId,
      reason,
    }: {
      productId: string;
      movementId: string;
      reason: string;
    }) => api.products.reverseStockMovement(productId, movementId, reason),
    onSuccess: invalidateMovement,
  });
  return {
    create: (input: ProductFormValues) => create.mutateAsync(input),
    update: (id: string, input: ProductFormValues) => update.mutateAsync({ id, input }),
    addStockMovement: (id: string, input: StockMovementInput) =>
      addStockMovement.mutateAsync({ id, input }),
    adjustStock: (id: string, input: StockAdjustmentInput) =>
      adjustStock.mutateAsync({ id, input }),
    reverseStockMovement: (productId: string, movementId: string, reason: string) =>
      reverseStockMovement.mutateAsync({ productId, movementId, reason }),
  };
}

export function useDocumentMutations() {
  const api = useData();
  const invalidate = useInvalidate(
    ["documents"],
    ["document"],
    ["products"],
    ["product"],
    ["product-movements"],
    ["stock-movements"],
    ["inventory-summary"],
    ["customers"],
    ["cash-session"],
    ["customer-account"],
    ...dashboardInvalidationKeys,
  );
  const create = useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: DocumentFormValues;
      idempotencyKey: string;
    }) => api.documents.create(input, idempotencyKey),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.documents.cancel(id, reason),
    onSuccess: invalidate,
  });
  return {
    create: (input: DocumentFormValues, idempotencyKey: string) =>
      create.mutateAsync({ input, idempotencyKey }),
    cancel: (id: string, reason: string) => cancel.mutateAsync({ id, reason }),
  };
}

export function useCashMutations() {
  const api = useData();
  const queryClient = useQueryClient();
  const { snapshot } = useDataContext();
  const invalidate = (action: CashMutationAction) => (result: Result<unknown>) =>
    invalidateCashQueries(
      queryClient,
      action,
      result,
      snapshot.activeCompanyId,
      cashQueryKeys.session(
        snapshot.activeCompanyId,
        dataSource === "local" ? snapshot : undefined,
      ),
      result.ok && action === "open" ? (result.value as CashSession) : undefined,
    );
  const open = useMutation({
    mutationFn: (input: CashOpenValues) => api.cash.open(input),
    onSuccess: invalidate("open"),
  });
  const close = useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: CashCloseValues }) =>
      api.cash.close(sessionId, input),
    onSuccess: invalidate("close"),
  });
  const collectPayment = useMutation({
    mutationFn: ({
      sessionId,
      input,
      idempotencyKey,
    }: {
      sessionId: string;
      input: CollectPaymentValues;
      idempotencyKey: string;
    }) => api.cash.collectPayment(sessionId, input, idempotencyKey),
    onSuccess: invalidate("collectPayment"),
  });
  return {
    open: (input: CashOpenValues) => open.mutateAsync(input),
    close: (sessionId: string, input: CashCloseValues) => close.mutateAsync({ sessionId, input }),
    collectPayment: (sessionId: string, input: CollectPaymentValues, idempotencyKey: string) =>
      collectPayment.mutateAsync({ sessionId, input, idempotencyKey }),
  };
}

export function useCompanyMutations() {
  const api = useData();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.companies.setActive(id),
    onSuccess: async (result: Result<import("@/features/companies/types").Company>) => {
      if (result.ok) await queryClient.invalidateQueries();
    },
  });
}

export function useNotificationMutations() {
  const api = useData();
  const queryClient = useQueryClient();
  const { snapshot } = useDataContext();
  const invalidate = async (result: Result<unknown>) => {
    if (!result.ok) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.count(snapshot.activeCompanyId),
      }),
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.list(snapshot.activeCompanyId),
      }),
    ]);
  };
  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: invalidate,
  });
  const createTelegramLink = useMutation({
    mutationFn: () => api.notifications.createTelegramLink(),
  });
  return {
    markRead: (id: string) => markRead.mutateAsync(id),
    markAllRead: () => markAllRead.mutateAsync(),
    createTelegramLink: () => createTelegramLink.mutateAsync(),
  };
}

export type CustomerMutationResult = Result<Customer>;
export type ProductMutationResult = Result<ProductSummary>;
export type DocumentMutationResult = Result<DocumentWithTotal>;
export type CashMutationResult = Result<CashSession>;
export type CollectionMutationResult = Result<Receipt>;

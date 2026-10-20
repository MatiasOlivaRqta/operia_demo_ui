"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AppError, Result } from "@/data/result";
import type {
  CashApi,
  CashMovementQuery,
  CursorPage,
  DataSnapshot,
  GeoApi,
  GeoLocality,
  GeoProvince,
  InventoryMovementQuery,
  ListQuery,
  Page,
  ProductMovementQuery,
  NotificationPage,
} from "@/data/api";
import type {
  CashMovement,
  CashSession,
  CashTotals,
  CustomerAccount,
  CustomerAccountMovementPage,
  CustomerAccountSummary,
  DocumentCollections,
  CollectionApplications,
} from "@/features/cash/types";
import { emptyCashTotals } from "@/features/cash/types";
import type { Company } from "@/features/companies/types";
import { PRODUCT_CATEGORY_TYPE_ID, type ElemSubType } from "@/features/catalog/types";
import type { Customer } from "@/features/customers/types";
import type { DocumentSummary, DocumentWithTotal } from "@/features/documents/types";
import type {
  InventorySummary,
  ProductSummary,
  StockMovementEntry,
} from "@/features/products/types";
import type { AuthSession } from "@/features/auth/schemas";
import { permissions } from "@/features/auth/permissions";
import type { DashboardActivity, DashboardSummary } from "@/features/dashboard/types";
import { requestApi } from "@/data/http/client";
import { dataSource } from "@/data/config";
import { useDataContext } from "@/data/context";
import { calculateAvailableStock, isLowStock } from "@/features/products/domain";
import { calculateDocumentTotal } from "@/features/documents/domain";
import { calculateDocumentPendingCents } from "@/features/store/domain";

export type QueryState<T> = Readonly<{
  data: T;
  error: AppError | null;
  isLoading: boolean;
  isFetching: boolean;
}>;
type QueryOptions = Readonly<{ enabled?: boolean; staleTime?: number }>;

async function unwrapResult<T>(request: Promise<Result<T>>): Promise<T> {
  const result = await request;
  if (!result.ok) throw result.error;
  return result.value;
}

function toQueryState<T>(query: UseQueryResult<T>, fallback: T): QueryState<T> {
  return {
    data: query.data ?? fallback,
    error: query.error as AppError | null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
  };
}

const emptyPage = <T>(): Page<T> => ({ items: [], page: 1, pageSize: 25, total: 0 });

export const notificationQueryKeys = {
  count: (companyId: string) => ["notifications", companyId, "unread-count"] as const,
  list: (companyId: string) => ["notifications", companyId, "list"] as const,
};

export function useUnreadNotificationCount() {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: notificationQueryKeys.count(snapshot.activeCompanyId),
    queryFn: () => unwrapResult(api.notifications.unreadCount()),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  return toQueryState(query, 0);
}

export function useNotificationList(enabled: boolean) {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: notificationQueryKeys.list(snapshot.activeCompanyId),
    queryFn: ({ signal }) =>
      unwrapResult(api.notifications.list({ page: 1, pageSize: 20 }, { signal })),
    enabled,
  });
  return toQueryState(query, emptyPage<import("@/data/api").Notification>() as NotificationPage);
}

export const userManagementQueryKeys = {
  users: (companyId: string) => ["users", dataSource, companyId] as const,
  roles: (companyId: string) => ["roles", dataSource, companyId] as const,
  permissionCatalog: (companyId: string) => ["permission-catalog", dataSource, companyId] as const,
};

export function useUsers(): QueryState<readonly import("@/data/api").ManagedUser[]> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: userManagementQueryKeys.users(snapshot.activeCompanyId),
    queryFn: ({ signal }) => unwrapResult(api.users.list({ signal })),
  });
  return toQueryState(query, []);
}

export function useRoles(): QueryState<readonly import("@/data/api").ManagedRole[]> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: userManagementQueryKeys.roles(snapshot.activeCompanyId),
    queryFn: ({ signal }) => unwrapResult(api.roles.list({ signal })),
  });
  return toQueryState(query, []);
}

export function usePermissionCatalog(): QueryState<
  readonly import("@/data/api").PermissionGroup[]
> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: userManagementQueryKeys.permissionCatalog(snapshot.activeCompanyId),
    queryFn: ({ signal }) => unwrapResult(api.roles.permissionCatalog({ signal })),
    staleTime: Infinity,
  });
  return toQueryState(query, []);
}

export async function loadLocalities(
  api: Pick<GeoApi, "localities">,
  provinceId: string,
): Promise<readonly GeoLocality[]> {
  if (!provinceId) return [];
  return unwrapResult(api.localities(provinceId));
}

export async function loadCustomers(
  api: Pick<import("@/data/api").CustomersApi, "list">,
  filter: ListQuery,
  signal?: AbortSignal,
): Promise<Page<Customer>> {
  return unwrapResult(api.list(filter, { signal }));
}

export async function loadProductMovements(
  api: Pick<import("@/data/api").ProductsApi, "movements">,
  productId: string,
  query: ProductMovementQuery,
  signal?: AbortSignal,
): Promise<CursorPage<StockMovementEntry>> {
  return unwrapResult(api.movements(productId, query, { signal }));
}

export function productMovementsQueryKey(
  companyId: string,
  productId: string,
  limit = 20,
  localSnapshot?: DataSnapshot,
) {
  return [
    "product-movements",
    companyId,
    productId,
    limit,
    ...(localSnapshot ? [localSnapshot] : []),
  ] as const;
}

export function useProvinces(): QueryState<readonly GeoProvince[]> {
  const { api } = useDataContext();
  const query = useQuery({
    queryKey: ["geo-provinces"],
    queryFn: () => unwrapResult(api.geo.provinces()),
    staleTime: Infinity,
  });
  return toQueryState(query, []);
}

export function useLocalities(provinceId: string): QueryState<readonly GeoLocality[]> {
  const { api } = useDataContext();
  const query = useQuery({
    queryKey: ["geo-localities", provinceId],
    queryFn: () => loadLocalities(api.geo, provinceId),
    enabled: !!provinceId,
    staleTime: Infinity,
  });
  return toQueryState(query, []);
}

export const cashQueryKeys = {
  session: (companyId: string, localSnapshot?: DataSnapshot) =>
    ["cash-session", companyId, ...(localSnapshot ? [localSnapshot] : [])] as const,
  totals: (companyId: string, sessionId: string, localSnapshot?: DataSnapshot) =>
    ["cash-totals", companyId, sessionId, ...(localSnapshot ? [localSnapshot] : [])] as const,
  movements: (
    companyId: string,
    sessionId: string,
    pageNumber: number,
    pageSize: number,
    localSnapshot?: DataSnapshot,
  ) =>
    [
      "cash-movements",
      companyId,
      sessionId,
      pageNumber,
      pageSize,
      ...(localSnapshot ? [localSnapshot] : []),
    ] as const,
  customerAccount: (companyId: string, customerId: string, localSnapshot?: DataSnapshot) =>
    ["customer-account", companyId, customerId, ...(localSnapshot ? [localSnapshot] : [])] as const,
  customerAccountSummary: (companyId: string, customerId: string, localSnapshot?: DataSnapshot) =>
    [
      "customer-account",
      companyId,
      customerId,
      "summary",
      ...(localSnapshot ? [localSnapshot] : []),
    ] as const,
  customerAccountMovements: (companyId: string, customerId: string, localSnapshot?: DataSnapshot) =>
    [
      "customer-account",
      companyId,
      customerId,
      "movements",
      ...(localSnapshot ? [localSnapshot] : []),
    ] as const,
};

export const collectionQueryKeys = {
  document: (companyId: string, documentId: string, localSnapshot?: DataSnapshot) =>
    [
      "document-collections",
      companyId,
      documentId,
      ...(localSnapshot ? [localSnapshot] : []),
    ] as const,
  collection: (
    companyId: string,
    customerId: string,
    cashMovementId: string,
    localSnapshot?: DataSnapshot,
  ) =>
    [
      "collection-applications",
      companyId,
      customerId,
      cashMovementId,
      ...(localSnapshot ? [localSnapshot] : []),
    ] as const,
};

const emptyDocumentCollections: DocumentCollections = {
  items: [],
  totalCents: 0 as DocumentCollections["totalCents"],
  paidCents: 0 as DocumentCollections["paidCents"],
  pendingCents: 0 as DocumentCollections["pendingCents"],
};

const emptyCollectionApplications: CollectionApplications = {
  cashMovementId: "",
  receiptNumber: null,
  paymentMethod: "CASH",
  occurredAt: "",
  totalCents: 0 as CollectionApplications["totalCents"],
  documents: [],
  creditGeneratedCents: 0 as CollectionApplications["creditGeneratedCents"],
};

export function useDocumentCollections(id: string, enabled: boolean) {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: collectionQueryKeys.document(
      snapshot.activeCompanyId,
      id,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.documents.collections(id, { signal })),
    enabled: Boolean(id) && enabled,
  });
  return { ...toQueryState(query, emptyDocumentCollections), isError: query.isError };
}

export function useCollectionApplications(
  customerId: string,
  cashMovementId: string,
  enabled: boolean,
) {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: collectionQueryKeys.collection(
      snapshot.activeCompanyId,
      customerId,
      cashMovementId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) =>
      unwrapResult(
        api.customerAccount.collectionApplications(customerId, cashMovementId, { signal }),
      ),
    enabled: Boolean(customerId && cashMovementId) && enabled,
  });
  return { ...toQueryState(query, emptyCollectionApplications), isError: query.isError };
}

export const dashboardQueryKeys = {
  summary: (companyId: string, localSnapshot?: DataSnapshot) =>
    ["dashboard-summary", companyId, ...(localSnapshot ? [localSnapshot] : [])] as const,
  activity: (companyId: string, limit = 10, localSnapshot?: DataSnapshot) =>
    ["dashboard-activity", companyId, limit, ...(localSnapshot ? [localSnapshot] : [])] as const,
};

export function useDashboardSummary(): QueryState<DashboardSummary | undefined> & {
  refetch: () => Promise<unknown>;
} {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: dashboardQueryKeys.summary(
      snapshot.activeCompanyId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.dashboard.summary({ signal })),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  return { ...toQueryState(query, undefined), refetch: query.refetch };
}

export function useDashboardActivity(
  limit = 10,
): QueryState<DashboardActivity | undefined> & { refetch: () => Promise<unknown> } {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: dashboardQueryKeys.activity(
      snapshot.activeCompanyId,
      limit,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.dashboard.activity(limit, { signal })),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  return { ...toQueryState(query, undefined), refetch: query.refetch };
}

export function cashSessionQueryEnabled(sessionId: string | undefined): boolean {
  return Boolean(sessionId);
}

export async function loadCashTotals(
  api: Pick<CashApi, "totals">,
  sessionId: string,
  signal?: AbortSignal,
): Promise<CashTotals> {
  if (!sessionId) return emptyCashTotals;
  return (await unwrapResult(api.totals({ signal }))) ?? emptyCashTotals;
}

export async function loadCashMovements(
  api: Pick<CashApi, "movements">,
  query: CashMovementQuery,
  signal?: AbortSignal,
): Promise<Page<CashMovement>> {
  if (!query.sessionId) return emptyPage<CashMovement>();
  return unwrapResult(api.movements(query, { signal }));
}

function normalizeLocalSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function localProductSummary(product: import("@/features/products/types").Product): ProductSummary {
  return {
    barcode: product.barcode,
    category: product.category,
    categoryId: product.categoryId,
    companyId: product.companyId,
    costCents: product.costCents,
    id: product.id,
    minimumStock: product.minimumStock,
    name: product.name,
    priceCents: product.priceCents,
    sku: product.sku,
    status: product.status,
    unit: product.unit,
    stock: calculateAvailableStock(product.movements),
    lowStock: isLowStock(product),
  };
}

function localDocumentSummary(
  document: import("@/features/documents/types").CommercialDocument,
): DocumentSummary {
  const { items, ...fields } = document;
  return { ...fields, totalCents: calculateDocumentTotal(items), itemCount: items.length };
}

function localCashSessionView(
  session: import("@/features/cash/local-types").LocalCashSession,
): CashSession {
  const { movements, ...view } = session;
  void movements;
  return view;
}

export function useCustomers(
  filter: ListQuery = {},
  options: QueryOptions = {},
): QueryState<Page<Customer>> {
  const { api, snapshot } = useDataContext();
  const pageNumber = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  const localCustomers = snapshot.customers
    .filter((entry) => entry.companyId === snapshot.activeCompanyId)
    .filter((entry) => !filter.status || filter.status === "all" || entry.status === filter.status)
    .filter(
      (entry) =>
        !filter.vatCondition ||
        filter.vatCondition === "all" ||
        entry.vatCondition === filter.vatCondition,
    )
    .filter(
      (entry) =>
        !filter.search ||
        normalizeLocalSearch(
          `${entry.commercialName} ${entry.legalName} ${entry.contactName} ${entry.contactEmail} ${entry.contactPhone} ${entry.documentNumber}`,
        ).includes(normalizeLocalSearch(filter.search)),
    )
    .sort(
      (a, b) =>
        normalizeLocalSearch(a.commercialName).localeCompare(
          normalizeLocalSearch(b.commercialName),
          "es",
        ) || a.id.localeCompare(b.id),
    );
  const initialData: Page<Customer> = {
    items: localCustomers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    page: pageNumber,
    pageSize,
    total: localCustomers.length,
  };
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["customers", "api", snapshot.activeCompanyId, filter]
        : ["customers", "local", snapshot.activeCompanyId, filter, snapshot],
    queryFn: ({ signal }) => loadCustomers(api.customers, filter, signal),
    placeholderData: keepPreviousData,
    initialData: dataSource === "local" ? initialData : undefined,
    enabled: options.enabled,
  });
  return toQueryState(query, dataSource === "api" ? emptyPage<Customer>() : initialData);
}

export function useCustomerSearch(
  term: string,
  options: QueryOptions = {},
): QueryState<Page<Customer>> {
  return useCustomers(
    { search: term, status: "active", page: 1, pageSize: 10 },
    { ...options, enabled: options.enabled ?? Boolean(term.trim()), staleTime: 0 },
  );
}

export function useCustomer(id: string): QueryState<Customer | undefined> {
  const { api, snapshot } = useDataContext();
  const localCustomer = snapshot.customers.find(
    (entry) => entry.id === id && entry.companyId === snapshot.activeCompanyId,
  );
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["customer", "api", snapshot.activeCompanyId, id]
        : ["customer", "local", snapshot.activeCompanyId, id, snapshot],
    queryFn: async () => unwrapResult(api.customers.get(id)),
    enabled: Boolean(id),
    initialData: dataSource === "local" ? localCustomer : undefined,
  });
  return toQueryState(query, localCustomer);
}

export function useProducts(
  filter: ListQuery = {},
  options: QueryOptions = {},
): QueryState<Page<ProductSummary>> & { refetch: () => Promise<unknown> } {
  const { api, snapshot } = useDataContext();
  const localEntries =
    dataSource === "local"
      ? snapshot.products
          .filter((entry) => entry.companyId === snapshot.activeCompanyId)
          .filter(
            (entry) => !filter.status || filter.status === "all" || entry.status === filter.status,
          )
          .filter((entry) => !filter.lowStock || isLowStock(entry))
          .filter(
            (entry) =>
              !filter.search ||
              normalizeLocalSearch(
                `${entry.name} ${entry.sku} ${entry.barcode} ${entry.category}`,
              ).includes(normalizeLocalSearch(filter.search)),
          )
          .sort((a, b) => a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id))
          .map(localProductSummary)
      : [];
  const pageNumber = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  const initialData: Page<ProductSummary> = {
    items: localEntries.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    page: pageNumber,
    pageSize,
    total: localEntries.length,
  };
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["products", snapshot.activeCompanyId, filter]
        : ["products", snapshot.activeCompanyId, filter, snapshot],
    queryFn: ({ signal }) => unwrapResult(api.products.list(filter, { signal })),
    placeholderData: keepPreviousData,
    initialData: dataSource === "local" ? initialData : undefined,
    enabled: options.enabled,
    staleTime: options.staleTime ?? 30_000,
  });
  return {
    ...toQueryState(query, dataSource === "api" ? emptyPage<ProductSummary>() : initialData),
    refetch: query.refetch,
  };
}

export function useProduct(id: string): QueryState<ProductSummary | undefined> {
  const { api, snapshot } = useDataContext();
  const product =
    dataSource === "local"
      ? snapshot.products.find(
          (entry) => entry.id === id && entry.companyId === snapshot.activeCompanyId,
        )
      : undefined;
  const fallback = product ? localProductSummary(product) : undefined;
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["product", snapshot.activeCompanyId, id]
        : ["product", snapshot.activeCompanyId, id, snapshot],
    queryFn: ({ signal }) => unwrapResult(api.products.get(id, { signal })),
    enabled: Boolean(id),
    initialData: dataSource === "local" ? fallback : undefined,
    staleTime: 30_000,
  });
  return toQueryState(query, fallback);
}

export function useProductMovements(
  productId: string,
  params: Pick<ProductMovementQuery, "limit"> = {},
  options: QueryOptions = {},
) {
  const { api, snapshot } = useDataContext();
  return useInfiniteQuery({
    queryKey: productMovementsQueryKey(
      snapshot.activeCompanyId,
      productId,
      params.limit ?? 20,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ pageParam, signal }) =>
      loadProductMovements(api.products, productId, { ...params, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(productId) && options.enabled !== false,
    staleTime: 30_000,
  });
}

export function useStockMovements(
  params: InventoryMovementQuery = {},
  options: QueryOptions = {},
): QueryState<Page<StockMovementEntry>> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: [
      "stock-movements",
      snapshot.activeCompanyId,
      params,
      ...(dataSource === "local" ? [snapshot] : []),
    ],
    queryFn: ({ signal }) => unwrapResult(api.inventory.movements(params, { signal })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options.enabled !== false,
  });
  return toQueryState(query, emptyPage<StockMovementEntry>());
}

export function useInventorySummary(): QueryState<InventorySummary> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: [
      "inventory-summary",
      snapshot.activeCompanyId,
      ...(dataSource === "local" ? [snapshot] : []),
    ],
    queryFn: ({ signal }) => unwrapResult(api.inventory.summary({ signal })),
    staleTime: 0,
  });
  return toQueryState(query, {
    activeProducts: 0,
    totalUnits: 0,
    lowStockCount: 0,
    inventoryValueCents: 0 as InventorySummary["inventoryValueCents"],
  });
}

export function useProductSearch(
  term: string,
  options: QueryOptions & Readonly<{ includeInactive?: boolean }> = {},
): QueryState<Page<ProductSummary>> {
  const { includeInactive = false, ...queryOptions } = options;
  return useProducts(productSearchQuery(term, includeInactive), {
    ...queryOptions,
    enabled: queryOptions.enabled ?? Boolean(term.trim()),
    staleTime: 0,
  });
}

export function productSearchQuery(term: string, includeInactive = false): ListQuery {
  return {
    search: term,
    ...(includeInactive ? {} : { status: "active" }),
    page: 1,
    pageSize: 10,
  };
}

export const PRODUCT_CATEGORIES_QUERY_KEY = "product-categories";

export function useProductCategories(
  term: string,
  options: QueryOptions = {},
): QueryState<Page<ElemSubType>> {
  const { api, snapshot } = useDataContext();
  const filter = { search: term, page: 1, pageSize: 10 };
  const query = useQuery({
    queryKey: [PRODUCT_CATEGORIES_QUERY_KEY, snapshot.activeCompanyId, filter],
    queryFn: ({ signal }) =>
      unwrapResult(api.elemSubTypes.list(PRODUCT_CATEGORY_TYPE_ID, filter, { signal })),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
    staleTime: 0,
  });
  return toQueryState(query, emptyPage<ElemSubType>());
}

export function useDocuments(
  filter: ListQuery = {},
  options: QueryOptions = {},
): QueryState<Page<DocumentSummary>> {
  const { api, snapshot } = useDataContext();
  const entries =
    dataSource === "local"
      ? snapshot.documents
          .filter((entry) => entry.companyId === snapshot.activeCompanyId)
          .filter((entry) => !filter.customerId || entry.customerId === filter.customerId)
          .filter(
            (entry) => !filter.status || filter.status === "all" || entry.status === filter.status,
          )
          .filter(
            (entry) =>
              !filter.search ||
              normalizeLocalSearch(`${entry.internalNumber} ${entry.customerName}`).includes(
                normalizeLocalSearch(filter.search),
              ),
          )
          .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
          .map(localDocumentSummary)
      : [];
  const pageNumber = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  const initialData: Page<DocumentSummary> = {
    items: entries.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    page: pageNumber,
    pageSize,
    total: entries.length,
  };
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["documents", snapshot.activeCompanyId, filter]
        : ["documents", snapshot.activeCompanyId, filter, snapshot],
    queryFn: ({ signal }) => unwrapResult(api.documents.list(filter, { signal })),
    placeholderData: keepPreviousData,
    initialData: dataSource === "local" ? initialData : undefined,
    enabled: options.enabled,
    staleTime: 30_000,
  });
  return toQueryState(query, dataSource === "api" ? emptyPage<DocumentSummary>() : initialData);
}

export function useDocument(id: string): QueryState<DocumentWithTotal | undefined> {
  const { api, snapshot } = useDataContext();
  const local =
    dataSource === "local"
      ? snapshot.documents.find(
          (entry) => entry.id === id && entry.companyId === snapshot.activeCompanyId,
        )
      : undefined;
  const fallback = local
    ? (() => {
        const totalCents = calculateDocumentTotal(local.items);
        const paidCents =
          snapshot.customers
            .find((customer) => customer.id === local.customerId)
            ?.movements.filter(
              (movement) => movement.documentId === local.id && movement.amountCents < 0,
            )
            .reduce((sum, movement) => sum - movement.amountCents, 0) ?? 0;
        return {
          ...local,
          pendingCents: calculateDocumentPendingCents(totalCents, paidCents, local.status),
          totalCents,
        };
      })()
    : undefined;
  const query = useQuery({
    queryKey:
      dataSource === "api"
        ? ["document", snapshot.activeCompanyId, id]
        : ["document", snapshot.activeCompanyId, id, snapshot],
    queryFn: ({ signal }) => unwrapResult(api.documents.get(id, { signal })),
    enabled: Boolean(id),
    initialData: dataSource === "local" ? fallback : undefined,
    staleTime: 30_000,
  });
  return toQueryState(query, fallback);
}

export type CashSessionQueryState = QueryState<CashSession | undefined> &
  Readonly<{ isError: boolean; refetch: () => Promise<unknown> }>;

export function useCashSession(): CashSessionQueryState {
  const { api, snapshot } = useDataContext();
  const localSession =
    dataSource === "local"
      ? snapshot.cashSessions.find(
          (entry) => entry.companyId === snapshot.activeCompanyId && entry.status === "open",
        )
      : undefined;
  const localView = localSession ? localCashSessionView(localSession) : undefined;
  const query = useQuery({
    queryKey: cashQueryKeys.session(
      snapshot.activeCompanyId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.cash.current({ signal })),
    initialData: localView,
  });
  return {
    data: query.data ?? undefined,
    error: query.error as AppError | null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export type CashResourceQueryState<T> = QueryState<T> &
  Readonly<{ isError: boolean; refetch: () => Promise<unknown> }>;

export function useCashTotals(): CashResourceQueryState<CashTotals> {
  const { api, snapshot } = useDataContext();
  const session = useCashSession();
  const sessionId = session.data?.id ?? "";
  const query = useQuery({
    queryKey: cashQueryKeys.totals(
      snapshot.activeCompanyId,
      sessionId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => loadCashTotals(api.cash, sessionId, signal),
    enabled: cashSessionQueryEnabled(sessionId),
  });
  return {
    ...toQueryState(query, emptyCashTotals),
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useCashMovements(
  pageNumber: number,
  pageSize: number,
): CashResourceQueryState<Page<CashMovement>> {
  const { api, snapshot } = useDataContext();
  const session = useCashSession();
  const sessionId = session.data?.id ?? "";
  const queryParams: CashMovementQuery = { sessionId, page: pageNumber, pageSize };
  const query = useQuery({
    queryKey: cashQueryKeys.movements(
      snapshot.activeCompanyId,
      sessionId,
      pageNumber,
      pageSize,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => loadCashMovements(api.cash, queryParams, signal),
    enabled: cashSessionQueryEnabled(sessionId),
    placeholderData: keepPreviousData,
  });
  return {
    ...toQueryState(query, emptyPage<CashMovement>()),
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useCustomerAccount(
  customerId: string,
  options: QueryOptions = {},
): CashResourceQueryState<CustomerAccount | undefined> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: cashQueryKeys.customerAccount(
      snapshot.activeCompanyId,
      customerId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.customerAccount.get(customerId, { signal })),
    enabled: Boolean(customerId) && options.enabled !== false,
  });
  return { ...toQueryState(query, undefined), isError: query.isError, refetch: query.refetch };
}

export async function loadCustomerAccountMovements(
  api: Pick<import("@/data/api").CustomerAccountApi, "movements">,
  customerId: string,
  cursor: string | undefined,
  signal?: AbortSignal,
): Promise<CustomerAccountMovementPage> {
  return unwrapResult(api.movements(customerId, cursor, { signal }));
}

export function useCustomerAccountSummary(
  customerId: string,
): CashResourceQueryState<CustomerAccountSummary | undefined> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: cashQueryKeys.customerAccountSummary(
      snapshot.activeCompanyId,
      customerId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ signal }) => unwrapResult(api.customerAccount.summary(customerId, { signal })),
    enabled: Boolean(customerId),
  });
  return { ...toQueryState(query, undefined), isError: query.isError, refetch: query.refetch };
}

export function useCustomerAccountMovements(customerId: string) {
  const { api, snapshot } = useDataContext();
  return useInfiniteQuery({
    queryKey: cashQueryKeys.customerAccountMovements(
      snapshot.activeCompanyId,
      customerId,
      dataSource === "local" ? snapshot : undefined,
    ),
    queryFn: ({ pageParam, signal }) =>
      loadCustomerAccountMovements(api.customerAccount, customerId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(customerId),
  });
}

export function useCompanies(): QueryState<readonly Company[]> {
  const { api, snapshot } = useDataContext();
  const query = useQuery({
    queryKey: ["companies", dataSource],
    queryFn: () => unwrapResult(api.companies.list()),
    initialData: dataSource === "local" ? snapshot.companies : undefined,
  });
  return toQueryState(query, dataSource === "local" ? snapshot.companies : []);
}

export function useAuthSession(): QueryState<AuthSession | undefined> {
  const { snapshot } = useDataContext();
  const query = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => unwrapResult(requestApi<AuthSession>("/auth/me")),
    enabled: dataSource === "api",
    staleTime: 30_000,
  });
  if (dataSource === "local") {
    const company = snapshot.companies.find((entry) => entry.id === snapshot.activeCompanyId);
    if (company) {
      const session: AuthSession = {
        user: { id: "demo-user", email: "demo@operia.local", name: "Demo" },
        companies: snapshot.companies,
        activeCompany: company,
        role: { id: "demo-admin", name: "ADMIN" },
        permissions,
      };
      return { data: session, error: null, isLoading: false, isFetching: false };
    }
  }
  return toQueryState(query, undefined);
}

/** Returns false while the API session is loading; the local demo grants access to every permission. */
export function useCan(...requestedPermissions: string[]): boolean {
  const session = useAuthSession();
  if (dataSource === "local") return true;
  if (session.isLoading || !session.data) return false;
  const authSession = session.data;
  return requestedPermissions.some((permission) => authSession.permissions.includes(permission));
}

export type ActiveCompanyQueryState = QueryState<Company | undefined> &
  Readonly<{ session: AuthSession | undefined }>;

export function useActiveCompany(): ActiveCompanyQueryState {
  const { snapshot } = useDataContext();
  const session = useAuthSession();
  const company = snapshot.companies.find((entry) => entry.id === snapshot.activeCompanyId);
  return {
    data: dataSource === "api" ? session.data?.activeCompany : company,
    error: session.error,
    isLoading: session.isLoading,
    isFetching: session.isFetching,
    session: session.data,
  };
}

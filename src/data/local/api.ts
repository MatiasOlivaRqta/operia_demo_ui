import type { Dispatch } from "react";
import type {
  CashMovementQuery,
  CursorPage,
  DataApi,
  DataSnapshot,
  Page,
  ProductMovementQuery,
  StockMovementInput,
  ManagedRole,
  ManagedUser,
} from "@/data/api";
import { failure, success, type Result } from "@/data/result";
import type { AppAction, AppState } from "@/features/store/app-store";
import {
  addStockMovement,
  adjustStock,
  cancelDocument,
  calculateDocumentPendingCents,
  closeCash,
  collectPayment,
  createCustomer,
  createDocument,
  createProduct,
  deactivateCustomer,
  openCash,
  reverseStockMovement,
  setCustomerStatus,
  updateCustomer,
  updateProduct,
} from "@/features/store/domain";
import { toCents } from "@/lib/money";
import type { Product, ProductSummary, StockMovementEntry } from "@/features/products/types";
import type {
  CommercialDocument,
  DocumentSummary,
  DocumentWithTotal,
} from "@/features/documents/types";
import { calculateAvailableStock, isLowStock } from "@/features/products/domain";
import { calculateDocumentTotal } from "@/features/documents/domain";
import { asCents } from "@/lib/money";
import type {
  CashSession,
  CashTotals,
  CustomerAccount,
  CustomerAccountMovementPage,
  CustomerAccountSummary,
  DocumentCollections,
  CollectionApplications,
} from "@/features/cash/types";
import { calculatePaymentMethodTotal, calculateTheoreticalCash } from "@/features/cash/domain";
import { calculateCustomerBalance } from "@/features/customers/domain";
import type { Customer } from "@/features/customers/types";
import {
  MAX_CATEGORY_LENGTH,
  cleanCategoryText,
  normalizeCategoryText,
} from "@/features/catalog/category-options";
import { PRODUCT_CATEGORY_TYPE_ID, type ElemSubType } from "@/features/catalog/types";
import type { LocalCashSession } from "@/features/cash/local-types";
import { toDocumentItems } from "@/data/api";
import { permissions, permissionGroups } from "@/features/auth/permissions";

type Commit = (state: AppState) => void;
type IdempotentEntry = {
  fingerprint: string;
  result: Result<DocumentWithTotal>;
};

function apply<T>(
  result: Result<AppState>,
  commit: Commit,
  select: (state: AppState) => T,
): Result<T> {
  if (!result.ok) return { ok: false, error: result.error };
  commit(result.value);
  return success(select(result.value));
}

function filterByQuery<T extends { status: string }>(
  entries: readonly T[],
  query?: { search?: string; status?: string },
): readonly T[] {
  const normalizedSearch = query?.search?.trim().toLocaleLowerCase("es");
  return entries.filter((entry) => {
    const statusMatches = !query?.status || query.status === "all" || entry.status === query.status;
    if (!statusMatches || !normalizedSearch) return statusMatches;
    return JSON.stringify(entry).toLocaleLowerCase("es").includes(normalizedSearch);
  });
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function page<T>(entries: readonly T[], query?: { page?: number; pageSize?: number }): Page<T> {
  const pageNumber = Math.max(1, Math.floor(query?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query?.pageSize ?? 25)));
  const start = (pageNumber - 1) * pageSize;
  return {
    items: entries.slice(start, start + pageSize),
    page: pageNumber,
    pageSize,
    total: entries.length,
  };
}

function cursorOffset(cursor?: string): number {
  if (!cursor) return 0;
  const match = /^m([0-9a-z]+)$/i.exec(cursor);
  if (!match?.[1]) return 0;
  const offset = Number.parseInt(match[1], 36);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function productMovementPage<T>(
  entries: readonly T[],
  query?: ProductMovementQuery,
): CursorPage<T> {
  const limit = Math.min(100, Math.max(1, Math.floor(query?.limit ?? 20)));
  const start = cursorOffset(query?.cursor);
  const items = entries.slice(start, start + limit);
  const nextOffset = start + items.length;
  return {
    items,
    nextCursor: nextOffset < entries.length ? `m${nextOffset.toString(36)}` : null,
  };
}

function productSummary(product: Product): ProductSummary {
  const { movements, ...fields } = product;
  const stock = calculateAvailableStock(product.movements);
  void movements;
  return { ...fields, stock, lowStock: isLowStock(product) };
}

function documentTotal(state: AppState, document: CommercialDocument): DocumentWithTotal {
  const customer = state.customers.find((entry) => entry.id === document.customerId);
  const paidCents = asCents(
    customer?.movements
      .filter((movement) => movement.documentId === document.id && movement.amountCents < 0)
      .reduce((sum, movement) => sum - movement.amountCents, 0) ?? 0,
  );
  const totalCents = calculateDocumentTotal(document.items);
  return {
    ...document,
    pendingCents: calculateDocumentPendingCents(totalCents, paidCents, document.status),
    totalCents,
  };
}

function documentSummary(document: CommercialDocument): DocumentSummary {
  const withTotal = { ...document, totalCents: calculateDocumentTotal(document.items) };
  return {
    ...(withTotal.cancelledBy ? { cancelledBy: withTotal.cancelledBy } : {}),
    companyId: withTotal.companyId,
    customerId: withTotal.customerId,
    customerName: withTotal.customerName,
    date: withTotal.date,
    id: withTotal.id,
    internalNumber: withTotal.internalNumber,
    itemCount: document.items.length,
    pointOfSale: withTotal.pointOfSale,
    status: withTotal.status,
    totalCents: withTotal.totalCents,
  };
}

function cashSessionView(session: LocalCashSession): CashSession {
  const { movements, ...view } = session;
  void movements;
  return view;
}

function cashTotals(session: LocalCashSession): CashTotals {
  return {
    byMethod: {
      Efectivo: calculatePaymentMethodTotal(session.movements, "Efectivo"),
      Tarjeta: calculatePaymentMethodTotal(session.movements, "Tarjeta"),
      Transferencia: calculatePaymentMethodTotal(session.movements, "Transferencia"),
    },
    movementsCount: session.movements.length,
    netCollectedCents: asCents(
      session.movements.reduce((sum, entry) => sum + entry.amountCents, 0),
    ),
    openingBalanceCents: session.openingBalanceCents,
    theoreticalCashCents: calculateTheoreticalCash(session, session.movements),
  };
}

function localCustomerAccount(state: AppState, customerId: string): CustomerAccount | undefined {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  if (!customer) return undefined;
  const documents = state.documents.filter(
    (document) =>
      document.companyId === state.activeCompanyId &&
      document.customerId === customerId &&
      document.status !== "CANCELLED",
  );
  const allPendingItems = documents
    .map((document) => {
      const totalCents = calculateDocumentTotal(document.items);
      const paidCents = asCents(
        customer.movements
          .filter((movement) => movement.documentId === document.id && movement.amountCents < 0)
          .reduce((sum, movement) => sum - movement.amountCents, 0),
      );
      return {
        date: document.date,
        id: document.id,
        internalNumber: document.internalNumber,
        paidCents,
        pendingCents: asCents(Math.max(0, totalCents - paidCents)),
        totalCents,
      };
    })
    .filter((document) => document.pendingCents > 0);
  const balance = calculateCustomerBalance(customer.movements);
  const debtCents = asCents(Math.max(0, balance));
  const creditCents = asCents(Math.max(0, -balance));
  return {
    customerId,
    debtCents,
    creditCents,
    netBalanceCents: balance,
    pending: {
      items: allPendingItems.slice(0, 100),
      page: 1,
      pageSize: 100,
      total: allPendingItems.length,
    },
  };
}

function localCustomerMovements(
  state: AppState,
  customerId: string,
  cursor?: string,
): CustomerAccountMovementPage | undefined {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  if (!customer) return undefined;
  const sorted = [...customer.movements].sort(
    (left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  );
  let balance = calculateCustomerBalance(customer.movements);
  const items = sorted.map((movement) => {
    const amount = movement.amountCents;
    const kind =
      movement.relationKind === "CREDIT_APPLIED"
        ? "CREDIT_APPLIED"
        : movement.type === "Cobro"
          ? "COLLECTION"
          : movement.amountCents < 0
            ? "CANCELLATION"
            : "DOCUMENT";
    const debitCents = kind === "DOCUMENT" && amount > 0 ? amount : asCents(0);
    const creditCents =
      kind === "CANCELLATION" || kind === "COLLECTION" ? asCents(Math.abs(amount)) : asCents(0);
    const item = {
      id: movement.id,
      kind,
      occurredAt: movement.date,
      reference: movement.description,
      documentNumber: movement.documentId
        ? (state.documents.find((document) => document.id === movement.documentId)
            ?.internalNumber ?? null)
        : null,
      documentId: movement.documentId ?? null,
      cashMovementId: movement.cashMovementId ?? null,
      debitCents,
      creditCents,
      appliedCents: null,
      balanceCents: balance,
    } as const;
    balance = asCents(balance - debitCents + creditCents);
    return item;
  });
  const parsedOffset = cursor === undefined ? 0 : Number(cursor);
  const start = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const pageItems = items.slice(start, start + 50);
  const nextOffset = start + pageItems.length;
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
  };
}

function paymentMethodDto(method: string | null | undefined): "CASH" | "TRANSFER" | "CARD" | null {
  if (method === "Efectivo") return "CASH";
  if (method === "Transferencia") return "TRANSFER";
  if (method === "Tarjeta") return "CARD";
  return null;
}

function localDocumentCollections(
  state: AppState,
  documentId: string,
): DocumentCollections | undefined {
  const document = state.documents.find(
    (entry) => entry.id === documentId && entry.companyId === state.activeCompanyId,
  );
  if (!document) return undefined;
  const customer = state.customers.find(
    (entry) => entry.id === document.customerId && entry.companyId === state.activeCompanyId,
  );
  const totalCents = asCents(calculateDocumentTotal(document.items));
  const movements =
    customer?.movements.filter(
      (movement) => movement.documentId === documentId && movement.amountCents < 0,
    ) ?? [];
  const items =
    document.status === "CANCELLED"
      ? []
      : movements
          .map((movement) => ({
            kind:
              movement.relationKind ??
              (movement.cashMovementId ? ("PAYMENT" as const) : ("CREDIT_APPLIED" as const)),
            occurredAt:
              movement.date.length === 10 ? `${movement.date}T12:00:00.000Z` : movement.date,
            amountCents: asCents(-movement.amountCents),
            paymentMethod: paymentMethodDto(movement.paymentMethod),
            receiptNumber: movement.receiptNumber ?? null,
            cashMovementId: movement.cashMovementId ?? null,
          }))
          .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const paidCents = asCents(items.reduce((sum, item) => sum + item.amountCents, 0));
  return {
    items,
    totalCents,
    paidCents,
    pendingCents: calculateDocumentPendingCents(totalCents, paidCents, document.status),
  };
}

function localCollectionApplications(
  state: AppState,
  customerId: string,
  cashMovementId: string,
): CollectionApplications | undefined {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  const movements =
    customer?.movements.filter((movement) => movement.cashMovementId === cashMovementId) ?? [];
  if (!customer || movements.length === 0) return undefined;
  const grouped = new Map<string, number>();
  for (const movement of movements) {
    if (movement.documentId)
      grouped.set(
        movement.documentId,
        (grouped.get(movement.documentId) ?? 0) - movement.amountCents,
      );
  }
  const receipt = state.cashSessions
    .flatMap((session) => session.movements)
    .find((movement) => movement.id === cashMovementId);
  const documentApplications = [...grouped].flatMap(([documentId, amountCents]) => {
    const document = state.documents.find(
      (entry) => entry.id === documentId && entry.companyId === state.activeCompanyId,
    );
    return document
      ? [
          {
            documentId,
            documentNumber: document.internalNumber,
            amountCents: asCents(amountCents),
            status: document.status,
          },
        ]
      : [];
  });
  return {
    cashMovementId,
    receiptNumber:
      movements.find((movement) => movement.receiptNumber)?.receiptNumber ??
      receipt?.receiptNumber ??
      null,
    paymentMethod:
      paymentMethodDto(
        movements.find((movement) => movement.paymentMethod)?.paymentMethod ??
          receipt?.paymentMethod,
      ) ?? "CASH",
    occurredAt:
      movements[0]!.date.length === 10 ? `${movements[0]!.date}T12:00:00.000Z` : movements[0]!.date,
    totalCents: asCents(movements.reduce((sum, movement) => sum - movement.amountCents, 0)),
    documents: documentApplications,
    creditGeneratedCents: asCents(
      movements
        .filter((movement) => !movement.documentId)
        .reduce((sum, movement) => sum - movement.amountCents, 0),
    ),
  };
}

function localCustomerSummary(
  state: AppState,
  customerId: string,
): CustomerAccountSummary | undefined {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  if (!customer) return undefined;
  return {
    customerId,
    invoicedCents: asCents(
      customer.movements
        .filter((movement) => movement.amountCents > 0)
        .reduce((sum, movement) => sum + movement.amountCents, 0),
    ),
    collectedCents: asCents(
      customer.movements
        .filter((movement) => movement.amountCents < 0)
        .reduce((sum, movement) => sum + Math.abs(movement.amountCents), 0),
    ),
    netBalanceCents: calculateCustomerBalance(customer.movements),
  };
}

function movementEntry(
  product: Product,
  movement: Product["movements"][number],
): StockMovementEntry {
  return {
    ...movement,
    date: movement.date.length === 10 ? `${movement.date}T00:00:00.000Z` : movement.date,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    reversed: product.movements.some((entry) => entry.reversesMovementId === movement.id),
  };
}

function argentinaCalendarDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// shortcut: categorías creadas en modo local viven en memoria del módulo y se pierden al recargar; alcanza para desarrollo sin backend.
const createdCategories = new Map<string, Map<string, string>>();

const categoryKey = normalizeCategoryText;

function localCategories(state: AppState): ElemSubType[] {
  const byId = new Map<string, string>();
  for (const product of state.products) {
    if (product.companyId === state.activeCompanyId) byId.set(product.categoryId, product.category);
  }
  for (const [id, description] of createdCategories.get(state.activeCompanyId) ?? []) {
    byId.set(id, description);
  }
  return [...byId].map(([id, description]) => ({
    description,
    elemTypeId: PRODUCT_CATEGORY_TYPE_ID,
    id,
  }));
}

function categoryOf(state: AppState, categoryId: string): Result<string> {
  const found = localCategories(state).find((entry) => entry.id === categoryId);
  return found
    ? success(found.description)
    : failure(
        "validation",
        "Revisá los datos ingresados.",
        {
          categoryId: "errors.categoryCompanyRequired",
        },
        "errors.validationFailed",
      );
}

export function createLocalApi(
  initialState: AppState,
  dispatch: Dispatch<AppAction>,
  idempotency: Map<string, IdempotentEntry>,
  apiMode = false,
): DataApi {
  let state = initialState;
  const commit: Commit = (nextState) => {
    state = nextState;
    dispatch({ state: nextState, type: "replace-state" });
  };
  const companyId = (): string => state.activeCompanyId;

  return {
    users: {
      list: async () =>
        success<readonly ManagedUser[]>([
          {
            id: "demo-user",
            email: "demo@operia.local",
            name: "Demo",
            role: { id: "demo-admin", name: "ADMIN" },
          },
        ]),
      create: async () =>
        failure(
          "forbidden",
          "La gestión de usuarios no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
      update: async () =>
        failure(
          "forbidden",
          "La gestión de usuarios no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
      delete: async () =>
        failure(
          "business_rule",
          "La gestión de usuarios no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
    },
    roles: {
      list: async () =>
        success<readonly ManagedRole[]>([
          { id: "demo-admin", name: "ADMIN", isSystem: true, permissions, userCount: 1 },
        ]),
      permissionCatalog: async () => success(permissionGroups),
      create: async () =>
        failure(
          "forbidden",
          "La gestión de roles no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
      update: async () =>
        failure(
          "forbidden",
          "La gestión de roles no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
      delete: async () =>
        failure(
          "business_rule",
          "La gestión de roles no está disponible en el modo demo.",
          undefined,
          "errors.demoUserManagementReadOnly",
        ),
    },
    notifications: {
      list: async (query) =>
        success({ items: [], page: query?.page ?? 1, pageSize: query?.pageSize ?? 20, total: 0 }),
      unreadCount: async () => success(0),
      markRead: async () => success({ ok: true as const }),
      markAllRead: async () => success({ updated: 0 }),
      createTelegramLink: async () =>
        failure(
          "business_rule",
          "Vincular Telegram no está disponible en modo demo.",
          undefined,
          "errors.telegramDemoUnavailable",
        ),
    },
    elemSubTypes: {
      list: async (typeId, query) => {
        if (typeId !== PRODUCT_CATEGORY_TYPE_ID)
          return failure(
            "not_found",
            "No encontramos ese tipo de elemento.",
            undefined,
            "errors.elementTypeNotFound",
          );
        const term = categoryKey(query?.search ?? "");
        const entries = localCategories(state)
          .filter((entry) => categoryKey(entry.description).includes(term))
          .sort((a, b) =>
            categoryKey(a.description).localeCompare(categoryKey(b.description), "es"),
          );
        return success(page(entries, query));
      },
      create: async (typeId, description) => {
        if (typeId !== PRODUCT_CATEGORY_TYPE_ID)
          return failure(
            "not_found",
            "No encontramos ese tipo de elemento.",
            undefined,
            "errors.elementTypeNotFound",
          );
        const text = cleanCategoryText(description);
        if (!text || text.length > MAX_CATEGORY_LENGTH)
          return failure(
            "validation",
            "Revisá los datos ingresados.",
            {
              description: "errors.categoryLength",
            },
            "errors.validationFailed",
          );
        const existing = localCategories(state).find(
          (entry) => categoryKey(entry.description) === categoryKey(text),
        );
        if (existing) return success(existing);
        const created: ElemSubType = {
          description: text,
          elemTypeId: PRODUCT_CATEGORY_TYPE_ID,
          id: `cat-${categoryKey(text)}`,
        };
        const forCompany = createdCategories.get(companyId()) ?? new Map<string, string>();
        forCompany.set(created.id, created.description);
        createdCategories.set(companyId(), forCompany);
        return success(created);
      },
    },
    geo: {
      provinces: async () =>
        failure(
          "unexpected",
          "El catálogo geográfico no está disponible.",
          undefined,
          "errors.geoCatalogUnavailable",
        ),
      localities: async () =>
        failure(
          "unexpected",
          "El catálogo geográfico no está disponible.",
          undefined,
          "errors.geoCatalogUnavailable",
        ),
    },
    dashboard: {
      summary: async () => {
        const today = argentinaCalendarDate(new Date().toISOString());
        const yesterdayDate = new Date(`${today}T12:00:00.000Z`);
        yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
        const yesterday = yesterdayDate.toISOString().slice(0, 10);
        const documents = state.documents.filter((entry) => entry.companyId === companyId());
        const salesToday = documents.filter(
          (entry) => entry.status !== "CANCELLED" && argentinaCalendarDate(entry.date) === today,
        );
        const previousSales = documents.filter(
          (entry) =>
            entry.status !== "CANCELLED" && argentinaCalendarDate(entry.date) === yesterday,
        );
        const session = state.cashSessions.find(
          (entry) => entry.companyId === companyId() && entry.status === "open",
        );
        const collections = (session?.movements ?? []).filter(
          (entry) => argentinaCalendarDate(entry.date) === today,
        );
        const balances = state.customers
          .filter((entry) => entry.companyId === companyId())
          .map((entry) => calculateCustomerBalance(entry.movements))
          .filter((balance) => balance > 0);
        const lowStockCount = state.products.filter(
          (entry) =>
            entry.companyId === companyId() && entry.status === "active" && isLowStock(entry),
        ).length;
        return success({
          date: today,
          salesToday: {
            totalCents: asCents(
              salesToday.reduce((sum, entry) => sum + calculateDocumentTotal(entry.items), 0),
            ),
            count: salesToday.length,
            previousDayTotalCents: asCents(
              previousSales.reduce((sum, entry) => sum + calculateDocumentTotal(entry.items), 0),
            ),
          },
          collectionsToday: {
            totalCents: asCents(collections.reduce((sum, entry) => sum + entry.amountCents, 0)),
            count: collections.length,
          },
          receivables: {
            balanceCents: asCents(balances.reduce((sum, balance) => sum + balance, 0)),
            customersWithBalance: balances.length,
          },
          lowStockCount,
        });
      },
      activity: async (limit = 10) => {
        const documents = state.documents
          .filter((entry) => entry.companyId === companyId())
          .map((entry) => ({
            kind: "document" as const,
            id: entry.id,
            occurredAt: entry.date,
            reference: entry.internalNumber,
            counterparty: entry.customerName,
            amountCents: calculateDocumentTotal(entry.items),
            status: entry.status,
            refId: entry.id,
          }));
        const collections = state.cashSessions
          .filter((entry) => entry.companyId === companyId())
          .flatMap((entry) => entry.movements)
          .map((entry) => ({
            kind: "collection" as const,
            id: entry.id,
            occurredAt: entry.date,
            reference: entry.receiptNumber,
            counterparty: entry.customerName,
            amountCents: entry.amountCents,
            status: "COLLECTED" as const,
            refId: entry.id,
          }));
        const stockMovements = state.products
          .filter((entry) => entry.companyId === companyId())
          .flatMap((product) => product.movements.map((movement) => ({ product, movement })))
          .map(({ product, movement }) => ({
            kind: "stock_movement" as const,
            id: movement.id,
            occurredAt: movement.date,
            reference: movement.reference,
            counterparty: product.name,
            quantity: movement.quantity,
            status: movement.type.toLocaleUpperCase("es") as
              "INGRESO" | "SALIDA" | "AJUSTE" | "REVERSION",
            refId: product.id,
          }));
        const items = [...documents, ...collections, ...stockMovements]
          .sort(
            (left, right) =>
              right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id),
          )
          .slice(0, Math.max(1, Math.min(20, Math.floor(limit))));
        return success({ items });
      },
    },
    customers: {
      list: async (query) =>
        (() => {
          let entries: readonly Customer[] = state.customers.filter(
            (entry) => entry.companyId === companyId(),
          );
          entries = filterByQuery(entries, { status: query?.status });
          if (query?.vatCondition && query.vatCondition !== "all") {
            entries = entries.filter((entry) => entry.vatCondition === query.vatCondition);
          }
          if (query?.search?.trim()) {
            const term = normalizeName(query.search.trim());
            entries = entries.filter((entry) =>
              normalizeName(
                `${entry.commercialName} ${entry.legalName} ${entry.contactName} ${entry.contactEmail} ${entry.contactPhone} ${entry.documentNumber}`,
              ).includes(term),
            );
          }
          const sorted = [...entries].sort(
            (a, b) =>
              normalizeName(a.commercialName).localeCompare(
                normalizeName(b.commercialName),
                "es",
              ) || a.id.localeCompare(b.id),
          );
          return success(page(sorted, query));
        })(),
      get: async (id) => {
        const customer = state.customers.find(
          (entry) => entry.id === id && entry.companyId === companyId(),
        );
        return customer
          ? success(customer)
          : failure(
              "not_found",
              "No encontramos el cliente de la empresa activa.",
              undefined,
              "errors.customerNotFound",
            );
      },
      create: async (input) =>
        apply(createCustomer(state, input), commit, (next) => next.customers.at(-1)!),
      update: async (id, input) =>
        apply(updateCustomer(state, id, input), commit, (next) =>
          next.customers.find((entry) => entry.id === id && entry.companyId === companyId())!,
        ),
      deactivate: async (id) =>
        apply(deactivateCustomer(state, id), commit, (next) =>
          next.customers.find((entry) => entry.id === id && entry.companyId === companyId())!,
        ),
      setStatus: async (id, status) =>
        apply(setCustomerStatus(state, id, status), commit, (next) =>
          next.customers.find((entry) => entry.id === id && entry.companyId === companyId())!,
        ),
    },
    products: {
      list: async (query) => {
        let entries: readonly Product[] = state.products.filter(
          (entry) => entry.companyId === companyId(),
        );
        entries = filterByQuery(entries, { status: query?.status });
        if (query?.lowStock) entries = entries.filter((entry) => isLowStock(entry));
        if (query?.search?.trim()) {
          const term = normalizeName(query.search.trim());
          entries = entries.filter((entry) =>
            normalizeName(`${entry.name} ${entry.sku} ${entry.barcode} ${entry.category}`).includes(
              term,
            ),
          );
        }
        const sorted = [...entries].sort(
          (a, b) =>
            normalizeName(a.name).localeCompare(normalizeName(b.name), "es") ||
            a.id.localeCompare(b.id),
        );
        return success({ ...page(sorted.map(productSummary), query) });
      },
      get: async (id) => {
        const product = state.products.find(
          (entry) => entry.id === id && entry.companyId === companyId(),
        );
        return product
          ? success(productSummary(product))
          : failure(
              "not_found",
              "No encontramos el producto de la empresa activa.",
              undefined,
              "errors.productNotFound",
            );
      },
      movements: async (productId, query) => {
        const product = state.products.find(
          (entry) => entry.id === productId && entry.companyId === companyId(),
        );
        if (!product)
          return failure(
            "not_found",
            "No encontramos el producto de la empresa activa.",
            undefined,
            "errors.productNotFound",
          );
        const entries = [...product.movements]
          .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
          .map((movement) => movementEntry(product, movement));
        return success(productMovementPage(entries, query));
      },
      create: async ({ costPesos, pricePesos, ...input }) => {
        const category = categoryOf(state, input.categoryId);
        if (!category.ok) return category;
        return apply(
          createProduct(state, {
            ...input,
            category: category.value,
            costCents: toCents(costPesos),
            priceCents: toCents(pricePesos),
          }),
          commit,
          (next) => productSummary(next.products.at(-1)!),
        );
      },
      update: async (id, { costPesos, pricePesos, ...input }) => {
        const category = categoryOf(state, input.categoryId);
        if (!category.ok) return category;
        return apply(
          updateProduct(state, id, {
            ...input,
            category: category.value,
            costCents: toCents(costPesos),
            priceCents: toCents(pricePesos),
          }),
          commit,
          (next) =>
            productSummary(
              next.products.find((entry) => entry.id === id && entry.companyId === companyId())!,
            ),
        );
      },
      addStockMovement: async (productId, input) => updateStock(state, productId, input, commit),
      adjustStock: async (productId, input) =>
        apply(adjustStock(state, productId, input.targetStock, input.note), commit, (next) =>
          movementEntry(
            next.products.find(
              (entry) => entry.id === productId && entry.companyId === companyId(),
            )!,
            next.products
              .find((entry) => entry.id === productId && entry.companyId === companyId())!
              .movements.at(-1)!,
          ),
        ),
      reverseStockMovement: async (productId, movementId, reason) => {
        const result = reverseStockMovement(state, productId, movementId);
        if (!result.ok) return result;
        const product = result.value.products.find(
          (entry) => entry.id === productId && entry.companyId === companyId(),
        )!;
        const movement = product.movements.at(-1)!;
        const nextState = {
          ...result.value,
          products: result.value.products.map((entry) =>
            entry.id === productId && entry.companyId === companyId()
              ? {
                  ...entry,
                  movements: entry.movements.map((item) =>
                    item.id === movement.id ? { ...item, note: reason.trim() || item.note } : item,
                  ),
                }
              : entry,
          ),
        };
        return apply(success(nextState), commit, (next) =>
          movementEntry(
            next.products.find(
              (entry) => entry.id === productId && entry.companyId === companyId(),
            )!,
            next.products
              .find((entry) => entry.id === productId && entry.companyId === companyId())!
              .movements.at(-1)!,
          ),
        );
      },
    },
    inventory: {
      summary: async () => {
        const active = state.products.filter(
          (entry) => entry.companyId === companyId() && entry.status === "active",
        );
        return success({
          activeProducts: active.length,
          totalUnits: active.reduce(
            (total, product) => total + calculateAvailableStock(product.movements),
            0,
          ),
          lowStockCount: active.filter(isLowStock).length,
          inventoryValueCents: asCents(
            active.reduce(
              (total, product) =>
                total + calculateAvailableStock(product.movements) * product.costCents,
              0,
            ),
          ),
        });
      },
      movements: async (query) => {
        const entries = state.products
          .filter((product) => product.companyId === companyId())
          .flatMap((product) =>
            product.movements.map((movement) => movementEntry(product, movement)),
          )
          .filter((movement) => !query?.type || movement.type === query.type)
          .filter((movement) => !query?.productId || movement.productId === query.productId)
          .filter((movement) => !query?.from || argentinaCalendarDate(movement.date) >= query.from)
          .filter((movement) => !query?.to || argentinaCalendarDate(movement.date) <= query.to)
          .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
        return success(page(entries, query));
      },
    },
    documents: {
      list: async (query) => {
        const search = query?.search?.trim();
        const entries = state.documents
          .filter((entry) => entry.companyId === companyId())
          .filter(
            (entry) => !query?.status || query.status === "all" || entry.status === query.status,
          )
          .filter((entry) => !query?.customerId || entry.customerId === query.customerId)
          .filter(
            (entry) =>
              !search ||
              normalizeName(`${entry.internalNumber} ${entry.customerName}`).includes(
                normalizeName(search),
              ),
          )
          .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
          .map(documentSummary);
        return success(page(entries, query));
      },
      get: async (id) => {
        const document = state.documents.find(
          (entry) => entry.id === id && entry.companyId === companyId(),
        );
        return document
          ? success(documentTotal(state, document))
          : failure(
              "not_found",
              "No encontramos el comprobante de la empresa activa.",
              undefined,
              "errors.documentNotFound",
            );
      },
      collections: async (id) => {
        const document = state.documents.find(
          (entry) => entry.id === id && entry.companyId === companyId(),
        );
        if (!document)
          return failure(
            "not_found",
            "No encontramos el comprobante de la empresa activa.",
            undefined,
            "errors.documentNotFound",
          );
        return success(localDocumentCollections(state, id)!);
      },
      create: async (input, idempotencyKey) => {
        const key = `${companyId()}:documents.create:${idempotencyKey}`;
        const fingerprint = JSON.stringify(input);
        const previous = idempotency.get(key);
        if (previous) {
          return previous.fingerprint === fingerprint
            ? previous.result
            : failure(
                "conflict",
                "La clave de idempotencia ya se usó con otros datos.",
                undefined,
                "errors.idempotencyConflict",
              );
        }
        const customer = state.customers.find(
          (entry) => entry.id === input.customerId && entry.companyId === companyId(),
        );
        if (!customer)
          return failure(
            "not_found",
            "No encontramos el cliente de la empresa activa.",
            undefined,
            "errors.customerNotFound",
          );
        const items = toDocumentItems(
          input,
          state.products.filter((entry) => entry.companyId === companyId()),
        );
        if (!items.ok) return items;
        const mutation = createDocument(state, input.customerId, items.value);
        const result = apply(mutation, commit, (next) =>
          documentTotal(next, next.documents.at(-1)!),
        );
        if (result.ok) idempotency.set(key, { fingerprint, result });
        return result;
      },
      cancel: async (id, reason) =>
        apply(cancelDocument(state, id, reason), commit, (next) =>
          documentTotal(
            next,
            next.documents.find((entry) => entry.id === id && entry.companyId === companyId())!,
          ),
        ),
    },
    cash: {
      current: async () => {
        const session = state.cashSessions.find(
          (entry) => entry.companyId === companyId() && entry.status === "open",
        );
        return success(session ? cashSessionView(session) : null);
      },
      totals: async () => {
        const session = state.cashSessions.find(
          (entry) => entry.companyId === companyId() && entry.status === "open",
        );
        return success(session ? cashTotals(session) : null);
      },
      movements: async (query: CashMovementQuery) => {
        const session = state.cashSessions.find(
          (entry) => entry.companyId === companyId() && entry.id === query.sessionId,
        );
        return success(page(session ? session.movements : [], query));
      },
      open: async (input) =>
        apply(openCash(state, input.openingBalanceCents, "Matías Oliva"), commit, (next) =>
          cashSessionView(next.cashSessions.find((entry) => entry.companyId === companyId())!),
        ),
      close: async (_sessionId, input) =>
        apply(closeCash(state, input.declaredBalanceCents, input.observation), commit, (next) =>
          cashSessionView(next.cashSessions.find((entry) => entry.companyId === companyId())!),
        ),
      collectPayment: async (sessionId, input, idempotencyKey) => {
        void sessionId;
        void idempotencyKey;
        const mutation = collectPayment(
          state,
          input.customerId,
          input.amountCents,
          input.paymentMethod,
          input.documentId,
          !apiMode,
        );
        return apply(mutation, commit, (next) => {
          const movement = next.cashSessions
            .find((entry) => entry.companyId === companyId())!
            .movements.at(-1)!;
          const account = localCustomerAccount(next, input.customerId)!;
          const allocated = localCollectionApplications(next, input.customerId, movement.id);
          return {
            amountCents: movement.amountCents,
            applications:
              allocated?.documents.map(({ amountCents, documentId, documentNumber }) => ({
                amountCents,
                documentId,
                documentNumber,
              })) ?? [],
            creditGeneratedCents: allocated?.creditGeneratedCents ?? asCents(0),
            customerCreditCents: account.creditCents,
            customerId: movement.customerId,
            customerName: movement.customerName,
            documentId: input.documentId ?? null,
            movementId: movement.id,
            occurredAt: movement.date,
            paymentMethod: movement.paymentMethod,
            receiptNumber: movement.receiptNumber,
          };
        });
      },
    },
    customerAccount: {
      get: async (customerId) => {
        const account = localCustomerAccount(state, customerId);
        return account
          ? success(account)
          : failure(
              "not_found",
              "No encontramos el cliente de la empresa activa.",
              undefined,
              "errors.customerNotFound",
            );
      },
      summary: async (customerId) => {
        const summary = localCustomerSummary(state, customerId);
        return summary
          ? success(summary)
          : failure(
              "not_found",
              "No encontramos el cliente de la empresa activa.",
              undefined,
              "errors.customerNotFound",
            );
      },
      movements: async (customerId, cursor) => {
        const movements = localCustomerMovements(state, customerId, cursor);
        return movements
          ? success(movements)
          : failure(
              "not_found",
              "No encontramos el cliente de la empresa activa.",
              undefined,
              "errors.customerNotFound",
            );
      },
      collectionApplications: async (customerId, cashMovementId) => {
        const applications = localCollectionApplications(state, customerId, cashMovementId);
        return applications
          ? success(applications)
          : failure(
              "not_found",
              "No encontramos el cliente de la empresa activa.",
              undefined,
              "errors.customerNotFound",
            );
      },
    },
    companies: {
      list: async () => success(state.companies),
      setActive: async (id) => {
        const company = state.companies.find((entry) => entry.id === id);
        if (!company)
          return failure(
            "not_found",
            "No encontramos esa empresa.",
            undefined,
            "errors.companyNotFound",
          );
        state = { ...state, activeCompanyId: id };
        dispatch({ companyId: id, type: "set-company" });
        return success(company);
      },
    },
  };
}

function updateStock(
  state: AppState,
  productId: string,
  input: StockMovementInput,
  commit: Commit,
) {
  return apply(
    addStockMovement(state, productId, input.action, input.quantity, input.note),
    commit,
    (next) =>
      movementEntry(
        next.products.find(
          (entry) => entry.id === productId && entry.companyId === state.activeCompanyId,
        )!,
        next.products
          .find((entry) => entry.id === productId && entry.companyId === state.activeCompanyId)!
          .movements.at(-1)!,
      ),
  );
}

export function snapshotFromState(state: AppState): DataSnapshot {
  return {
    activeCompanyId: state.activeCompanyId,
    cashSessions: state.cashSessions,
    companies: state.companies,
    customers: state.customers,
    documents: state.documents,
    products: state.products,
  };
}

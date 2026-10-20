import type {
  CashMovement,
  CashReceipt,
  CashSession,
  CashTotals,
  CustomerAccount,
  CustomerAccountMovementPage,
  CustomerAccountSummary,
  DocumentCollections,
  CollectionApplications,
} from "@/features/cash/types";
import type {
  CashCloseValues,
  CashOpenValues,
  CollectPaymentValues,
} from "@/features/cash/schemas";
import type { Company } from "@/features/companies/types";
import type { Customer } from "@/features/customers/types";
import type { CustomerFormValues } from "@/features/customers/schemas";
import type {
  CommercialDocument,
  DocumentItem,
  DocumentSummary,
  DocumentWithTotal,
} from "@/features/documents/types";
import type { DocumentFormValues } from "@/features/documents/schemas";
import type {
  InventorySummary,
  Product,
  ProductSummary,
  StockMovementEntry,
} from "@/features/products/types";
import type {
  ProductFormValues,
  StockAdjustmentValues,
  StockMovementValues,
} from "@/features/products/schemas";
import type { ElemSubType } from "@/features/catalog/types";
import type { Result } from "@/data/result";
import type { DashboardActivity, DashboardSummary } from "@/features/dashboard/types";
import { asCents } from "@/lib/money";

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;
export type CursorPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
}>;
export type ListQuery = Readonly<{
  search?: string;
  status?: string;
  vatCondition?: string;
  lowStock?: boolean;
  customerId?: string;
  page?: number;
  pageSize?: number;
}>;
export type MovementQuery = Readonly<{ page?: number; pageSize?: number }>;
export type ProductMovementQuery = Readonly<{ limit?: number; cursor?: string }>;
export type InventoryMovementQuery = Readonly<
  MovementQuery & { type?: string; productId?: string; from?: string; to?: string }
>;
export type CashMovementQuery = Readonly<{ sessionId: string; page: number; pageSize: number }>;
export type RequestControl = Readonly<{ signal?: AbortSignal }>;
export type StockMovementInput = StockMovementValues;
export type StockAdjustmentInput = StockAdjustmentValues;
export type OpenCashInput = CashOpenValues;
export type CloseCashInput = CashCloseValues;
export type CollectPaymentInput = CollectPaymentValues;
export type Receipt = CashReceipt;

export type Notification = Readonly<{
  id: string;
  type: "ORDER_MESSAGE";
  title: string;
  body: string;
  payload: Readonly<{ chatId: number; messageId: number; username: string | null }>;
  readAt: string | null;
  createdAt: string;
}>;
export type NotificationPage = Page<Notification>;
export type TelegramLinkToken = Readonly<{ url: string; expiresAt: string }>;

export interface NotificationsApi {
  list(query?: MovementQuery, control?: RequestControl): Promise<Result<NotificationPage>>;
  unreadCount(control?: RequestControl): Promise<Result<number>>;
  markRead(id: string): Promise<Result<{ ok: true }>>;
  markAllRead(): Promise<Result<{ updated: number }>>;
  createTelegramLink(): Promise<Result<TelegramLinkToken>>;
}

export type GeoProvince = Readonly<{ id: string; name: string }>;
export type GeoLocality = Readonly<{ id: string; name: string; department: string }>;

export interface GeoApi {
  provinces(): Promise<Result<readonly GeoProvince[]>>;
  localities(provinceId: string): Promise<Result<readonly GeoLocality[]>>;
}

export interface CustomersApi {
  list(query?: ListQuery, control?: RequestControl): Promise<Result<Page<Customer>>>;
  get(id: string): Promise<Result<Customer>>;
  create(input: CustomerFormValues): Promise<Result<Customer>>;
  update(id: string, input: CustomerFormValues): Promise<Result<Customer>>;
  deactivate(id: string): Promise<Result<Customer>>;
  setStatus(id: string, status: Customer["status"]): Promise<Result<Customer>>;
}

export interface ElemSubTypesApi {
  list(
    typeId: string,
    query?: ListQuery,
    control?: RequestControl,
  ): Promise<Result<Page<ElemSubType>>>;
  create(typeId: string, description: string): Promise<Result<ElemSubType>>;
}

export interface ProductsApi {
  list(query?: ListQuery, control?: RequestControl): Promise<Result<Page<ProductSummary>>>;
  get(id: string, control?: RequestControl): Promise<Result<ProductSummary>>;
  movements(
    productId: string,
    query?: ProductMovementQuery,
    control?: RequestControl,
  ): Promise<Result<CursorPage<StockMovementEntry>>>;
  create(input: ProductFormValues): Promise<Result<ProductSummary>>;
  update(id: string, input: ProductFormValues): Promise<Result<ProductSummary>>;
  addStockMovement(
    productId: string,
    input: StockMovementInput,
  ): Promise<Result<StockMovementEntry>>;
  adjustStock(productId: string, input: StockAdjustmentInput): Promise<Result<StockMovementEntry>>;
  reverseStockMovement(
    productId: string,
    movementId: string,
    reason: string,
  ): Promise<Result<StockMovementEntry>>;
}

export interface InventoryApi {
  summary(control?: RequestControl): Promise<Result<InventorySummary>>;
  movements(
    query?: InventoryMovementQuery,
    control?: RequestControl,
  ): Promise<Result<Page<StockMovementEntry>>>;
}

export interface DocumentsApi {
  list(query?: ListQuery, control?: RequestControl): Promise<Result<Page<DocumentSummary>>>;
  get(id: string, control?: RequestControl): Promise<Result<DocumentWithTotal>>;
  create(input: DocumentFormValues, idempotencyKey: string): Promise<Result<DocumentWithTotal>>;
  cancel(id: string, reason: string): Promise<Result<DocumentWithTotal>>;
  collections(id: string, control?: RequestControl): Promise<Result<DocumentCollections>>;
}

export interface CashApi {
  current(control?: RequestControl): Promise<Result<CashSession | null>>;
  totals(control?: RequestControl): Promise<Result<CashTotals | null>>;
  movements(
    query: CashMovementQuery,
    control?: RequestControl,
  ): Promise<Result<Page<CashMovement>>>;
  open(input: OpenCashInput): Promise<Result<CashSession>>;
  close(sessionId: string, input: CloseCashInput): Promise<Result<CashSession>>;
  collectPayment(
    sessionId: string,
    input: CollectPaymentInput,
    idempotencyKey: string,
  ): Promise<Result<Receipt>>;
}

export interface DashboardApi {
  summary(control?: RequestControl): Promise<Result<DashboardSummary>>;
  activity(limit?: number, control?: RequestControl): Promise<Result<DashboardActivity>>;
}

export interface CustomerAccountApi {
  get(customerId: string, control?: RequestControl): Promise<Result<CustomerAccount>>;
  summary(customerId: string, control?: RequestControl): Promise<Result<CustomerAccountSummary>>;
  movements(
    customerId: string,
    cursor?: string,
    control?: RequestControl,
  ): Promise<Result<CustomerAccountMovementPage>>;
  collectionApplications(
    customerId: string,
    cashMovementId: string,
    control?: RequestControl,
  ): Promise<Result<CollectionApplications>>;
}

export interface CompaniesApi {
  list(): Promise<Result<readonly Company[]>>;
  setActive(id: string): Promise<Result<Company>>;
}

export type ManagedUser = Readonly<{
  id: string;
  email: string;
  name: string;
  role: Readonly<{ id: string; name: string }>;
}>;
export type ManagedRole = Readonly<{
  id: string;
  name: string;
  isSystem: boolean;
  permissions: readonly string[];
  userCount: number;
}>;
export type PermissionGroup = Readonly<{ module: string; permissions: readonly string[] }>;
export type CreateManagedUserInput = Readonly<{
  email: string;
  name: string;
  password: string;
  roleId: string;
}>;
export type UpdateManagedUserInput = Readonly<{ roleId: string }>;
export type SaveManagedRoleInput = Readonly<{ name: string; permissions: readonly string[] }>;

export interface UsersApi {
  list(control?: RequestControl): Promise<Result<readonly ManagedUser[]>>;
  create(input: CreateManagedUserInput): Promise<Result<ManagedUser>>;
  update(id: string, input: UpdateManagedUserInput): Promise<Result<ManagedUser>>;
  delete(id: string): Promise<Result<void>>;
}

export interface RolesApi {
  list(control?: RequestControl): Promise<Result<readonly ManagedRole[]>>;
  permissionCatalog(control?: RequestControl): Promise<Result<readonly PermissionGroup[]>>;
  create(input: SaveManagedRoleInput): Promise<Result<ManagedRole>>;
  update(id: string, input: Partial<SaveManagedRoleInput>): Promise<Result<ManagedRole>>;
  delete(id: string): Promise<Result<void>>;
}

export type DataApi = Readonly<{
  cash: CashApi;
  companies: CompaniesApi;
  customerAccount: CustomerAccountApi;
  dashboard: DashboardApi;
  customers: CustomersApi;
  documents: DocumentsApi;
  elemSubTypes: ElemSubTypesApi;
  geo: GeoApi;
  inventory: InventoryApi;
  notifications: NotificationsApi;
  products: ProductsApi;
  users: UsersApi;
  roles: RolesApi;
}>;

export type DataSnapshot = Readonly<{
  activeCompanyId: string;
  cashSessions: readonly import("@/features/cash/local-types").LocalCashSession[];
  companies: readonly Company[];
  customers: readonly Customer[];
  documents: readonly CommercialDocument[];
  products: readonly Product[];
}>;

export function toDocumentItems(
  input: DocumentFormValues,
  products: readonly Product[],
): Result<readonly DocumentItem[]> {
  const items: DocumentItem[] = [];
  for (const line of input.items) {
    const product = products.find((entry) => entry.id === line.productId);
    if (!product) {
      return {
        ok: false,
        error: {
          code: "not_found",
          key: "errors.selectedProductNotFound",
          message: "No encontramos uno de los productos elegidos.",
        },
      };
    }
    items.push({
      discountRate: line.discountRate,
      productId: product.id,
      productName: product.name,
      quantity: line.quantity,
      sku: product.sku,
      taxRate: line.taxRate,
      unitPriceCents: asCents(line.unitPriceCents),
    });
  }
  return { ok: true, value: items };
}

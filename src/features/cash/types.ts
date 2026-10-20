import type { Cents } from "@/lib/money";

export type CashSessionStatus = "closed" | "open";
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia";

export type CashMovement = {
  amountCents: Cents;
  customerId: string;
  customerName: string;
  date: string;
  documentNumber: string | null;
  id: string;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  type: "Cobro";
};

export type CashSession = {
  closedAt?: string;
  companyId?: string;
  declaredBalanceCents?: Cents;
  differenceCents?: Cents;
  id: string;
  observation?: string;
  openedBy: Readonly<{ name: string }>;
  openedAt: string;
  openingBalanceCents: Cents;
  status: CashSessionStatus;
};

export type CashTotals = {
  byMethod: Readonly<Record<PaymentMethod, Cents>>;
  movementsCount: number;
  netCollectedCents: Cents;
  openingBalanceCents: Cents;
  theoreticalCashCents: Cents;
};

export const emptyCashTotals: CashTotals = {
  byMethod: { Efectivo: 0 as Cents, Tarjeta: 0 as Cents, Transferencia: 0 as Cents },
  movementsCount: 0,
  netCollectedCents: 0 as Cents,
  openingBalanceCents: 0 as Cents,
  theoreticalCashCents: 0 as Cents,
};

export type CustomerAccount = {
  customerId: string;
  debtCents: Cents;
  creditCents: Cents;
  netBalanceCents: Cents;
  pending: Readonly<{
    items: readonly PendingDocument[];
    page: number;
    pageSize: number;
    total: number;
  }>;
};

export type PendingDocument = {
  date: string;
  id: string;
  internalNumber: string;
  paidCents: Cents;
  pendingCents: Cents;
  totalCents: Cents;
};

export type CustomerAccountSummary = {
  customerId: string;
  invoicedCents: Cents;
  collectedCents: Cents;
  netBalanceCents: Cents;
};

export type CustomerAccountMovementKind =
  "DOCUMENT" | "CANCELLATION" | "COLLECTION" | "CREDIT_APPLIED";

export type CustomerAccountLedgerMovement = {
  id: string;
  kind: CustomerAccountMovementKind;
  occurredAt: string;
  reference: string;
  documentNumber: string | null;
  documentId?: string | null;
  cashMovementId?: string | null;
  debitCents: Cents;
  creditCents: Cents;
  appliedCents: Cents | null;
  balanceCents: Cents;
};

export type DocumentCollection = {
  kind: "PAYMENT" | "CREDIT_APPLIED";
  occurredAt: string;
  amountCents: Cents;
  paymentMethod: "CASH" | "TRANSFER" | "CARD" | null;
  receiptNumber: string | null;
  cashMovementId: string | null;
};

export type DocumentCollections = {
  items: readonly DocumentCollection[];
  totalCents: Cents;
  paidCents: Cents;
  pendingCents: Cents;
};

export type CollectionApplication = {
  documentId: string;
  documentNumber: string;
  amountCents: Cents;
  status: import("@/features/documents/types").DocumentStatus;
};

export type CollectionApplications = {
  cashMovementId: string;
  receiptNumber: string | null;
  paymentMethod: "CASH" | "TRANSFER" | "CARD";
  occurredAt: string;
  totalCents: Cents;
  documents: readonly CollectionApplication[];
  creditGeneratedCents: Cents;
};

export type CustomerAccountMovementPage = {
  items: readonly CustomerAccountLedgerMovement[];
  nextCursor: string | null;
};

export type CashReceipt = {
  amountCents: Cents;
  applications: readonly { amountCents: Cents; documentId: string; documentNumber: string }[];
  creditGeneratedCents: Cents;
  customerCreditCents: Cents;
  customerId: string;
  customerName: string;
  documentId: string | null;
  movementId: string;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
};

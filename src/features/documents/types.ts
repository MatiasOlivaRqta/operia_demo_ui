import type { Cents } from "@/lib/money";

export type DocumentStatus = "PENDING" | "PARTIAL" | "COMPLETED" | "CANCELLED";

export type DocumentItem = {
  discountRate: number;
  productName: string;
  quantity: number;
  sku: string;
  taxRate: number;
  productId: string;
  unitPriceCents: Cents;
};

export type CommercialDocument = {
  cancelledBy?: string;
  customerId: string;
  companyId: string;
  customerName: string;
  date: string;
  id: string;
  internalNumber: string;
  items: readonly DocumentItem[];
  pointOfSale: string;
  status: DocumentStatus;
};

export type DocumentSummary = Omit<CommercialDocument, "items"> & {
  totalCents: Cents;
  itemCount: number;
};

export type DocumentWithTotal = CommercialDocument & {
  pendingCents: Cents;
  totalCents: Cents;
};

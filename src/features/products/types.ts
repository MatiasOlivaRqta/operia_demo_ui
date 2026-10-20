import type { Cents } from "@/lib/money";

export type ProductStatus = "active" | "inactive";

export type StockMovementType = "Ajuste" | "Ingreso" | "Reversion" | "Salida";

export type StockMovement = {
  date: string;
  documentId?: string;
  id: string;
  note: string;
  quantity: number;
  reference: string;
  reversesMovementId?: string;
  type: StockMovementType;
};

export type Product = {
  barcode: string;
  category: string;
  categoryId: string;
  companyId: string;
  costCents: Cents;
  id: string;
  minimumStock: number;
  name: string;
  priceCents: Cents;
  sku: string;
  status: ProductStatus;
  unit: string;
  movements: readonly StockMovement[];
};

export type ProductSummary = Omit<Product, "movements"> & { stock: number; lowStock: boolean };

export type StockMovementEntry = StockMovement & {
  productId: string;
  productName: string;
  sku: string;
  reversed: boolean;
};

export type InventorySummary = {
  activeProducts: number;
  totalUnits: number;
  lowStockCount: number;
  inventoryValueCents: Cents;
};

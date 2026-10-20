import type { Cents } from "@/lib/money";

export type DashboardSummary = Readonly<{
  date: string;
  salesToday: Readonly<{ totalCents: Cents; count: number; previousDayTotalCents: Cents }>;
  collectionsToday: Readonly<{ totalCents: Cents; count: number }>;
  receivables: Readonly<{ balanceCents: Cents; customersWithBalance: number }>;
  lowStockCount: number;
}>;

export type DashboardActivityItem = Readonly<{
  kind: "document" | "collection" | "stock_movement";
  id: string;
  occurredAt: string;
  reference: string;
  counterparty: string;
  amountCents?: Cents;
  quantity?: number;
  status:
    | "PENDING"
    | "PARTIAL"
    | "COMPLETED"
    | "CANCELLED"
    | "COLLECTED"
    | "INGRESO"
    | "SALIDA"
    | "AJUSTE"
    | "REVERSION";
  refId: string;
}>;

export type DashboardActivity = Readonly<{ items: readonly DashboardActivityItem[] }>;

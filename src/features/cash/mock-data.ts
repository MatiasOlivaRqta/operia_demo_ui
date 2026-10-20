import type { CashMovement, CashSession } from "@/features/cash/types";
import { toCents } from "@/lib/money";

export const cashSession: CashSession = {
  companyId: "operia-central",
  id: "local-cash-operia-central-2026-08-26",
  openedAt: "2026-08-26T08:15:00-03:00",
  openingBalanceCents: toCents(100000),
  openedBy: { name: "Matías Oliva" },
  status: "open",
};

export const cashMovements: readonly CashMovement[] = [
  {
    amountCents: toCents(184200),
    customerId: "ferreteria-el-tornillo",
    customerName: "Ferreteria El Tornillo",
    date: "2026-08-26T09:42:00-03:00",
    documentNumber: "Factura B-0001-00001836",
    id: "cash-1",
    paymentMethod: "Efectivo",
    receiptNumber: "R-0001-00000897",
    type: "Cobro",
  },
  {
    amountCents: toCents(300000),
    customerId: "distribuidora-norte",
    customerName: "Distribuidora Norte",
    date: "2026-08-26T10:18:00-03:00",
    documentNumber: null,
    id: "cash-2",
    paymentMethod: "Transferencia",
    receiptNumber: "R-0001-00000898",
    type: "Cobro",
  },
  {
    amountCents: toCents(75600),
    customerId: "punto-hogar",
    customerName: "Punto Hogar",
    date: "2026-08-26T11:07:00-03:00",
    documentNumber: "Factura A-0001-00002441",
    id: "cash-3",
    paymentMethod: "Tarjeta",
    receiptNumber: "R-0001-00000899",
    type: "Cobro",
  },
];

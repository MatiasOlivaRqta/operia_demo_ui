import type { Page } from "@/data/api";
import type {
  CashMovementDto,
  CashMovementPageDto,
  CashReceiptDto,
  CashSessionDto,
  CashTotalsDto,
  CustomerAccountDto,
} from "@/features/cash/dto";
import type {
  CashMovement,
  CashReceipt,
  CashSession,
  CashTotals,
  CustomerAccount,
  PaymentMethod,
  PendingDocument,
} from "@/features/cash/types";
import type {
  CashCloseValues,
  CashOpenValues,
  CollectPaymentValues,
} from "@/features/cash/schemas";
import { asCents } from "@/lib/money";

const methodToUi: Record<CashMovementDto["paymentMethod"], PaymentMethod> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};
const methodToDto: Record<PaymentMethod, CashMovementDto["paymentMethod"]> = {
  Efectivo: "CASH",
  Tarjeta: "CARD",
  Transferencia: "TRANSFER",
};

export function mapCashSession(dto: CashSessionDto, companyId?: string): CashSession {
  const base: CashSession = {
    ...(companyId === undefined ? {} : { companyId }),
    id: dto.id,
    openedAt: dto.openedAt,
    openingBalanceCents: asCents(dto.openingBalanceCents),
    openedBy: dto.openedBy,
    status: dto.status === "OPEN" ? "open" : "closed",
  };
  if (dto.status === "OPEN") return base;
  return {
    ...base,
    closedAt: dto.closedAt,
    declaredBalanceCents: asCents(dto.declaredBalanceCents),
    differenceCents: asCents(dto.differenceCents),
    ...(dto.observation === undefined ? {} : { observation: dto.observation }),
  };
}

export function mapCashTotals(dto: CashTotalsDto): CashTotals {
  return {
    byMethod: {
      Efectivo: asCents(dto.byMethod.CASH),
      Tarjeta: asCents(dto.byMethod.CARD),
      Transferencia: asCents(dto.byMethod.TRANSFER),
    },
    movementsCount: dto.movementsCount,
    netCollectedCents: asCents(dto.netCollectedCents),
    openingBalanceCents: asCents(dto.openingBalanceCents),
    theoreticalCashCents: asCents(dto.theoreticalCashCents),
  };
}

export function mapCashMovement(dto: CashMovementDto): CashMovement {
  return {
    amountCents: asCents(dto.amountCents),
    customerId: dto.customerId,
    customerName: dto.customerName,
    date: dto.occurredAt,
    documentNumber: dto.documentNumber,
    id: dto.id,
    paymentMethod: methodToUi[dto.paymentMethod],
    receiptNumber: dto.receiptNumber,
    type: "Cobro",
  };
}

export function mapCashMovementPage(dto: CashMovementPageDto): Page<CashMovement> {
  return { ...dto, items: dto.items.map(mapCashMovement) };
}

export function mapCashReceipt(dto: CashReceiptDto): CashReceipt {
  return {
    ...dto,
    amountCents: asCents(dto.amountCents),
    applications: dto.applications.map((application) => ({
      ...application,
      amountCents: asCents(application.amountCents),
    })),
    creditGeneratedCents: asCents(dto.creditGeneratedCents),
    customerCreditCents: asCents(dto.customerCreditCents),
    paymentMethod: methodToUi[dto.paymentMethod],
  };
}

function mapPendingDocument(dto: CustomerAccountDto["pending"]["items"][number]): PendingDocument {
  return {
    ...dto,
    paidCents: asCents(dto.paidCents),
    pendingCents: asCents(dto.pendingCents),
    totalCents: asCents(dto.totalCents),
  };
}

export function mapCustomerAccount(dto: CustomerAccountDto): CustomerAccount {
  return {
    ...dto,
    creditCents: asCents(dto.creditCents),
    debtCents: asCents(dto.debtCents),
    netBalanceCents: asCents(dto.netBalanceCents),
    pending: { ...dto.pending, items: dto.pending.items.map(mapPendingDocument) },
  };
}

export function mapCashOpenInput(input: CashOpenValues): { openingBalanceCents: number } {
  return { openingBalanceCents: input.openingBalanceCents };
}

export function mapCashCloseInput(input: CashCloseValues): {
  declaredBalanceCents: number;
  observation?: string;
} {
  const observation = input.observation.trim();
  return {
    declaredBalanceCents: input.declaredBalanceCents,
    ...(observation ? { observation } : {}),
  };
}

export function mapCollectPaymentInput(input: CollectPaymentValues): {
  amountCents: number;
  customerId: string;
  documentId?: string;
  paymentMethod: CashMovementDto["paymentMethod"];
} {
  return {
    customerId: input.customerId,
    amountCents: input.amountCents,
    ...(input.documentId ? { documentId: input.documentId } : {}),
    paymentMethod: methodToDto[input.paymentMethod],
  };
}

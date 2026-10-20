import { z } from "zod";

const centsSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestampSchema = z.string().datetime({ offset: true });
const paymentMethodDtoSchema = z.enum(["CASH", "TRANSFER", "CARD"]);
const sessionBaseDtoSchema = z.object({
  id: z.string().uuid(),
  openedAt: timestampSchema,
  openingBalanceCents: centsSchema,
  openedBy: z.object({ name: z.string().min(1) }),
});

export const cashSessionDtoSchema = z.discriminatedUnion("status", [
  sessionBaseDtoSchema.extend({ status: z.literal("OPEN") }),
  sessionBaseDtoSchema.extend({
    closedAt: timestampSchema,
    closedBy: z.object({ name: z.string() }),
    declaredBalanceCents: centsSchema,
    differenceCents: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
    observation: z.string().optional(),
    status: z.literal("CLOSED"),
    theoreticalBalanceCents: centsSchema,
  }),
]);

export const cashTotalsDtoSchema = z.object({
  asOf: timestampSchema,
  byMethod: z.object({ CASH: centsSchema, TRANSFER: centsSchema, CARD: centsSchema }),
  movementsCount: z.number().int().nonnegative(),
  netCollectedCents: centsSchema,
  openedAt: timestampSchema,
  openingBalanceCents: centsSchema,
  sessionId: z.string().uuid(),
  theoreticalCashCents: centsSchema,
});

export const cashMovementDtoSchema = z.object({
  amountCents: centsSchema,
  customerId: z.string().min(1),
  customerName: z.string(),
  documentNumber: z.string().nullable(),
  id: z.string().min(1),
  occurredAt: timestampSchema,
  paymentMethod: paymentMethodDtoSchema,
  receiptNumber: z.string().min(1),
  type: z.literal("COBRO"),
});

export const cashMovementPageDtoSchema = z.object({
  items: z.array(cashMovementDtoSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

export const cashReceiptDtoSchema = z.object({
  amountCents: z.number().int().positive().max(2_147_483_647),
  applications: z.array(
    z.object({
      amountCents: centsSchema,
      documentId: z.string().min(1),
      documentNumber: z.string(),
    }),
  ),
  creditGeneratedCents: centsSchema,
  customerCreditCents: centsSchema,
  customerId: z.string().min(1),
  customerName: z.string(),
  documentId: z.string().min(1).nullable(),
  movementId: z.string().min(1),
  occurredAt: timestampSchema,
  paymentMethod: paymentMethodDtoSchema,
  receiptNumber: z.string().min(1),
});

export const customerAccountDtoSchema = z.object({
  creditCents: centsSchema,
  customerId: z.string().min(1),
  debtCents: centsSchema,
  netBalanceCents: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  pending: z.object({
    items: z.array(
      z.object({
        date: timestampSchema,
        id: z.string().min(1),
        internalNumber: z.string(),
        paidCents: centsSchema,
        pendingCents: centsSchema,
        totalCents: centsSchema,
      }),
    ),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
  }),
});

const safeIntegerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

export const customerAccountSummaryDtoSchema = z.object({
  customerId: z.string().min(1),
  invoicedCents: centsSchema,
  collectedCents: centsSchema,
  netBalanceCents: safeIntegerSchema,
});

export const customerAccountMovementDtoSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["DOCUMENT", "CANCELLATION", "COLLECTION", "CREDIT_APPLIED"]),
  occurredAt: timestampSchema,
  reference: z.string(),
  documentNumber: z.string().nullable(),
  documentId: z.string().min(1).nullable().optional(),
  cashMovementId: z.string().min(1).nullable().optional(),
  debitCents: centsSchema,
  creditCents: centsSchema,
  appliedCents: centsSchema.nullable(),
  balanceCents: safeIntegerSchema,
});

export const documentCollectionsDtoSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["PAYMENT", "CREDIT_APPLIED"]),
      occurredAt: timestampSchema,
      amountCents: centsSchema,
      paymentMethod: paymentMethodDtoSchema.nullable(),
      receiptNumber: z.string().nullable(),
      cashMovementId: z.string().min(1).nullable(),
    }),
  ),
  totalCents: centsSchema,
  paidCents: centsSchema,
  pendingCents: centsSchema,
});

export const collectionApplicationsDtoSchema = z.object({
  cashMovementId: z.string().min(1),
  receiptNumber: z.string().nullable(),
  paymentMethod: paymentMethodDtoSchema,
  occurredAt: timestampSchema,
  totalCents: centsSchema,
  documents: z.array(
    z.object({
      documentId: z.string().min(1),
      documentNumber: z.string(),
      amountCents: centsSchema,
      status: z.enum(["PENDING", "PARTIAL", "COMPLETED", "CANCELLED"]),
    }),
  ),
  creditGeneratedCents: centsSchema,
});

export const customerAccountMovementPageDtoSchema = z.object({
  items: z.array(customerAccountMovementDtoSchema),
  nextCursor: z.string().nullable(),
});

export type CashSessionDto = z.infer<typeof cashSessionDtoSchema>;
export type CashTotalsDto = z.infer<typeof cashTotalsDtoSchema>;
export type CashMovementDto = z.infer<typeof cashMovementDtoSchema>;
export type CashMovementPageDto = z.infer<typeof cashMovementPageDtoSchema>;
export type CashReceiptDto = z.infer<typeof cashReceiptDtoSchema>;
export type CustomerAccountDto = z.infer<typeof customerAccountDtoSchema>;
export type CustomerAccountSummaryDto = z.infer<typeof customerAccountSummaryDtoSchema>;
export type CustomerAccountMovementPageDto = z.infer<typeof customerAccountMovementPageDtoSchema>;
export type DocumentCollectionsDto = z.infer<typeof documentCollectionsDtoSchema>;
export type CollectionApplicationsDto = z.infer<typeof collectionApplicationsDtoSchema>;

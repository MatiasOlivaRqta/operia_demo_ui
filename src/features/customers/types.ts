import type { Cents } from "@/lib/money";
import type { PaymentMethod } from "@/features/cash/types";

export type CustomerStatus = "active" | "inactive";

export const vatConditions = {
  consumer: "Consumidor final",
  exempt: "Exento",
  smallTaxpayer: "Monotributista",
  registered: "Responsable inscripto",
} as const;

export type VatCondition = (typeof vatConditions)[keyof typeof vatConditions];

export const personTypes = { natural: "Física", legal: "Jurídica" } as const;

export type PersonType = (typeof personTypes)[keyof typeof personTypes];

export type DocumentType = "DNI" | "CUIT/CUIL" | "Pasaporte";

export type CustomerAccountMovement = {
  amountCents: Cents;
  date: string;
  description: string;
  documentId?: string;
  cashMovementId?: string | null;
  id: string;
  paymentMethod?: PaymentMethod | null;
  relationKind?: "PAYMENT" | "CREDIT_APPLIED";
  receiptNumber?: string | null;
  type: "Cobro" | "Factura" | "Nota de crédito" | "Nota de débito";
};

export type Customer = {
  address: string;
  city: string;
  commercialName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  companyId: string;
  documentNumber: string;
  documentType: DocumentType;
  fiscalAddress: string;
  id: string;
  legalName: string;
  locality: string;
  personType: PersonType;
  postalCode: string;
  priceList: string;
  province: string;
  status: CustomerStatus;
  vatCondition: VatCondition;
  movements: readonly CustomerAccountMovement[];
  balanceCents?: Cents;
};

import { z } from "zod";

export function isValidCuit(value: string): boolean {
  const digits = value.replaceAll(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const checkDigit = 11 - (sum % 11);
  const expected = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
  return Number(digits[10]) === expected;
}

export const defaultPriceList = { Física: "Minorista", Jurídica: "Mayorista" } as const;

const documentRules = {
  "CUIT/CUIL": { isValid: isValidCuit, message: "validation.document.cuit" },
  DNI: {
    isValid: (value: string) => /^\d{7,8}$/.test(value.replaceAll(".", "")),
    message: "validation.document.dni",
  },
  Pasaporte: {
    isValid: (value: string) => /^[A-Za-z0-9]{6,20}$/.test(value),
    message: "validation.document.passport",
  },
} as const;

const legalRequired = {
  address: "validation.customer.address",
  commercialName: "validation.customer.commercialName",
  contactName: "validation.customer.contactName",
  contactPhone: "validation.customer.contactPhone",
  fiscalAddress: "validation.customer.fiscalAddress",
  locality: "validation.customer.locality",
  province: "validation.customer.province",
} as const;

const text = z.string().trim();

export const customerSchema = z
  .object({
    address: text,
    commercialName: text,
    contactEmail: text,
    contactName: text,
    contactPhone: text,
    documentNumber: text,
    documentType: z.enum(["DNI", "CUIT/CUIL", "Pasaporte"]),
    fiscalAddress: text,
    legalName: text,
    locality: text,
    personType: z.enum(["Física", "Jurídica"]),
    postalCode: text,
    priceList: text.min(1, "validation.customer.priceList"),
    province: text,
    status: z.enum(["active", "inactive"]),
    vatCondition: z.enum(["Consumidor final", "Exento", "Monotributista", "Responsable inscripto"]),
  })
  .superRefine((values, ctx) => {
    const issue = (field: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", message, path: [field] });
    const rule = documentRules[values.documentType];
    if (!rule.isValid(values.documentNumber)) issue("documentNumber", rule.message);
    if (values.contactEmail && !z.email().safeParse(values.contactEmail).success)
      issue("contactEmail", "validation.email");
    if (!values.legalName)
      issue(
        "legalName",
        values.personType === "Física"
          ? "validation.customer.fullName"
          : "validation.customer.legalName",
      );
    if (values.personType === "Física") {
      if (!values.contactPhone && !values.contactEmail)
        issue("contactPhone", "validation.customer.contactMethod");
      return;
    }
    if (values.documentType !== "CUIT/CUIL")
      issue("documentType", "validation.customer.legalDocumentType");
    for (const [field, message] of Object.entries(legalRequired)) {
      if (!values[field as keyof typeof legalRequired])
        issue(field as keyof typeof values, message);
    }
  });

export type CustomerFormValues = z.infer<typeof customerSchema>;

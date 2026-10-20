import { describe, expect, it } from "vitest";
import { customerSchema, isValidCuit, type CustomerFormValues } from "@/features/customers/schemas";

const natural: CustomerFormValues = {
  address: "",
  commercialName: "",
  contactEmail: "",
  contactName: "",
  contactPhone: "1111",
  documentNumber: "30.123.456",
  documentType: "DNI",
  fiscalAddress: "",
  legalName: "Ana Gómez",
  locality: "",
  personType: "Física",
  postalCode: "",
  priceList: "Minorista",
  province: "",
  status: "active",
  vatCondition: "Consumidor final",
};

const legal: CustomerFormValues = {
  address: "Calle 1",
  commercialName: "Nuevo",
  contactEmail: "contacto@example.com",
  contactName: "Contacto",
  contactPhone: "1111",
  documentNumber: "30-71458963-2",
  documentType: "CUIT/CUIL",
  fiscalAddress: "Calle 1",
  legalName: "Nuevo SRL",
  locality: "Centro",
  personType: "Jurídica",
  postalCode: "1000",
  priceList: "Mayorista",
  province: "Buenos Aires",
  status: "active",
  vatCondition: "Responsable inscripto",
};

function errorFields(values: CustomerFormValues): string[] {
  const parsed = customerSchema.safeParse(values);
  return parsed.success ? [] : parsed.error.issues.map((issue) => String(issue.path[0]));
}

describe("CUIT validation", () => {
  it("accepts a valid CUIT and rejects an invalid check digit", () => {
    expect(isValidCuit("30-71458963-2")).toBe(true);
    expect(isValidCuit("30-71458963-1")).toBe(false);
  });

  it("requires a valid CUIT at the customer form boundary", () => {
    const parsed = customerSchema.safeParse({ ...legal, documentNumber: "20-12345678-0" });
    expect(errorFields({ ...legal, documentNumber: "20-12345678-0" })).toEqual(["documentNumber"]);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe("validation.document.cuit");
  });
});

describe("customer schema by person type", () => {
  it("accepts a natural person with only name, DNI and phone", () => {
    expect(errorFields(natural)).toEqual([]);
  });

  it("accepts a natural person with a locality", () => {
    expect(errorFields({ ...natural, locality: "Villa Carlos Paz" })).toEqual([]);
  });

  it("requires a phone or an email for a natural person", () => {
    const parsed = customerSchema.safeParse({ ...natural, contactPhone: "" });
    expect(errorFields({ ...natural, contactPhone: "" })).toEqual(["contactPhone"]);
    if (!parsed.success)
      expect(parsed.error.issues[0]?.message).toBe("validation.customer.contactMethod");
    expect(errorFields({ ...natural, contactPhone: "", contactEmail: "ana@example.com" })).toEqual(
      [],
    );
  });

  it("validates the document number by document type", () => {
    expect(errorFields({ ...natural, documentNumber: "123" })).toEqual(["documentNumber"]);
    expect(
      errorFields({ ...natural, documentType: "Pasaporte", documentNumber: "AAA123456" }),
    ).toEqual([]);
    expect(errorFields({ ...natural, documentType: "Pasaporte", documentNumber: "AB-1" })).toEqual([
      "documentNumber",
    ]);
  });

  it("rejects a legal person without CUIT/CUIL", () => {
    expect(errorFields({ ...legal, documentType: "DNI", documentNumber: "30123456" })).toEqual([
      "documentType",
    ]);
  });

  it("keeps every current field required for a legal person", () => {
    expect(errorFields({ ...legal, fiscalAddress: "" })).toEqual(["fiscalAddress"]);
    expect(errorFields({ ...legal, locality: "" })).toEqual(["locality"]);
    expect(errorFields(legal)).toEqual([]);
  });

  it("does not include city in form values and strips it from legacy values", () => {
    type HasCity = "city" extends keyof CustomerFormValues ? true : false;
    const hasCity: HasCity = false;
    expect(hasCity).toBe(false);
    const parsed = customerSchema.safeParse({ ...legal, city: "Rosario" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).not.toHaveProperty("city");
  });
});

describe("legalName required message", () => {
  const messages = (values: CustomerFormValues) =>
    customerSchema
      .safeParse({ ...values, legalName: "" })
      .error?.issues.filter((i) => i.path[0] === "legalName")
      .map((i) => i.message);

  it("asks for the full name on natural persons", () => {
    expect(messages(natural)).toEqual(["validation.customer.fullName"]);
  });

  it("asks for the legal name on legal entities", () => {
    expect(messages(legal)).toEqual(["validation.customer.legalName"]);
  });
});

import { describe, expect, it } from "vitest";
import { syncApiCustomers } from "@/data/bridge/customers-bridge";
import { initialState } from "@/features/store/app-store";
import { createLocalApi } from "@/data/local/api";
import { toCents } from "@/lib/money";

describe("API customer bridge", () => {
  it("keeps local account movements when remote master data changes", () => {
    const original = initialState.customers.find(
      (customer) => customer.id === "distribuidora-norte",
    );
    expect(original).toBeDefined();
    if (!original) return;
    const incoming = {
      address: original.address,
      city: original.city,
      commercialName: "Distribuidora Norte actualizada",
      companyId: original.companyId,
      contactEmail: original.contactEmail,
      contactName: original.contactName,
      contactPhone: original.contactPhone,
      documentNumber: original.documentNumber,
      documentType: original.documentType,
      personType: original.personType,
      fiscalAddress: original.fiscalAddress,
      id: original.id,
      legalName: original.legalName,
      locality: original.locality,
      postalCode: original.postalCode,
      priceList: original.priceList,
      province: original.province,
      status: original.status,
      vatCondition: original.vatCondition,
    };

    const next = syncApiCustomers(initialState, { items: [incoming] });
    const bridged = next.customers.find((customer) => customer.id === original.id);
    expect(bridged?.commercialName).toBe("Distribuidora Norte actualizada");
    expect(bridged?.movements).toEqual(original.movements);
  });

  it("creates an API customer without mixing it into another company", () => {
    const next = syncApiCustomers(initialState, {
      items: [
        {
          address: "Calle 1",
          city: "Buenos Aires",
          commercialName: "Cliente API",
          companyId: "operia-central",
          contactEmail: "cliente@example.com",
          contactName: "Contacto",
          contactPhone: "1111",
          documentNumber: "30-71458963-2",
          documentType: "CUIT/CUIL",
          personType: "Jurídica",
          fiscalAddress: "Calle 1",
          id: "api-customer-1",
          legalName: "Cliente API SRL",
          locality: "Centro",
          postalCode: "1000",
          priceList: "Minorista",
          province: "Buenos Aires",
          status: "active",
          vatCondition: "Responsable inscripto",
        },
      ],
    });
    const added = next.customers.find((customer) => customer.id === "api-customer-1");
    expect(added?.companyId).toBe("operia-central");
    expect(added?.movements).toEqual([]);
    expect(next.customers.filter((customer) => customer.companyId === "operia-hogar")).toEqual(
      initialState.customers.filter((customer) => customer.companyId === "operia-hogar"),
    );
  });

  it("lets a bridged customer enter local document and collection flows", async () => {
    const bridged = syncApiCustomers(initialState, {
      items: [
        {
          address: "Calle 1",
          city: "Buenos Aires",
          commercialName: "Cliente API",
          companyId: "operia-central",
          contactEmail: "cliente@example.com",
          contactName: "Contacto",
          contactPhone: "1111",
          documentNumber: "30-71458963-2",
          documentType: "CUIT/CUIL",
          personType: "Jurídica",
          fiscalAddress: "Calle 1",
          id: "api-customer-1",
          legalName: "Cliente API SRL",
          locality: "Centro",
          postalCode: "1000",
          priceList: "Minorista",
          province: "Buenos Aires",
          status: "active",
          vatCondition: "Responsable inscripto",
        },
      ],
    });
    const api = createLocalApi(bridged, () => undefined, new Map());
    const product = bridged.products.find((entry) => entry.companyId === "operia-central");
    expect(product).toBeDefined();
    if (!product) return;

    const document = await api.documents.create(
      {
        customerId: "api-customer-1",
        items: [
          {
            discountRate: 0,
            productId: product.id,
            quantity: 1,
            taxRate: 0,
            unitPriceCents: product.priceCents,
          },
        ],
      },
      "api-customer-bridge-document",
    );
    expect(document.ok).toBe(true);
    if (!document.ok) return;
    const currentSession = await api.cash.current();
    if (!currentSession.ok || !currentSession.value) throw new Error("No hay caja abierta.");
    const receipt = await api.cash.collectPayment(
      currentSession.value.id,
      {
        amountCents: toCents(100),
        customerId: "api-customer-1",
        documentId: document.value.id,
        paymentMethod: "Efectivo",
      },
      "attempt-api-customer",
    );
    expect(receipt.ok).toBe(true);
  });
});

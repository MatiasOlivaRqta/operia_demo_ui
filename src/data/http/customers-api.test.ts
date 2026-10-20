import { afterEach, describe, expect, it, vi } from "vitest";
import { customersApi } from "@/data/http/customers-api";
import type { CustomerFormValues } from "@/features/customers/schemas";

const customerInput: CustomerFormValues = {
  address: "Calle 1",
  commercialName: "Nuevo",
  contactEmail: "contacto@example.com",
  contactName: "Contacto",
  contactPhone: "1111",
  documentNumber: "30-71458963-2",
  documentType: "CUIT/CUIL",
  personType: "Jurídica",
  fiscalAddress: "Calle 1",
  legalName: "Nuevo SRL",
  locality: "Centro",
  postalCode: "1000",
  priceList: "Minorista",
  province: "Buenos Aires",
  status: "active",
  vatCondition: "Responsable inscripto",
};

afterEach(() => vi.restoreAllMocks());

describe("CustomersApi HTTP adapter", () => {
  it("omits empty search and all-filter values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, pageSize: 25, total: 0 }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await customersApi.list({ search: " ", status: "all", vatCondition: "all" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/customers");
  });

  it("serializes list filters and sends customer mutations to contract routes", async () => {
    const page = { items: [], page: 2, pageSize: 50, total: 0 };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(page), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const listed = await customersApi.list({
      search: "norte",
      status: "active",
      vatCondition: "Exento",
      page: 2,
      pageSize: 50,
    });
    await customersApi.create(customerInput);
    await customersApi.update("id / 1", { ...customerInput, commercialName: "Actualizado" });
    await customersApi.deactivate("id / 1");
    await customersApi.setStatus("id / 1", "inactive");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      [
        "/api/customers?search=norte&status=active&vatCondition=Exento&page=2&pageSize=50",
        "GET",
        undefined,
      ],
      ["/api/customers", "POST", JSON.stringify(customerInput)],
      [
        "/api/customers/id%20%2F%201",
        "PATCH",
        JSON.stringify({ ...customerInput, commercialName: "Actualizado" }),
      ],
      ["/api/customers/id%20%2F%201/deactivation", "POST", undefined],
      ["/api/customers/id%20%2F%201/status", "PATCH", JSON.stringify({ status: "inactive" })],
    ]);
    expect(listed).toEqual({ ok: true, value: page });
  });
});

import { describe, expect, it } from "vitest";
import { calculateAvailableStock } from "@/features/products/domain";
import { calculateCustomerBalance } from "@/features/customers/domain";
import {
  addStockMovement,
  applyCredit,
  cancelDocument,
  collectPayment,
  createDocument,
  closeCash,
  setCustomerStatus,
} from "@/features/store/domain";
import { calculateDocumentTotal } from "@/features/documents/domain";
import { initialState, type AppState } from "@/features/store/app-store";
import { asCents, toCents } from "@/lib/money";

describe("store business mutations", () => {
  it("keeps two collections structurally linked to one partially paid document", () => {
    const first = collectPayment(
      initialState,
      "distribuidora-norte",
      toCents(1000),
      "Efectivo",
      "pv-0001-00002457",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = collectPayment(
      first.value,
      "distribuidora-norte",
      toCents(2000),
      "Transferencia",
      "pv-0001-00002457",
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const allocations = second.value.customers
      .find((customer) => customer.id === "distribuidora-norte")!
      .movements.filter(
        (movement) => movement.documentId === "pv-0001-00002457" && movement.amountCents < 0,
      );
    expect(allocations.slice(-2)).toMatchObject([
      {
        amountCents: -toCents(1000),
        paymentMethod: "Efectivo",
        relationKind: "PAYMENT",
        receiptNumber: expect.any(String),
      },
      {
        amountCents: -toCents(2000),
        paymentMethod: "Transferencia",
        relationKind: "PAYMENT",
        receiptNumber: expect.any(String),
      },
    ]);
    expect(new Set(allocations.slice(-2).map((movement) => movement.cashMovementId)).size).toBe(2);
  });

  it("allocates one payment across documents and records its excess as customer credit", () => {
    const result = collectPayment(initialState, "distribuidora-norte", toCents(200000), "Efectivo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cashMovementId = result.value.cashSessions
      .find((session) => session.companyId === "operia-central")!
      .movements.at(-1)!.id;
    const collection = result.value.customers
      .find((customer) => customer.id === "distribuidora-norte")!
      .movements.filter((movement) => movement.cashMovementId === cashMovementId);
    const linked = collection.filter((movement) => movement.documentId);
    const excess = collection.filter((movement) => !movement.documentId);
    expect(new Set(linked.map((movement) => movement.documentId)).size).toBeGreaterThan(1);
    expect(
      linked.reduce((sum, movement) => sum - movement.amountCents, 0) +
        excess.reduce((sum, movement) => sum - movement.amountCents, 0),
    ).toBe(toCents(200000));
    expect(excess.reduce((sum, movement) => sum - movement.amountCents, 0)).toBeGreaterThan(0);
  });

  it("never updates matching identifiers owned by another company", () => {
    const centralProduct = initialState.products.find(
      (entry) => entry.id === "taladro-percutor-13mm",
    )!;
    const centralCustomer = initialState.customers.find(
      (entry) => entry.id === "distribuidora-norte",
    )!;
    const collidingState: AppState = {
      ...initialState,
      customers: [
        ...initialState.customers,
        { ...centralCustomer, companyId: "operia-hogar", status: "active" },
      ],
      products: [
        ...initialState.products,
        { ...centralProduct, companyId: "operia-hogar", movements: [] },
      ],
    };
    const statusResult = setCustomerStatus(collidingState, centralCustomer.id, "inactive");
    const stockResult = addStockMovement(
      collidingState,
      centralProduct.id,
      "Ingreso",
      1,
      "Test aislamiento",
    );
    expect(statusResult.ok && statusResult.value.customers.at(-1)?.status).toBe("active");
    expect(stockResult.ok && stockResult.value.products.at(-1)?.movements).toHaveLength(0);
  });

  it("confirms a document atomically across customer, stock and documents", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 1,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const beforeStock = calculateAvailableStock(initialState.products[0]!.movements);
    const result = createDocument(initialState, "distribuidora-norte", [item]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.documents.at(-1)?.status).toBe("PENDING");
    expect(calculateAvailableStock(result.value.products[0]!.movements)).toBe(beforeStock - 1);
    expect(result.value.customers[0]!.movements).toHaveLength(
      initialState.customers[0]!.movements.length + 1,
    );
  });

  it("leaves state unchanged when stock validation fails and reverses a cancellation", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 100,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const invalid = createDocument(initialState, "distribuidora-norte", [item]);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error.code).toBe("business_rule");
    expect(invalid.error.key).toBe("errors.documentInsufficientStock");
    const valid = createDocument(initialState, "distribuidora-norte", [{ ...item, quantity: 1 }]);
    if (!valid.ok) return;
    const canceled = cancelDocument(
      valid.value,
      valid.value.documents.at(-1)!.id,
      "Error de carga",
    );
    if (!canceled.ok) return;
    expect(canceled.value.documents.at(-1)?.status).toBe("CANCELLED");
    expect(calculateCustomerBalance(canceled.value.customers[0]!.movements)).toBe(
      calculateCustomerBalance(initialState.customers[0]!.movements),
    );
  });

  it("records a partial collection and requires a note for a cash difference", () => {
    const payment = collectPayment(initialState, "distribuidora-norte", toCents(1000), "Efectivo");
    expect(payment.ok).toBe(true);
    if (!payment.ok) return;
    expect(payment.value.cashSessions[0]!.movements).toHaveLength(
      initialState.cashSessions[0]!.movements.length + 1,
    );
    const invalidClose = closeCash(payment.value, toCents(100), "");
    expect(invalidClose.ok).toBe(false);
  });

  it("moves an issued document from pending through partial to completed", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 1,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const created = createDocument(initialState, "distribuidora-norte", [item]);
    if (!created.ok) throw new Error("Expected document creation");
    const document = created.value.documents.at(-1)!;
    const total = calculateDocumentTotal([item]);
    expect(document.status).toBe("PENDING");

    const partial = collectPayment(
      created.value,
      document.customerId,
      toCents(10000),
      "Efectivo",
      document.id,
    );
    expect(partial.ok && partial.value.documents.at(-1)?.status).toBe("PARTIAL");
    if (!partial.ok) return;

    const remainder = collectPayment(
      partial.value,
      document.customerId,
      asCents(total - toCents(10000)),
      "Efectivo",
      document.id,
    );
    expect(remainder.ok && remainder.value.documents.at(-1)?.status).toBe("COMPLETED");
  });

  it("completes an overpaid document and records the excess as customer credit", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 1,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const created = createDocument(initialState, "distribuidora-norte", [item]);
    if (!created.ok) throw new Error("Expected document creation");
    const document = created.value.documents.at(-1)!;
    const total = calculateDocumentTotal([item]);
    const payment = collectPayment(
      created.value,
      document.customerId,
      asCents(total + toCents(1000)),
      "Efectivo",
      document.id,
    );
    expect(payment.ok && payment.value.documents.at(-1)?.status).toBe("COMPLETED");
    if (!payment.ok) return;
    const movements = payment.value.customers.find(
      (entry) => entry.id === document.customerId,
    )!.movements;
    expect(movements.filter((movement) => movement.documentId === document.id)).toHaveLength(1);
    expect(movements.at(-1)?.amountCents).toBe(-toCents(1000));
    expect(movements.at(-1)?.documentId).toBeUndefined();
  });

  it("applies existing customer credit and recalculates the document status", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 1,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const created = createDocument(initialState, "distribuidora-norte", [item]);
    if (!created.ok) throw new Error("Expected document creation");
    const document = created.value.documents.at(-1)!;
    const stateWithCredit: AppState = {
      ...created.value,
      customers: created.value.customers.map((customer) =>
        customer.id === document.customerId
          ? {
              ...customer,
              movements: [
                ...customer.movements,
                {
                  amountCents: asCents(-toCents(1000000)),
                  date: "2026-08-27",
                  description: "Crédito de prueba",
                  id: "credit-test",
                  type: "Cobro" as const,
                },
              ],
            }
          : customer,
      ),
    };
    const applied = applyCredit(stateWithCredit, document.customerId, document.id, toCents(1000));
    expect(applied.ok && applied.value.documents.at(-1)?.status).toBe("PARTIAL");
  });

  it("rejects cancellation of a partially paid document", () => {
    const item = {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      productName: "Taladro",
      quantity: 1,
      sku: "HER-TAL-013",
      taxRate: 21,
      unitPriceCents: toCents(32900),
    };
    const created = createDocument(initialState, "distribuidora-norte", [item]);
    if (!created.ok) throw new Error("Expected document creation");
    const document = created.value.documents.at(-1)!;
    const partial = collectPayment(
      created.value,
      document.customerId,
      toCents(1000),
      "Efectivo",
      document.id,
    );
    if (!partial.ok) throw new Error("Expected partial collection");
    const cancelled = cancelDocument(partial.value, document.id, "Intento inválido");
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.error.key).toBe("errors.documentAlreadyCancelled");
  });
});

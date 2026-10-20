import { describe, expect, it, vi } from "vitest";
import { createLocalApi } from "@/data/local/api";
import { initialState, type AppAction, type AppState } from "@/features/store/app-store";
import { productSchema } from "@/features/products/schemas";
import { documentSchema } from "@/features/documents/schemas";
import {
  stockAdjustmentSchema,
  stockMovementSchema,
  stockReversalSchema,
} from "@/features/products/schemas";
import { cashCloseSchema, cashOpenSchema, collectPaymentSchema } from "@/features/cash/schemas";
import { toCents } from "@/lib/money";
import { permissions } from "@/features/auth/permissions";

const documentInput = (quantity = 1) => ({
  customerId: "distribuidora-norte",
  items: [
    {
      discountRate: 0,
      productId: "taladro-percutor-13mm",
      quantity,
      taxRate: 21,
      unitPriceCents: toCents(32900),
    },
  ],
});

function apiFor(state: AppState = initialState) {
  const dispatch = vi.fn<(action: AppAction) => void>();
  const idempotency = new Map();
  return { api: createLocalApi(state, dispatch, idempotency), dispatch, idempotency };
}

describe("local data API", () => {
  it("returns a partial document's two collections with matching totals", async () => {
    const { api } = apiFor();
    for (const [amountCents, paymentMethod, key] of [
      [toCents(1000), "Efectivo", "partial-one"],
      [toCents(2000), "Transferencia", "partial-two"],
    ] as const) {
      const result = await api.cash.collectPayment(
        "session",
        {
          amountCents,
          customerId: "distribuidora-norte",
          documentId: "pv-0001-00002457",
          paymentMethod,
        },
        key,
      );
      expect(result.ok).toBe(true);
    }
    const result = await api.documents.collections("pv-0001-00002457");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.filter((item) => item.kind === "PAYMENT")).toHaveLength(3);
    expect(result.value.items.reduce((sum, item) => sum + item.amountCents, 0)).toBe(
      result.value.paidCents,
    );
    expect(result.value.pendingCents).toBe(result.value.totalCents - result.value.paidCents);
  });

  it("returns every document covered by one collection and its generated excess", async () => {
    const { api } = apiFor();
    const payment = await api.cash.collectPayment(
      "session",
      {
        amountCents: toCents(200000),
        customerId: "distribuidora-norte",
        paymentMethod: "Efectivo",
      },
      "automatic-multiple",
    );
    expect(payment.ok).toBe(true);
    if (!payment.ok) return;
    const applications = await api.customerAccount.collectionApplications(
      "distribuidora-norte",
      payment.value.movementId,
    );
    expect(applications.ok).toBe(true);
    if (!applications.ok) return;
    expect(applications.value.documents.length).toBeGreaterThan(1);
    expect(applications.value.creditGeneratedCents).toBeGreaterThan(0);
    expect(
      applications.value.documents.reduce((sum, document) => sum + document.amountCents, 0) +
        applications.value.creditGeneratedCents,
    ).toBe(toCents(200000));
  });

  it("serves one ADMIN user and role with the complete catalog and rejects demo writes", async () => {
    const { api } = apiFor();
    const [users, roles, catalog] = await Promise.all([
      api.users.list(),
      api.roles.list(),
      api.roles.permissionCatalog(),
    ]);
    expect(users).toMatchObject({
      ok: true,
      value: [{ email: "demo@operia.local", role: { name: "ADMIN" } }],
    });
    expect(roles).toMatchObject({
      ok: true,
      value: [{ name: "ADMIN", isSystem: true, permissions, userCount: 1 }],
    });
    expect(catalog.ok && catalog.value.flatMap((group) => group.permissions)).toEqual(permissions);
    await expect(
      api.users.create({
        email: "new@example.com",
        name: "New",
        password: "123456789012",
        roleId: "demo-admin",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "forbidden", key: "errors.demoUserManagementReadOnly" },
    });
    await expect(api.roles.delete("demo-admin")).resolves.toMatchObject({
      ok: false,
      error: { code: "business_rule", key: "errors.demoUserManagementReadOnly" },
    });
  });

  it("calculates dashboard summary from today's local store data and returns zeros without data", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date(`${today}T12:00:00.000Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const sourceDocument = initialState.documents[0];
    if (!sourceDocument) throw new Error("Expected a local document fixture");
    const localState: AppState = {
      ...initialState,
      documents: [
        { ...sourceDocument, date: `${today}T15:00:00.000Z`, status: "PENDING" },
        {
          ...sourceDocument,
          id: "yesterday-document",
          date: `${yesterdayDate.toISOString().slice(0, 10)}T15:00:00.000Z`,
          status: "PARTIAL",
        },
      ],
      cashSessions: [],
      products: [],
      customers: [],
    };
    const { api } = apiFor(localState);
    const result = await api.dashboard.summary();
    if (!result.ok) throw new Error("Expected dashboard summary");
    expect(result.value.date).toBe(today);
    expect(result.value.salesToday.count).toBe(1);
    expect(result.value.salesToday.totalCents).toBeGreaterThan(0);
    expect(result.value.salesToday.previousDayTotalCents).toBe(result.value.salesToday.totalCents);
    expect(result.value.collectionsToday).toEqual({ totalCents: 0, count: 0 });
    expect(result.value.receivables).toEqual({ balanceCents: 0, customersWithBalance: 0 });
    expect(result.value.lowStockCount).toBe(0);

    const empty = apiFor({ ...localState, documents: [] });
    const emptyResult = await empty.api.dashboard.summary();
    if (!emptyResult.ok) throw new Error("Expected empty dashboard summary");
    expect(emptyResult.value.salesToday).toEqual({
      totalCents: 0,
      count: 0,
      previousDayTotalCents: 0,
    });
  });

  it("keeps pending, partial, and completed documents in customer account debt", async () => {
    const { api } = apiFor();
    const account = await api.customerAccount.get("distribuidora-norte");
    expect(account.ok).toBe(true);
    if (!account.ok) return;
    expect(account.value.pending.items.map((item) => item.id)).toEqual([
      "pv-0001-00002457",
      "pv-0001-00002459",
    ]);
    expect(account.value.pending.items.map((item) => item.pendingCents)).toEqual([
      toCents(112040.4),
      toCents(39809),
    ]);
    expect(account.value.debtCents).toBe(toCents(564900));
  });

  it("returns the remaining balance for a partial document detail", async () => {
    const { api } = apiFor();
    const result = await api.documents.get("pv-0001-00002457");
    if (!result.ok) throw new Error("Expected a partial local document");
    expect(result.value.status).toBe("PARTIAL");
    expect(result.value.pendingCents).toBe(toCents(112040.4));
  });

  it("filters stock movements by type, product, inclusive Argentine dates, and combinations", async () => {
    const { api } = apiFor();
    const allResult = await api.inventory.movements({ page: 1, pageSize: 100 });
    if (!allResult.ok || allResult.value.items.length === 0) throw new Error("Expected movements");
    const all = allResult.value.items;
    const selected = all[0]!;
    const day = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
    })
      .formatToParts(new Date(selected.date))
      .reduce<Record<string, string>>((parts, part) => {
        parts[part.type] = part.value;
        return parts;
      }, {});
    const selectedDay = `${day.year}-${day.month}-${day.day}`;
    const calendarDay = (value: string) => {
      const fields = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
      })
        .formatToParts(new Date(value))
        .reduce<Record<string, string>>((parts, part) => {
          parts[part.type] = part.value;
          return parts;
        }, {});
      return `${fields.year}-${fields.month}-${fields.day}`;
    };

    const byType = await api.inventory.movements({ type: selected.type, pageSize: 100 });
    const byProduct = await api.inventory.movements({
      productId: selected.productId,
      pageSize: 100,
    });
    const fromOnly = await api.inventory.movements({ from: selectedDay, pageSize: 100 });
    const toOnly = await api.inventory.movements({ to: selectedDay, pageSize: 100 });
    const combined = await api.inventory.movements({
      type: selected.type,
      productId: selected.productId,
      from: selectedDay,
      to: selectedDay,
      pageSize: 100,
    });

    expect(byType.ok && byType.value.items.every((entry) => entry.type === selected.type)).toBe(
      true,
    );
    expect(
      byProduct.ok &&
        byProduct.value.items.every((entry) => entry.productId === selected.productId),
    ).toBe(true);
    expect(
      fromOnly.ok && fromOnly.value.items.every((entry) => calendarDay(entry.date) >= selectedDay),
    ).toBe(true);
    expect(
      toOnly.ok && toOnly.value.items.every((entry) => calendarDay(entry.date) <= selectedDay),
    ).toBe(true);
    expect(combined.ok && combined.value.items.map((entry) => entry.id)).toContain(selected.id);
    expect(combined.ok && combined.value.total).toBe(combined.ok ? combined.value.items.length : 0);
  });

  it("filters, sorts, and paginates customers in memory", async () => {
    const { api } = apiFor();
    const result = await api.customers.list({
      search: "distribuidora norte",
      status: "active",
      vatCondition: "Responsable inscripto",
      page: 1,
      pageSize: 1,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { page: 1, pageSize: 1, total: 1 },
    });
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.commercialName).toBe("Distribuidora Norte");

    const sorted = await api.customers.list({ pageSize: 100 });
    expect(sorted.ok).toBe(true);
    if (sorted.ok) {
      const names = sorted.value.items.map((customer) => customer.commercialName);
      const normalized = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("es");
      expect(names).toEqual(
        [...names].sort((a, b) => normalized(a).localeCompare(normalized(b), "es")),
      );
    }

    const empty = await api.customers.list({ page: 100, pageSize: 1 });
    expect(empty.ok && empty.value.items).toEqual([]);
    expect(empty.ok && empty.value.total).toBeGreaterThan(1);
  });

  it("exposes session, totals, movements, and approximate customer account without HTTP", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { api } = apiFor();
    const current = await api.cash.current();
    expect(current.ok && current.value?.id).toBe("local-cash-operia-central-2026-08-26");
    if (!current.ok || !current.value) return;
    const totals = await api.cash.totals();
    expect(totals).toMatchObject({
      ok: true,
      value: {
        movementsCount: 3,
        byMethod: { Efectivo: toCents(184200), Transferencia: toCents(300000) },
      },
    });
    const movements = await api.cash.movements({
      sessionId: current.value.id,
      page: 1,
      pageSize: 25,
    });
    expect(movements.ok && movements.value.total).toBe(3);
    const account = await api.customerAccount.get("distribuidora-norte");
    expect(account.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("isolates reads and mutations to the active company", async () => {
    const { api, dispatch } = apiFor();
    const products = await api.products.list();
    expect(
      products.ok && products.value.items.every((entry) => entry.companyId === "operia-central"),
    ).toBe(true);

    const foreignProduct = await api.products.addStockMovement("cable-taller-3x15", {
      action: "Ingreso",
      note: "Intento cruzado",
      quantity: 1,
    });
    expect(foreignProduct.ok).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();

    const foreignCustomer = await api.customers.get("customer-operia-hogar");
    expect(foreignCustomer.ok).toBe(false);

    const switched = await api.companies.setActive("operia-hogar");
    expect(switched.ok).toBe(true);
    const householdProducts = await api.products.list();
    expect(
      householdProducts.ok &&
        householdProducts.value.items.length > 0 &&
        householdProducts.value.items.every((entry) => entry.companyId === "operia-hogar"),
    ).toBe(true);
  });

  it("filters, orders, and paginates product summaries in memory", async () => {
    const { api } = apiFor();
    const result = await api.products.list({ page: 1, pageSize: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.page).toBe(1);
    expect(result.value.pageSize).toBe(1);
    expect(result.value.items).toHaveLength(1);
    const all = await api.products.list({ pageSize: 100 });
    expect(all.ok).toBe(true);
    if (!all.ok) return;
    const names = all.value.items.map((entry) =>
      entry.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es"),
    );
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
    const lowStock = await api.products.list({ lowStock: true, pageSize: 100 });
    expect(lowStock.ok && lowStock.value.items.every((entry) => entry.lowStock)).toBe(true);
    const accented = all.value.items.find((entry) => /[áéíóúñ]/i.test(entry.name));
    if (accented) {
      const searchTerm = accented.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matches = await api.products.list({ search: searchTerm, pageSize: 100 });
      expect(matches.ok && matches.value.items.some((entry) => entry.id === accented.id)).toBe(
        true,
      );
    }
  });

  it("cursor-paginates enriched movements with reversed flags and summarizes active inventory", async () => {
    const { api } = apiFor();
    const created = await api.products.addStockMovement("taladro-percutor-13mm", {
      action: "Ingreso",
      note: "Prueba reversión",
      quantity: 1,
    });
    if (!created.ok) throw new Error(created.error.message);
    const reversed = await api.products.reverseStockMovement(
      "taladro-percutor-13mm",
      created.value.id,
      "Movimiento incorrecto",
    );
    expect(reversed.ok).toBe(true);
    const movements = await api.products.movements("taladro-percutor-13mm", { limit: 2 });
    expect(movements.ok).toBe(true);
    if (movements.ok) {
      expect(movements.value.items).toHaveLength(2);
      expect(movements.value.nextCursor).toBeTruthy();
      expect(movements.value.items.every((entry) => entry.productName && entry.sku)).toBe(true);
      expect(movements.value.items.every((entry) => entry.date.endsWith(".000Z"))).toBe(true);
      expect(
        movements.value.items.some((entry) => entry.id === created.value.id && entry.reversed),
      ).toBe(true);
      const allIds = movements.value.items.map((entry) => entry.id);
      let cursor = movements.value.nextCursor;
      while (cursor) {
        const nextPage = await api.products.movements("taladro-percutor-13mm", {
          limit: 2,
          cursor,
        });
        expect(nextPage.ok).toBe(true);
        if (!nextPage.ok) break;
        allIds.push(...nextPage.value.items.map((entry) => entry.id));
        cursor = nextPage.value.nextCursor;
      }
      expect(cursor).toBeNull();
      expect(new Set(allIds).size).toBe(allIds.length);
    }
    const summary = await api.inventory.summary();
    const products = await api.products.list({ status: "active", pageSize: 100 });
    expect(summary.ok && products.ok).toBe(true);
    if (summary.ok && products.ok) {
      expect(summary.value.activeProducts).toBe(products.value.total);
      expect(summary.value.lowStockCount).toBe(
        products.value.items.filter((entry) => entry.lowStock).length,
      );
    }
  });

  it("returns document summaries with totals and filters before pagination", async () => {
    const { api } = apiFor();
    const result = await api.documents.list({ search: "00002457", page: 1, pageSize: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.total).toBe(1);
    expect(result.value.items[0]?.internalNumber).toContain("00002457");
    expect(result.value.items[0]?.itemCount).toBeGreaterThan(0);
    expect(result.value.items[0]?.totalCents).toBeGreaterThan(0);
  });

  it("creates a document atomically and replays an idempotency key only for the same payload", async () => {
    const { api, dispatch } = apiFor();
    const payload = documentInput();
    const first = await api.documents.create(payload, "confirm-1");
    const replay = await api.documents.create(payload, "confirm-1");
    expect(first.ok).toBe(true);
    expect(replay).toEqual(first);
    expect(dispatch).toHaveBeenCalledTimes(1);

    const conflictingReplay = await api.documents.create(documentInput(2), "confirm-1");
    expect(conflictingReplay.ok).toBe(false);
    if (!conflictingReplay.ok) expect(conflictingReplay.error.code).toBe("conflict");

    const current = first.ok ? first.value : undefined;
    expect(current?.internalNumber).toBe("0001-00002460");
    expect(current?.status).toBe("PENDING");

    await api.companies.setActive("operia-hogar");
    const homeCustomer = initialState.customers.find(
      (entry) => entry.companyId === "operia-hogar" && entry.status === "active",
    );
    const homeProduct = initialState.products.find(
      (entry) => entry.companyId === "operia-hogar" && entry.status === "active",
    );
    expect(homeCustomer).toBeDefined();
    expect(homeProduct).toBeDefined();
    if (!homeCustomer || !homeProduct) return;
    const homeCreated = await api.documents.create(
      {
        customerId: homeCustomer.id,
        items: [
          {
            discountRate: 0,
            productId: homeProduct.id,
            quantity: 1,
            taxRate: 21,
            unitPriceCents: homeProduct.priceCents,
          },
        ],
      },
      "home-document",
    );
    expect(homeCreated.ok).toBe(true);
    await api.companies.setActive("operia-central");
    const centralCreated = await api.documents.create(payload, "central-document-2");
    expect(centralCreated.ok && centralCreated.value.internalNumber).toBe("0001-00002461");
  });

  it("does not dispatch or cache a document when stock validation fails", async () => {
    const { api, dispatch, idempotency } = apiFor();
    const result = await api.documents.create(documentInput(1000), "insufficient-stock");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("business_rule");
    expect(dispatch).not.toHaveBeenCalled();
    expect(idempotency.size).toBe(0);
    const documents = await api.documents.list();
    expect(
      documents.ok &&
        documents.value.total ===
          initialState.documents.filter((entry) => entry.companyId === "operia-central").length,
    ).toBe(true);
  });

  it("cancels once and records linked reversing movements", async () => {
    const { api, dispatch } = apiFor();
    const created = await api.documents.create(documentInput(), "cancel-document");
    if (!created.ok) throw new Error(created.error.message);
    const cancelled = await api.documents.cancel(created.value.id, "Carga duplicada");
    expect(cancelled.ok).toBe(true);
    const finalState = dispatch.mock.calls.at(-1)?.[0];
    if (finalState?.type === "replace-state") {
      const cancelledDocument = finalState.state.documents.find(
        (entry) => entry.id === created.value.id,
      );
      expect(cancelledDocument?.status).toBe("CANCELLED");
      expect(
        finalState.state.products
          .find((entry) => entry.id === "taladro-percutor-13mm")
          ?.movements.some(
            (movement) => movement.documentId === created.value.id && movement.type === "Reversion",
          ),
      ).toBe(true);
      expect(
        finalState.state.customers
          .find((entry) => entry.id === "distribuidora-norte")
          ?.movements.some(
            (movement) =>
              movement.documentId === created.value.id && movement.type === "Nota de crédito",
          ),
      ).toBe(true);
    }
    const duplicate = await api.documents.cancel(created.value.id, "Segundo intento");
    expect(duplicate.ok).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(2);
    if (cancelled.ok) expect(cancelled.value.status).toBe("CANCELLED");
  });

  it("adds a new linked stock reversal and rejects a second reversal", async () => {
    const { api, dispatch } = apiFor();
    const added = await api.products.addStockMovement("taladro-percutor-13mm", {
      action: "Ingreso",
      note: "Ajuste de prueba",
      quantity: 1,
    });
    if (!added.ok) throw new Error(added.error.message);
    const reversed = await api.products.reverseStockMovement(
      "taladro-percutor-13mm",
      added.value.id,
      "Carga incorrecta",
    );
    expect(reversed.ok).toBe(true);
    if (reversed.ok) expect(reversed.value.reversesMovementId).toBe(added.value.id);
    const duplicate = await api.products.reverseStockMovement(
      "taladro-percutor-13mm",
      added.value.id,
      "Segundo intento",
    );
    expect(duplicate.ok).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("enforces cash rules and permits partial collections", async () => {
    const sessionId = initialState.cashSessions.find(
      (session) => session.companyId === initialState.activeCompanyId,
    )!.id;
    const closedState = {
      ...initialState,
      cashSessions: initialState.cashSessions.map((session) =>
        session.companyId === initialState.activeCompanyId
          ? { ...session, status: "closed" as const }
          : session,
      ),
    };
    const closed = apiFor(closedState);
    const noCash = await closed.api.cash.collectPayment(
      sessionId,
      {
        amountCents: toCents(1000),
        customerId: "distribuidora-norte",
        paymentMethod: "Efectivo",
      },
      "attempt-no-cash",
    );
    expect(noCash.ok).toBe(false);
    const reopened = await closed.api.cash.open({ openingBalanceCents: toCents(0) });
    expect(reopened).toMatchObject({ ok: true, value: { openedBy: { name: "Matías Oliva" } } });

    const open = apiFor();
    const duplicateOpen = await open.api.cash.open({
      openingBalanceCents: toCents(100),
    });
    expect(duplicateOpen.ok).toBe(false);
    const partial = await open.api.cash.collectPayment(
      sessionId,
      {
        amountCents: toCents(1000),
        customerId: "distribuidora-norte",
        paymentMethod: "Efectivo",
      },
      "attempt-partial",
    );
    expect(partial.ok).toBe(true);
    const excess = await open.api.cash.collectPayment(
      sessionId,
      {
        amountCents: toCents(999999999),
        customerId: "distribuidora-norte",
        paymentMethod: "Efectivo",
      },
      "attempt-excess",
    );
    expect(excess.ok).toBe(false);

    const close = await open.api.cash.close(sessionId, {
      declaredBalanceCents: toCents(0),
      observation: "",
    });
    expect(close.ok).toBe(false);
    const closedSuccessfully = await open.api.cash.close(sessionId, {
      declaredBalanceCents: toCents(0),
      observation: "Diferencia revisada",
    });
    expect(closedSuccessfully.ok).toBe(true);
    const afterClose = await open.api.cash.collectPayment(
      sessionId,
      {
        amountCents: toCents(100),
        customerId: "distribuidora-norte",
        paymentMethod: "Efectivo",
      },
      "attempt-after-close",
    );
    expect(afterClose.ok).toBe(false);
  });

  it("validates product and document schemas", () => {
    expect(
      productSchema.safeParse({
        barcode: "",
        categoryId: "cat-herramientas",
        costPesos: 10,
        minimumStock: 2,
        name: "Taladro",
        pricePesos: 20,
        sku: "TAL-1",
        status: "active",
        unit: "Unidad",
      }).success,
    ).toBe(true);
    expect(productSchema.safeParse({ pricePesos: -1 }).success).toBe(false);
    expect(documentSchema.safeParse(documentInput()).success).toBe(true);
    expect(documentSchema.safeParse({ customerId: "", items: [] }).success).toBe(false);
    expect(
      stockMovementSchema.safeParse({ action: "Ingreso", quantity: 2, note: "Compra" }).success,
    ).toBe(true);
    expect(stockMovementSchema.safeParse({ action: "Salida", quantity: 0, note: "" }).success).toBe(
      false,
    );
    expect(stockAdjustmentSchema.safeParse({ targetStock: 0, note: "Conteo" }).success).toBe(true);
    expect(stockReversalSchema.safeParse({ movementId: "m-1", reason: "Error" }).success).toBe(
      true,
    );
    expect(cashOpenSchema.safeParse({ openingBalanceCents: "1.00" }).success).toBe(true);
    expect(cashOpenSchema.safeParse({ openingBalanceCents: "-1" }).success).toBe(false);
    expect(cashCloseSchema.safeParse({ declaredBalanceCents: "0", observation: "" }).success).toBe(
      true,
    );
    expect(
      collectPaymentSchema.safeParse({
        amountCents: "1.00",
        customerId: "c-1",
        paymentMethod: "Efectivo",
      }).success,
    ).toBe(true);
    expect(
      collectPaymentSchema.safeParse({
        amountCents: "0",
        customerId: "",
        paymentMethod: "Efectivo",
      }).success,
    ).toBe(false);
  });

  it("lists, searches and creates product categories without duplicating equivalent ones", async () => {
    const { api } = apiFor();

    const all = await api.elemSubTypes.list("PROD_CAT", { pageSize: 10 });
    if (!all.ok) throw new Error("Expected categories");
    expect(all.value.items.map((entry) => entry.description)).toEqual([
      "Ferreteria",
      "Herramientas",
    ]);

    const filtered = await api.elemSubTypes.list("PROD_CAT", { search: "HERRA" });
    expect(filtered.ok && filtered.value.items.map((entry) => entry.description)).toEqual([
      "Herramientas",
    ]);

    const equivalent = await api.elemSubTypes.create("PROD_CAT", " ferretería ");
    expect(equivalent.ok && equivalent.value.id).toBe("cat-ferreteria");

    const created = await api.elemSubTypes.create("PROD_CAT", "  Pinturas  ");
    expect(created.ok && created.value.description).toBe("Pinturas");
    const again = await api.elemSubTypes.create("PROD_CAT", "pinturas");
    expect(again.ok && created.ok && again.value.id === created.value.id).toBe(true);

    expect(await api.elemSubTypes.create("PROD_CAT", "   ")).toMatchObject({ ok: false });
    expect(await api.elemSubTypes.list("NO_EXISTE")).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
  });

  it("creates a product with the description of the chosen category and rejects an unknown one", async () => {
    const { api } = apiFor();
    const input = {
      barcode: "",
      categoryId: "cat-herramientas",
      costPesos: 10,
      minimumStock: 1,
      name: "Candado",
      pricePesos: 20,
      sku: "CAN-LOCAL-1",
      status: "active" as const,
      unit: "Unidad",
    };

    const created = await api.products.create(input);
    expect(created.ok && created.value.category).toBe("Herramientas");
    expect(created.ok && created.value.categoryId).toBe("cat-herramientas");

    const unknown = await api.products.create({ ...input, categoryId: "no-existe", sku: "CAN-2" });
    expect(unknown).toMatchObject({
      ok: false,
      error: { code: "validation", fieldErrors: { categoryId: expect.any(String) } },
    });
  });
});

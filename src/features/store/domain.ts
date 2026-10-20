import type { PaymentMethod } from "@/features/cash/types";
import type { LocalCashSession } from "@/features/cash/local-types";
import { calculateCashDifference } from "@/features/cash/domain";
import type { Customer, CustomerAccountMovement } from "@/features/customers/types";
import { calculateCustomerBalance } from "@/features/customers/domain";
import type { CommercialDocument, DocumentItem, DocumentStatus } from "@/features/documents/types";
import { calculateDocumentTotal } from "@/features/documents/domain";
import type { Product, StockMovement } from "@/features/products/types";
import { calculateAvailableStock } from "@/features/products/domain";
import { asCents, type Cents } from "@/lib/money";
import type { AppState } from "@/features/store/app-store";
import { failure, success, type AppErrorCode, type Result } from "@/lib/result";

export type MutationResult = Result<AppState>;
export type CustomerInput = Omit<Customer, "city" | "companyId" | "id" | "movements"> &
  Partial<Pick<Customer, "city">>;
export type ProductInput = Omit<Product, "companyId" | "id" | "movements">;

const error = (
  message: string,
  key: `errors.${string}`,
  code: AppErrorCode = "business_rule",
  params?: Record<string, string | number>,
): MutationResult => failure(code, message, undefined, key, params);
const id = (): string => crypto.randomUUID();
const today = (): string => new Date().toISOString().slice(0, 10);
const now = (): string => new Date().toISOString();

export function settlementStatus(total: number, paid: number): DocumentStatus {
  if (paid <= 0) return "PENDING";
  if (paid < total) return "PARTIAL";
  return "COMPLETED";
}

export function calculateDocumentPendingCents(
  totalCents: number,
  paidCents: number,
  status: DocumentStatus,
): Cents {
  if (status === "COMPLETED" || status === "CANCELLED") return asCents(0);
  return asCents(Math.max(0, totalCents - paidCents));
}

export function createCustomer(state: AppState, input: CustomerInput): MutationResult {
  if (
    state.customers.some(
      (entry) =>
        entry.companyId === state.activeCompanyId &&
        entry.documentType === input.documentType &&
        entry.documentNumber === input.documentNumber,
    )
  ) {
    return error(
      "Ya existe un cliente con ese documento en la empresa activa.",
      "errors.customerDocumentConflict",
      "conflict",
    );
  }
  const customer: Customer = {
    ...input,
    city: input.city ?? "",
    companyId: state.activeCompanyId,
    id: id(),
    movements: [],
  };
  return success({ ...state, customers: [...state.customers, customer] });
}

export function updateCustomer(
  state: AppState,
  customerId: string,
  input: CustomerInput,
): MutationResult {
  if (
    state.customers.some(
      (entry) =>
        entry.companyId === state.activeCompanyId &&
        entry.id !== customerId &&
        entry.documentType === input.documentType &&
        entry.documentNumber === input.documentNumber,
    )
  ) {
    return error(
      "Ya existe un cliente con ese documento en la empresa activa.",
      "errors.customerDocumentConflict",
      "conflict",
    );
  }
  if (
    !state.customers.some(
      (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
    )
  ) {
    return error(
      "No encontramos el cliente de la empresa activa.",
      "errors.customerNotFound",
      "not_found",
    );
  }
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, ...input }
        : entry,
    ),
  });
}

export function deactivateCustomer(state: AppState, customerId: string): MutationResult {
  if (
    !state.customers.some(
      (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
    )
  ) {
    return error(
      "No encontramos el cliente de la empresa activa.",
      "errors.customerNotFound",
      "not_found",
    );
  }
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, status: "inactive" }
        : entry,
    ),
  });
}

export function setCustomerStatus(
  state: AppState,
  customerId: string,
  status: Customer["status"],
): MutationResult {
  if (
    !state.customers.some(
      (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
    )
  ) {
    return error(
      "No encontramos el cliente de la empresa activa.",
      "errors.customerNotFound",
      "not_found",
    );
  }
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, status }
        : entry,
    ),
  });
}

export function createProduct(state: AppState, input: ProductInput): MutationResult {
  if (
    state.products.some(
      (entry) =>
        entry.companyId === state.activeCompanyId &&
        entry.sku.toLowerCase() === input.sku.toLowerCase(),
    )
  ) {
    return error(
      "Ya existe un producto con ese SKU en la empresa activa.",
      "errors.productSkuConflict",
      "conflict",
    );
  }
  const product: Product = { ...input, companyId: state.activeCompanyId, id: id(), movements: [] };
  return success({ ...state, products: [...state.products, product] });
}

export function updateProduct(
  state: AppState,
  productId: string,
  input: ProductInput,
): MutationResult {
  if (
    state.products.some(
      (entry) =>
        entry.companyId === state.activeCompanyId &&
        entry.id !== productId &&
        entry.sku.toLowerCase() === input.sku.toLowerCase(),
    )
  ) {
    return error(
      "Ya existe un producto con ese SKU en la empresa activa.",
      "errors.productSkuConflict",
      "conflict",
    );
  }
  if (
    !state.products.some(
      (entry) => entry.id === productId && entry.companyId === state.activeCompanyId,
    )
  ) {
    return error(
      "No encontramos el producto de la empresa activa.",
      "errors.productNotFound",
      "not_found",
    );
  }
  return success({
    ...state,
    products: state.products.map((entry) =>
      entry.id === productId && entry.companyId === state.activeCompanyId
        ? { ...entry, ...input }
        : entry,
    ),
  });
}

export function addStockMovement(
  state: AppState,
  productId: string,
  type: StockMovement["type"],
  quantity: number,
  note: string,
): MutationResult {
  const product = state.products.find(
    (entry) => entry.id === productId && entry.companyId === state.activeCompanyId,
  );
  if (!product)
    return error(
      "No encontramos el producto de la empresa activa.",
      "errors.productNotFound",
      "not_found",
    );
  if (!Number.isInteger(quantity) || quantity <= 0 || !note.trim())
    return error(
      "Ingresá una cantidad entera positiva y un motivo.",
      "errors.stockQuantityAndReasonRequired",
      "validation",
    );
  if (type === "Salida" && calculateAvailableStock(product.movements) < quantity)
    return error("La salida supera el stock disponible.", "errors.stockAvailableExceeded");
  const movement: StockMovement = {
    date: today(),
    id: id(),
    note: note.trim(),
    quantity: type === "Salida" ? -quantity : quantity,
    reference: type,
    type,
  };
  return success({
    ...state,
    products: state.products.map((entry) =>
      entry.id === productId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, movement] }
        : entry,
    ),
  });
}

export function reverseStockMovement(
  state: AppState,
  productId: string,
  movementId: string,
): MutationResult {
  const product = state.products.find(
    (entry) => entry.id === productId && entry.companyId === state.activeCompanyId,
  );
  const original = product?.movements.find((movement) => movement.id === movementId);
  if (!product || !original)
    return error(
      "No encontramos el movimiento que querés revertir.",
      "errors.stockMovementNotFound",
      "not_found",
    );
  if (product.movements.some((movement) => movement.reversesMovementId === movementId)) {
    return error(
      "Ese movimiento ya fue revertido.",
      "errors.stockMovementAlreadyReversed",
      "conflict",
    );
  }
  const movement: StockMovement = {
    date: today(),
    id: id(),
    note: `Reversión de ${original.reference}`,
    quantity: -original.quantity,
    reference: original.reference,
    reversesMovementId: movementId,
    type: "Reversion",
  };
  return success({
    ...state,
    products: state.products.map((entry) =>
      entry.id === productId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, movement] }
        : entry,
    ),
  });
}

export function adjustStock(
  state: AppState,
  productId: string,
  targetStock: number,
  note: string,
): MutationResult {
  const product = state.products.find(
    (entry) => entry.id === productId && entry.companyId === state.activeCompanyId,
  );
  if (!product)
    return error(
      "No encontramos el producto de la empresa activa.",
      "errors.productNotFound",
      "not_found",
    );
  if (!Number.isInteger(targetStock) || targetStock < 0 || !note.trim())
    return error(
      "Ingresá un stock final entero y un motivo.",
      "errors.finalStockAndReasonRequired",
      "validation",
    );
  const quantity = targetStock - calculateAvailableStock(product.movements);
  if (quantity === 0)
    return error("El stock ya coincide con ese valor.", "errors.stockAlreadyMatches", "validation");
  const movement: StockMovement = {
    date: today(),
    id: id(),
    note: note.trim(),
    quantity,
    reference: "Ajuste manual",
    type: "Ajuste",
  };
  return success({
    ...state,
    products: state.products.map((entry) =>
      entry.id === productId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, movement] }
        : entry,
    ),
  });
}

export function createDocument(
  state: AppState,
  customerId: string,
  items: readonly DocumentItem[],
): MutationResult {
  const customer = state.customers.find(
    (entry) =>
      entry.id === customerId &&
      entry.companyId === state.activeCompanyId &&
      entry.status === "active",
  );
  if (!customer)
    return error(
      "Seleccioná un cliente activo de la empresa.",
      "errors.documentCustomerActiveRequired",
    );
  if (items.length === 0)
    return error("Agregá al menos un producto.", "errors.documentProductRequired");
  const requested = new Map<string, number>();
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0)
      return error(
        "Cada producto debe tener una cantidad mayor que cero.",
        "errors.documentItemQuantityPositive",
        "validation",
      );
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  }
  for (const [productId, quantity] of requested) {
    const product = state.products.find(
      (entry) =>
        entry.id === productId &&
        entry.companyId === state.activeCompanyId &&
        entry.status === "active",
    );
    if (!product)
      return error(
        "Hay un producto que no pertenece a la empresa activa.",
        "errors.documentProductNotActive",
      );
    if (calculateAvailableStock(product.movements) < quantity)
      return error(
        `Stock insuficiente para ${product.name}.`,
        "errors.documentInsufficientStock",
        "business_rule",
        { name: product.name },
      );
  }
  const sequence =
    state.documents
      .filter((entry) => entry.companyId === state.activeCompanyId)
      .reduce((max, entry) => Math.max(max, Number(entry.internalNumber.slice(-8))), 0) + 1;
  const internalNumber = `0001-${String(sequence).padStart(8, "0")}`;
  const document: CommercialDocument = {
    companyId: state.activeCompanyId,
    customerId,
    customerName: customer.commercialName,
    date: today(),
    id: `pv-${internalNumber}`,
    internalNumber,
    items: [...items],
    pointOfSale: "0001",
    status: "PENDING",
  };
  const accountMovement: CustomerAccountMovement = {
    amountCents: calculateDocumentTotal(items),
    date: today(),
    description: `Comprobante ${internalNumber}`,
    id: id(),
    type: "Factura",
  };
  const products = state.products.map((product) => {
    const quantity = requested.get(product.id);
    if (!quantity || product.companyId !== state.activeCompanyId) return product;
    const movement: StockMovement = {
      documentId: document.id,
      date: today(),
      id: id(),
      note: `Comprobante ${internalNumber}`,
      quantity: -quantity,
      reference: internalNumber,
      type: "Salida",
    };
    return { ...product, movements: [...product.movements, movement] };
  });
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, accountMovement] }
        : entry,
    ),
    documents: [...state.documents, document],
    products,
  });
}

export function cancelDocument(
  state: AppState,
  documentId: string,
  reason: string,
): MutationResult {
  if (!reason.trim())
    return error("Ingresá el motivo de anulación.", "errors.documentReasonRequired", "validation");
  const document = state.documents.find(
    (entry) => entry.id === documentId && entry.companyId === state.activeCompanyId,
  );
  if (!document)
    return error(
      "No encontramos el comprobante de la empresa activa.",
      "errors.documentNotFound",
      "not_found",
    );
  if (document.status !== "PENDING")
    return error("El comprobante ya está anulado.", "errors.documentAlreadyCancelled", "conflict");
  const amount = calculateDocumentTotal(document.items);
  const reverse: CustomerAccountMovement = {
    amountCents: asCents(-amount),
    date: today(),
    description: `Anulación ${document.internalNumber}: ${reason.trim()}`,
    documentId,
    id: id(),
    type: "Nota de crédito",
  };
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === document.customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, reverse] }
        : entry,
    ),
    documents: state.documents.map((entry) =>
      entry.id === documentId
        ? { ...entry, cancelledBy: reason.trim(), status: "CANCELLED" }
        : entry,
    ),
    products: state.products.map((product) => {
      const quantity = document.items
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (!quantity || product.companyId !== state.activeCompanyId) return product;
      const movement: StockMovement = {
        documentId: document.id,
        date: today(),
        id: id(),
        note: `Anulación ${document.internalNumber}`,
        quantity,
        reference: document.internalNumber,
        reversesMovementId: product.movements.find((entry) => entry.documentId === document.id)?.id,
        type: "Reversion",
      };
      return { ...product, movements: [...product.movements, movement] };
    }),
  });
}

export function collectPayment(
  state: AppState,
  customerId: string,
  amountCents: Cents,
  paymentMethod: PaymentMethod,
  documentId?: string,
  validateAgainstLocalDocuments = true,
): MutationResult {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  const session = state.cashSessions.find(
    (entry) => entry.companyId === state.activeCompanyId && entry.status === "open",
  );
  if (!customer)
    return error("Seleccioná un cliente de la empresa activa.", "errors.paymentCustomerRequired");
  if (!session)
    return error("Abrí la caja antes de registrar un cobro.", "errors.cashMustBeOpenForPayment");
  const pending =
    documentId && validateAgainstLocalDocuments
      ? (() => {
          const document = state.documents.find(
            (entry) =>
              entry.id === documentId &&
              entry.customerId === customerId &&
              entry.companyId === state.activeCompanyId &&
              (entry.status === "PENDING" || entry.status === "PARTIAL"),
          );
          if (!document) return 0;
          const paid = customer.movements
            .filter((movement) => movement.documentId === documentId)
            .reduce((sum, movement) => sum - Math.min(0, movement.amountCents), 0);
          return Math.max(0, calculateDocumentTotal(document.items) - paid);
        })()
      : documentId
        ? Math.max(
            0,
            customer.movements
              .filter((movement) => movement.documentId === documentId)
              .reduce((sum, movement) => sum + movement.amountCents, 0),
          )
        : calculateCustomerBalance(customer.movements);
  if (
    amountCents <= 0 ||
    (amountCents > pending && !documentId) ||
    (documentId && validateAgainstLocalDocuments && pending <= 0)
  )
    return error(
      "El importe debe ser positivo y no superar el saldo pendiente.",
      "errors.paymentAmountInvalid",
    );
  const receiptNumber = `R-0001-${String(session.movements.length + 900).padStart(8, "0")}`;
  const cashMovementId = id();
  const occurredAt = now();
  const targets = documentId
    ? state.documents.filter(
        (entry) => entry.id === documentId && entry.companyId === state.activeCompanyId,
      )
    : state.documents
        .filter(
          (entry) =>
            entry.customerId === customerId &&
            entry.companyId === state.activeCompanyId &&
            entry.status !== "CANCELLED",
        )
        .sort(
          (left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
        );
  let remainingCents: number = amountCents;
  const applications = targets.flatMap((entry) => {
    const alreadyPaid = customer.movements
      .filter((movement) => movement.documentId === entry.id && movement.amountCents < 0)
      .reduce((sum, movement) => sum - movement.amountCents, 0);
    const pendingCents = Math.max(0, calculateDocumentTotal(entry.items) - alreadyPaid);
    const appliedCents = Math.min(remainingCents, pendingCents);
    remainingCents -= appliedCents;
    return appliedCents > 0 ? [{ document: entry, amountCents: asCents(appliedCents) }] : [];
  });
  const accountMovements: CustomerAccountMovement[] = applications.map(
    ({ document, amountCents: applied }) => ({
      amountCents: asCents(-applied),
      cashMovementId,
      date: occurredAt,
      description: `Recibo ${receiptNumber}`,
      documentId: document.id,
      id: id(),
      paymentMethod,
      relationKind: "PAYMENT",
      receiptNumber,
      type: "Cobro",
    }),
  );
  if (remainingCents > 0) {
    accountMovements.push({
      amountCents: asCents(-remainingCents),
      cashMovementId,
      date: occurredAt,
      description: `Saldo a favor de recibo ${receiptNumber}`,
      id: id(),
      paymentMethod,
      relationKind: "PAYMENT",
      receiptNumber,
      type: "Cobro",
    });
  }
  const documents = state.documents.map((entry) => {
    const appliedToDocument = applications.find(
      (application) => application.document.id === entry.id,
    );
    if (!appliedToDocument || entry.companyId !== state.activeCompanyId) return entry;
    const alreadyPaid = customer.movements
      .filter((movement) => movement.documentId === entry.id && movement.amountCents < 0)
      .reduce((sum, movement) => sum - movement.amountCents, 0);
    return {
      ...entry,
      status: settlementStatus(
        calculateDocumentTotal(entry.items),
        alreadyPaid + appliedToDocument.amountCents,
      ),
    };
  });
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, ...accountMovements] }
        : entry,
    ),
    cashSessions: state.cashSessions.map((entry) =>
      entry.companyId === state.activeCompanyId
        ? {
            ...entry,
            movements: [
              ...entry.movements,
              {
                amountCents,
                customerId: customer.id,
                customerName: customer.commercialName,
                date: occurredAt,
                documentNumber:
                  applications.length === 1 ? applications[0]!.document.internalNumber : null,
                id: cashMovementId,
                paymentMethod,
                receiptNumber,
                type: "Cobro",
              },
            ],
          }
        : entry,
    ),
    documents,
  });
}

export function applyCredit(
  state: AppState,
  customerId: string,
  documentId: string,
  amountCents: Cents,
): MutationResult {
  const customer = state.customers.find(
    (entry) => entry.id === customerId && entry.companyId === state.activeCompanyId,
  );
  const document = state.documents.find(
    (entry) =>
      entry.id === documentId &&
      entry.customerId === customerId &&
      entry.companyId === state.activeCompanyId &&
      (entry.status === "PENDING" || entry.status === "PARTIAL"),
  );
  if (!customer || !document)
    return error(
      "No encontramos un comprobante pendiente de la cuenta.",
      "errors.documentNotFound",
    );
  const creditCents = Math.max(0, -calculateCustomerBalance(customer.movements));
  const alreadyPaid = customer.movements
    .filter((movement) => movement.documentId === documentId && movement.amountCents < 0)
    .reduce((sum, movement) => sum - movement.amountCents, 0);
  const pendingCents = Math.max(0, calculateDocumentTotal(document.items) - alreadyPaid);
  if (amountCents <= 0 || amountCents > creditCents || amountCents > pendingCents)
    return error(
      "El importe debe ser positivo y no superar el saldo disponible.",
      "errors.paymentAmountInvalid",
    );
  const allocationId = id();
  const occurredAt = now();
  const movements: CustomerAccountMovement[] = [
    {
      amountCents,
      date: occurredAt,
      description: `Aplicación de saldo a favor al comprobante ${document.internalNumber}`,
      id: id(),
      type: "Nota de d\u00e9bito",
    },
    {
      amountCents: asCents(-amountCents),
      cashMovementId: null,
      date: occurredAt,
      description: `Saldo a favor aplicado al comprobante ${document.internalNumber}`,
      documentId,
      id: allocationId,
      paymentMethod: null,
      receiptNumber: null,
      relationKind: "CREDIT_APPLIED",
      type: "Cobro",
    },
  ];
  return success({
    ...state,
    customers: state.customers.map((entry) =>
      entry.id === customerId && entry.companyId === state.activeCompanyId
        ? { ...entry, movements: [...entry.movements, ...movements] }
        : entry,
    ),
    documents: state.documents.map((entry) =>
      entry.id === documentId && entry.companyId === state.activeCompanyId
        ? {
            ...entry,
            status: settlementStatus(
              calculateDocumentTotal(entry.items),
              alreadyPaid + amountCents,
            ),
          }
        : entry,
    ),
  });
}

export function openCash(
  state: AppState,
  openingBalanceCents: Cents,
  openedByName: string,
): MutationResult {
  if (
    state.cashSessions.some(
      (entry) => entry.companyId === state.activeCompanyId && entry.status === "open",
    )
  )
    return error("Ya hay una caja abierta para esta empresa.", "errors.cashAlreadyOpen");
  if (openingBalanceCents < 0 || !openedByName.trim())
    return error("Ingresá un saldo inicial válido.", "errors.openingBalanceInvalid");
  const session: LocalCashSession = {
    companyId: state.activeCompanyId,
    id: `local-${state.activeCompanyId}-${now()}`,
    openedAt: now(),
    openingBalanceCents,
    openedBy: { name: openedByName.trim() },
    status: "open",
    movements: [],
  };
  return success({
    ...state,
    cashSessions: [
      ...state.cashSessions.filter((entry) => entry.companyId !== state.activeCompanyId),
      session,
    ],
  });
}

export function closeCash(
  state: AppState,
  declaredBalance: Cents,
  observation: string,
): MutationResult {
  const session = state.cashSessions.find(
    (entry) => entry.companyId === state.activeCompanyId && entry.status === "open",
  );
  if (!session) return error("No hay una caja abierta para cerrar.", "errors.cashNotOpenToClose");
  if (
    calculateCashDifference(session, session.movements, declaredBalance) !== 0 &&
    !observation.trim()
  )
    return error(
      "La observación es obligatoria cuando hay diferencia.",
      "errors.cashDifferenceObservationRequired",
    );
  return success({
    ...state,
    cashSessions: state.cashSessions.map((entry) =>
      entry === session
        ? {
            ...entry,
            closedAt: now(),
            declaredBalanceCents: declaredBalance,
            differenceCents: calculateCashDifference(session, session.movements, declaredBalance),
            observation: observation.trim(),
            status: "closed",
          }
        : entry,
    ),
  });
}

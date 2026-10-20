"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Field } from "@/components/forms/field";
import { CustomerPicker } from "@/components/common/customer-picker";
import { ProductPicker } from "@/components/features/documents/product-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateDocumentDiscount,
  calculateDocumentSubtotal,
  calculateDocumentTax,
  calculateDocumentTotal,
  calculateItemSubtotal,
} from "@/features/documents/domain";
import { documentSchema } from "@/features/documents/schemas";
import type { DocumentItem } from "@/features/documents/types";
import type { ProductSummary } from "@/features/products/types";
import { useDocumentMutations } from "@/data/mutations";
import type { Customer } from "@/features/customers/types";
import { useFormatters } from "@/lib/use-formatters";
import { toCents } from "@/lib/money";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type DocumentLine = DocumentItem &
  Readonly<{ availableStock: number; unit: string; product: ProductSummary | null }>;

export function DocumentForm() {
  const t = useTranslations("documents.form");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const { currency: formatCurrency, quantity: formatQuantity } = useFormatters();
  const router = useRouter();
  const mutations = useDocumentMutations();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<DocumentLine[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const subtotal = calculateDocumentSubtotal(items);
  const discount = calculateDocumentDiscount(items);
  const tax = calculateDocumentTax(items);
  const total = calculateDocumentTotal(items);

  function addItem(): void {
    setItems((current) => [
      ...current,
      {
        availableStock: 0,
        discountRate: 0,
        product: null,
        productId: "",
        productName: "",
        quantity: 1,
        sku: "",
        taxRate: 21,
        unitPriceCents: 0 as DocumentItem["unitPriceCents"],
        unit: "unidades",
      },
    ]);
  }

  function updateItem(index: number, changes: Partial<DocumentLine>): void {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    );
  }

  function selectProduct(index: number, product: ProductSummary): void {
    updateItem(index, {
      availableStock: product.stock,
      product,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPriceCents: product.priceCents,
      unit: product.unit,
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    const parsed = documentSchema.safeParse({
      customerId,
      items: items.map(({ discountRate, productId, quantity, taxRate, unitPriceCents }) => ({
        discountRate,
        productId,
        quantity,
        taxRate,
        unitPriceCents,
      })),
    });
    if (!parsed.success) {
      setError(validationMessage(parsed.error.issues[0]?.message) ?? t("fallbackError"));
      return;
    }
    setSaving(true);
    const result = await mutations.create(parsed.data, idempotencyKey.current);
    if (!result.ok) {
      const fieldErrors =
        result.error.code === "validation" ? Object.values(result.error.fieldErrors ?? {}) : [];
      setError(
        [
          errorMessage(result.error),
          ...fieldErrors.map((message) => validationMessage(message) ?? message),
        ].join(" "),
      );
      setSaving(false);
      return;
    }
    idempotencyKey.current = crypto.randomUUID();
    router.push(`/comprobantes/${result.value.id}`);
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href="/comprobantes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <form onSubmit={submit} className="mt-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{t("description")}</p>
          </div>
          <Button
            type="submit"
            disabled={saving || items.length === 0 || items.some((item) => !item.productId)}
          >
            {t("save")}
          </Button>
        </header>
        {error && (
          <p
            className="border-danger/30 bg-danger/10 text-danger mt-4 rounded-lg border p-3 text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <Field htmlFor="document-customer" label={t("customer")}>
            <CustomerPicker
              id="document-customer"
              value={selectedCustomer}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setCustomerId(customer.id);
              }}
            />
          </Field>
        </section>
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">{t("products")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("stockHint")}</p>
            </div>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="size-4" aria-hidden="true" />
              {t("addItem")}
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">{t("empty")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => {
                const lineStockError =
                  Boolean(item.productId) && item.quantity > item.availableStock;
                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="grid gap-4 p-4 md:grid-cols-[minmax(12rem,2fr)_6rem_8rem_6rem_6rem_auto] md:items-end"
                  >
                    <Field
                      htmlFor={`product-${index}`}
                      label={t("product")}
                      error={
                        lineStockError
                          ? t("available", {
                              quantity: formatQuantity(item.availableStock, item.unit),
                            })
                          : undefined
                      }
                    >
                      <ProductPicker
                        id={`product-${index}`}
                        value={item.product}
                        onSelect={(product) => selectProduct(index, product)}
                      />
                    </Field>
                    <Field htmlFor={`quantity-${index}`} label={t("quantity")}>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </Field>
                    <Field htmlFor={`price-${index}`} label={t("price")}>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={(item.unitPriceCents / 100).toFixed(2)}
                        onChange={(event) =>
                          updateItem(index, { unitPriceCents: toCents(Number(event.target.value)) })
                        }
                      />
                    </Field>
                    <Field htmlFor={`discount-${index}`} label={t("discount")}>
                      <Input
                        id={`discount-${index}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discountRate}
                        onChange={(event) =>
                          updateItem(index, { discountRate: Number(event.target.value) })
                        }
                      />
                    </Field>
                    <Field htmlFor={`tax-${index}`} label={t("tax")}>
                      <Input
                        id={`tax-${index}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.taxRate}
                        onChange={(event) =>
                          updateItem(index, { taxRate: Number(event.target.value) })
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("remove", { name: item.productName })}
                      onClick={() =>
                        setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                    <p className="text-right text-sm font-medium text-slate-700 md:col-span-6">
                      {t("lineSubtotal", { amount: formatCurrency(calculateItemSubtotal(item)) })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <div className="ml-auto grid w-full max-w-sm gap-2 border-t border-slate-100 p-5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{t("subtotal")}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t("discountTotal")}</span>
              <span>−{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t("taxTotal")}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
              <span>{t("total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </section>
      </form>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Package, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { CategoryPicker } from "@/components/features/products/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  productSchema,
  productToFormValues,
  type ProductFormInput,
  type ProductFormValues,
} from "@/features/products/schemas";
import { useProductMutations } from "@/data/mutations";
import { useProduct } from "@/data/queries";
import { PRODUCT_CATEGORY_TYPE_ID, type ElemSubType } from "@/features/catalog/types";
import type { FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type ProductFormProps = { mode: "create" | "edit"; productId?: string };

export function ProductForm({ mode, productId }: ProductFormProps) {
  const t = useTranslations("products.form");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const mutations = useProductMutations();
  const productQuery = useProduct(productId ?? "");
  const product = productId ? productQuery.data : undefined;
  const [mutationError, setMutationError] = useState("");
  const [pickedCategory, setPickedCategory] = useState<ElemSubType | null>(null);
  const category =
    pickedCategory ??
    (product
      ? {
          description: product.category,
          elemTypeId: PRODUCT_CATEGORY_TYPE_ID,
          id: product.categoryId,
        }
      : null);
  const resetProductId = useRef<string | null>(null);
  const form = useForm<ProductFormInput, undefined, ProductFormValues>({
    defaultValues: {
      barcode: product?.barcode ?? "",
      categoryId: product?.categoryId ?? "",
      costPesos: product ? product.costCents / 100 : 0,
      minimumStock: product?.minimumStock ?? 0,
      name: product?.name ?? "",
      pricePesos: product ? product.priceCents / 100 : 0,
      sku: product?.sku ?? "",
      status: product?.status ?? "active",
      unit: product?.unit ?? "Unidad",
    },
    resolver: zodResolver(productSchema),
  });
  useEffect(() => {
    if (mode === "edit" && product && resetProductId.current !== product.id) {
      form.reset(productToFormValues(product));
      resetProductId.current = product.id;
    }
  }, [form, mode, product]);
  const errors = form.formState.errors;
  if (mode === "edit" && productQuery.isLoading)
    return (
      <main id="contenido" role="status" className="p-8">
        {t("loading")}
      </main>
    );
  if (mode === "edit" && !product)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{t("notFound")}</h1>
        <Link href="/productos" className="mt-4 inline-block text-emerald-800 underline">
          {t("back")}
        </Link>
      </main>
    );

  async function onSubmit(values: ProductFormValues): Promise<void> {
    const result =
      mode === "edit" && product
        ? await mutations.update(product.id, values)
        : await mutations.create(values);
    if (!result.ok) {
      if (result.error.code === "validation" && result.error.fieldErrors) {
        const [first] = Object.entries(result.error.fieldErrors);
        for (const [field, message] of Object.entries(result.error.fieldErrors)) {
          form.setError(field as FieldPath<ProductFormValues>, { message, type: "server" });
        }
        if (first) form.setFocus(first[0] as FieldPath<ProductFormValues>);
      }
      setMutationError(errorMessage(result.error));
      return;
    }
    router.push(`/productos/${result.value.id}`);
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href={product ? `/productos/${product.id}` : "/productos"}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {mode === "edit" ? t("edit") : t("new")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{t("stockNote")}</p>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="size-4" aria-hidden="true" />
            {form.formState.isSubmitting
              ? t("saving")
              : mode === "edit"
                ? t("saveChanges")
                : t("create")}
          </Button>
        </header>
        {mutationError && (
          <p
            role="alert"
            className="border-danger/30 bg-danger/10 text-danger mt-4 rounded-lg border p-3 text-sm"
          >
            {mutationError}
          </p>
        )}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
              <Package className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{t("sectionTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("pricesHint")}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field htmlFor="name" label={t("name")} error={validationMessage(errors.name?.message)}>
              <Input
                id="name"
                {...form.register("name")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </Field>
            <Field htmlFor="sku" label={t("code")} error={validationMessage(errors.sku?.message)}>
              <Input
                id="sku"
                {...form.register("sku")}
                aria-invalid={Boolean(errors.sku)}
                aria-describedby={errors.sku ? "sku-error" : undefined}
              />
            </Field>
            <Field
              htmlFor="category"
              label={t("category")}
              error={validationMessage(errors.categoryId?.message)}
            >
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <CategoryPicker
                    id="category"
                    value={category}
                    onSelect={(selected) => {
                      setPickedCategory(selected);
                      field.onChange(selected.id);
                    }}
                    ariaInvalid={Boolean(errors.categoryId)}
                    ariaDescribedBy={errors.categoryId ? "category-error" : undefined}
                  />
                )}
              />
            </Field>
            <Field
              htmlFor="unit"
              label={t("measurementUnit")}
              error={validationMessage(errors.unit?.message)}
            >
              <select
                id="unit"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...form.register("unit")}
              >
                <option value="Unidad">{t("unit")}</option>
                <option value="Metro">{t("meter")}</option>
                <option value="Par">{t("pair")}</option>
              </select>
            </Field>
            <Field
              htmlFor="pricePesos"
              label={t("salePrice")}
              error={validationMessage(errors.pricePesos?.message)}
            >
              <Input
                id="pricePesos"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                {...form.register("pricePesos")}
                aria-invalid={Boolean(errors.pricePesos)}
                aria-describedby={errors.pricePesos ? "pricePesos-error" : undefined}
              />
            </Field>
            <Field
              htmlFor="costPesos"
              label={t("cost")}
              error={validationMessage(errors.costPesos?.message)}
            >
              <Input
                id="costPesos"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                {...form.register("costPesos")}
                aria-invalid={Boolean(errors.costPesos)}
                aria-describedby={errors.costPesos ? "costPesos-error" : undefined}
              />
            </Field>
            <Field
              htmlFor="minimumStock"
              label={t("minimumStock")}
              error={validationMessage(errors.minimumStock?.message)}
            >
              <Input
                id="minimumStock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                {...form.register("minimumStock")}
                aria-invalid={Boolean(errors.minimumStock)}
                aria-describedby={errors.minimumStock ? "minimumStock-error" : undefined}
              />
            </Field>
            <Field htmlFor="barcode" label={t("barcode")}>
              <Input id="barcode" {...form.register("barcode")} />
            </Field>
          </div>
        </section>
      </form>
    </main>
  );
}

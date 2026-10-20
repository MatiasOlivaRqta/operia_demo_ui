"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customerSchema,
  defaultPriceList,
  type CustomerFormValues,
} from "@/features/customers/schemas";
import { useCustomerMutations } from "@/data/mutations";
import { useCustomer, useLocalities, useProvinces } from "@/data/queries";
import type { FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import { personTypes, vatConditions } from "@/features/customers/types";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type CustomerFormProps = { customerId?: string; mode: "create" | "edit" };
type TextFieldName = Exclude<
  FieldPath<CustomerFormValues>,
  "documentType" | "personType" | "status" | "vatCondition"
>;

const blankValues: CustomerFormValues = {
  address: "",
  commercialName: "",
  contactEmail: "",
  contactName: "",
  contactPhone: "",
  documentNumber: "",
  documentType: "DNI",
  fiscalAddress: "",
  legalName: "",
  locality: "",
  personType: personTypes.natural,
  postalCode: "",
  priceList: defaultPriceList[personTypes.natural],
  province: "",
  status: "active",
  vatCondition: vatConditions.consumer,
};

const documentPlaceholder = {
  "CUIT/CUIL": "30-12345678-9",
  DNI: "30123456",
  Pasaporte: "AAA123456",
} as const;

// Individuals use their full name as the visible name and do not have a separate legal name or contact.
function toNaturalPerson(values: CustomerFormValues): CustomerFormValues {
  return {
    ...values,
    commercialName: values.legalName,
    contactName: "",
    fiscalAddress: "",
  };
}

export function CustomerForm({ customerId, mode }: CustomerFormProps) {
  const t = useTranslations("customers.form");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const mutations = useCustomerMutations();
  const customerQuery = useCustomer(customerId ?? "");
  const customer = customerId ? customerQuery.data : undefined;
  const [mutationError, setMutationError] = useState("");
  const form = useForm<CustomerFormValues>({
    defaultValues: customer ? { ...customer } : blankValues,
    resolver: zodResolver(customerSchema),
  });
  useEffect(() => {
    if (customer) form.reset({ ...customer });
  }, [customer, form]);
  const isEditing = mode === "edit";
  const personType = useWatch({ control: form.control, name: "personType" });
  const documentType = useWatch({ control: form.control, name: "documentType" });
  const priceList = useWatch({ control: form.control, name: "priceList" });
  const province = useWatch({ control: form.control, name: "province" });
  const provincesQuery = useProvinces();
  const provinceId = provincesQuery.data.find((entry) => entry.name === province)?.id ?? "";
  const localitiesQuery = useLocalities(provinceId);
  const isNatural = personType === personTypes.natural;
  if (isEditing && customerQuery.isLoading)
    return (
      <main id="contenido" role="status" className="p-8">
        {t("loading")}
      </main>
    );
  if (isEditing && !customer)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{customerQuery.error?.message ?? t("notFound")}</h1>
        <Link href="/clientes" className="mt-4 inline-block text-emerald-800 underline">
          {t("back")}
        </Link>
      </main>
    );

  function onPersonTypeChange(next: CustomerFormValues["personType"]): void {
    if (next === personTypes.legal) form.setValue("documentType", "CUIT/CUIL");
    const previous = next === personTypes.natural ? personTypes.legal : personTypes.natural;
    // Replace only the suggested list; preserve a list selected by the user.
    if (!isEditing && form.getValues("priceList") === defaultPriceList[previous])
      form.setValue("priceList", defaultPriceList[next]);
  }

  async function onSubmit(values: CustomerFormValues): Promise<void> {
    const input = values.personType === personTypes.natural ? toNaturalPerson(values) : values;
    const result =
      isEditing && customer
        ? await mutations.update(customer.id, input)
        : await mutations.create(input);
    if (!result.ok) {
      if (result.error.code === "validation" && result.error.fieldErrors) {
        const fieldErrors = Object.entries(result.error.fieldErrors).filter(
          ([field]) => field in customerSchema.shape,
        );
        const [first] = fieldErrors;
        for (const [field, message] of fieldErrors) {
          form.setError(field as FieldPath<CustomerFormValues>, { message, type: "server" });
        }
        if (first) form.setFocus(first[0] as FieldPath<CustomerFormValues>);
      }
      setMutationError(errorMessage(result.error));
      return;
    }
    router.push(`/clientes/${result.value.id}`);
  }

  const error = form.formState.errors;
  const textField = (
    name: TextFieldName,
    label: string,
    inputProps: ComponentProps<typeof Input> = {},
  ) => (
    <Field htmlFor={name} label={label} error={validationMessage(error[name]?.message)}>
      <Input
        id={name}
        {...inputProps}
        {...form.register(name)}
        aria-invalid={Boolean(error[name])}
        aria-describedby={error[name] ? `${name}-error` : undefined}
      />
    </Field>
  );
  const optional = (label: string) => (isNatural ? t("optional", { label }) : label);
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href={isEditing && customer ? `/clientes/${customer.id}` : "/clientes"}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <form className="mt-6 space-y-6" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {isEditing ? t("edit") : t("new")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{t("description")}</p>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="size-4" aria-hidden="true" />
            {form.formState.isSubmitting ? t("saving") : isEditing ? t("saveChanges") : t("create")}
          </Button>
        </header>
        {mutationError && (
          <p
            role="alert"
            className="border-danger/30 bg-danger/10 text-danger rounded-lg border p-3 text-sm"
          >
            {mutationError}
          </p>
        )}
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
              <Building2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{t("sectionTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("documentHint")}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field htmlFor="personType" label={t("personType")} error={error.personType?.message}>
              <div
                id="personType"
                role="radiogroup"
                aria-label={t("personType")}
                className="grid min-h-11 grid-cols-2 rounded-md border border-slate-300 bg-white p-1"
              >
                {Object.values(personTypes).map((type) => (
                  <label
                    key={type}
                    className="flex min-h-11 cursor-pointer items-center justify-center rounded px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 has-[:checked]:bg-slate-900 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-900"
                  >
                    <input
                      type="radio"
                      value={type}
                      className="sr-only"
                      {...form.register("personType", {
                        onChange: (event: {
                          target: { value: CustomerFormValues["personType"] };
                        }) => onPersonTypeChange(event.target.value),
                      })}
                    />
                    {type === personTypes.natural ? t("natural") : t("legal")}
                  </label>
                ))}
              </div>
            </Field>
            {textField("legalName", isNatural ? t("fullName") : t("legalName"))}
            {!isNatural && textField("commercialName", t("commercialName"))}
            {isNatural && (
              <Field
                htmlFor="documentType"
                label={t("documentType")}
                error={error.documentType?.message}
              >
                <select
                  id="documentType"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  {...form.register("documentType")}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT/CUIL">CUIT/CUIL</option>
                  <option value="Pasaporte">{t("passport")}</option>
                </select>
              </Field>
            )}
            {textField(
              "documentNumber",
              isNatural ? t("documentNumber", { type: documentType }) : t("taxId"),
              {
                placeholder: documentPlaceholder[documentType],
              },
            )}
            <Field
              htmlFor="vatCondition"
              label={t("vatCondition")}
              error={error.vatCondition?.message}
            >
              <select
                id="vatCondition"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...form.register("vatCondition")}
              >
                <option value={vatConditions.consumer}>{t("vatConsumer")}</option>
                <option value={vatConditions.exempt}>{t("vatExempt")}</option>
                <option value={vatConditions.smallTaxpayer}>{t("vatSmallTaxpayer")}</option>
                <option value={vatConditions.registered}>{t("vatRegistered")}</option>
              </select>
            </Field>
            {!isNatural && textField("contactName", t("contactName"))}
            {textField("contactPhone", t("phone"), { type: "tel" })}
            {textField("contactEmail", t("optional", { label: t("email") }), { type: "email" })}
            <Field htmlFor="priceList" label={t("priceList")} error={error.priceList?.message}>
              <select
                id="priceList"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...form.register("priceList")}
                value={priceList}
                aria-invalid={Boolean(error.priceList)}
                aria-describedby={error.priceList ? "priceList-error" : undefined}
              >
                {priceList &&
                  !Object.values(defaultPriceList).some((option) => option === priceList) && (
                    <option value={priceList}>{priceList}</option>
                  )}
                {Object.values(defaultPriceList).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            {!isNatural && textField("fiscalAddress", t("fiscalAddress"))}
            {textField("address", optional(isNatural ? t("address") : t("commercialAddress")))}
            {provincesQuery.error ? (
              textField("province", optional(t("province")))
            ) : (
              <Field
                htmlFor="province"
                label={optional(t("province"))}
                error={error.province?.message}
              >
                <select
                  id="province"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  {...form.register("province", {
                    onChange: () => form.setValue("locality", ""),
                  })}
                  // Keep the selected value if the catalog arrives after the form reset.
                  value={province}
                  aria-invalid={Boolean(error.province)}
                  aria-describedby={error.province ? "province-error" : undefined}
                >
                  <option value="">{t("chooseProvince")}</option>
                  {province && !provincesQuery.data.some((entry) => entry.name === province) && (
                    <option value={province}>{province}</option>
                  )}
                  {provincesQuery.data.map((entry) => (
                    <option key={entry.id} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {provincesQuery.error ? (
              textField("locality", optional(t("locality")))
            ) : (
              <Field
                htmlFor="locality"
                label={optional(t("locality"))}
                error={error.locality?.message}
              >
                <Input
                  id="locality"
                  list="customer-localities"
                  {...form.register("locality")}
                  aria-invalid={Boolean(error.locality)}
                  aria-describedby={error.locality ? "locality-error" : undefined}
                />
                <datalist id="customer-localities">
                  {localitiesQuery.data.map((entry) => (
                    <option key={entry.id} value={entry.name} label={entry.department} />
                  ))}
                </datalist>
              </Field>
            )}
            {textField("postalCode", t("optional", { label: t("postalCode") }))}
          </div>
          {isNatural && <p className="mt-5 text-sm text-slate-600">{t("contactRequired")}</p>}
        </section>
      </form>
    </main>
  );
}

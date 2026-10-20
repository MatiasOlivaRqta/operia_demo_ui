"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@base-ui/react/combobox";
import { Search } from "lucide-react";

import { useCan, useCustomerSearch, useDocuments, useProductSearch } from "@/data/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useTranslations } from "next-intl";

type Result = Readonly<{ href: string; label: string; detail: string }>;

// A one-character term barely narrows the trigram index, so require at least two characters.
const MIN_CHARS = 2;
const PER_GROUP = 5;

export function GlobalSearch() {
  const t = useTranslations("dashboard.search");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search, 300).trim();
  const enabled = term.length >= MIN_CHARS;
  const canReadCustomers = useCan("customers.read");
  const canReadProducts = useCan("products.read");
  const canReadDocuments = useCan("documents.read");

  const customers = useCustomerSearch(term, { enabled: enabled && canReadCustomers });
  const products = useProductSearch(term, { enabled: enabled && canReadProducts });
  const documents = useDocuments(
    { search: term, pageSize: PER_GROUP },
    { enabled: enabled && canReadDocuments },
  );

  const groups: { title: string; results: Result[]; total: number }[] = [
    ...(canReadCustomers
      ? [
          {
            title: t("customers"),
            results: (customers.data?.items ?? []).slice(0, PER_GROUP).map((c) => ({
              href: `/clientes/${c.id}`,
              label: c.commercialName,
              detail: `${c.documentType} ${c.documentNumber}`,
            })),
            total: customers.data?.total ?? 0,
          },
        ]
      : []),
    ...(canReadProducts
      ? [
          {
            title: t("products"),
            results: (products.data?.items ?? []).slice(0, PER_GROUP).map((p) => ({
              href: `/productos/${p.id}`,
              label: p.name,
              detail: `SKU ${p.sku}`,
            })),
            total: products.data?.total ?? 0,
          },
        ]
      : []),
    ...(canReadDocuments
      ? [
          {
            title: t("documents"),
            results: (documents.data?.items ?? []).slice(0, PER_GROUP).map((d) => ({
              href: `/comprobantes/${d.id}`,
              label: d.internalNumber,
              detail: d.customerName,
            })),
            total: documents.data?.total ?? 0,
          },
        ]
      : []),
  ];
  const flat = groups.flatMap((group) => group.results);
  const loading =
    (canReadCustomers && customers.isLoading) ||
    (canReadProducts && products.isLoading) ||
    (canReadDocuments && documents.isLoading);
  const failed =
    (canReadCustomers && customers.error) ||
    (canReadProducts && products.error) ||
    (canReadDocuments && documents.error);
  const shown = flat.length;
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const moreMessage = !loading && !failed && total > shown ? t("showing", { shown, total }) : null;
  let index = 0;

  return (
    <Combobox.Root<Result>
      value={null}
      inputValue={search}
      onInputValueChange={setSearch}
      onValueChange={(result) => {
        if (!result) return;
        setSearch("");
        router.push(result.href);
      }}
      itemToStringLabel={(result) => result.label}
      itemToStringValue={(result) => result.href}
      autoHighlight
    >
      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/30 md:flex">
        <Search className="size-4 text-slate-500" aria-hidden="true" />
        <Combobox.Input
          aria-label={t("ariaLabel")}
          placeholder={t("placeholder")}
          className="min-h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
        />
      </div>
      {enabled ? (
        <Combobox.Portal>
          <Combobox.Positioner className="z-50 outline-none" sideOffset={4} align="start">
            <Combobox.Popup className="max-h-96 w-[var(--anchor-width)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <Combobox.List className="max-h-80 overflow-y-auto p-1">
                {loading ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                    {t("loading")}
                  </Combobox.Empty>
                ) : failed ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-rose-700" role="alert">
                    {t("error")}
                  </Combobox.Empty>
                ) : shown === 0 ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                    {t("empty")}
                  </Combobox.Empty>
                ) : (
                  groups
                    .filter((group) => group.results.length > 0)
                    .map((group) => (
                      <Combobox.Group key={group.title} items={group.results}>
                        <Combobox.GroupLabel className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          {group.title}
                        </Combobox.GroupLabel>
                        {group.results.map((result) => (
                          <Combobox.Item
                            key={result.href}
                            value={result}
                            index={index++}
                            className="flex cursor-pointer flex-col rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-emerald-50"
                          >
                            <span className="font-medium text-slate-800">{result.label}</span>
                            <span className="mt-0.5 text-xs text-slate-500">{result.detail}</span>
                          </Combobox.Item>
                        ))}
                      </Combobox.Group>
                    ))
                )}
              </Combobox.List>
              {moreMessage ? (
                <p
                  aria-live="polite"
                  className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500"
                >
                  {moreMessage}
                </p>
              ) : null}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      ) : null}
    </Combobox.Root>
  );
}

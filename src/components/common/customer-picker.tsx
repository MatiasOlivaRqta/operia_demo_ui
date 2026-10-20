"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { useCustomerSearch } from "@/data/queries";
import type { Customer } from "@/features/customers/types";
import { getSearchResultsMessage } from "@/lib/search-results-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type CustomerPickerProps = Readonly<{
  id: string;
  value: Customer | null;
  onSelect: (customer: Customer) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}>;

export function CustomerPicker({
  id,
  value,
  onSelect,
  ariaInvalid,
  ariaDescribedBy,
}: CustomerPickerProps) {
  const t = useTranslations("common.customerPicker");
  const searchResultsT = useTranslations("common.searchResults");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const customersQuery = useCustomerSearch(debouncedSearch, { enabled: open });
  const visibleCustomers = customersQuery.data?.items.slice(0, 10) ?? [];
  const resultsMessage =
    !customersQuery.isLoading && !customersQuery.error
      ? getSearchResultsMessage(visibleCustomers.length, customersQuery.data?.total ?? 0)
      : null;

  return (
    <Combobox.Root<Customer>
      value={value}
      inputValue={open ? search : (value?.commercialName ?? "")}
      onInputValueChange={setSearch}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      onValueChange={(customer) => {
        if (customer) onSelect(customer);
        setSearch("");
      }}
      itemToStringLabel={(customer) => customer.commercialName}
      itemToStringValue={(customer) => customer.id}
      isItemEqualToValue={(customer, selected) => customer.id === selected.id}
      autoHighlight
    >
      <Combobox.Input
        id={id}
        aria-label={t("label")}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        placeholder={t("placeholder")}
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30"
      />
      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {customersQuery.isLoading ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                  {t("loading")}
                </Combobox.Empty>
              ) : customersQuery.error ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-rose-700" role="alert">
                  {t("error")}
                </Combobox.Empty>
              ) : visibleCustomers.length === 0 ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                  {t("empty")}
                </Combobox.Empty>
              ) : (
                visibleCustomers.map((customer, index) => (
                  <Combobox.Item
                    key={customer.id}
                    value={customer}
                    index={index}
                    className="flex cursor-pointer flex-col rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-emerald-50"
                  >
                    <span className="font-medium text-slate-800">{customer.commercialName}</span>
                    <span className="mt-0.5 text-xs text-slate-500">
                      {customer.documentType} {customer.documentNumber}
                    </span>
                  </Combobox.Item>
                ))
              )}
            </Combobox.List>
            {resultsMessage ? (
              <p
                aria-live="polite"
                className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500"
              >
                {searchResultsT("showing", resultsMessage)}
              </p>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

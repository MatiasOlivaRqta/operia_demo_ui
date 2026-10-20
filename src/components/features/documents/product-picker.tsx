"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { useProductSearch } from "@/data/queries";
import type { ProductSummary } from "@/features/products/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useFormatters } from "@/lib/use-formatters";
import { getSearchResultsMessage } from "@/lib/search-results-message";

type ProductPickerProps = Readonly<{
  id: string;
  value: ProductSummary | null;
  onSelect: (product: ProductSummary) => void;
  includeInactive?: boolean;
}>;

export function ProductPicker({
  id,
  value,
  onSelect,
  includeInactive = false,
}: ProductPickerProps) {
  const t = useTranslations("documents.picker");
  const searchResultsT = useTranslations("common.searchResults");
  const { quantity: formatQuantity } = useFormatters();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const productsQuery = useProductSearch(debouncedSearch, { enabled: open, includeInactive });
  const visibleProducts = productsQuery.data?.items.slice(0, 10) ?? [];
  const resultsMessage =
    !productsQuery.isLoading && !productsQuery.error
      ? getSearchResultsMessage(visibleProducts.length, productsQuery.data?.total ?? 0)
      : null;

  return (
    <Combobox.Root<ProductSummary>
      value={value}
      inputValue={open ? search : (value?.name ?? "")}
      onInputValueChange={setSearch}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      onValueChange={(product) => {
        if (product) onSelect(product);
        setSearch("");
      }}
      itemToStringLabel={(product) => product.name}
      itemToStringValue={(product) => product.id}
      isItemEqualToValue={(product, selected) => product.id === selected.id}
      autoHighlight
    >
      <Combobox.Input
        id={id}
        aria-label={t("label")}
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
              {productsQuery.isLoading ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                  {t("loading")}
                </Combobox.Empty>
              ) : productsQuery.error ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-rose-700" role="alert">
                  {t("error")}
                </Combobox.Empty>
              ) : visibleProducts.length === 0 ? (
                <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                  {includeInactive ? t("empty") : t("activeEmpty")}
                </Combobox.Empty>
              ) : (
                visibleProducts.map((product, index) => (
                  <Combobox.Item
                    key={product.id}
                    value={product}
                    index={index}
                    disabled={!includeInactive && product.stock <= 0}
                    className="flex cursor-pointer flex-col rounded-md px-3 py-2 text-sm outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-emerald-50"
                  >
                    <span className="font-medium text-slate-800">{product.name}</span>
                    <span className="mt-0.5 flex w-full justify-between gap-3 text-xs text-slate-500">
                      <span>SKU {product.sku}</span>
                      <span className={product.stock > 0 ? "text-emerald-700" : "text-rose-700"}>
                        {product.stock > 0
                          ? t("available", {
                              quantity: formatQuantity(product.stock, product.unit),
                            })
                          : t("noStock")}
                      </span>
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

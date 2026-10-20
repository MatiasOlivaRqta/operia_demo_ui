"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { useProductCategoryMutations } from "@/data/mutations";
import { useCan, useProductCategories } from "@/data/queries";
import {
  buildCategoryOptions,
  isCreateOption,
  type CategoryOption,
} from "@/features/catalog/category-options";
import type { ElemSubType } from "@/features/catalog/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/use-formatters";

type CategoryPickerProps = Readonly<{
  id: string;
  value: ElemSubType | null;
  onSelect: (category: ElemSubType) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}>;

export function CategoryPicker({
  id,
  value,
  onSelect,
  ariaInvalid,
  ariaDescribedBy,
}: CategoryPickerProps) {
  const t = useTranslations("products.category");
  const { number: formatNumber } = useFormatters();
  const canWriteProducts = useCan("products.write");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const categoriesQuery = useProductCategories(debouncedSearch, { enabled: open });
  const mutations = useProductCategoryMutations();
  const { items, total } = categoriesQuery.data;
  const canCreate =
    canWriteProducts && !categoriesQuery.isLoading && !categoriesQuery.error && !creating;
  // Only offer creation after the debounced query results are available for comparison.
  const options = buildCategoryOptions(items, debouncedSearch, canCreate);
  const shown = Math.min(items.length, 10);
  const moreResults =
    total > shown ? t("showing", { shown: formatNumber(shown), total: formatNumber(total) }) : null;

  async function choose(option: CategoryOption | null): Promise<void> {
    setSearch("");
    if (!option) return;
    if (!isCreateOption(option)) {
      setCreateError("");
      onSelect(option);
      return;
    }
    setCreating(true);
    setCreateError("");
    const result = await mutations.create(option.description);
    setCreating(false);
    if (result.ok) onSelect(result.value);
    else setCreateError(t("createError"));
  }

  return (
    <>
      <Combobox.Root<CategoryOption>
        value={value}
        inputValue={open ? search : (value?.description ?? "")}
        onInputValueChange={setSearch}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
        onValueChange={(option) => void choose(option)}
        itemToStringLabel={(option) =>
          isCreateOption(option)
            ? `${t("createAction")} "${option.description}"`
            : option.description
        }
        itemToStringValue={(option) => option.id}
        isItemEqualToValue={(option, selected) => option.id === selected.id}
        autoHighlight
      >
        <Combobox.Input
          id={id}
          aria-label={t("searchLabel")}
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
                {categoriesQuery.isLoading ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                    {t("searching")}
                  </Combobox.Empty>
                ) : categoriesQuery.error ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-rose-700" role="alert">
                    {t("searchError")}
                  </Combobox.Empty>
                ) : options.length === 0 ? (
                  <Combobox.Empty className="px-3 py-2 text-sm text-slate-500">
                    {t("empty")}
                  </Combobox.Empty>
                ) : (
                  options.map((option, index) => (
                    <Combobox.Item
                      key={option.id}
                      value={option}
                      index={index}
                      className="flex cursor-pointer flex-col rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-emerald-50"
                    >
                      {isCreateOption(option) ? (
                        <span className="font-medium text-emerald-800">
                          {t("createAction")} &quot;{option.description}&quot;
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800">{option.description}</span>
                      )}
                    </Combobox.Item>
                  ))
                )}
              </Combobox.List>
              {moreResults && (
                <p
                  aria-live="polite"
                  className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500"
                >
                  {moreResults}
                </p>
              )}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {creating && (
        <p role="status" className="mt-1 text-xs text-slate-500">
          {t("creating")}
        </p>
      )}
      {createError && (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          {createError}
        </p>
      )}
    </>
  );
}

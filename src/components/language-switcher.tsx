"use client";

import { useLocale, useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { useTransition } from "react";
import { setLanguage } from "@/app/actions";
import type { AppLocale } from "@/i18n/locale";

export function LanguageSwitcher({ inMenu = false }: { inMenu?: boolean }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("language");
  const [isPending, startTransition] = useTransition();

  function changeLanguage(nextLocale: AppLocale) {
    if (nextLocale === locale || isPending) return;
    startTransition(async () => setLanguage(nextLocale));
  }

  const options = [
    { locale: "es" as const, code: "ES", label: t("spanish") },
    { locale: "en" as const, code: "EN", label: t("english") },
  ];
  const className =
    "flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100 aria-pressed:font-semibold aria-pressed:text-emerald-800";

  if (inMenu) {
    return (
      <div role="group" aria-label={t("label")}>
        {options.map(({ locale: optionLocale, code, label }) => (
          <Menu.Item
            key={optionLocale}
            aria-label={label}
            aria-pressed={locale === optionLocale}
            disabled={isPending}
            className={className}
            onClick={() => changeLanguage(optionLocale)}
          >
            <span aria-hidden="true" className="w-5">
              {code}
            </span>
            {label}
            {locale === optionLocale && <span className="sr-only">({t("active")})</span>}
          </Menu.Item>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t("label")}>
      {options.map(({ locale: optionLocale, code, label }, index) => (
        <span key={optionLocale} className="inline-flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
          )}
          <button
            type="button"
            aria-label={label}
            aria-pressed={locale === optionLocale}
            disabled={isPending}
            onClick={() => changeLanguage(optionLocale)}
            className="min-h-9 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-800"
          >
            {code}
          </button>
        </span>
      ))}
    </div>
  );
}

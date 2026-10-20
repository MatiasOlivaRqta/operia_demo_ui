"use client";

import { useTranslations } from "next-intl";

export function NoPermission() {
  const t = useTranslations("common.noPermission");

  return (
    <section
      aria-labelledby="no-permission-title"
      className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950"
      role="status"
    >
      <h1 id="no-permission-title" className="text-lg font-semibold">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm">{t("description")}</p>
    </section>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-text-primary text-2xl font-semibold">{t("title")}</h1>
      <p className="text-text-muted mt-3 text-sm">{t("description")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}

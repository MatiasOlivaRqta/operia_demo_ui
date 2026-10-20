"use client";

import { useEffect, useState } from "react";
import { useActiveCompany } from "@/data/queries";
import { firstNameOf, formatHomeDate, greetingFor } from "@/features/dashboard/home-format";
import { useTranslations, useLocale } from "next-intl";

export function HomeGreeting() {
  const t = useTranslations("dashboard.greeting");
  const locale = useLocale() as "es" | "en";
  const { data: company, session } = useActiveCompany();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const firstName = firstNameOf(session?.user.name);
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-emerald-700">{company?.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {now ? `${t(greetingFor(now))}${firstName ? `, ${firstName}` : ""}` : ""}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{t("description")}</p>
      </div>
      <p className="text-sm font-medium text-slate-500">{now ? formatHomeDate(now, locale) : ""}</p>
    </div>
  );
}

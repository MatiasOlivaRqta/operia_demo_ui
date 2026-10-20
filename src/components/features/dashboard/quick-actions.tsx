"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCan } from "@/data/queries";

const actions = [
  { href: "/comprobantes/nuevo", key: "newDocument", permission: "documents.write" },
  { href: "/caja?accion=cobro", key: "registerPayment", permission: "cash.write" },
  { href: "/inventario", key: "adjustStock", permission: "inventory.write" },
] as const;

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");
  const canDocumentWrite = useCan("documents.write");
  const canCashWrite = useCan("cash.write");
  const canInventoryWrite = useCan("inventory.write");
  const access: Record<string, boolean> = {
    "documents.write": canDocumentWrite,
    "cash.write": canCashWrite,
    "inventory.write": canInventoryWrite,
  };
  return (
    <section className="mt-8" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-sm font-semibold text-slate-800">
        {t("title")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions
          .filter((action) => access[action.permission])
          .map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Plus className="size-4 text-emerald-700" aria-hidden="true" />
              {t(action.key)}
            </Link>
          ))}
      </div>
    </section>
  );
}

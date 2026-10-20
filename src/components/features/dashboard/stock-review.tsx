"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { useProducts } from "@/data/queries";
import { useFormatters } from "@/lib/use-formatters";
import { useTranslations } from "next-intl";

type ProductsState = ReturnType<typeof useProducts>;

/** Show the card when products need review or the query failed so it can be retried. */
export function shouldShowStockReview(products: ProductsState): boolean {
  return Boolean(products.error) || products.data.items.length > 0;
}

export function StockReview({ products }: Readonly<{ products: ProductsState }>) {
  const t = useTranslations();
  const formatters = useFormatters();
  return (
    <Card className="bg-sidebar border border-slate-200/80 py-0 text-white shadow-sm ring-0">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold tracking-[-0.025em]">
          {t("dashboard.stockReview.title")}
        </h2>
        {products.error ? (
          <div role="alert" className="mt-3">
            <p className="text-sidebar-muted text-sm">{t("dashboard.stockReview.error")}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void products.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/10">
            {products.data.items.slice(0, 3).map((product) => (
              <li key={product.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium">{product.name}</p>
                <p className="text-sidebar-muted mt-1 text-xs">
                  {t("dashboard.stockReview.stock", {
                    quantity: formatters.quantity(product.stock, product.unit),
                  })}{" "}
                  ·{" "}
                  {t("dashboard.stockReview.minimum", {
                    quantity: formatters.quantity(product.minimumStock, product.unit),
                  })}
                </p>
                <Link
                  href={`/productos/${encodeURIComponent(product.id)}?accion=movimiento`}
                  className="mt-2 inline-flex text-sm font-medium text-emerald-200 underline-offset-4 hover:underline"
                >
                  {t("dashboard.stockReview.registerMovement")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/inventario"
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-300 px-3 text-sm font-medium text-emerald-950 hover:bg-emerald-200"
        >
          {t("dashboard.stockReview.reviewInventory")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

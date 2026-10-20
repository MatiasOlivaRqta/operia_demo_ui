"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Barcode, CircleAlert, Pencil, Warehouse } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockMovementDialog } from "@/components/features/products/stock-movement-dialog";
import { useFormatters } from "@/lib/use-formatters";
import { useCan, useProduct, useProductMovements } from "@/data/queries";
import { decideProductAction } from "@/features/products/action-logic";
import { useTranslations } from "next-intl";

type ProductDetailProps = { productId: string };

function ProductActionListener({
  productAvailable,
  onOpen,
}: Readonly<{ productAvailable: boolean; onOpen: () => void }>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef(false);
  const action = searchParams.get("accion");

  useEffect(() => {
    const decision = decideProductAction(action, productAvailable, handled.current);
    if (decision === "wait" || decision === "none") return;
    handled.current = true;
    onOpen();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("accion");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [action, onOpen, pathname, productAvailable, router, searchParams]);
  return null;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const canWriteProducts = useCan("products.write");
  const t = useTranslations("products.detail");
  const formT = useTranslations("products.form");
  const {
    currency: formatCurrency,
    date: formatDate,
    number: formatNumber,
    quantity: formatQuantity,
  } = useFormatters();
  const [initialMovementOpen, setInitialMovementOpen] = useState(false);
  const productQuery = useProduct(productId);
  const product = productQuery.data;
  const movementsQuery = useProductMovements(productId);
  if (!product)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{t("notFound")}</h1>
        <Link href="/productos" className="mt-4 inline-block text-emerald-800 underline">
          {t("back")}
        </Link>
      </main>
    );
  const stock = product.stock;
  const lowStock = product.lowStock;
  const inactive = product.status === "inactive";
  const movements = (movementsQuery.data?.pages ?? []).flatMap((page) => page.items);
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {product.name}
            </h1>
            <Badge
              className={
                inactive
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
                  : lowStock
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              }
            >
              {inactive ? t("inactive") : lowStock ? t("lowStock") : t("active")}
            </Badge>
          </div>
          <p className="mt-2 font-mono text-sm text-slate-500">{product.sku}</p>
        </div>
        <div className="flex gap-2">
          {canWriteProducts && (
            <Link
              href={`/productos/${product.id}/editar`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              {t("edit")}
            </Link>
          )}
          <StockMovementDialog
            productId={product.id}
            productName={product.name}
            open={initialMovementOpen}
            onOpenChange={setInitialMovementOpen}
          />
        </div>
      </div>
      <Suspense fallback={null}>
        <ProductActionListener productAvailable onOpen={() => setInitialMovementOpen(true)} />
      </Suspense>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("availableStock")}</p>
            <p
              className={
                lowStock
                  ? "mt-2 text-3xl font-semibold text-amber-700"
                  : "mt-2 text-3xl font-semibold text-slate-900"
              }
            >
              {formatQuantity(stock, product.unit)}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              {t("minimumDefined", { count: formatNumber(product.minimumStock) })}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("salePrice")}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {formatCurrency(product.priceCents)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {t("cost", { amount: formatCurrency(product.costCents) })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sidebar border border-slate-200/80 py-0 text-white shadow-sm ring-0">
          <CardContent className="p-5">
            <Warehouse className="size-5 text-emerald-300" aria-hidden="true" />
            <p className="text-sidebar-muted mt-3 text-sm">{t("location")}</p>
            <p className="mt-1 text-lg font-semibold">{t("centralWarehouse")}</p>
            <p className="text-sidebar-muted mt-2 text-xs">{t("warehouseCount")}</p>
          </CardContent>
        </Card>
      </section>
      {!inactive && lowStock && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {t("lowStockNotice")}
        </div>
      )}
      <section className="mt-8 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-6">
            <h2 className="font-semibold text-slate-900">{t("commercialInfo")}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-slate-600">{t("category")}</dt>
                <dd className="mt-1 text-slate-800">{product.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t("unit")}</dt>
                <dd className="mt-1 text-slate-800">
                  {product.unit === "Unidad"
                    ? formT("unit")
                    : product.unit === "Metro"
                      ? formT("meter")
                      : product.unit === "Par"
                        ? formT("pair")
                        : product.unit}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Barcode className="size-4 text-emerald-700" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-slate-600">{t("barcode")}</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-800">{product.barcode}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">{t("historyTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("movementHistory")}</p>
            </div>
            <Table aria-label={t("movementsAriaLabel", { name: product.name })}>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 text-xs text-slate-500">{t("date")}</TableHead>
                  <TableHead className="text-xs text-slate-500">{t("reference")}</TableHead>
                  <TableHead className="hidden text-xs text-slate-500 sm:table-cell">
                    {t("type")}
                  </TableHead>
                  <TableHead className="text-right text-xs text-slate-500">
                    {t("quantity")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsQuery.error ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <p role="alert" className="py-3 text-sm text-rose-700">
                        {t("loadError")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <p role="status" className="py-3 text-sm text-slate-500">
                        {t("empty")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="px-5 text-slate-600">
                        {formatDate(movement.date)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{movement.reference}</p>
                        <p className="mt-1 text-xs text-slate-500">{movement.note}</p>
                      </TableCell>
                      <TableCell className="hidden text-slate-600 sm:table-cell">
                        {movement.type === "Ingreso"
                          ? t("income")
                          : movement.type === "Salida"
                            ? t("outgoing")
                            : movement.type === "Ajuste"
                              ? t("adjustment")
                              : t("reversal")}
                      </TableCell>
                      <TableCell
                        className={
                          movement.quantity > 0
                            ? "text-right font-semibold text-emerald-700"
                            : "text-right font-semibold text-amber-700"
                        }
                      >
                        {movement.quantity > 0
                          ? `+${formatNumber(movement.quantity)}`
                          : formatNumber(movement.quantity)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {movementsQuery.hasNextPage && (
              <div className="border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-800 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={movementsQuery.isFetchingNextPage}
                  onClick={() => void movementsQuery.fetchNextPage()}
                >
                  {movementsQuery.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

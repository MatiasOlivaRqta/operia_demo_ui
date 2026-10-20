"use client";

import { useState } from "react";
import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProductMutations } from "@/data/mutations";
import { useCan, useProduct, useProductMovements } from "@/data/queries";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/use-formatters";
import { useErrorMessage } from "@/lib/use-error-message";

type StockMovementDialogProps = {
  productId: string;
  productName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
type MovementAction = "Ajuste" | "Ingreso" | "Reversion" | "Salida";

export function StockMovementDialog({
  productId,
  productName,
  open: controlledOpen,
  onOpenChange,
}: StockMovementDialogProps) {
  const t = useTranslations("products.movement");
  const canWriteInventory = useCan("inventory.write");
  const canCancelInventory = useCan("inventory.cancel");
  const errorMessage = useErrorMessage();
  const { number: formatNumber } = useFormatters();
  const mutations = useProductMutations();
  const productQuery = useProduct(productId);
  const product = productQuery.data;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [movementLimit, setMovementLimit] = useState(20);
  const movementsQuery = useProductMovements(
    productId,
    { limit: movementLimit },
    { enabled: open },
  );
  const [type, setType] = useState<MovementAction>(canWriteInventory ? "Ingreso" : "Reversion");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [movementId, setMovementId] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [saving, setSaving] = useState(false);
  const movements = movementsQuery.data?.pages[0]?.items ?? [];
  const reversible = movements.filter(
    (movement) => !movement.reversed && movement.type !== "Reversion",
  );

  async function submit(): Promise<void> {
    if (type === "Reversion" ? !canCancelInventory : !canWriteInventory) return;
    setError("");
    setInvalidField("");
    if (!product) return;
    if (type === "Reversion" && !movementId) {
      setError(t("selectError"));
      setInvalidField("movement-original");
      document.getElementById("movement-original")?.focus();
      return;
    }
    if (type !== "Reversion" && (!quantity || !note.trim())) {
      setError(t("requiredError"));
      const firstInvalid = !quantity ? "movement-quantity" : "movement-note";
      setInvalidField(firstInvalid);
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setSaving(true);
    const result =
      type === "Reversion"
        ? await mutations.reverseStockMovement(productId, movementId, note || t("reversalNote"))
        : type === "Ajuste"
          ? await mutations.adjustStock(productId, {
              targetStock: Number(quantity),
              note,
            })
          : await mutations.addStockMovement(productId, {
              action: type,
              quantity: Number(quantity),
              note,
            });
    if (!result.ok) {
      setError(
        result.error.code === "business_rule"
          ? t("businessError", { message: errorMessage(result.error) })
          : result.error.code === "conflict"
            ? t("conflictError", { message: errorMessage(result.error) })
            : errorMessage(result.error),
      );
      if (result.error.code === "validation" || result.error.code === "business_rule") {
        setInvalidField("movement-quantity");
        document.getElementById("movement-quantity")?.focus();
      }
      setSaving(false);
      return;
    }
    setOpen(false);
    setStatusMessage(t("success"));
    setQuantity("");
    setNote("");
    setSaving(false);
  }

  if (!canWriteInventory && !canCancelInventory) return null;

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {t("register")}
        </Button>
        <DialogContent>
          <DialogHeader>
            <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-800">
              <History className="size-4" aria-hidden="true" />
            </span>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { name: productName })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label htmlFor="movement-type" className="text-sm font-medium">
                {t("type")}
              </label>
              <select
                id="movement-type"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={type}
                onChange={(event) => setType(event.target.value as MovementAction)}
              >
                {canWriteInventory && <option value="Ingreso">{t("income")}</option>}
                {canWriteInventory && <option value="Salida">{t("outgoing")}</option>}
                {canWriteInventory && <option value="Ajuste">{t("adjustment")}</option>}
                {canCancelInventory && <option value="Reversion">{t("reversal")}</option>}
              </select>
            </div>
            {type === "Reversion" ? (
              <div className="space-y-2">
                <label htmlFor="movement-original" className="text-sm font-medium">
                  {t("original")}
                </label>
                <select
                  id="movement-original"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={movementId}
                  onChange={(event) => setMovementId(event.target.value)}
                  aria-invalid={invalidField === "movement-original"}
                  aria-describedby={error ? "movement-error" : undefined}
                >
                  <option value="">{t("choose")}</option>
                  {reversible.map((movement) => (
                    <option key={movement.id} value={movement.id}>
                      {movement.type === "Ingreso"
                        ? t("income")
                        : movement.type === "Salida"
                          ? t("outgoing")
                          : movement.type === "Ajuste"
                            ? t("adjustment")
                            : t("reversal")}{" "}
                      · {movement.reference} · {formatNumber(movement.quantity)}
                    </option>
                  ))}
                </select>
                {movementsQuery.isLoading && (
                  <p className="text-sm text-slate-500" role="status">
                    {t("loading")}
                  </p>
                )}
                {movementsQuery.error && (
                  <p className="text-sm text-rose-700" role="alert">
                    {t("loadError")}
                  </p>
                )}
                {movementsQuery.hasNextPage && movementLimit < 100 && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={movementsQuery.isFetching || movementsQuery.isFetchingNextPage}
                    onClick={() => setMovementLimit((current) => Math.min(100, current + 20))}
                  >
                    {t("loadMore")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="movement-quantity" className="text-sm font-medium">
                  {type === "Ajuste" ? t("finalStock") : t("quantity")}
                </label>
                <Input
                  id="movement-quantity"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-invalid={invalidField === "movement-quantity"}
                  aria-describedby={error ? "movement-error" : undefined}
                />
              </div>
            )}
            {type !== "Reversion" && (
              <div className="space-y-2">
                <label htmlFor="movement-note" className="text-sm font-medium">
                  {t("reason")}
                </label>
                <Input
                  id="movement-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  aria-invalid={invalidField === "movement-note"}
                  aria-describedby={error ? "movement-error" : undefined}
                />
              </div>
            )}
            {error && (
              <p role="alert" id="movement-error" className="text-danger text-sm">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? t("saving") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

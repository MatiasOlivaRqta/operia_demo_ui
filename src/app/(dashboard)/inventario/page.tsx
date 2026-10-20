import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InventoryOverview } from "@/components/features/products/inventory-overview";
import { PermissionGate } from "@/components/common/permission-gate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("inventoryTitle"), description: t("inventoryDescription") };
}

export default function InventoryPage() {
  return (
    <PermissionGate permissions={["inventory.read"]}>
      <InventoryOverview />
    </PermissionGate>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CashOverview } from "@/components/features/cash/cash-overview";
import { PermissionGate } from "@/components/common/permission-gate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("cashTitle"), description: t("cashDescription") };
}

export default function CashPage() {
  return (
    <PermissionGate permissions={["cash.read"]}>
      <CashOverview />
    </PermissionGate>
  );
}

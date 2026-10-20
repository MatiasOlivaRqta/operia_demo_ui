import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview";
import { PermissionGate } from "@/components/common/permission-gate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("dashboardTitle"), description: t("dashboardDescription") };
}

export default function DashboardPage() {
  return (
    <PermissionGate permissions={["dashboard.read"]}>
      <DashboardOverview />
    </PermissionGate>
  );
}

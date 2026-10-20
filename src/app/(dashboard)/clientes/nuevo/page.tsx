import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CustomerForm } from "@/components/features/customers/customer-form";
import { PermissionGate } from "@/components/common/permission-gate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("newCustomerTitle") };
}

export default function NewCustomerPage() {
  return (
    <PermissionGate permissions={["customers.write"]}>
      <CustomerForm mode="create" />
    </PermissionGate>
  );
}

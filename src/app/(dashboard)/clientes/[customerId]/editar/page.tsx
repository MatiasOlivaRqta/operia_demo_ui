import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CustomerForm } from "@/components/features/customers/customer-form";
import { PermissionGate } from "@/components/common/permission-gate";

type EditCustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("editCustomerTitle") };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { customerId } = await params;
  return (
    <PermissionGate permissions={["customers.write"]}>
      <CustomerForm customerId={customerId} mode="edit" />
    </PermissionGate>
  );
}

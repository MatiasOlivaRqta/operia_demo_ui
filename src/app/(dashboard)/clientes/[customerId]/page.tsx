import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CustomerDetail } from "@/components/features/customers/customer-detail";
import { PermissionGate } from "@/components/common/permission-gate";

type CustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("customerTitle") };
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { customerId } = await params;
  return (
    <PermissionGate permissions={["customers.read"]}>
      <CustomerDetail customerId={customerId} />
    </PermissionGate>
  );
}

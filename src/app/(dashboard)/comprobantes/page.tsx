import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocumentsList } from "@/components/features/documents/documents-list";
import { PermissionGate } from "@/components/common/permission-gate";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("documentsTitle"), description: t("documentsDescription") };
}
export default function DocumentsPage() {
  return (
    <PermissionGate permissions={["documents.read"]}>
      <DocumentsList />
    </PermissionGate>
  );
}

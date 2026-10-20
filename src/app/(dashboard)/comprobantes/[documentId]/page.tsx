import { DocumentDetail } from "@/components/features/documents/document-detail";
import { PermissionGate } from "@/components/common/permission-gate";
type DocumentPageProps = { params: Promise<{ documentId: string }> };
export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;
  return (
    <PermissionGate permissions={["documents.read"]}>
      <DocumentDetail documentId={documentId} />
    </PermissionGate>
  );
}

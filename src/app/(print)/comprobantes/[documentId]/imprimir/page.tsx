import { PrintableDocument } from "@/components/features/documents/printable-document";
import { PermissionGate } from "@/components/common/permission-gate";

type PrintDocumentPageProps = { params: Promise<{ documentId: string }> };

export default async function PrintDocumentPage({ params }: PrintDocumentPageProps) {
  const { documentId } = await params;
  return (
    <PermissionGate permissions={["documents.read"]}>
      <PrintableDocument documentId={documentId} />
    </PermissionGate>
  );
}

import { DocumentForm } from "@/components/features/documents/document-form";
import { PermissionGate } from "@/components/common/permission-gate";
export default function NewDocumentPage() {
  return (
    <PermissionGate permissions={["documents.write"]}>
      <DocumentForm />
    </PermissionGate>
  );
}

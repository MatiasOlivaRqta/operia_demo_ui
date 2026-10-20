import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/features/documents/types";
import { useTranslations } from "next-intl";

const statusPresentation: Record<DocumentStatus, { label: string; className: string }> = {
  PENDING: { label: "pendingOne", className: "bg-amber-50 text-amber-700 hover:bg-amber-50" },
  PARTIAL: { label: "partialOne", className: "bg-sky-50 text-sky-700 hover:bg-sky-50" },
  COMPLETED: {
    label: "completedOne",
    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  },
  CANCELLED: { label: "cancelledOne", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const t = useTranslations("documents.status");
  const presentation = statusPresentation[status];
  return <Badge className={presentation.className}>{t(presentation.label)}</Badge>;
}

export function documentStatusLabel(status: DocumentStatus): string {
  return statusPresentation[status].label;
}

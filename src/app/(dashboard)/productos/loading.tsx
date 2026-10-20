import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
export default function Loading() {
  const t = useTranslations("common");
  return (
    <main aria-label={t("loadingProducts")} className="space-y-6 p-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-96" />
    </main>
  );
}

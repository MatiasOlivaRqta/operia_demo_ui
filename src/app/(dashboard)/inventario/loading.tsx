import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
export default function Loading() {
  const t = useTranslations("common");
  return (
    <main aria-label={t("loadingInventory")} className="space-y-6 p-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}

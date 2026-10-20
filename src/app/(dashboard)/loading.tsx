import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function DashboardLoading() {
  const t = useTranslations("common");
  return (
    <main
      aria-label={t("pageLoading")}
      className="mx-auto w-full max-w-[90rem] space-y-6 px-4 py-7 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}

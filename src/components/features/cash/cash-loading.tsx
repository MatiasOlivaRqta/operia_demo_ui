import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export function CashLoading() {
  const t = useTranslations("common");
  return (
    <main
      aria-label={t("cashLoading")}
      className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-7 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-20 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}

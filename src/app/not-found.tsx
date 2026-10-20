import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main
      id="contenido"
      className="grid min-h-dvh place-content-center justify-items-center gap-4 px-6 text-center"
    >
      <h1 className="text-text-primary text-3xl font-semibold">{t("title")}</h1>
      <p className="text-text-muted text-sm">{t("description")}</p>
      <Button nativeButton={false} render={<Link href="/" />}>
        {t("home")}
      </Button>
    </main>
  );
}

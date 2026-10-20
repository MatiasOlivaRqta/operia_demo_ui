import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UsersPageContent } from "@/components/features/users/users-page-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("usersTitle"), description: t("usersDescription") };
}

export default function UsersPage() {
  return <UsersPageContent />;
}

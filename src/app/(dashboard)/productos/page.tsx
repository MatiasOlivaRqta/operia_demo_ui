import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductsList } from "@/components/features/products/products-list";
import { PermissionGate } from "@/components/common/permission-gate";
import { parseInitialLowStock } from "@/features/products/initial-stock-filter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata");
  return { title: t("productsTitle"), description: t("productsDescription") };
}

type ProductsPageProps = Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  return (
    <PermissionGate permissions={["products.read"]}>
      <ProductsList initialLowStock={parseInitialLowStock(params.stock)} />
    </PermissionGate>
  );
}

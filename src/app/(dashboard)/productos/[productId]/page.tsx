import { ProductDetail } from "@/components/features/products/product-detail";
import { PermissionGate } from "@/components/common/permission-gate";

type ProductPageProps = { params: Promise<{ productId: string }> };

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  return (
    <PermissionGate permissions={["products.read"]}>
      <ProductDetail productId={productId} />
    </PermissionGate>
  );
}

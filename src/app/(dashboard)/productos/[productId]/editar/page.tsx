import { ProductForm } from "@/components/features/products/product-form";
import { PermissionGate } from "@/components/common/permission-gate";

type EditProductPageProps = { params: Promise<{ productId: string }> };

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  return (
    <PermissionGate permissions={["products.write"]}>
      <ProductForm mode="edit" productId={productId} />
    </PermissionGate>
  );
}

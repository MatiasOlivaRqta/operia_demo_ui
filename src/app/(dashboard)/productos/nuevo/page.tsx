import { ProductForm } from "@/components/features/products/product-form";
import { PermissionGate } from "@/components/common/permission-gate";

export default function NewProductPage() {
  return (
    <PermissionGate permissions={["products.write"]}>
      <ProductForm mode="create" />
    </PermissionGate>
  );
}

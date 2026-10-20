import { describe, expect, it } from "vitest";
import { createManagedUserSchema, managedRoleSchema } from "@/features/users/schemas";

describe("user management schemas", () => {
  it("rejects passwords shorter than the back-end minimum", () => {
    const result = createManagedUserSchema.safeParse({
      email: "ana@example.com",
      name: "Ana",
      password: "short",
      roleId: "role-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("validation.minLength|12");
  });

  it("trims role names and keeps the selected permission IDs", () => {
    expect(
      managedRoleSchema.parse({ name: "  Billing  ", permissions: ["documents.write"] }),
    ).toEqual({ name: "Billing", permissions: ["documents.write"] });
  });
});

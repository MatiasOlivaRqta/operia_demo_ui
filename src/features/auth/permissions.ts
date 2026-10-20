export const permissions = [
  "customers.read",
  "customers.write",
  "products.read",
  "products.write",
  "inventory.read",
  "inventory.write",
  "inventory.cancel",
  "documents.read",
  "documents.write",
  "documents.cancel",
  "cash.read",
  "cash.write",
  "account.read",
  "account.write",
  "dashboard.read",
  "users.manage",
] as const;

export type Permission = (typeof permissions)[number];

export const permissionGroups = [
  {
    module: "customers",
    permissions: permissions.filter((permission) => permission.startsWith("customers.")),
  },
  {
    module: "products",
    permissions: permissions.filter((permission) => permission.startsWith("products.")),
  },
  {
    module: "inventory",
    permissions: permissions.filter((permission) => permission.startsWith("inventory.")),
  },
  {
    module: "documents",
    permissions: permissions.filter((permission) => permission.startsWith("documents.")),
  },
  {
    module: "cash",
    permissions: permissions.filter((permission) => permission.startsWith("cash.")),
  },
  {
    module: "account",
    permissions: permissions.filter((permission) => permission.startsWith("account.")),
  },
  {
    module: "dashboard",
    permissions: permissions.filter((permission) => permission.startsWith("dashboard.")),
  },
  {
    module: "users",
    permissions: permissions.filter((permission) => permission.startsWith("users.")),
  },
] as const;

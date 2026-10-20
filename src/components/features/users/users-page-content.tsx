"use client";

import { NoPermission } from "@/components/common/no-permission";
import { UsersManagement } from "@/components/features/users/users-management";
import { useCan } from "@/data/queries";

export function UsersPageContent() {
  return useCan("users.manage") ? <UsersManagement /> : <NoPermission />;
}

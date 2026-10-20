"use client";

import type { ReactNode } from "react";
import { NoPermission } from "@/components/common/no-permission";
import { useAuthSession, useCan } from "@/data/queries";

type PermissionGateProps = Readonly<{
  children?: ReactNode;
  permissions: readonly string[];
}>;

export function PermissionGate({ children, permissions }: PermissionGateProps) {
  const session = useAuthSession();
  const allowed = useCan(...permissions);

  if (session.isLoading || !session.data) return null;
  if (!allowed) return <NoPermission />;
  return children;
}

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/features/dashboard/dashboard-shell";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardShell>{children}</DashboardShell>;
}

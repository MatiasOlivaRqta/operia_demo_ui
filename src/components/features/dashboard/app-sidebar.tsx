"use client";

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BadgeDollarSign,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useActiveCompany, useCan } from "@/data/queries";
import { dataSource } from "@/data/config";
import { useTranslations } from "next-intl";

type AppSidebarContentProps = {
  onNavigate?: () => void;
};

const navigationItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "home", permission: "dashboard.read" },
  { href: "/clientes", icon: UsersRound, key: "customers", permission: "customers.read" },
  { href: "/productos", icon: Package, key: "products", permission: "products.read" },
  { href: "/inventario", icon: Archive, key: "inventory", permission: "inventory.read" },
  { href: "/comprobantes", icon: FileText, key: "documents", permission: "documents.read" },
  { href: "/caja", icon: BadgeDollarSign, key: "cash", permission: "cash.read" },
  { href: "/usuarios", icon: UsersRound, key: "users", permission: "users.manage" },
] as const;

export function AppSidebarContent({ onNavigate }: AppSidebarContentProps) {
  const pathname: string = usePathname();
  const t = useTranslations("dashboard.sidebar");
  const { data: activeCompany } = useActiveCompany();
  const canDashboard = useCan("dashboard.read");
  const canCustomers = useCan("customers.read");
  const canProducts = useCan("products.read");
  const canInventory = useCan("inventory.read");
  const canDocuments = useCan("documents.read");
  const canCash = useCan("cash.read");
  const canUsers = useCan("users.manage");
  const access: Record<string, boolean> = {
    "dashboard.read": canDashboard,
    "customers.read": canCustomers,
    "products.read": canProducts,
    "inventory.read": canInventory,
    "documents.read": canDocuments,
    "cash.read": canCash,
    "users.manage": canUsers,
  };

  return (
    <div className="flex h-full flex-col p-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-xl px-2 py-2 text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        onClick={onNavigate}
      >
        <span className="text-sidebar-primary-foreground grid size-9 place-items-center rounded-xl bg-emerald-300 shadow-lg shadow-emerald-950/25">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Operia</span>
      </Link>

      <div className="mt-8 px-2">
        <p className="text-sidebar-muted text-[0.69rem] font-semibold tracking-[0.14em] uppercase">
          {t("operation")}
        </p>
      </div>

      <nav className="mt-3 space-y-1" aria-label={t("navigationLabel")}>
        {navigationItems
          .filter((item) => access[item.permission])
          .map((item) => {
            const isActive: boolean =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon: LucideIcon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                  isActive
                    ? "text-sidebar-primary-foreground bg-emerald-300 shadow-sm"
                    : "text-sidebar-muted hover:bg-white/7 hover:text-white",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(item.key)}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.045] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white">{activeCompany?.name ?? t("company")}</p>
            <p className="text-sidebar-muted mt-1 text-xs">{t("activeCompany")}</p>
          </div>
          <Badge className="bg-emerald-300/15 text-emerald-200 hover:bg-emerald-300/15">
            {dataSource === "api" ? "API" : "Demo"}
          </Badge>
        </div>
        <Separator className="my-3 bg-white/8" />
        <p className="text-sidebar-muted text-xs leading-5">{t("description")}</p>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { AppSidebarContent } from "@/components/features/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header";
import { DataProvider } from "@/data/provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";

type DashboardShellProps = Readonly<{
  children: ReactNode;
}>;

export function DashboardShell({ children }: DashboardShellProps) {
  const t = useTranslations("dashboard.shell");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  function openMenu(): void {
    setIsMenuOpen(true);
  }

  function closeMenu(): void {
    setIsMenuOpen(false);
  }

  function handleMenuStateChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  return (
    <DataProvider>
      <div className="bg-background min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-white p-3 text-slate-900 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("skipContent")}
        </a>
        <aside className="bg-sidebar hidden min-h-dvh lg:block">
          <AppSidebarContent />
        </aside>

        <div className="min-w-0">
          <DashboardHeader onMenuOpen={openMenu} />
          {children}
        </div>

        <Sheet open={isMenuOpen} onOpenChange={handleMenuStateChange}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="bg-sidebar w-[17rem] border-0 p-0 text-emerald-50 sm:max-w-none"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("mainMenu")}</SheetTitle>
              <SheetDescription>{t("sections")}</SheetDescription>
            </SheetHeader>
            <AppSidebarContent onNavigate={closeMenu} />
          </SheetContent>
        </Sheet>
      </div>
    </DataProvider>
  );
}

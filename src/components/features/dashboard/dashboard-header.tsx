"use client";

import { Menu } from "@base-ui/react/menu";
import { Building2, ChevronDown, LogOut, Menu as MenuIcon } from "lucide-react";

import { GlobalSearch } from "./global-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanyMutations } from "@/data/mutations";
import { useActiveCompany, useCan, useCompanies } from "@/data/queries";
import { logoutDemo } from "@/app/actions";
import { dataSource } from "@/data/config";
import { postApi } from "@/data/http/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationBell } from "./notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/lib/use-error-message";
import { signOut } from "./dashboard-header-actions";

type DashboardHeaderProps = {
  onMenuOpen: () => void;
};

export function DashboardHeader({ onMenuOpen }: DashboardHeaderProps) {
  const t = useTranslations("dashboard.header");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const setCompany = useCompanyMutations();
  const [companyError, setCompanyError] = useState("");
  const [companyBusy, setCompanyBusy] = useState(false);
  const companiesQuery = useCompanies();
  const activeCompanyQuery = useActiveCompany();
  const canReadDashboard = useCan("dashboard.read");
  const companies = companiesQuery.data;
  const activeCompany = activeCompanyQuery.data;
  const session = activeCompanyQuery.session;
  const userName = session?.user.name ?? (dataSource === "api" ? t("account") : "Matías Oliva");
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
    .join("");
  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white px-4 sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-slate-600 lg:hidden"
        onClick={onMenuOpen}
      >
        <MenuIcon className="size-5" aria-hidden="true" />
        <span className="sr-only">{t("openNavigation")}</span>
      </Button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Select
          items={companies.map((company) => ({ value: company.id, label: company.name }))}
          value={activeCompany?.id ?? null}
          disabled={companyBusy || companiesQuery.isLoading}
          onValueChange={async (id) => {
            if (!id) return;
            setCompanyBusy(true);
            setCompanyError("");
            const result = await setCompany.mutateAsync(id);
            if (!result.ok) setCompanyError(errorMessage(result.error));
            setCompanyBusy(false);
          }}
        >
          <SelectTrigger
            aria-label={t("activeCompany")}
            className="min-h-11 max-w-44 gap-2 rounded-xl border-slate-200 bg-slate-50 px-3 font-medium text-slate-800 hover:bg-slate-100 sm:max-w-60"
          >
            <Building2 className="size-4 text-emerald-700" aria-hidden="true" />
            <SelectValue placeholder={t("selectBranch")} className="truncate" />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="end"
            className="min-w-56 rounded-xl p-1"
          >
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id} className="min-h-10 rounded-lg">
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(companyError || companiesQuery.error) && (
          <span role="alert" className="text-danger sr-only">
            {companyError || companiesQuery.error?.message}
          </span>
        )}
        {canReadDashboard && <NotificationBell />}
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <Menu.Root>
          <Menu.Trigger
            aria-label={t("userMenu")}
            className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 data-popup-open:bg-slate-100"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-sidebar text-xs font-semibold text-emerald-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block">
              <span className="block text-sm font-medium text-slate-800">{userName}</span>
              <span className="block text-xs text-slate-500">
                {session?.user.email ??
                  (dataSource === "api" ? t("connecting") : t("administrator"))}
              </span>
            </span>
            <ChevronDown className="hidden size-3.5 text-slate-500 sm:block" aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="end" sideOffset={6} className="isolate z-50">
              <Menu.Popup className="min-w-48 rounded-xl bg-white p-1 shadow-md ring-1 ring-slate-200 outline-none">
                <LanguageSwitcher inMenu />
                <Menu.Item
                  className="flex min-h-10 cursor-default items-center gap-2 rounded-lg px-2.5 text-sm text-slate-700 outline-none select-none data-highlighted:bg-red-50 data-highlighted:text-red-700"
                  onClick={() => signOut({ dataSource, logoutDemo, postApi, router })}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {t("logout")}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  );
}

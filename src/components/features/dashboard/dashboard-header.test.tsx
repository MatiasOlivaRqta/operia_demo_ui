import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header";
import { renderWithIntl } from "@/test/render-with-intl";

const { permissions, notificationBell } = vi.hoisted(() => ({
  permissions: { dashboardRead: false },
  notificationBell: vi.fn(),
}));

vi.mock("@/data/queries", () => ({
  useCan: () => permissions.dashboardRead,
  useActiveCompany: () => ({ data: undefined, session: undefined }),
  useCompanies: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/data/mutations", () => ({ useCompanyMutations: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/data/config", () => ({ dataSource: "local" }));
vi.mock("@/data/http/client", () => ({ postApi: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/features/dashboard/global-search", () => ({ GlobalSearch: () => null }));
vi.mock("@/components/features/dashboard/notification-bell", () => ({
  NotificationBell: () => {
    notificationBell();
    return <span data-testid="notification-bell">Campana</span>;
  },
}));

describe("DashboardHeader permissions", () => {
  it("does not mount the notification bell without dashboard.read", () => {
    permissions.dashboardRead = false;
    notificationBell.mockClear();

    const markup = renderWithIntl(<DashboardHeader onMenuOpen={vi.fn()} />);

    expect(markup).not.toContain('data-testid="notification-bell"');
    expect(notificationBell).not.toHaveBeenCalled();
  });

  it("mounts the notification bell with dashboard.read", () => {
    permissions.dashboardRead = true;
    notificationBell.mockClear();

    const markup = renderWithIntl(<DashboardHeader onMenuOpen={vi.fn()} />);

    expect(markup).toContain('data-testid="notification-bell"');
    expect(notificationBell).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import { Menu } from "@base-ui/react/menu";
import type { Notification } from "@/data/api";
import {
  NotificationListView,
  TelegramLinkAction,
  TelegramLinkContent,
  copyTextToClipboard,
  notificationBadgeLabel,
  telegramLinkErrorMessage,
} from "@/components/features/dashboard/notification-bell";
import { renderWithIntl } from "@/test/render-with-intl";

const { permissions } = vi.hoisted(() => ({ permissions: { usersManage: false } }));
vi.mock("@/data/queries", () => ({ useCan: () => permissions.usersManage }));

const notification: Notification = {
  id: "n1",
  type: "ORDER_MESSAGE",
  title: "Pedido de Ana",
  body: "Mensaje de notificación",
  payload: { chatId: 12, messageId: 45, username: "ana" },
  readAt: null,
  createdAt: "2026-10-15T12:00:00.000Z",
};

describe("NotificationBell views", () => {
  it("shows an unread notification and escapes its text", () => {
    const markup = renderWithIntl(
      <NotificationListView items={[notification]} unreadCount={1} onRead={vi.fn()} />,
    );
    expect(markup).toContain("Pedido de Ana");
    expect(markup).toContain("Marcar todas como leídas");
    expect(notificationBadgeLabel(1)).toBe("1");
    expect(notificationBadgeLabel(10)).toBe("9+");
    expect(notificationBadgeLabel(0)).toBeNull();
  });

  it("shows the empty state", () => {
    expect(renderWithIntl(<NotificationListView items={[]} onRead={vi.fn()} />)).toContain(
      "No hay notificaciones",
    );
  });

  it("shows a generated Telegram link, expiry, and code copy action", () => {
    const markup = renderWithIntl(
      <TelegramLinkContent
        link={{ url: "https://t.me/example?start=abc", expiresAt: "2026-10-15T12:15:00.000Z" }}
        error=""
      />,
    );
    expect(markup).toContain("Copiar código");
    expect(markup).toContain("Si el bot no te vincula al abrir el link");
    expect(markup).toContain("Vence:");
    expect(markup).toContain('target="_blank"');
  });

  it("shows clipboard and service-unavailable errors in Spanish and English", () => {
    const spanish = renderWithIntl(
      <TelegramLinkContent
        link={{ url: "https://t.me/example?start=abc", expiresAt: "2026-10-15T12:15:00.000Z" }}
        error=""
        copyError="No pudimos copiar"
      />,
    );
    const english = renderWithIntl(
      <TelegramLinkContent
        link={{ url: "https://t.me/example?start=abc", expiresAt: "2026-10-15T12:15:00.000Z" }}
        error=""
        copyError="Couldn't copy"
      />,
      "en",
    );
    const unavailableEnglish = renderWithIntl(
      <TelegramLinkContent
        link={null}
        error={telegramLinkErrorMessage(
          503,
          "The Telegram integration is currently unavailable.",
          "fallback",
        )}
      />,
      "en",
    );
    expect(spanish).toContain("No pudimos copiar");
    expect(english).toContain("Couldn&#x27;t copy");
    expect(english).toContain("Expires:");
    expect(unavailableEnglish).toContain("The Telegram integration is currently unavailable.");
    expect(telegramLinkErrorMessage(503, "unavailable", "api error")).toBe("unavailable");
    expect(telegramLinkErrorMessage(500, "unavailable", "api error")).toBe("api error");
  });

  it("copies text to the clipboard and reports failures", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await expect(copyTextToClipboard("telegram-start-token")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("telegram-start-token");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("clipboard unavailable")) },
    });
    await expect(copyTextToClipboard("token")).resolves.toBe(false);
  });

  it("localizes notification actions in English", () => {
    const markup = renderWithIntl(
      <NotificationListView items={[notification]} unreadCount={2} onRead={vi.fn()} />,
      "en",
    );
    expect(markup).toContain("Mark all as read");
    expect(markup).toContain("Mark all as read");
  });

  it("shows the Telegram link action only to users managers", () => {
    permissions.usersManage = false;
    const hidden = renderWithIntl(
      <Menu.Root>
        <TelegramLinkAction onClick={vi.fn()} />
      </Menu.Root>,
    );
    expect(hidden).not.toContain("Vincular Telegram");

    permissions.usersManage = true;
    const visible = renderWithIntl(
      <Menu.Root>
        <TelegramLinkAction onClick={vi.fn()} />
      </Menu.Root>,
    );
    expect(visible).toContain("Vincular Telegram");
  });
});

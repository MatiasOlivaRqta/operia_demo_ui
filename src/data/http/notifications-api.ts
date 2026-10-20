import type {
  NotificationsApi,
  NotificationPage,
  MovementQuery,
  RequestControl,
  TelegramLinkToken,
} from "@/data/api";
import { postApi, requestApi } from "@/data/http/client";

function queryString(query: MovementQuery = {}): string {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  });
  return `?${params.toString()}`;
}

export const notificationsApi: NotificationsApi = {
  list: (query?: MovementQuery, control?: RequestControl) =>
    requestApi<NotificationPage>(`/notifications${queryString(query)}`, control),
  unreadCount: async (control?: RequestControl) => {
    const result = await requestApi<{ count: number }>("/notifications/unread-count", control);
    return result.ok ? { ok: true, value: result.value.count } : result;
  },
  markRead: (id: string) => postApi<{ ok: true }>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => postApi<{ updated: number }>("/notifications/read-all"),
  createTelegramLink: () => postApi<TelegramLinkToken>("/telegram/link-token"),
};

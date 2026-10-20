import { afterEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "@/data/http/notifications-api";

afterEach(() => vi.unstubAllGlobals());

describe("notificationsApi", () => {
  it("uses list, count, and mutation routes with the expected methods", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, pageSize: 20, total: 0 }))
      .mockResolvedValueOnce(Response.json({ count: 2 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ updated: 2 }))
      .mockResolvedValueOnce(
        Response.json(
          { url: "https://t.me/bot?start=token", expiresAt: "2026-10-15T12:15:00.000Z" },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await notificationsApi.list()).toMatchObject({ ok: true, value: { pageSize: 20 } });
    expect(await notificationsApi.unreadCount()).toEqual({ ok: true, value: 2 });
    await notificationsApi.markRead("id /1");
    await notificationsApi.markAllRead();
    expect(await notificationsApi.createTelegramLink()).toMatchObject({
      ok: true,
      value: { url: expect.stringContaining("t.me") },
    });

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["/api/notifications?page=1&pageSize=20", "GET"],
      ["/api/notifications/unread-count", "GET"],
      ["/api/notifications/id%20%2F1/read", "POST"],
      ["/api/notifications/read-all", "POST"],
      ["/api/telegram/link-token", "POST"],
    ]);
    expect(fetchMock.mock.calls.slice(2).every(([, init]) => init?.body === undefined)).toBe(true);
  });

  it("preserves API failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: { code: "not_found", message: "No existe" } }, { status: 404 }),
        ),
    );
    expect(await notificationsApi.markRead("missing")).toMatchObject({
      ok: false,
      error: { code: "not_found", message: "No existe" },
    });
  });
});

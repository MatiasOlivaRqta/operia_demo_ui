"use client";

import { Menu } from "@base-ui/react/menu";
import { Bell, Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dataSource } from "@/data/config";
import { useNotificationMutations } from "@/data/mutations";
import { useCan, useNotificationList, useUnreadNotificationCount } from "@/data/queries";
import type { Notification } from "@/data/api";
import { useFormatters } from "@/lib/use-formatters";
import { useErrorMessage } from "@/lib/use-error-message";

export function NotificationListView({
  items,
  loading = false,
  onRead,
  unreadCount = 0,
  onMarkAllRead,
  formatDateTime: formatDateTimeProp,
}: Readonly<{
  items: readonly Notification[];
  loading?: boolean;
  unreadCount?: number;
  onRead: (id: string) => void;
  onMarkAllRead?: () => void;
  formatDateTime?: (value: string) => string;
}>) {
  const t = useTranslations("notifications");
  const defaultDateTime = useFormatters().dateTime;
  const formatDateTime = formatDateTimeProp ?? defaultDateTime;
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-2 py-1.5">
        <h2 className="text-sm font-semibold text-slate-900">{t("title")}</h2>
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-xs font-medium text-emerald-700 hover:underline"
            onClick={onMarkAllRead}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>
      {loading ? (
        <p className="px-3 py-6 text-center text-sm text-slate-500">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`block w-full cursor-default rounded-lg px-3 py-2 text-left outline-none hover:bg-slate-50 ${notification.readAt ? "text-slate-600" : "bg-emerald-50/70 text-slate-900"}`}
                onClick={() => {
                  if (!notification.readAt) onRead(notification.id);
                }}
              >
                <span className="block truncate text-sm font-medium">{notification.title}</span>
                <span className="line-clamp-2 block text-xs leading-5 text-slate-600">
                  {notification.body}
                </span>
                <time
                  className="mt-1 block text-[11px] text-slate-400"
                  dateTime={notification.createdAt}
                >
                  {formatDateTime(notification.createdAt)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TelegramLinkContent({
  link,
  error,
  copied = false,
  onCopy,
  codeCopied = false,
  onCopyCode,
  copyError = "",
  formatDateTime: formatDateTimeProp,
}: Readonly<{
  link: { url: string; expiresAt: string } | null;
  error: string;
  copied?: boolean;
  onCopy?: () => void;
  codeCopied?: boolean;
  onCopyCode?: (token: string) => void;
  copyError?: string;
  formatDateTime?: (value: string) => string;
}>) {
  const t = useTranslations("notifications.telegram");
  const defaultDateTime = useFormatters().dateTime;
  const formatDateTime = formatDateTimeProp ?? defaultDateTime;
  if (error)
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  if (!link)
    return (
      <p role="status" className="text-sm text-slate-600">
        {t("generatingLink")}
      </p>
    );
  let startToken: string | null = null;
  try {
    startToken = new URL(link.url).searchParams.get("start");
  } catch {
    // An invalid URL cannot provide a code to copy.
  }
  return (
    <>
      <p className="rounded-lg bg-slate-50 p-3 text-sm break-all text-slate-700">{link.url}</p>
      <div className="space-y-1 text-xs text-slate-500">
        <p>{t("help")}</p>
        <p>{t("expires", { date: formatDateTime(link.expiresAt) })}</p>
      </div>
      {copyError && (
        <p role="alert" className="text-xs text-red-700">
          {t("copyError")}
        </p>
      )}
      <DialogFooter className="sm:flex-wrap">
        <Button type="button" variant="outline" onClick={onCopy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t("copied") : t("copy")}
        </Button>
        {startToken !== null && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (startToken !== null) onCopyCode?.(startToken);
            }}
          >
            {codeCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {codeCopied ? t("copied") : t("copyCode")}
          </Button>
        )}
        <Button
          nativeButton={false}
          render={<a href={link.url} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink aria-hidden="true" /> {t("openTelegram")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function notificationBadgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

export function telegramLinkErrorMessage(
  status: number | undefined,
  unavailableMessage: string,
  apiMessage: string,
): string {
  return status === 503 ? unavailableMessage : apiMessage;
}

export function TelegramLinkAction({ onClick }: Readonly<{ onClick: () => void }>) {
  const t = useTranslations("notifications.telegram");
  if (!useCan("users.manage")) return null;
  return (
    <Menu.Item
      className="flex min-h-10 cursor-default items-center gap-2 rounded-lg px-3 text-sm text-slate-700 outline-none data-highlighted:bg-slate-50"
      onClick={onClick}
    >
      {t("link")}
    </Menu.Item>
  );
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const telegramT = useTranslations("notifications.telegram");
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [copyDone, setCopyDone] = useState(false);
  const [codeCopyDone, setCodeCopyDone] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const formatters = useFormatters();
  const count = useUnreadNotificationCount();
  const list = useNotificationList(open);
  const mutations = useNotificationMutations();
  const unreadCount = count.data;
  const badgeLabel = notificationBadgeLabel(unreadCount);

  async function openLinkDialog() {
    setLinkDialogOpen(true);
    setLink(null);
    setLinkError("");
    setCopyDone(false);
    setCodeCopyDone(false);
    setCopyError(false);
    const result = await mutations.createTelegramLink();
    if (result.ok) setLink(result.value);
    else
      setLinkError(
        telegramLinkErrorMessage(
          result.error.status,
          telegramT("unavailable"),
          errorMessage(result.error),
        ),
      );
  }

  return (
    <>
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          aria-label={t("bellLabel", { count: unreadCount })}
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors outline-none hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Bell className="size-4" aria-hidden="true" />
          {badgeLabel && (
            <>
              <span
                className="absolute top-2 right-2 size-1.5 rounded-full bg-emerald-500 ring-2 ring-white"
                aria-hidden="true"
              />
              <span
                className="absolute -top-1 -right-1 min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[10px] leading-4 font-semibold text-white"
                aria-hidden="true"
              >
                {badgeLabel}
              </span>
            </>
          )}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="isolate z-50">
            <Menu.Popup className="w-[min(24rem,calc(100vw-2rem))] rounded-xl bg-white p-2 shadow-md ring-1 ring-slate-200 outline-none">
              <div className="max-h-80 overflow-y-auto">
                <NotificationListView
                  items={list.data.items}
                  loading={list.isLoading}
                  unreadCount={unreadCount}
                  onRead={(id) => void mutations.markRead(id)}
                  onMarkAllRead={() => void mutations.markAllRead()}
                  formatDateTime={formatters.dateTime}
                />
              </div>
              {dataSource === "api" && (
                <>
                  <div className="my-2 border-t border-slate-100" />
                  <TelegramLinkAction onClick={() => void openLinkDialog()} />
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{telegramT("link")}</DialogTitle>
            <DialogDescription>{telegramT("description")}</DialogDescription>
          </DialogHeader>
          <TelegramLinkContent
            link={link}
            error={linkError}
            copied={copyDone}
            codeCopied={codeCopyDone}
            copyError={copyError ? telegramT("copyError") : ""}
            formatDateTime={formatters.dateTime}
            onCopy={async () => {
              if (!link) return;
              const copied = await copyTextToClipboard(link.url);
              setCopyDone(copied);
              setCopyError(!copied);
            }}
            onCopyCode={async (token) => {
              const copied = await copyTextToClipboard(token);
              setCodeCopyDone(copied);
              setCopyError(!copied);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

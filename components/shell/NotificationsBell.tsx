"use client";
import { useState } from "react";
import { Badge, Button, EmptyState, ErrorState, Glyph, IconButton, Link, LoadingState, Popover, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { KIND_GLYPH, type AppNotification } from "@/lib/notifications/mock";
import { useNotificationsState } from "@/lib/notifications/NotificationsProvider";

/** "há 35 min" / "há 2 h" / "há 3 d" com Intl.RelativeTimeFormat no idioma corrente. */
export function relativeTime(minutesAgo: number, intl: string): string {
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
  if (minutesAgo < 60) return rtf.format(-Math.max(1, Math.round(minutesAgo)), "minute");
  if (minutesAgo < 60 * 24) return rtf.format(-Math.round(minutesAgo / 60), "hour");
  return rtf.format(-Math.round(minutesAgo / (60 * 24)), "day");
}

export function NotificationRow({ n, onOpen }: { n: AppNotification; onOpen?: (id: string) => void }) {
  const { t, intl } = useI18n();
  return (
    <li>
      <Link href={n.href} variant="card" onClick={() => onOpen?.(n.id)} className={cn("flex items-start gap-3 p-2", !n.read && "bg-ws-accent-soft/60")}>
        <span className={cn("mt-0.5 rounded-[var(--ws-radius-sm)] p-1", n.read ? "text-ws-text-muted" : "text-ws-accent-ink")}>
          <Glyph name={KIND_GLYPH[n.kind]} size={20} decorative />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[length:var(--ws-text-body-sm)] leading-snug", !n.read && "font-semibold")}>{t(n.titleKey, n.vars)}</span>
          <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{relativeTime(n.minutesAgo, intl)}</span>
        </span>
        {!n.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-ws-accent" aria-label={t("notif.unread")} /> : null}
      </Link>
    </li>
  );
}

/** Corpo compartilhado pelo Popover do sino e pela página /notifications. */
export function NotificationsList({ limit, className }: { limit?: number; className?: string }) {
  const { t } = useI18n();
  const { status, items, markRead, retry } = useNotificationsState();
  if (status === "loading") return <LoadingState className={className} />;
  if (status === "error") return <ErrorState className={className} title={t("notif.errorTitle")} description={t("notif.errorDescription")} code="MOCK_ERRO" onRetry={retry} />;
  if (items.length === 0) return <EmptyState compact className={className} title={t("notif.emptyTitle")} description={t("notif.emptyDescription")} moji="ok" />;
  const list = limit ? items.slice(0, limit) : items;
  return (
    <ul className={cn("grid gap-0.5", className)} aria-label={t("nav.notifications")}>
      {list.map((n) => <NotificationRow key={n.id} n={n} onOpen={markRead} />)}
    </ul>
  );
}

export function NotificationsBell() {
  const { t } = useI18n();
  const { unread, markAllRead, status } = useNotificationsState();
  const [open, setOpen] = useState(false);
  const label = unread ? t("notif.bellWithCount", { n: unread }) : t("nav.notifications");
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t("nav.notifications")}
      width="w-[min(92vw,24rem)]"
      trigger={
        <span className="relative inline-flex">
          <IconButton icon="notificacoes" label={label} aria-haspopup="dialog" aria-expanded={open} data-testid="bell" />
          {unread > 0 ? <Badge count className="pointer-events-none absolute -right-0.5 -top-0.5" aria-hidden>{unread > 99 ? "99+" : unread}</Badge> : null}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("nav.notifications")}</h2>
        <Button size="sm" variant="ghost" onClick={markAllRead} disabled={status !== "ready" || unread === 0}>{t("notif.markAllRead")}</Button>
      </div>
      <NotificationsList limit={5} />
      <div className="mt-2 border-t border-ws-border px-2 pt-2 text-right">
        <Button size="sm" variant="ghost" href="/notifications" onClick={() => setOpen(false)}>{t("notif.seeAll")}</Button>
      </div>
    </Popover>
  );
}

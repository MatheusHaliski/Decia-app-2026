"use client";
// Lista completa de notificações (mock D-33 até o RF de notificações). Estados vazio/erro/carregando simuláveis pelo lab.
import { Badge, Button, Card, Select } from "@/components/ui";
import { NotificationsList } from "@/components/shell/NotificationsBell";
import { PageHeader } from "@/components/shell/PageHeader";
import { useI18n } from "@/lib/i18n/useI18n";
import { NOTIF_SIMS, type NotificationsSim } from "@/lib/notifications/mock";
import { useNotificationsState } from "@/lib/notifications/NotificationsProvider";

export default function NotificationsPage() {
  const { t } = useI18n();
  const { unread, markAllRead, status, sim, setSim } = useNotificationsState();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader
        title={t("nav.notifications")}
        glyph="notificacoes"
        description={t("notif.pageDescription")}
        actions={<Button variant="primary" size="sm" onClick={markAllRead} disabled={status !== "ready" || unread === 0}>{t("notif.markAllRead")}</Button>}
      />
      <Card padding="sm">
        <NotificationsList />
      </Card>
      <Card tone="soft" padding="sm" className="flex flex-wrap items-center gap-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <Badge tone="spark">{t("common.lab")}</Badge>
        <span>{t("notif.simHint")}</span>
        <Select aria-label={t("notif.simLabel")} value={sim} onChange={(e) => setSim(e.target.value as NotificationsSim)} options={NOTIF_SIMS.map((s) => ({ value: s, label: t(`notif.sim.${s}`) }))} className="min-h-[var(--ws-control-sm)] w-auto text-[length:var(--ws-text-body-sm)]" />
      </Card>
    </div>
  );
}

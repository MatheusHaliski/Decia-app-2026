"use client";
/**
 * "Delegadas a mim" (RF18.CA04/CA05, RF46.CA04): atribuições recebidas com Aceitar · Recusar (motivo obrigatório) e,
 * depois de aceitas, Devolver (= Retornar, motivo ≥ 20); "Delegadas por mim" com o estado de cada uma; e as
 * notificações sociais do viewer (agrupadas por hora, RF26.CA09). Tudo sobre o repositório DEMO.
 */
import { useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Link, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { GIVE_BACK_MIN, assignmentsTo, itemOf, markNotificationsRead, notificationsFor, personById, respondToAssignment, titleOf } from "@/lib/social/rules";
import type { Assignment, AssignmentStatus } from "@/lib/social/types";
import { useSocial } from "./context";
import { ReasonDialog } from "./DelegateDialog";
import { formatDay, relativeTime } from "./meta";

const STATUS_TONE: Record<AssignmentStatus, "warning" | "success" | "danger" | "neutral"> = { PROPOSTA: "warning", ACEITA: "success", RECUSADA: "danger", DEVOLVIDA: "neutral" };

function AssignmentRow({ a, incoming }: { a: Assignment; incoming: boolean }) {
  const { t, intl } = useI18n();
  const { state, run, now } = useSocial();
  const [dialog, setDialog] = useState<null | "refuse" | "return">(null);
  const item = itemOf(state, { type: a.targetType, id: a.targetId });
  const other = personById(state, incoming ? a.fromUserId : a.toUserId);
  const href = a.targetType === "TASK" ? `/tasks/${a.targetId}` : `/projects/${a.targetId}`;
  const title = item ? titleOf(item) : a.targetId;
  return (
    <li className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" data-testid="assignment-row" data-status={a.status} data-assignment-id={a.id}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Tag tone={STATUS_TONE[a.status]} filled={a.status === "ACEITA"}>{t(`social.assignmentStatus.${a.status}`)}</Tag>
        <Badge tone="neutral">{t(`social.assignmentOrigin.${a.origin}`)}</Badge>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{relativeTime(a.createdAt, now, intl)}</span>
      </div>
      <p className="min-w-0 text-[length:var(--ws-text-body)] font-semibold [overflow-wrap:anywhere]"><Link href={href} variant="plain" className="hover:underline">{title}</Link></p>
      <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
        {other ? <Avatar name={other.fullName} size={20} /> : null}
        <span className="min-w-0 [overflow-wrap:anywhere]">{t(incoming ? "social.inbox.from" : "social.inbox.to", { name: other?.fullName ?? "" })}</span>
        {a.dueAt ? <span>· {t("social.delegation.due", { date: formatDay(a.dueAt, intl) })}</span> : null}
      </p>
      {a.message ? <p className="rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1 text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]">“{a.message}”</p> : null}
      {a.reason ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink [overflow-wrap:anywhere]">{t("social.inbox.reason", { reason: a.reason })}</p> : null}
      {incoming && a.status === "PROPOSTA" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" data-testid="assignment-accept" onClick={() => run((s, v, at) => respondToAssignment(s, v, a.id, "ACEITA", null, at), "social.toast.accepted")}>{t("social.inbox.accept")}</Button>
          <Button size="sm" variant="danger" data-testid="assignment-refuse" onClick={() => setDialog("refuse")}>{t("social.inbox.refuse")}</Button>
        </div>
      ) : null}
      {incoming && a.status === "ACEITA" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" href={href}>{t("social.inbox.open")}</Button>
          <Button size="sm" variant="danger" data-testid="assignment-return" onClick={() => setDialog("return")}>{t("social.inbox.return")}</Button>
        </div>
      ) : null}
      <ReasonDialog
        open={dialog === "refuse"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("social.inbox.refuseTitle")}
        description={t("social.inbox.refuseDescription", { title })}
        min={1}
        confirmLabel={t("social.inbox.refuse")}
        testId="refuse-dialog"
        onConfirm={(why) => run((s, v, at) => respondToAssignment(s, v, a.id, "RECUSADA", why, at), "social.toast.refused").ok}
      />
      <ReasonDialog
        open={dialog === "return"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("social.giveBack.title")}
        description={t("social.giveBack.description", { title, name: other?.fullName ?? "" })}
        min={GIVE_BACK_MIN}
        confirmLabel={t("social.inbox.return")}
        testId="return-dialog"
        onConfirm={(why) => run((s, v, at) => respondToAssignment(s, v, a.id, "DEVOLVIDA", why, at), "social.toast.givenBack").ok}
      />
    </li>
  );
}

export function AssignmentInbox() {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const incoming = assignmentsTo(state, viewerId);
  const outgoing = viewerId ? state.assignments.filter((a) => a.fromUserId === viewerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const pending = incoming.filter((a) => a.status === "PROPOSTA").length;
  return (
    <Card title={<>{t("social.inbox.title")} {pending ? <Badge count>{pending}</Badge> : null}</>} eyebrow="RF18 · RF10 · RF46" data-testid="assignment-inbox">
      {incoming.length ? (
        <ul className="grid gap-2" aria-label={t("social.inbox.title")}>{incoming.map((a) => <AssignmentRow key={a.id} a={a} incoming />)}</ul>
      ) : (
        <EmptyState compact title={t("social.inbox.emptyTitle")} description={t("social.inbox.emptyDescription")} />
      )}
      {outgoing.length ? (
        <details className="mt-3 group" open>
          <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("social.inbox.sent", { n: outgoing.length })}</summary>
          <ul className="mt-2 grid gap-2" aria-label={t("social.inbox.sentLabel")}>{outgoing.map((a) => <AssignmentRow key={a.id} a={a} incoming={false} />)}</ul>
        </details>
      ) : null}
    </Card>
  );
}

export function SocialNotifications({ limit = 6 }: { limit?: number }) {
  const { t, intl } = useI18n();
  const { state, viewerId, repo, now } = useSocial();
  const items = notificationsFor(state, viewerId).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  const unread = notificationsFor(state, viewerId).filter((n) => !n.read).length;
  if (!viewerId) return null;
  return (
    <Card title={<>{t("social.notifications.title")} {unread ? <Badge count>{unread}</Badge> : null}</>} eyebrow="RF26.CA09" data-testid="social-notifications"
      actions={unread ? <Button size="sm" variant="ghost" onClick={() => repo.run((s) => ({ ok: true, state: markNotificationsRead(s, viewerId, new Date()) }))}>{t("social.notifications.markAll")}</Button> : undefined}>
      {items.length ? (
        <ul className="grid gap-2">
          {items.map((n) => {
            const actor = personById(state, n.actorId);
            const href = n.resourceType === "PROJECT" ? `/projects/${n.resourceId}` : `/tasks/${n.resourceId}`;
            return (
              <li key={n.id} className="flex min-w-0 items-start gap-2 text-[length:var(--ws-text-body-sm)]" data-read={n.read}>
                <span aria-hidden className={n.read ? "mt-1.5 size-2 shrink-0 rounded-full bg-ws-surface-3" : "mt-1.5 size-2 shrink-0 rounded-full bg-ws-accent"} />
                <div className="min-w-0 flex-1">
                  <Link href={href} variant="plain" className="hover:underline [overflow-wrap:anywhere]">
                    {t(n.title, { actor: actor?.fullName ?? t("social.notifications.system"), title: n.payload.targetTitle })}
                    {n.payload.count > 1 ? ` ${t("social.notifications.more", { n: n.payload.count - 1 })}` : ""}
                  </Link>
                  <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{relativeTime(n.createdAt, now, intl)}{n.read ? "" : ` · ${t("social.notifications.unread")}`}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.notifications.empty")}</p>
      )}
    </Card>
  );
}

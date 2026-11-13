"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingState, Select, Tabs, Tag } from "@/components/ui";
import { canSeeImpediment, canSeePact } from "@/lib/pacts/access";
import { pactMetrics } from "@/lib/pacts/metrics";
import { activeDepartmentsOf, departmentOf, headOf, pactUserOf, personOf } from "@/lib/pacts/org";
import {
  DEFAULT_QUEUE_FILTER, cooperationQueue, currentDueDate, departmentLedger, isOverdue, pendingActions, unblockToday, waitingDays,
  type QueueBox, type QueueDue, type QueueFilter,
} from "@/lib/pacts/queue";
import { demoPactRepository, type PactRepository } from "@/lib/pacts/store";
import { PACT_STATES, type CooperationPact, type Impediment, type PactStatus } from "@/lib/pacts/types";
import { usePactsState } from "@/lib/pacts/usePacts";
import { useI18n } from "@/lib/i18n/useI18n";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { ImpedimentDialog } from "./ImpedimentDialog";
import { STATUS_TONE, formatDay, formatWhen, partyLabel } from "./labels";
import { MetricsPanel } from "./MetricsPanel";
import { OpenPactDialog } from "./OpenPactDialog";
import { PactDetail } from "./PactDetail";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

const ALL = "*";

function PactRow({ pact, repo, userId, now, onOpen, selected }: { pact: CooperationPact; repo: PactRepository; userId: string; now: Date; onOpen: (id: string) => void; selected: boolean }) {
  const { t, intl } = useI18n();
  const org = repo.org;
  const actions = pendingActions(org, pact, userId);
  return (
    <Card as="li" padding="sm" className={selected ? "border-ws-accent" : undefined} data-testid="pact-row" data-pact={pact.id}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="font-semibold [overflow-wrap:anywhere]">{pact.expectedDelivery}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
            {t("pacts.row.parties", { from: partyLabel(t, org, pact.requester), to: partyLabel(t, org, pact.target) })}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[pact.status]}>{t(`pacts.status.${pact.status}`)}</Badge>
            <Tag>{t("pacts.row.due", { date: formatDay(currentDueDate(pact), intl) })}</Tag>
            <Tag>{t("pacts.row.age", { days: waitingDays(pact, now) })}</Tag>
            {isOverdue(pact, now) ? <Badge tone="danger">{t("pacts.detail.overdue")}</Badge> : null}
            {pact.escalations.some((e) => e.status === "ABERTA") ? <Badge tone="warning">{t("pacts.row.escalated")}</Badge> : null}
            {actions.map((a) => <Tag key={a} tone="accent">{t(`pacts.pending.${a}`)}</Tag>)}
          </div>
        </div>
        <Button size="sm" onClick={() => onOpen(pact.id)} aria-label={t("pacts.row.openLabel", { title: pact.expectedDelivery })} data-testid="pact-row-open">{t("pacts.row.open")}</Button>
      </div>
    </Card>
  );
}

function ImpedimentCard({ imp, pacts, canStart, onOpenPact, onStartPact, now }: { imp: Impediment; pacts: readonly CooperationPact[]; canStart: boolean; onOpenPact: (id: string) => void; onStartPact: (imp: Impediment) => void; now: Date }) {
  const { t, intl } = useI18n();
  const linked = pacts.filter((p) => p.impedimentId === imp.id);
  const unblocked = linked.some((p) => p.status === "VALIDADO" && p.unblock);
  const inPact = linked.some((p) => !["RECUSADO", "CANCELADO"].includes(p.status));
  const days = Math.max(0, Math.floor((now.getTime() - Date.parse(`${imp.since}T12:00:00Z`)) / 86_400_000));
  return (
    <Card as="li" padding="sm" className="grid gap-2" data-testid="impediment-card" data-impediment={imp.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={imp.source === "ACERVO" ? "blue" : imp.source === "MESA" ? "orange" : "neutral"}>{t(`pacts.impediment.source.${imp.source}`)}</Tag>
        <Badge tone={unblocked ? "success" : inPact ? "accent" : "warning"}>{unblocked ? t("pacts.impediment.state.unblocked") : inPact ? t("pacts.impediment.state.inPact") : t("pacts.impediment.state.open")}</Badge>
        <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{imp.title}</span>
      </div>
      <dl className="grid gap-x-3 gap-y-0.5 text-[length:var(--ws-text-body-sm)] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">{t("pacts.impediment.blockedBy")}</dt>
        <dd className="[overflow-wrap:anywhere]">{imp.blockedBy}</dd>
        <dt className="font-semibold">{t("pacts.impediment.since")}</dt>
        <dd>{t("pacts.impediment.sinceValue", { date: formatDay(imp.since, intl), days })}</dd>
        <dt className="font-semibold">{t("pacts.impediment.dependents")}</dt>
        <dd>{imp.dependents.map((d) => d.label).join("; ")}</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        {linked.map((p) => (
          <Button key={p.id} size="sm" variant="ghost" onClick={() => onOpenPact(p.id)}>
            {t("pacts.impediment.linked", { status: t(`pacts.status.${p.status}`) })}
          </Button>
        ))}
        {!inPact && canStart ? (
          <Button size="sm" variant="primary" onClick={() => onStartPact(imp)} data-testid="impediment-start-pact">{t("pacts.impediment.startPact")}</Button>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Pactos de Desbloqueio (RF49) em `/goals`: "Quem eu posso destravar hoje?", a visão da chefia (o que a unidade precisa
 * receber e o que prometeu entregar), a fila de cooperação com filtros e paginação, os impedimentos (Acervo, Mesa e registro
 * manual), as métricas agregadas e os avisos genéricos. O detalhe do pacto abre por `?pacto=<id>`.
 */
export function PactsWorkspace({ repo = demoPactRepository() }: { repo?: PactRepository }) {
  const { t, intl } = useI18n();
  const { profile } = useViewer();
  const userId = pactUserOf(profile);
  const state = usePactsState(repo);
  const org = repo.org;
  const mounted = useMounted();
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pactParam = params.get("pacto");
  const [selected, setSelected] = useState<string | null>(pactParam);
  const [filter, setFilter] = useState<QueueFilter>(DEFAULT_QUEUE_FILTER);
  const [page, setPage] = useState(1);
  const [starting, setStarting] = useState<{ impediment: Impediment | null } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [metricsScope, setMetricsScope] = useState<string>(ALL);

  useEffect(() => {
    if (pactParam) setSelected(pactParam);
  }, [pactParam]);
  useEffect(() => {
    if (selected) document.getElementById("pact-detail-anchor")?.scrollIntoView({ block: "start" });
  }, [selected]);

  const visible = useMemo(() => state.pacts.filter((p) => canSeePact(org, p, userId)), [state, org, userId]);

  if (!mounted) return <LoadingState />;
  if (!userId) return <EmptyState moji="vazio" title={t("pacts.visitor.title")} description={t("pacts.visitor.description")} />;

  const me = personOf(org, userId);
  const myDept = me?.departmentId ?? null;
  const isHead = !!myDept && headOf(org, myDept) === userId;
  const companyWide = profile === "EMPRESA" || profile === "ADMIN";
  const select = (id: string | null) => {
    setSelected(id);
    if (id) repo.markRead(userId, id);
    const next = new URLSearchParams(params.toString());
    if (id) next.set("pacto", id); else next.delete("pacto");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const setF = (patch: Partial<QueueFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const queue = cooperationQueue(state, org, userId, filter, now, page);
  const unblock = unblockToday(state, org, userId, now);
  const ledger = isHead && myDept ? departmentLedger(state, org, userId, myDept, now) : null;
  const impediments = state.impediments.filter((i) => canSeeImpediment(org, i, userId));
  const notifications = state.notifications.filter((n) => n.recipientId === userId).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  const unread = notifications.filter((n) => !n.read).length;
  const selectedPact = selected ? visible.find((p) => p.id === selected) ?? null : null;
  const companyId = me?.companyId ?? null;
  const departments = activeDepartmentsOf(org, companyId);
  // métricas: a empresa e a administração veem o agregado da empresa (só números); as demais pessoas, o que já veem
  const scopePacts = companyWide ? state.pacts.filter((p) => p.companyId === companyId) : visible;
  const metricsPacts = metricsScope === ALL ? scopePacts : scopePacts.filter((p) => p.requester.departmentId === metricsScope || p.target.departmentId === metricsScope);
  const scopeLabel = metricsScope === ALL ? (companyWide ? t("pacts.metrics.scopeCompany") : t("pacts.metrics.scopeVisible")) : t("pacts.metrics.scopeDept", { dept: departmentOf(org, metricsScope)?.acronym ?? metricsScope });

  const tabs = [
    { slug: "fila", label: t("pacts.tab.queue"), badge: <Badge>{queue.total}</Badge> },
    { slug: "impedimentos", label: t("pacts.tab.impediments"), badge: <Badge>{impediments.length}</Badge> },
    { slug: "metricas", label: t("pacts.tab.metrics") },
    { slug: "avisos", label: t("pacts.tab.notifications"), badge: unread ? <Badge count>{unread}</Badge> : undefined },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]" data-testid="pacts-workspace">
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.intro")}</p>
      <div className="flex flex-wrap gap-2">
        {myDept ? <Button variant="primary" onClick={() => setStarting({ impediment: null })} data-testid="pact-new">+ {t("pacts.actions.open")}</Button> : null}
        {myDept ? <Button onClick={() => setRegistering(true)} data-testid="impediment-new">+ {t("pacts.impediment.new")}</Button> : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)] lg:grid-cols-2">
        <Card as="section" aria-labelledby="pacts-today-title" className="grid gap-2" data-testid="pacts-unblock-today">
          <h2 id="pacts-today-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("pacts.today.title")}</h2>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.today.hint")}</p>
          {unblock.length ? (
            <ul className="grid gap-2">
              {unblock.map((x) => (
                <li key={x.pact.id} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="font-semibold">{x.pact.expectedDelivery}</span>
                    <span className="text-ws-text-muted"> · {t("pacts.today.who", { who: partyLabel(t, org, x.pact.requester), days: x.waitingDays })}</span>
                  </span>
                  {x.overdue ? <Badge tone="danger">{t("pacts.detail.overdue")}</Badge> : null}
                  {x.actions.map((a) => <Tag key={a} tone="accent">{t(`pacts.pending.${a}`)}</Tag>)}
                  <Button size="sm" onClick={() => select(x.pact.id)}>{t("pacts.row.open")}</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.today.none")}</p>
          )}
        </Card>
        {ledger ? (
          <Card as="section" aria-labelledby="pacts-ledger-title" className="grid gap-2" data-testid="pacts-ledger">
            <h2 id="pacts-ledger-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("pacts.ledger.title", { dept: departmentOf(org, myDept!)?.acronym ?? "" })}</h2>
            <p className="text-[length:var(--ws-text-body-sm)]">{t("pacts.ledger.toReceive", { n: ledger.toReceive.length, late: ledger.overdueToReceive })}</p>
            <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
              {ledger.toReceive.map((p) => <li key={p.id}><Button size="sm" variant="ghost" onClick={() => select(p.id)}>{p.expectedDelivery}</Button></li>)}
            </ul>
            <p className="text-[length:var(--ws-text-body-sm)]">{t("pacts.ledger.toDeliver", { n: ledger.toDeliver.length, late: ledger.overdueToDeliver })}</p>
            <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
              {ledger.toDeliver.map((p) => <li key={p.id}><Button size="sm" variant="ghost" onClick={() => select(p.id)}>{p.expectedDelivery}</Button></li>)}
            </ul>
          </Card>
        ) : null}
      </div>

      <Tabs tabs={tabs} label={t("pacts.tabsLabel")} param="vista" look="pills">
        {(active) => {
          if (active === "impedimentos") {
            return impediments.length ? (
              <ul className="grid gap-2" data-testid="impediments-list">
                {impediments.map((imp) => (
                  <ImpedimentCard key={imp.id} imp={imp} pacts={visible} canStart={!!myDept} now={now} onOpenPact={select} onStartPact={(i) => setStarting({ impediment: i })} />
                ))}
              </ul>
            ) : (
              <EmptyState compact moji="vazio" title={t("pacts.impediment.none")} description={t("pacts.impediment.noneHint")} />
            );
          }
          if (active === "metricas") {
            return (
              <div className="grid gap-3">
                <Field label={t("pacts.metrics.scope")} className="max-w-sm">
                  {({ id }) => (
                    <Select id={id} value={metricsScope} onChange={(e) => setMetricsScope(e.target.value)}
                      options={[{ value: ALL, label: companyWide ? t("pacts.metrics.scopeCompany") : t("pacts.metrics.scopeVisible") }, ...departments.map((d) => ({ value: d.id, label: t("pacts.metrics.scopeDept", { dept: d.acronym }) }))]} />
                  )}
                </Field>
                <MetricsPanel metrics={pactMetrics(metricsPacts)} scopeLabel={scopeLabel} />
              </div>
            );
          }
          if (active === "avisos") {
            return notifications.length ? (
              <ul className="grid gap-2" data-testid="pact-notifications">
                {notifications.map((n) => (
                  <Card as="li" key={n.id} padding="sm" className="flex flex-wrap items-center gap-2">
                    <Badge tone={n.read ? "neutral" : "accent"}>{n.read ? t("pacts.notify.read") : t("pacts.notify.unread")}</Badge>
                    <span className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]">{t("pacts.notify.line", { n: n.count, when: formatWhen(n.lastAt, intl) })}</span>
                    {visible.some((p) => p.id === n.pactId) ? <Button size="sm" onClick={() => select(n.pactId)}>{t("pacts.row.open")}</Button> : null}
                    {!n.read ? <Button size="sm" variant="ghost" onClick={() => repo.markRead(userId, n.pactId)}>{t("pacts.notify.markRead")}</Button> : null}
                  </Card>
                ))}
              </ul>
            ) : (
              <EmptyState compact moji="vazio" title={t("pacts.notify.none")} />
            );
          }
          return (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label={t("pacts.queue.filters")}>
                <Field label={t("pacts.queue.box")}>
                  {({ id }) => <Select id={id} value={filter.box} onChange={(e) => setF({ box: e.target.value as QueueBox })} options={(["TODOS", "RECEBIDOS", "ENVIADOS"] as const).map((b) => ({ value: b, label: t(`pacts.queue.box.${b}`) }))} />}
                </Field>
                <Field label={t("pacts.queue.department")}>
                  {({ id }) => <Select id={id} value={filter.departmentId ?? ALL} onChange={(e) => setF({ departmentId: e.target.value === ALL ? null : e.target.value })} options={[{ value: ALL, label: t("pacts.queue.all") }, ...departments.map((d) => ({ value: d.id, label: d.acronym }))]} />}
                </Field>
                <Field label={t("pacts.queue.status")}>
                  {({ id }) => <Select id={id} value={filter.status} onChange={(e) => setF({ status: e.target.value as PactStatus | "ABERTOS" | "TODOS" })} options={[{ value: "ABERTOS", label: t("pacts.queue.open") }, { value: "TODOS", label: t("pacts.queue.all") }, ...PACT_STATES.map((s) => ({ value: s, label: t(`pacts.status.${s}`) }))]} />}
                </Field>
                <Field label={t("pacts.queue.due")}>
                  {({ id }) => <Select id={id} value={filter.due} onChange={(e) => setF({ due: e.target.value as QueueDue })} options={(["TODOS", "VENCIDOS", "SETE_DIAS"] as const).map((d) => ({ value: d, label: t(`pacts.queue.due.${d}`) }))} />}
                </Field>
              </div>
              <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="pact-queue-status">{t("pacts.queue.count", { n: queue.total, page: queue.page, pages: queue.pages })}</p>
              {queue.items.length ? (
                <ul className="grid gap-2" data-testid="pact-queue">
                  {queue.items.map((p) => <PactRow key={p.id} pact={p} repo={repo} userId={userId} now={now} onOpen={select} selected={p.id === selected} />)}
                </ul>
              ) : (
                <EmptyState compact moji="vazio" title={t("pacts.queue.empty")} description={t("pacts.queue.emptyHint")} />
              )}
              {queue.pages > 1 ? (
                <nav aria-label={t("pacts.queue.pagination")} className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={queue.page <= 1}>{t("pacts.queue.prev")}</Button>
                  <span className="text-[length:var(--ws-text-body-sm)] tabular-nums">{t("pacts.queue.pageOf", { page: queue.page, pages: queue.pages })}</span>
                  <Button size="sm" onClick={() => setPage((p) => p + 1)} disabled={queue.page >= queue.pages}>{t("pacts.queue.next")}</Button>
                </nav>
              ) : null}
            </div>
          );
        }}
      </Tabs>

      <div id="pact-detail-anchor" />
      {selected && !selectedPact ? (
        <ErrorState title={t("pacts.detail.notFound")} code="404 NAO_ENCONTRADO" action={<Button size="sm" onClick={() => select(null)}>{t("pacts.detail.close")}</Button>} />
      ) : null}
      {selectedPact ? <PactDetail key={selectedPact.id} pact={selectedPact} repo={repo} userId={userId} now={now} onClose={() => select(null)} /> : null}

      {starting ? (
        <OpenPactDialog
          key={starting.impediment?.id ?? "novo"}
          open
          onOpenChange={(o) => { if (!o) setStarting(null); }}
          repo={repo}
          userId={userId}
          impediment={starting.impediment}
          onCreated={(id) => { setStarting(null); select(id); }}
        />
      ) : null}
      <ImpedimentDialog open={registering} onOpenChange={setRegistering} repo={repo} userId={userId} onCreated={() => setRegistering(false)} />
    </div>
  );
}

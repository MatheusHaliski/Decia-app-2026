"use client";
/**
 * Painel de auditoria das revisões (/decia/review; RF29 Rastro de Decisão, RF43 autoridade humana, RF51.CA02/CA05): toda
 * intervenção humana sobre o que a IA produziu — aceitou, editou e aceitou, rejeitou, reverteu — com quem, quando, a política de
 * IA vigente e o motivo; comparação ANTES × DEPOIS por palavra; filtros por sessão, pessoa, tipo e período; exportação CSV/JSON.
 * Os registros são somente-acréscimo (cadeia de hash verificada na tela). Entram também as revisões das decisões estruturadas
 * (versões e snapshots de lib/decia), derivadas sem cópia.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Tag, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { auditFromDecisions } from "@/lib/decia/audit/decisions";
import { auditToCsv, auditToJson, exportFileName } from "@/lib/decia/audit/export";
import { compareTexts, defaultCompare, filterAudit, NO_AUDIT_FILTERS, sortAudit, type AuditFilters, type CompareMode } from "@/lib/decia/audit/filter";
import { AUDIT_ACTIONS, type AuditAction, type AuditRecord } from "@/lib/decia/audit/types";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { demoRepository, useDecisions } from "@/lib/decia/repository";
import { demoSessionRepository, useSessions, type SessionRepository } from "@/lib/decia/session/repository";
import { WordDiff } from "./WordDiff";

const ACTION_META: Record<AuditAction, { icon: string; tone: Tone }> = {
  ACEITOU: { icon: "✓", tone: "success" },
  EDITOU_E_ACEITOU: { icon: "✎", tone: "info" },
  REJEITOU: { icon: "✕", tone: "danger" },
  REVERTEU: { icon: "↺", tone: "warning" },
};

export function AuditActionTag({ action }: { action: AuditAction }) {
  const { t } = useI18n();
  const meta = ACTION_META[action];
  return <Tag tone={meta.tone}><span aria-hidden>{meta.icon}</span>{t(`audit.action.${action}`)}</Tag>;
}

function download(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const nameOf = (id: string) => DEMO_PEOPLE[id]?.name ?? id;

function Comparison({ record }: { record: AuditRecord }) {
  const { t, intl } = useI18n();
  const [mode, setMode] = useState<CompareMode>(() => defaultCompare(record));
  const hasProposal = record.proposed !== null;
  const { left, right } = compareTexts(record, mode);
  const labels = mode === "PROPOSTA_APROVADO" ? [t("audit.compare.proposed"), t("audit.compare.approved")] : [t("audit.compare.before"), t("audit.compare.after")];
  return (
    <Card padding="md" className="grid gap-[var(--ws-space-3)]" data-testid="audit-comparison" aria-labelledby="audit-comparison-title">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="audit-comparison-title" className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold">{t("audit.compare.title", { target: record.target.label })}</h3>
        <AuditActionTag action={record.action} />
      </div>
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
        {t("audit.compare.who", { name: nameOf(record.actorId), when: new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.at)) })}
        {record.reason ? ` · ${t("audit.compare.reason", { reason: record.reason })}` : ""}
      </p>
      {hasProposal ? (
        <div role="group" aria-label={t("audit.compare.modeLabel")} className="flex flex-wrap gap-1">
          <Button size="sm" variant={mode === "PROPOSTA_APROVADO" ? "primary" : "ghost"} aria-pressed={mode === "PROPOSTA_APROVADO"} onClick={() => setMode("PROPOSTA_APROVADO")}>{t("audit.compare.modeProposal")}</Button>
          <Button size="sm" variant={mode === "ANTES_DEPOIS" ? "primary" : "ghost"} aria-pressed={mode === "ANTES_DEPOIS"} onClick={() => setMode("ANTES_DEPOIS")}>{t("audit.compare.modeBeforeAfter")}</Button>
        </div>
      ) : null}
      <WordDiff before={left} after={right} beforeLabel={labels[0]!} afterLabel={labels[1]!} />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <dt>{t("audit.compare.hash")}</dt><dd className="font-[family-name:var(--ws-font-mono)] [overflow-wrap:anywhere]">{record.hash}</dd>
        {record.chained ? <><dt>{t("audit.compare.prevHash")}</dt><dd className="font-[family-name:var(--ws-font-mono)] [overflow-wrap:anywhere]">{record.prevHash}</dd></> : null}
        <dt>{t("audit.compare.origin")}</dt><dd>{record.chained ? t("audit.compare.chained", { seq: record.seq }) : t("audit.compare.derived")}</dd>
      </dl>
    </Card>
  );
}

export function AuditPanel({ repo = demoSessionRepository() }: { repo?: SessionRepository }) {
  const { t, intl } = useI18n();
  const logRecords = useSyncExternalStore(repo.audit.subscribe, repo.audit.list, repo.audit.list);
  const decisions = useDecisions(demoRepository());
  const sessions = useSessions(repo);
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const derived = useMemo(() => auditFromDecisions(decisions), [decisions]);
  const all = useMemo(() => sortAudit([...logRecords, ...derived]), [logRecords, derived]);
  const visible = useMemo(() => filterAudit(all, filters), [all, filters]);
  // a cadeia é verificada de novo a cada acréscimo (a lista do livro só muda de referência quando cresce)
  const chain = useMemo(() => repo.audit.verify(), [repo, logRecords]);
  const record = visible.find((r) => r.id === selected) ?? null;
  const actors = [...new Set(all.map((r) => r.actorId))];
  const set = (patch: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const sessionTitle = (r: AuditRecord) => sessions.find((s) => s.id === r.sessionId)?.title ?? r.contextTitle ?? "—";
  const exportAs = (ext: "csv" | "json") => {
    const now = new Date();
    if (ext === "csv") download(exportFileName("csv", now), "text/csv;charset=utf-8", auditToCsv(visible, nameOf));
    else download(exportFileName("json", now), "application/json", auditToJson(visible, { exportedAt: now.toISOString(), source: repo.audit.source, filters: { ...filters }, chainOk: chain.ok }));
  };
  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="audit-panel">
      <Card padding="md" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("audit.title")}</h2>
          <Badge tone="neutral" title={t("session.demoHint")}>{t("session.demo")}</Badge>
          <Tag tone={chain.ok ? "success" : "danger"}>{chain.ok ? `✓ ${t("audit.chainOk", { n: logRecords.length })}` : `✕ ${t("audit.chainBroken", { n: chain.brokenAt })}`}</Tag>
        </div>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("audit.intro")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={t("audit.filter.session")}>
            {({ id }) => <Select id={id} value={filters.session} onChange={(e) => set({ session: e.target.value })} options={[{ value: "", label: t("audit.filter.all") }, ...sessions.map((s) => ({ value: s.id, label: s.title })), { value: "DECISOES", label: t("audit.filter.decisions") }]} />}
          </Field>
          <Field label={t("audit.filter.person")}>
            {({ id }) => <Select id={id} value={filters.actor} onChange={(e) => set({ actor: e.target.value })} options={[{ value: "", label: t("audit.filter.all") }, ...actors.map((a) => ({ value: a, label: nameOf(a) }))]} />}
          </Field>
          <Field label={t("audit.filter.type")}>
            {({ id }) => <Select id={id} value={filters.action} onChange={(e) => set({ action: e.target.value as AuditAction | "" })} options={[{ value: "", label: t("audit.filter.all") }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: t(`audit.action.${a}`) }))]} />}
          </Field>
          <Field label={t("audit.filter.from")}>{({ id }) => <Input id={id} type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />}</Field>
          <Field label={t("audit.filter.to")}>{({ id }) => <Input id={id} type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} />}</Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p aria-live="polite" className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="audit-count">{t("audit.count", { n: visible.length, total: all.length })}</p>
          <Button size="sm" variant="ghost" onClick={() => setFilters(NO_AUDIT_FILTERS)}>{t("audit.filter.clear")}</Button>
          <Button size="sm" variant="default" onClick={() => exportAs("csv")} disabled={!visible.length} data-testid="export-csv">{t("audit.export.csv")}</Button>
          <Button size="sm" variant="default" onClick={() => exportAs("json")} disabled={!visible.length} data-testid="export-json">{t("audit.export.json")}</Button>
        </div>
      </Card>
      {visible.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="audit-table">
            <caption className="sr-only">{t("audit.caption")}</caption>
            <thead>
              <tr>
                {["when", "who", "action", "target", "context", "policy", "reason", "compare"].map((c) => <th key={c} scope="col" className="border-b border-ws-border p-2 text-left">{t(`audit.col.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={r.id === selected ? "bg-ws-accent-soft" : undefined}>
                  <td className="border-b border-ws-border p-2 tabular-nums">{new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(r.at))}</td>
                  <th scope="row" className="border-b border-ws-border p-2 text-left font-normal">{nameOf(r.actorId)}</th>
                  <td className="border-b border-ws-border p-2"><AuditActionTag action={r.action} /></td>
                  <td className="border-b border-ws-border p-2"><span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`audit.target.${r.target.kind}`)}</span>{r.target.label}</td>
                  <td className="border-b border-ws-border p-2">{r.source === "DECISAO" ? <><span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("audit.source.DECISAO")}</span>{r.contextTitle}</> : sessionTitle(r)}</td>
                  <td className="border-b border-ws-border p-2">{r.policy ? t("audit.policy", { mode: t(`aiAutonomy.${r.policy.mode}`), version: r.policy.version }) : <span className="text-ws-text-muted">{t("audit.noPolicy")}</span>}</td>
                  <td className="border-b border-ws-border p-2">{r.reason ?? <span className="text-ws-text-muted">—</span>}</td>
                  <td className="border-b border-ws-border p-2">
                    <Button size="sm" variant={r.id === selected ? "primary" : "ghost"} aria-pressed={r.id === selected} onClick={() => setSelected(r.id === selected ? null : r.id)} aria-label={t("audit.compareAria", { target: r.target.label })}>
                      {t("audit.compareButton")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState compact title={t("audit.empty")} description={t("audit.emptyHint")} />}
      {record ? <Comparison key={record.id} record={record} /> : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("audit.pickOne")}</p>}
    </div>
  );
}

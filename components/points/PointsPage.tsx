"use client";
/**
 * DECIA Points (`/points`, RF42.CA03, CA09): Saldo (saldo, resumo, gráfico mensal com tabela, como se ganha e doação a colega) ·
 * Extrato (filtros por evento e período) · Regras (valores, tetos e multiplicador explicados) · Pontos por departamento (EMPRESA,
 * CHEFE e ADMIN; agregados só com 5 pessoas ou mais). Lê o razão DEMO compartilhado (`deciaPoints`) — a sessão do DECIA credita
 * os ganhos de participação nele; Loja, Balcão e Chancelas debitam e creditam também nele.
 */
import { Suspense, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { RfPage } from "@/components/shell/RfPage";
import { Button, Card, EmptyState, Field, Input, LoadingState, Select, Textarea, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { PageEntry } from "@/lib/pages/registry";
import { DONATION_MESSAGE_MAX, DONATION_MONTHLY_LIMIT } from "@/lib/points/donations";
import { pointsHolderOf } from "@/lib/points/identity";
import type { PointsEntry } from "@/lib/points/ledger";
import { COMPANY_MIN_PEOPLE, DEPARTMENT_MIN_PEOPLE, departmentRows } from "@/lib/points/departments";
import { ALL_EVENTS, filterStatement, isPeriod, isPointsEvent, monthlySeries, MULTIPLIER_RANGE, PERIODS, ruleViews, summarize, type Period } from "@/lib/points/statement";
import { pointsDonations, pointsLedger, usePointsEntries, usePointsTick } from "@/lib/points/usePoints";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { MonthlyChart } from "./MonthlyChart";
import { DemoBadge, DemoNote, formatDate, formatNumber, formatSigned, newActionKey, useMounted } from "./shared";

/** Colegas do diretório DEMO que podem receber doação (o próprio dono do saldo fica de fora). */
const COLLEAGUES: readonly { id: string; name: string }[] = [
  { id: "u-pessoa", name: "Pessoa Exemplo" }, { id: "u-ana", name: "Ana Exemplo" }, { id: "u-bruno", name: "Bruno Exemplo" }, { id: "u-carla", name: "Carla Exemplo" },
  { id: "u-diego", name: "Diego Exemplo" }, { id: "u-elisa", name: "Elisa Exemplo" }, { id: "chefe.exemplo", name: "Chefia Exemplo" }, { id: "curadoria.exemplo", name: "Curadoria Exemplo" },
];

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3">
      <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{label}</span>
      <span className="text-[length:var(--ws-text-h3)] font-semibold">{children}</span>
    </div>
  );
}

function HowToEarn() {
  const { t } = useI18n();
  return (
    <Card title={t("points.how.title")} eyebrow="RF42 · CA01 · CA10" data-testid="points-how">
      <div className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
        <p>{t("points.how.only")}</p>
        <p>{t("points.how.quality")}</p>
        <p>{t("points.how.noVolume")}</p>
        <p className="font-semibold">{t("points.how.noMoney")}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button href="/decia" size="sm" icon="sessao-decia">{t("points.how.goDecia")}</Button>
          <Button href="/points?tab=regras" size="sm" variant="ghost">{t("points.how.seeRules")}</Button>
          <Button href="/store" size="sm" variant="ghost" icon="balcao">{t("points.how.goStore")}</Button>
        </div>
      </div>
    </Card>
  );
}

function DonationCard({ holder }: { holder: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  usePointsTick();
  const service = pointsDonations();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const allowance = service.allowance(holder, now);
  const colleagues = COLLEAGUES.filter((c) => c.id !== holder);
  const history = service.history(holder).slice(0, 5);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const points = Number(amount);
    const r = service.donate({ id: newActionKey("doa"), fromId: holder, toId: to, points, message }, new Date());
    if (!r.ok) {
      setError(t(`points.donate.error.${r.reason}`, { limit: DONATION_MONTHLY_LIMIT, remaining: r.remaining, balance: pointsLedger().balance(holder) }));
      return;
    }
    setError(null);
    setMessage("");
    toast({ title: t("points.donate.done", { n: r.record.points, name: colleagues.find((c) => c.id === r.record.toId)?.name ?? r.record.toId }), tone: "sucesso" });
  };

  return (
    <Card title={t("points.donate.title")} eyebrow="RF42 · UC7 · CA09" data-testid="points-donate">
      <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("points.donate.intro", { limit: DONATION_MONTHLY_LIMIT })}</p>
      <p className="mb-3 text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="donate-allowance">{t("points.donate.allowance", { n: allowance, limit: DONATION_MONTHLY_LIMIT })}</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <Field label={t("points.donate.to")}>
          {({ id }) => <Select id={id} value={to} onChange={(e) => setTo(e.target.value)} options={[{ value: "", label: t("points.donate.choose") }, ...colleagues.map((c) => ({ value: c.id, label: c.name }))]} />}
        </Field>
        <Field label={t("points.donate.amount")} hint={t("points.donate.amountHint", { limit: DONATION_MONTHLY_LIMIT })}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="number" min={1} max={DONATION_MONTHLY_LIMIT} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label={t("points.donate.message")} hint={t("points.donate.messageHint", { max: DONATION_MESSAGE_MAX })} className="sm:col-span-2" error={error ?? undefined}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} maxLength={DONATION_MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" size="sm" disabled={!to || allowance === 0} data-testid="donate-submit">{t("points.donate.submit")}</Button>
        </div>
      </form>
      {history.length ? (
        <ul className="mt-4 grid gap-1 border-t border-ws-border pt-3 text-[length:var(--ws-text-body-sm)]" aria-label={t("points.donate.history")}>
          {history.map((r) => {
            const sent = r.fromId === holder;
            const other = COLLEAGUES.find((c) => c.id === (sent ? r.toId : r.fromId))?.name ?? (sent ? r.toId : r.fromId);
            return <li key={r.id}>{t(sent ? "points.donate.sentTo" : "points.donate.receivedFrom", { n: r.points, name: other })}{r.message ? <span className="text-ws-text-muted"> — “{r.message}”</span> : null}</li>;
          })}
        </ul>
      ) : null}
    </Card>
  );
}

function BalanceTab({ holder }: { holder: string }) {
  const { t, intl } = useI18n();
  const entries = usePointsEntries(holder);
  const now = new Date();
  const summary = summarize(entries, now);
  const series = monthlySeries(entries, now, 6);
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card padding="lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("points.balance.label")}</span>
            <span className="text-[length:3rem] font-semibold leading-none" data-testid="points-balance" aria-live="polite">{formatNumber(summary.balance, intl)} <span className="text-[length:var(--ws-text-h3)] text-ws-text-muted">DP</span></span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            <StatTile label={t("points.balance.thisMonth")}>{formatSigned(summary.earnedThisMonth, intl)}</StatTile>
            <StatTile label={t("points.balance.participation")}>{formatNumber(summary.participation, intl)}</StatTile>
            <StatTile label={t("points.balance.earned")}>{formatNumber(summary.earned, intl)}</StatTile>
            <StatTile label={t("points.balance.spent")}>{formatNumber(summary.spent, intl)}</StatTile>
          </div>
        </div>
      </Card>
      <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[3fr_2fr]">
        <Card title={t("points.chart.title")} eyebrow={t("points.chart.eyebrow")}>
          <MonthlyChart series={series} />
        </Card>
        <HowToEarn />
      </div>
      <DonationCard holder={holder} />
    </div>
  );
}

const eventLabel = (t: (k: string) => string, e: PointsEntry) => t(`points.event.${e.event}`);

function StatementTab({ holder }: { holder: string }) {
  const { t, intl } = useI18n();
  const entries = usePointsEntries(holder);
  const [event, setEvent] = useState<string>("TODOS");
  const [period, setPeriod] = useState<Period>("90d");
  const now = new Date();
  const rows = filterStatement(entries, { event: isPointsEvent(event) ? event : "TODOS", period }, now);
  const total = rows.reduce((s, e) => s + e.delta, 0);
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label={t("points.statement.filters")}>
        <Field label={t("points.statement.event")} className="min-w-56">
          {({ id }) => <Select id={id} value={event} onChange={(e) => setEvent(e.target.value)} options={[{ value: "TODOS", label: t("points.statement.allEvents") }, ...ALL_EVENTS.map((ev) => ({ value: ev, label: t(`points.event.${ev}`) }))]} data-testid="statement-event" />}
        </Field>
        <Field label={t("points.statement.period")} className="min-w-44">
          {({ id }) => <Select id={id} value={period} onChange={(e) => isPeriod(e.target.value) && setPeriod(e.target.value)} options={PERIODS.map((p) => ({ value: p, label: t(`points.period.${p}`) }))} data-testid="statement-period" />}
        </Field>
        <p className="pb-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" aria-live="polite" data-testid="statement-count">{t("points.statement.count", { n: rows.length, total: formatSigned(total, intl) })}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState compact title={t("points.statement.empty")} description={t("points.statement.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--ws-radius-lg)] border border-ws-border">
          <table className="w-full min-w-[36rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="statement-table">
            <caption className="sr-only">{t("points.statement.caption")}</caption>
            <thead className="bg-ws-surface-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{t("points.statement.colDate")}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t("points.statement.colEvent")}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t("points.statement.colDetail")}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{t("points.statement.colPoints")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-ws-border">
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(e.at, intl)}</td>
                  <th scope="row" className="px-3 py-2 font-normal">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {eventLabel(t, e)}
                      <Tag tone={e.delta > 0 ? "success" : "neutral"}>{t(e.delta > 0 ? "points.statement.credit" : "points.statement.debit")}</Tag>
                    </span>
                  </th>
                  <td className="px-3 py-2 text-ws-text-muted">{e.note ?? (e.sessionId ? t("points.statement.session") : "—")}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSigned(e.delta, intl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RulesTab() {
  const { t, intl } = useI18n();
  const views = ruleViews(pointsLedger().rules());
  const range = `${new Intl.NumberFormat(intl, { minimumFractionDigits: 1 }).format(MULTIPLIER_RANGE.min)}–${new Intl.NumberFormat(intl, { minimumFractionDigits: 1 }).format(MULTIPLIER_RANGE.max)}`;
  const capText = (dailyCap: number, perSessionCap: number) => {
    const parts = [dailyCap ? t("points.rules.capDay", { n: dailyCap }) : null, perSessionCap ? t("points.rules.capSession", { n: perSessionCap }) : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : t("points.rules.noCap");
  };
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card title={t("points.rules.title")} eyebrow="RF42 · CA02">
        <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("points.rules.intro")}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="rules-table">
            <caption className="sr-only">{t("points.rules.caption")}</caption>
            <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("points.rules.colEvent")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("points.rules.colPoints")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("points.rules.colCap")}</th>
                <th scope="col" className="py-2 font-semibold">{t("points.rules.colHow")}</th>
              </tr>
            </thead>
            <tbody>
              {views.map((r) => (
                <tr key={r.event} className="border-t border-ws-border align-top">
                  <th scope="row" className="py-2 pr-3 font-semibold">
                    {t(`points.event.${r.event}`)}
                    {!r.participation ? <span className="block text-[length:var(--ws-text-caption)] font-normal text-ws-text-muted">{t("points.rules.notParticipation")}</span> : null}
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.points === null ? t("points.rules.variable") : formatNumber(r.points, intl)}
                    {r.multiplier ? <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("points.rules.multiplier", { range })}</span> : null}
                  </td>
                  <td className="py-2 pr-3">{capText(r.dailyCap, r.perSessionCap)}</td>
                  <td className="py-2 text-ws-text-muted">{t(`points.rules.how.${r.event}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card tone="soft" title={t("points.rules.guardsTitle")}>
        <ul className="grid list-disc gap-1 pl-5 text-[length:var(--ws-text-body-sm)]">
          <li>{t("points.rules.guard.idempotent")}</li>
          <li>{t("points.rules.guard.caps")}</li>
          <li>{t("points.rules.guard.noise")}</li>
          <li>{t("points.rules.guard.noMoney")}</li>
          <li>{t("points.rules.guard.expiry")}</li>
          <li>{t("points.rules.guard.versions")}</li>
        </ul>
      </Card>
    </div>
  );
}

function DepartmentsTab() {
  const { t, intl } = useI18n();
  const { rows, company } = useMemo(() => departmentRows(), []);
  return (
    <Card title={t("points.departments.title")} eyebrow="RF42 · CA08">
      <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("points.departments.intro", { k: DEPARTMENT_MIN_PEOPLE, kCompany: COMPANY_MIN_PEOPLE })}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="departments-table">
          <caption className="sr-only">{t("points.departments.caption")}</caption>
          <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">{t("points.departments.colDept")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("points.departments.colPeople")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("points.departments.colEarned")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("points.departments.colSpent")}</th>
              <th scope="col" className="py-2 text-right font-semibold">{t("points.departments.colPerPerson")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.department} className="border-t border-ws-border">
                <th scope="row" className="py-2 pr-3 font-semibold">{r.department}</th>
                {r.hidden ? (
                  <td colSpan={4} className="py-2 text-ws-text-muted">{t("points.departments.hidden", { k: DEPARTMENT_MIN_PEOPLE })}</td>
                ) : (
                  <>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(r.people, intl)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(r.earned, intl)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(r.spent, intl)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(r.perPerson, intl)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          {company ? (
            <tfoot>
              <tr className="border-t-2 border-ws-border font-semibold">
                <th scope="row" className="py-2 pr-3">{t("points.departments.company")}</th>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(company.people, intl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(company.earned, intl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(company.spent, intl)}</td>
                <td className="py-2 text-right tabular-nums">{formatNumber(company.perPerson, intl)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <DemoNote hintKey="points.departments.demo" className="mt-3" />
    </Card>
  );
}

function NoBalance() {
  const { t } = useI18n();
  return <EmptyState title={t("points.noBalance.title")} description={t("points.noBalance.description")} />;
}

function PointsContent({ page }: { page: PageEntry }) {
  const { user } = useViewer();
  const mounted = useMounted();
  const holder = pointsHolderOf(user);
  return (
    <RfPage
      page={page}
      actions={<DemoBadge />}
      renderTab={(slug) => {
        if (!mounted) return <LoadingState />;
        if (slug === "regras") return <RulesTab />;
        if (slug === "departamentos") return <DepartmentsTab />;
        if (!holder) return <NoBalance />;
        if (slug === "extrato") return <StatementTab holder={holder} />;
        return <BalanceTab holder={holder} />;
      }}
    />
  );
}

export function PointsPage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <PointsContent page={page} />
    </Suspense>
  );
}


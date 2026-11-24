"use client";
/**
 * Execução do agente na sessão (RF51.CA04, modo AGENTE): o mandato vigente (objetivo, ferramentas, escopo, quem autorizou, uso
 * de passos/tokens/prazo), os controles Iniciar · Pausar · Retomar · Próximo passo · Interromper e a lista de passos com
 * ferramenta, alvos, tokens, resumo e motivo — cada um com "desfazer até este checkpoint". O executor é simulado e determinístico
 * (lib/decia/session/agent.ts, D-12): só completa seções vazias da minuta com o que a sessão registrou ou com trechos da Memória.
 */
import { useMemo, useState } from "react";
import { Badge, Button, Card, Checkbox, Tag, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { AgentRunStatus } from "@/lib/ai/autonomy";
import {
  AGENT_SECTIONS, canControlAgent, canStartAgent, canUndoTo, isRunning, sectionTarget, type AgentDenial, type AgentLabels, type AgentSection, type SessionAgentRun,
} from "@/lib/decia/session/agent";
import { agentStoreFor, useAgentRuns, type AgentStore } from "@/lib/decia/session/agentStore";
import { effectivePolicy, MINUTA_TARGET } from "@/lib/decia/session/policy";
import { can } from "@/lib/decia/session/roles";
import type { DateOnly } from "@/lib/decia/session/types";
import { formatDateOnly, formatWhen, personName, useSessionCtx } from "./context";

/** Motivos de recusa próprios do agente; os demais vêm de session.denial.* */
const OWN_DENIALS: readonly string[] = ["AGENTE_PAUSADO", "AGENTE_NAO_PAUSADO", "SEM_EXECUCAO", "EXECUCAO_EM_ANDAMENTO", "CHECKPOINT_INEXISTENTE"];

export function useAgentDenial() {
  const { t } = useI18n();
  return (reason: AgentDenial) => (OWN_DENIALS.includes(reason) ? t(`session.agent.denial.${reason}`) : t(`session.denial.${reason}`));
}

export function useAgentLabels(): AgentLabels {
  const { t, intl } = useI18n();
  return useMemo(() => ({
    section: Object.fromEntries(AGENT_SECTIONS.map((s) => [s, t(`session.agent.section.${s}`)])) as Record<AgentSection, string>,
    followUpProposal: (question: string) => t("session.agent.followUpProposal", { question }),
    summary: (section: string, n: number) => t("session.agent.summary", { section, n }),
    reason: (section: AgentSection, n: number) => t(`session.agent.reason.${section}`, { n }),
    formatDate: (d: DateOnly) => formatDateOnly(d, intl),
  }), [t, intl]);
}

/** O armazenamento do agente ligado ao repositório da sessão em tela. */
export function useAgentStore(): AgentStore {
  const { repo } = useSessionCtx();
  return agentStoreFor(repo);
}

const STATUS_TONE: Record<AgentRunStatus, Tone> = { EXECUTANDO: "spark", CONCLUIDO: "success", LIMITE_ATINGIDO: "warning", INTERROMPIDO: "danger" };
const STATUS_ICON: Record<AgentRunStatus, string> = { EXECUTANDO: "▶", CONCLUIDO: "✓", LIMITE_ATINGIDO: "■", INTERROMPIDO: "✕" };

export function AgentStatusTag({ run }: { run: SessionAgentRun }) {
  const { t } = useI18n();
  const status = run.core.status;
  if (status === "EXECUTANDO" && run.paused) return <Tag tone="warning"><span aria-hidden>❚❚</span>{t("session.agent.status.PAUSADO")}</Tag>;
  return <Tag tone={STATUS_TONE[status]}><span aria-hidden>{STATUS_ICON[status]}</span>{t(`session.agent.status.${status}`)}</Tag>;
}

/** Escopo do mandato: a minuta inteira ou só algumas seções (usado no formulário do mandato). */
export function AgentScopeField({ value, onChange }: { value: readonly string[]; onChange: (next: string[]) => void }) {
  const { t } = useI18n();
  const whole = value.includes(MINUTA_TARGET);
  return (
    <fieldset className="grid gap-1" data-testid="agent-scope">
      <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("session.agent.scope.title")}</legend>
      <Checkbox label={t("session.agent.scope.whole")} checked={whole} onCheckedChange={(on) => onChange(on ? [MINUTA_TARGET] : [])} />
      {AGENT_SECTIONS.map((s) => (
        <Checkbox
          key={s}
          className="ps-6"
          label={t(`session.agent.section.${s}`)}
          disabled={whole}
          checked={whole || value.includes(sectionTarget(s))}
          onCheckedChange={(on) => onChange(on ? [...value, sectionTarget(s)] : value.filter((x) => x !== sectionTarget(s)))}
        />
      ))}
    </fieldset>
  );
}

const targetLabel = (target: string, t: (k: string) => string) => {
  if (target === MINUTA_TARGET) return t("session.agent.scope.whole");
  const s = AGENT_SECTIONS.find((x) => sectionTarget(x) === target);
  return s ? t(`session.agent.section.${s}`) : target;
};

/** Linha curta no painel de autonomia: estado da execução e atalho para a lista de passos (aba Minuta). */
export function AgentStatusLine() {
  const { t } = useI18n();
  const { session, goTo } = useSessionCtx();
  const store = useAgentStore();
  const runs = useAgentRuns(store, session.id);
  const run = runs.at(-1);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)]" data-testid="agent-status-line">
      {run ? <AgentStatusTag run={run} /> : <span className="text-ws-text-muted">{t("session.agent.notStarted")}</span>}
      <Button size="sm" variant="ghost" onClick={() => goTo("minuta")}>{t("session.agent.openPanel")}</Button>
    </div>
  );
}

function StepsTable({ run, onUndo, mayUndo }: { run: SessionAgentRun; onUndo: (n: number) => void; mayUndo: boolean }) {
  const { t, intl } = useI18n();
  const { session } = useSessionCtx();
  const nf = new Intl.NumberFormat(intl);
  if (!run.steps.length) return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.agent.noSteps")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="agent-steps">
        <caption className="sr-only">{t("session.agent.steps.caption")}</caption>
        <thead>
          <tr className="text-left text-ws-text-muted">
            <th scope="col" className="border-b border-ws-border p-2">#</th>
            <th scope="col" className="border-b border-ws-border p-2">{t("session.agent.steps.tool")}</th>
            <th scope="col" className="border-b border-ws-border p-2">{t("session.agent.steps.targets")}</th>
            <th scope="col" className="border-b border-ws-border p-2 text-right">{t("session.agent.steps.tokens")}</th>
            <th scope="col" className="border-b border-ws-border p-2">{t("session.agent.steps.summary")}</th>
            <th scope="col" className="border-b border-ws-border p-2">{t("session.agent.steps.checkpoint")}</th>
          </tr>
        </thead>
        <tbody>
          {run.steps.map((s) => (
            <tr key={s.n} data-testid={`agent-step-${s.n}`} className={s.undoneAt ? "text-ws-text-muted" : undefined}>
              <th scope="row" className="border-b border-ws-border p-2 text-left font-[family-name:var(--ws-font-mono)] font-normal">{s.n}</th>
              <td className="border-b border-ws-border p-2">{t(`aiPolicy.tool.${s.tool}`)}</td>
              <td className="border-b border-ws-border p-2">{s.targetIds.map((x) => targetLabel(x, t)).join(", ")}</td>
              <td className="border-b border-ws-border p-2 text-right tabular-nums">{nf.format(s.tokens)}</td>
              <td className="border-b border-ws-border p-2">
                <span className="block"><span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{s.summary}</span>
                <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.agent.steps.reason", { reason: s.reason })}</span>
                <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.agent.steps.revision", { from: s.revisionBefore, to: s.revisionAfter, when: formatWhen(s.at, intl) })}</span>
              </td>
              <td className="border-b border-ws-border p-2">
                {s.undoneAt ? (
                  <Tag tone="neutral"><span aria-hidden>↺</span>{t("session.agent.steps.undone")}</Tag>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!mayUndo || !canUndoTo(session, run, s.n)}
                    title={mayUndo && !canUndoTo(session, run, s.n) ? t("session.denial.MINUTA_MUDOU_DEPOIS") : undefined}
                    onClick={() => onUndo(s.n)}
                    data-testid={`agent-undo-${s.n}`}
                  >
                    {t("session.agent.undoTo", { n: s.n })}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgentPanel() {
  const { t, intl } = useI18n();
  const { session, org, me, people } = useSessionCtx();
  const store = useAgentStore();
  const labels = useAgentLabels();
  const denial = useAgentDenial();
  const runs = useAgentRuns(store, session.id);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = runs.at(-1) ?? null;
  const eff = effectivePolicy(session, org);
  const charter = eff.mode === "AGENTE" ? eff.charter : null;
  const nf = new Intl.NumberFormat(intl);
  const running = isRunning(run);
  const shown = running ? run!.charter : charter ?? run?.charter ?? null;
  const mayStart = !!charter && !running && canStartAgent(session, charter, me);
  const mayControl = !!run && running && canControlAgent(session, run.charter, me);
  const mayResume = !!run && running && run.paused && canStartAgent(session, run.charter, me);
  const mayUndo = can(session, me, "DECIDIR_PROPOSTA");

  const done = (r: { ok: true } | { ok: false; reason: AgentDenial }, ok: string) => {
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    setError(null);
    setStatus(ok);
  };
  const step = () => {
    const out = store.step(session.id, { labels, actor: me });
    if (out.kind === "NEGADO") done({ ok: false, reason: out.reason }, "");
    else if (out.kind === "APLICADO") done({ ok: true }, t("session.agent.done.step", { n: out.step.n, summary: out.step.summary }));
    else done({ ok: true }, t(`session.agent.notice.${out.run.core.status}`, { by: t("session.agent.system"), steps: out.run.steps.length, tokens: out.run.core.tokensUsed, version: out.run.core.policyVersion, reason: t(`session.agent.end.${out.reason}`) }));
  };

  return (
    <Card padding="md" className="grid gap-[var(--ws-space-3)]" data-testid="agent-panel" aria-labelledby="agent-panel-title">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="agent-panel-title" className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold"><span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{t("session.agent.title")}</h2>
        {run ? <AgentStatusTag run={run} /> : null}
        <Badge tone="neutral" title={t("session.agent.simulatedHint")}>{t("session.agent.simulated")}</Badge>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.agent.intro")}</p>

      {!shown ? (
        <p className="rounded-[var(--ws-radius-md)] bg-ws-info-soft p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]" data-testid="agent-unavailable">
          {session.policy.mode === "AGENTE" ? t("session.agent.blockedByCeiling", { ceiling: t(`aiAutonomy.${org.ceiling}`) }) : t("session.agent.needsMode")}
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[length:var(--ws-text-body-sm)]" data-testid="agent-charter">
          <dt className="text-ws-text-muted">{t("session.agent.charter.goal")}</dt><dd>{shown.goal}</dd>
          <dt className="text-ws-text-muted">{t("session.agent.charter.authorizedBy")}</dt><dd>{personName(people, shown.authorizedBy)}</dd>
          <dt className="text-ws-text-muted">{t("session.agent.charter.tools")}</dt><dd>{shown.allowedTools.map((x) => t(`aiPolicy.tool.${x}`)).join(", ")}</dd>
          <dt className="text-ws-text-muted">{t("session.agent.charter.scope")}</dt><dd>{shown.scopeTargetIds.map((x) => targetLabel(x, t)).join(", ")}</dd>
          <dt className="text-ws-text-muted">{t("session.agent.charter.usage")}</dt>
          <dd data-testid="agent-usage">
            {t("session.agent.charter.usageValue", {
              steps: run && running ? run.core.steps.length : 0, maxSteps: shown.maxSteps,
              tokens: nf.format(run && running ? run.core.tokensUsed : 0), maxTokens: nf.format(shown.maxTokens), when: formatWhen(shown.expiresAt, intl),
            })}
          </dd>
        </dl>
      )}

      {run && !running ? (
        <p className="text-[length:var(--ws-text-body-sm)]" data-testid="agent-ended">
          {t(`session.agent.notice.${run.core.status}`, {
            by: run.core.endedBy === "SISTEMA" || !run.core.endedBy ? t("session.agent.system") : personName(people, run.core.endedBy),
            steps: run.steps.filter((s) => !s.undoneAt).length, tokens: run.core.tokensUsed, version: run.core.policyVersion, reason: run.endReason ? t(`session.agent.end.${run.endReason}`) : "",
          })}
        </p>
      ) : null}
      {running && run!.paused ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.agent.pausedBy", { name: personName(people, run!.pausedBy) })}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!running && charter ? (
          <Button size="sm" variant="spark" disabled={!mayStart} onClick={() => done(store.start(session.id, me, labels), t("session.agent.done.started"))} data-testid="agent-start">
            {t("session.agent.start")}
          </Button>
        ) : null}
        {running && !run!.paused ? (
          <Button size="sm" variant="default" disabled={!mayControl} onClick={() => done(store.pause(session.id, me), t("session.agent.done.paused"))} data-testid="agent-pause">{t("session.agent.pause")}</Button>
        ) : null}
        {running && run!.paused ? (
          <>
            <Button size="sm" variant="spark" disabled={!mayResume} onClick={() => done(store.resume(session.id, me, labels), t("session.agent.done.resumed"))} data-testid="agent-resume">{t("session.agent.resume")}</Button>
            <Button size="sm" variant="default" disabled={!mayResume} onClick={step} data-testid="agent-step">{t("session.agent.nextStep")}</Button>
          </>
        ) : null}
        {running ? (
          <Button size="sm" variant="danger" disabled={!mayControl} onClick={() => done(store.stop(session.id, me), t("session.agent.done.stopped"))} data-testid="agent-stop">{t("session.agent.stop")}</Button>
        ) : null}
      </div>
      {!running && charter && !mayStart ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.agent.onlyAuthorizer", { name: personName(people, charter.authorizedBy) })}</p> : null}

      <div aria-live="polite" className="text-[length:var(--ws-text-body-sm)]" data-testid="agent-live">
        {error ? <p role="alert" className="text-ws-danger-ink">{error}</p> : status ? <p>{status}</p> : null}
      </div>

      {run ? (
        <StepsTable
          run={run}
          mayUndo={mayUndo}
          onUndo={(n) => done(store.undoTo(session.id, me, run.id, n, t("session.agent.undoReason", { n })), t("session.agent.done.undone", { n }))}
        />
      ) : null}

      {runs.length > 1 ? (
        <details className="text-[length:var(--ws-text-body-sm)]">
          <summary className="cursor-pointer font-semibold">{t("session.agent.previous", { n: runs.length - 1 })}</summary>
          <ul className="mt-2 grid gap-1">
            {runs.slice(0, -1).reverse().map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <AgentStatusTag run={r} />
                <span>{t("session.agent.previousItem", { when: formatWhen(r.startedAt, intl), steps: r.steps.length, tokens: nf.format(r.core.tokensUsed) })}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

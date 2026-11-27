"use client";
/**
 * Tarefa ↔ decisão (RF29 × RF41): bloco "Decisões ligadas" para a página da tarefa e o aviso do que a API ainda não grava. Lê a fonte
 * ÚNICA (`useDecisionSource`: API com sessão, DEMO no laboratório) e lista as decisões com vínculo de trabalho TAREFA para a tarefa; a
 * ação "Ligar a uma decisão" grava o vínculo pelo mesmo repositório (`linkWork` → comando LINK_WORK na API, que confere se quem liga vê
 * a tarefa). Tarefa do laboratório (id sem UUID) numa sessão real não pode ser ligada no servidor: o botão fica desabilitado com o motivo
 * visível — nunca um vínculo que some em silêncio.
 */
import { useId, useState } from "react";
import { Button, Dialog, EmptyState, Field, Link, Select, Tag } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import { linkWork, unlinkWork } from "@/lib/decia/commands";
import { DecisionApiLimitError, isServerId, type HttpDecisionRepository } from "@/lib/decia/http";
import { useDecisions, useLinkedDecisions } from "@/lib/decia/repository";
import { useDecisionSource } from "@/lib/decia/useDecisionRepository";
import type { DecisionAggregate, DecisionWorkLink } from "@/lib/decia/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { DecisionStatusBadge } from "./Badges";

const LINKABLE_OUT = new Set(["ARQUIVADA"]);
export const decisionHref = (id: string) => `/decia/decisoes/${id}`;

/** Rótulo do vínculo: o que a tela conhecia ao ligar; vindo da API (o vínculo não copia dados) é o tipo + o início do id. */
export function workLinkLabel(w: DecisionWorkLink, t: (key: string, vars?: Record<string, string | number>) => string): string {
  return w.label || t("decia2.workLink.fallback", { type: t(`decia.workLink.${w.targetType}`), id: w.targetId.slice(0, 8) });
}

/** Aviso do último erro da API de decisões: limite (o que não foi gravado, item a item) ou erro da requisição. */
export function DecisionApiNotice({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  if (error instanceof DecisionApiLimitError) {
    return (
      <div role="alert" className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-warning-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="decision-api-limit">
        <p className="font-semibold">{t("decia2.limit.title")}</p>
        <ul className="list-disc pl-5">{error.limits.map((k) => <li key={k}>{t(`decia2.limit.${k}`)}</li>)}</ul>
      </div>
    );
  }
  return <p role="alert" className="rounded-[var(--ws-radius-md)] bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{t("deciaapi.saveError")} {describeError(error)}</p>;
}

/** Bloco "Decisões ligadas" de uma tarefa (página /tasks/[id]). */
export function LinkedDecisions({ taskId, taskTitle }: { taskId: string; taskTitle?: string }) {
  const { t } = useI18n();
  const { repo, currentUserId } = useDecisionSource();
  const linked = useLinkedDecisions("TAREFA", taskId, repo);
  const all = useDecisions(repo);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const reasonId = useId();
  const api = repo.source === "API";
  const http = api ? (repo as HttpDecisionRepository) : null;
  const labTask = api && !isServerId(taskId);
  const candidates = all.filter((a) => !LINKABLE_OUT.has(a.decision.status) && !linked.some((l) => l.decision.id === a.decision.id));
  const blocked = labTask ? t("decia2.linked.labTask") : !candidates.length ? t("decia2.linked.noCandidates") : null;

  const link = () => {
    const agg = all.find((a) => a.decision.id === choice);
    if (!agg) return;
    repo.save(linkWork(agg, { targetType: "TAREFA", targetId: taskId, label: taskTitle }, currentUserId, new Date()));
    setOpen(false);
    setChoice("");
  };
  const unlink = (agg: DecisionAggregate) => {
    const w = agg.workLinks.find((x) => x.targetType === "TAREFA" && x.targetId === taskId);
    if (w) repo.save(unlinkWork(agg, w.id, currentUserId, new Date()));
  };

  return (
    <section aria-labelledby={`${reasonId}-title`} className="grid gap-3 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)]" data-testid="linked-decisions">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${reasonId}-title`} className="text-[length:var(--ws-text-h3)] font-semibold">{t("decia2.linked.title")}</h2>
        {repo.source === "DEMO" ? <Tag tone="neutral">{t("decia.demo")}</Tag> : null}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {blocked ? <span id={reasonId} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{blocked}</span> : null}
          <Button size="sm" icon="sessao-decia" disabled={!!blocked} aria-describedby={blocked ? reasonId : undefined} onClick={() => setOpen(true)} data-testid="link-decision">{t("decia2.linked.action")}</Button>
        </span>
      </div>
      <div aria-live="polite">
        {linked.length ? (
          <ul className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
            {linked.map((a) => (
              <li key={a.decision.id} className="flex flex-wrap items-center gap-2">
                <Link href={decisionHref(a.decision.id)}>{a.decision.title}</Link>
                <DecisionStatusBadge status={a.decision.status} />
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => unlink(a)} aria-label={t("decia2.linked.unlinkOf", { title: a.decision.title })}>{t("decia2.linked.unlink")}</Button>
              </li>
            ))}
          </ul>
        ) : <EmptyState compact title={t("decia2.linked.empty")} description={t("decia2.linked.emptyDesc")} />}
        {http ? <div className="mt-2"><DecisionApiNotice error={http.lastError()} /></div> : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title={t("decia2.linked.dialogTitle")} description={t("decia2.linked.dialogDesc")}>
        <div className="grid gap-[var(--ws-space-4)]">
          <Field label={t("decia2.linked.choose")}>
            {({ id }) => <Select id={id} value={choice} onChange={(e) => setChoice(e.target.value)} options={[{ value: "", label: t("decia2.linked.choosePlaceholder") }, ...candidates.map((a) => ({ value: a.decision.id, label: a.decision.title }))]} />}
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("decia.common.cancel")}</Button>
            <Button variant="primary" disabled={!choice} onClick={link} data-testid="confirm-link-decision">{t("decia2.linked.confirm")}</Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}


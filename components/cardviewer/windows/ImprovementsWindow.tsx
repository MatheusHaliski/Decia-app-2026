"use client";
/**
 * Janela "Melhorias ✦" — CI da IA da Work Station: verificações determinísticas (`lib/cardviewer/checks.ts`) com placar
 * (n passaram · n atenção · n falharam), ordenadas por gravidade, cada uma com o porquê, a sugestão e "abrir onde corrigir".
 * Autonomia (lib/ai/autonomy.ts, padrão pessoal das preferências): só modos com sugestão espontânea rodam sozinhos; os demais mostram
 * "rodar verificação". MANUAL roda as verificações a pedido, mas sem sugestões da IA nem "aplicar". "Aplicar sugestão" (tarefa da API,
 * correções seguras do Acervo) monta a PROPOSTA (o que muda) e só grava depois que a pessoa revisa e confirma — com a versão atual,
 * para o servidor recusar se alguém mudou antes. D-12: textos montados dos fatos calculados; tudo da IA marcado com ✦.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Link, Tag, useToast } from "@/components/ui";
import { metricText } from "@/components/projects/common";
import { describeError } from "@/lib/api/client";
import { evaluateAiAction, personalPolicy } from "@/lib/ai/autonomy";
import type { OccupationPack } from "@/lib/career/occupationPack";
import { packFor } from "@/lib/career/packs";
import { applyFix, projectChecks, taskChecks, VERDICT_MARK, VERDICTS, type ImprovementCheck, type Verdict } from "@/lib/cardviewer/checks";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { STUDY_FIELD_KEY } from "@/lib/tasks/areas";
import { tasksApi } from "@/lib/tasks/client";
import type { QuickFix } from "@/lib/tasks/quality";
import { useViewerData } from "../context";

const TONE: Record<Verdict, "danger" | "warning" | "success"> = { FALHOU: "danger", ATENCAO: "warning", PASSOU: "success" };

export function ImprovementsWindow() {
  const { t } = useI18n();
  const { prefs } = usePreferences();
  const { task, project, today } = useViewerData();
  const policy = personalPolicy(prefs.aiAutonomyDefault);
  const auto = evaluateAiAction(policy, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok;
  const canPropose = evaluateAiAction(policy, "PROPOR_ALTERACAO", { requestedByUser: true }).ok;
  const [ran, setRan] = useState(auto);
  const [runId, setRunId] = useState(0);
  const [pack, setPack] = useState<OccupationPack | null>(null);

  // rubrica do campo de estudo, quando a tarefa tem um (mesma escada de status do criador do Acervo)
  const field = task?.subject.extensions[STUDY_FIELD_KEY];
  useEffect(() => {
    if (!field) return;
    let alive = true;
    packFor(field, "pesquisa").then((p) => { if (alive) setPack(p?.pack ?? null); }).catch(() => undefined);
    return () => { alive = false; };
  }, [field]);

  const report = useMemo(() => {
    if (!ran) return null;
    void runId;
    if (task) {
      const files = task.view && task.files.status === "ok"
        ? { attachments: task.files.attachments.length, evidences: task.files.evidences.length, list: task.files.attachments }
        : null;
      return taskChecks({ subject: task.subject, today, files, pack });
    }
    if (project) return projectChecks(project.subject, project.decisions);
    return null;
  }, [ran, runId, task, project, today, pack]);

  return (
    <div className="grid gap-3" data-testid="window-melhorias">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="spark"><span aria-hidden>✦ </span>{t("cardviewer.ci.badge")}</Badge>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.ci.mode", { mode: t(`cardviewer.ci.modeName.${policy.mode}`) })}</span>
        <span className="flex-1" />
        <Button size="sm" variant="spark" onClick={() => { setRan(true); setRunId((n) => n + 1); }}>{t(ran ? "cardviewer.ci.rerun" : "cardviewer.ci.run")}</Button>
      </div>
      {!ran ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="ci-idle">{t(policy.mode === "MANUAL" ? "cardviewer.ci.manual" : "cardviewer.ci.onRequest")}</p> : null}
      {report ? (
        <>
          <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] font-semibold" data-testid="ci-score">
            {t("cardviewer.ci.score", { pass: report.counts.PASSOU, warn: report.counts.ATENCAO, fail: report.counts.FALHOU })}
            {report.noData ? <span className="font-normal text-ws-text-muted"> · {t("cardviewer.ci.noData", { n: report.noData })}</span> : null}
          </p>
          <div className="flex flex-wrap gap-1" aria-hidden>
            {VERDICTS.map((v) => <Tag key={v} tone={TONE[v]}>{VERDICT_MARK[v]} {report.counts[v]}</Tag>)}
          </div>
          <ol className="grid gap-2">
            {report.checks.map((c) => <CheckItem key={c.id} c={c} suggestions={policy.mode !== "MANUAL"} canPropose={canPropose} />)}
          </ol>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.ci.engineNote")}</p>
        </>
      ) : null}
    </div>
  );
}

function CheckItem({ c, suggestions, canPropose }: { c: ImprovementCheck; suggestions: boolean; canPropose: boolean }) {
  const { t, intl } = useI18n();
  const { task } = useViewerData();
  const [proposal, setProposal] = useState(false);
  const m = c.metric ? metricText(t, intl, c.metric) : null;
  const detail = m ? m.detail : t(c.detail.key, c.detail.vars);
  const suggestion = c.suggestion ? (m ? m.advice : t(c.suggestion.key, c.suggestion.vars)) : null;
  const where = t(c.where.label.key, { ...c.where.label.vars, tab: c.where.label.vars?.tab ? t(`cardviewer.tab.${c.where.label.vars.tab}`) : "" });
  const applicable = !!c.fix && !!task?.view && task.subject.editable && canPropose && suggestions;
  return (
    <li className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-2.5 py-2 text-[length:var(--ws-text-body-sm)]" data-check={c.id} data-verdict={c.verdict}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag tone={TONE[c.verdict]}><span aria-hidden>{VERDICT_MARK[c.verdict]}</span>{t(`cardviewer.ci.verdict.${c.verdict}`)}</Tag>
        <span className="min-w-0 flex-1 font-semibold">{m ? m.title : t(c.title.key, c.title.vars)}</span>
      </div>
      <p className="[overflow-wrap:anywhere]">{detail}</p>
      {suggestion && suggestions ? <p className="text-ws-ai-spark-ink [overflow-wrap:anywhere]"><span aria-hidden>✦ </span><span className="sr-only">{t("cardviewer.ci.suggestion")}: </span>{suggestion}</p> : null}
      <details className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <summary className="cursor-pointer select-none">{t("cardviewer.ci.why")}</summary>
        <p className="mt-1">{t(c.why.key, c.why.vars)}</p>
      </details>
      {c.verdict !== "PASSOU" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={c.where.href}>{where}</Link>
          {applicable && !proposal ? <Button size="sm" variant="spark" onClick={() => setProposal(true)}>{t("cardviewer.ci.apply")}</Button> : null}
        </div>
      ) : null}
      {proposal && c.fix ? <Proposal fix={c.fix} onDone={() => setProposal(false)} /> : null}
    </li>
  );
}

function fixText(t: (k: string, v?: Record<string, string | number>) => string, f: QuickFix) {
  return f.kind === "ADD_CRITERION" ? t("tasks.assist.fix.criterion", { text: f.text })
    : f.kind === "ADD_DELIVERABLE" ? t("tasks.assist.fix.deliverable", { text: f.text })
    : f.kind === "ADD_REFERENCE" ? t("tasks.assist.fix.reference", { label: f.label })
    : f.kind === "SET_EXTENSION" ? t("tasks.assist.fix.extension", { field: t(`tasks.ext.${f.key}`), value: f.value })
    : t("tasks.assist.fix.access", { access: t(`social.access.${f.accessClass}`) });
}

/** Proposta revisável: mostra o que muda e só grava com a confirmação da pessoa (PUT com a versão atual). */
function Proposal({ fix, onDone }: { fix: QuickFix; onDone: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { task } = useViewerData();
  const [busy, setBusy] = useState(false);
  if (!task?.view) return null;
  const view = task.view;
  const confirm = async () => {
    setBusy(true);
    try {
      const next = await tasksApi.update(task.subject.id, applyFix(view, fix));
      task.setView(next);
      toast({ title: t("cardviewer.ci.applied"), tone: "sucesso" });
      onDone();
    } catch (e) {
      toast({ title: t("cardviewer.ci.applyError"), description: describeError(e), tone: "erro" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="group" aria-label={t("cardviewer.ci.proposal")} className="grid gap-1.5 rounded-[var(--ws-radius-sm)] bg-ws-ai-spark-soft p-2" data-testid="ci-proposal">
      <p className="text-ws-ai-spark-ink"><span aria-hidden>✦ </span>{t("cardviewer.ci.proposalText", { change: fixText(t, fix), version: view.version ?? 0 })}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" busy={busy} onClick={confirm}>{t("cardviewer.ci.confirm")}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}

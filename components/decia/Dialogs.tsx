"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Dialog, Field, Input, Select, Tag, Textarea, useToast } from "@/components/ui";
import { track } from "@/lib/decia/analytics";
import { addAlternative, addEvidence, decide, recordOutcome } from "@/lib/decia/commands";
import { focusAlternativeId, preDecisionGuard, scoreOf } from "@/lib/decia/rules";
import type { DecisionAggregate, EvidenceNature, EvidenceStance, OutcomeResult, RelevanceLevel } from "@/lib/decia/types";
import { useI18n } from "@/lib/i18n/useI18n";

export interface DialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aggregate: DecisionAggregate;
  currentUserId: string;
  onSave: (next: DecisionAggregate) => void;
}

const CONFIDENCE_OPTIONS = Array.from({ length: 21 }, (_, i) => i * 5);

/**
 * Decidir com guarda pré-decisão (§6.10): bloqueios (DECISAO_INCOMPLETA) impedem a confirmação; avisos exigem
 * confirmação explícita, que fica na trilha. Ao confirmar grava o snapshot "No momento da decisão" com SHA-256.
 */
export function DecideDialog({ open, onOpenChange, aggregate, currentUserId, onSave, onDecided }: DialogBaseProps & { onDecided?: (hash: string) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const initialAlt = useMemo(() => focusAlternativeId(aggregate, scoreOf(aggregate)) ?? "", [aggregate]);
  const [altId, setAltId] = useState(initialAlt);
  const [rationale, setRationale] = useState(aggregate.decision.rationale ?? "");
  const [confidence, setConfidence] = useState<string>(aggregate.decision.decisionConfidencePct?.toString() ?? "");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (open) {
      setAltId(initialAlt);
      setConfirmed(false);
    }
  }, [open, initialAlt]);
  const draft = { selectedAlternativeId: altId || null, rationale, confidencePct: confidence === "" ? null : Number(confidence) };
  const guard = preDecisionGuard(aggregate, draft);
  const canConfirm = guard.blocking.length === 0 && (guard.warnings.length === 0 || confirmed);
  const alts = [...aggregate.alternatives].sort((a, b) => a.position - b.position);

  const submit = () => {
    const { aggregate: next, snapshot } = decide(aggregate, { ...draft, warningsConfirmed: confirmed }, currentUserId, new Date());
    onSave(next);
    track("decision_finalized", { decisionId: aggregate.decision.id, warnings: guard.warnings.length, complexity: aggregate.decision.complexity });
    toast({ tone: "sucesso", title: t("decia.guard.success", { hash: snapshot.contentSha256.slice(0, 12) }) });
    onOpenChange(false);
    onDecided?.(snapshot.contentSha256);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.guard.title")} description={aggregate.decision.question} className="w-[min(94vw,40rem)]">
      <div className="grid gap-[var(--ws-space-4)]">
        <Field label={t("decia.decision.choose")} required>
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={altId}
              onChange={(e) => setAltId(e.target.value)}
              options={[{ value: "", label: t("decia.decision.chooseNone") }, ...alts.map((a) => ({ value: a.id, label: `${a.label} — ${a.title}${a.status === "DESCARTADA" ? ` (${t("decia.compare.discarded")})` : ""}` }))]}
            />
          )}
        </Field>
        <Field label={t("decia.decision.rationale")} hint={t("decia.decision.rationaleHint")} required>
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={rationale} onChange={(e) => setRationale(e.target.value)} />}
        </Field>
        <Field label={t("decia.decision.confidence")} hint={t("decia.confidence.helpNoPct")}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={confidence} onChange={(e) => setConfidence(e.target.value)} options={[{ value: "", label: t("decia.decision.noConfidence") }, ...CONFIDENCE_OPTIONS.map((n) => ({ value: String(n), label: `${n} %` }))]} />
          )}
        </Field>

        {guard.blocking.length ? (
          <div role="alert" className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3" data-testid="guard-blocking">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-ws-danger-ink">
              <span aria-hidden>✕</span>{t("decia.guard.blockingTitle")} <Tag tone="danger" className="font-[family-name:var(--ws-font-mono)]">DECISAO_INCOMPLETA</Tag>
            </p>
            <ul className="grid list-disc gap-1 pl-5 text-[length:var(--ws-text-body-sm)]">{guard.blocking.map((b) => <li key={b}>{t(`decia.guard.block.${b}`)}</li>)}</ul>
          </div>
        ) : null}
        {guard.warnings.length ? (
          <div className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-3" data-testid="guard-warnings">
            <p className="font-semibold text-ws-warning-ink"><span aria-hidden>⚠ </span>{t("decia.guard.warningsTitle")}</p>
            <ul className="grid list-disc gap-1 pl-5 text-[length:var(--ws-text-body-sm)]">{guard.warnings.map((w) => <li key={w}>{t(`decia.guard.warn.${w}`)}</li>)}</ul>
            <Checkbox checked={confirmed} onCheckedChange={setConfirmed} label={t("decia.guard.confirm")} disabled={guard.blocking.length > 0} />
          </div>
        ) : null}
        {!guard.blocking.length && !guard.warnings.length ? <p role="status" className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink"><span aria-hidden>✓ </span>{t("decia.guard.ok")}</p> : null}

        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.guard.snapshotNote")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("decia.common.cancel")}</Button>
          <Button variant="primary" onClick={submit} disabled={!canConfirm} data-testid="confirm-decision">{t("decia.guard.confirmBtn")}</Button>
        </div>
      </div>
    </Dialog>
  );
}

export const CHALLENGE_MODES = ["reasoning", "alternatives", "assumptions", "counterEvidence", "tradeoffs"] as const;

/** "Desafiar a decisão" (03 §7): 5 modos de crítica. O serviço de IA ainda não está conectado — estado de erro explícito. */
export function ChallengeDialog({ open, onOpenChange, decisionId }: { open: boolean; onOpenChange: (o: boolean) => void; decisionId: string }) {
  const { t } = useI18n();
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setAsked(null);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.challenge.title")} description={t("decia.challenge.desc")} className="w-[min(94vw,36rem)]">
      <div className="grid gap-3">
        <p className="flex items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted"><Tag tone="neutral">{t("decia.challenge.notConnectedTag")}</Tag>{t("decia.challenge.notConnected")}</p>
        <ul className="grid gap-2">
          {CHALLENGE_MODES.map((m) => (
            <li key={m} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ws-radius-md)] border border-ws-ai-spark bg-ws-ai-spark-soft p-3">
              <span className="flex min-w-0 items-center gap-2 text-[length:var(--ws-text-body-sm)] font-semibold"><span aria-hidden className="text-ws-ai-spark-ink">✦</span>{t(`decia.challenge.modes.${m}`)}</span>
              <Button size="sm" variant="spark" onClick={() => { setAsked(m); track("decision_challenged", { decisionId, mode: m }); }}>{t("decia.challenge.run")}</Button>
            </li>
          ))}
        </ul>
        {asked ? (
          <div role="alert" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="ai-unavailable">
            <p className="font-semibold">{t("decia.ai.unavailable")}</p>
            <p className="text-ws-text-muted">{t("decia.challenge.unavailableDetail", { mode: t(`decia.challenge.modes.${asked}`) })}</p>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

export function AddAlternativeDialog({ open, onOpenChange, aggregate, currentUserId, onSave }: DialogBaseProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [doNothing, setDoNothing] = useState(false);
  const save = () => {
    onSave(addAlternative(aggregate, { title, doNothing }, currentUserId, new Date()));
    track("alternative_added", { decisionId: aggregate.decision.id, doNothing });
    setTitle("");
    setDoNothing(false);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.compare.addAlternative")}>
      <div className="grid gap-3">
        <Field label={t("decia.form.altTitle")} required>{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <Checkbox checked={doNothing} onCheckedChange={setDoNothing} label={t("decia.form.doNothing")} hint={t("decia.form.doNothingHint")} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("decia.common.cancel")}</Button>
          <Button variant="primary" onClick={save} disabled={title.trim().length < 2}>{t("decia.common.save")}</Button>
        </div>
      </div>
    </Dialog>
  );
}

export function AddEvidenceDialog({ open, onOpenChange, aggregate, currentUserId, onSave }: DialogBaseProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [nature, setNature] = useState<EvidenceNature>("EVIDENCIA");
  const [source, setSource] = useState("");
  const [reliability, setReliability] = useState<RelevanceLevel>("MEDIA");
  const [altId, setAltId] = useState("");
  const [stance, setStance] = useState<EvidenceStance>("SUSTENTA");
  const save = () => {
    onSave(addEvidence(aggregate, { title, nature, sourceLabel: source, reliability, altId: altId || undefined, stance }, currentUserId, new Date()));
    track("evidence_added", { decisionId: aggregate.decision.id, nature });
    setTitle("");
    setSource("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.evidence.add")} description={t("decia.evidence.emptyDesc")}>
      <div className="grid gap-3">
        <Field label={t("decia.form.evidenceTitle")} required>{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("decia.form.nature")}>{({ id }) => <Select id={id} value={nature} onChange={(e) => setNature(e.target.value as EvidenceNature)} options={(["FATO", "EVIDENCIA", "OPINIAO"] as const).map((n) => ({ value: n, label: t(`decia.nature.${n}`) }))} />}</Field>
          <Field label={t("decia.evidence.reliability")}>{({ id }) => <Select id={id} value={reliability} onChange={(e) => setReliability(e.target.value as RelevanceLevel)} options={(["ALTA", "MEDIA", "BAIXA"] as const).map((n) => ({ value: n, label: t(`decia.rel.${n}`) }))} />}</Field>
        </div>
        <Field label={t("decia.evidence.source")}>{({ id }) => <Input id={id} value={source} onChange={(e) => setSource(e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("decia.form.alternative")}>{({ id }) => <Select id={id} value={altId} onChange={(e) => setAltId(e.target.value)} options={[{ value: "", label: t("decia.form.none") }, ...aggregate.alternatives.map((a) => ({ value: a.id, label: `${a.label} — ${a.title}` }))]} />}</Field>
          <Field label={t("decia.form.stance")}>{({ id }) => <Select id={id} value={stance} disabled={!altId} onChange={(e) => setStance(e.target.value as EvidenceStance)} options={(["SUSTENTA", "CONTRADIZ", "CONTEXTO"] as const).map((s) => ({ value: s, label: t(`decia.stance.${s}`) }))} />}</Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("decia.common.cancel")}</Button>
          <Button variant="primary" onClick={save} disabled={title.trim().length < 3}>{t("decia.common.save")}</Button>
        </div>
      </div>
    </Dialog>
  );
}

export function RecordOutcomeDialog({ open, onOpenChange, aggregate, currentUserId, onSave }: DialogBaseProps) {
  const { t } = useI18n();
  const [result, setResult] = useState<OutcomeResult>("SUCESSO");
  const [summary, setSummary] = useState("");
  const save = () => {
    onSave(recordOutcome(aggregate, { result, summary }, currentUserId, new Date()));
    track("outcome_recorded", { decisionId: aggregate.decision.id, result });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.execution.recordOutcome")}>
      <div className="grid gap-3">
        <Field label={t("decia.execution.outcome")}>{({ id }) => <Select id={id} value={result} onChange={(e) => setResult(e.target.value as OutcomeResult)} options={(["SUCESSO", "PARCIAL", "FALHOU", "CANCELADA", "SUBSTITUIDA"] as const).map((r) => ({ value: r, label: t(`decia.outcome.${r}`) }))} />}</Field>
        <Field label={t("decia.form.summary")} required>{({ id }) => <Textarea id={id} value={summary} onChange={(e) => setSummary(e.target.value)} />}</Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("decia.common.cancel")}</Button>
          <Button variant="primary" onClick={save} disabled={summary.trim().length < 5}>{t("decia.common.save")}</Button>
        </div>
      </div>
    </Dialog>
  );
}

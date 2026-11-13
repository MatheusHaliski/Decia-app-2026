"use client";
import { useId, useState } from "react";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CopilotCaps } from "@/lib/letters/copilot";
import { REFERENCES, ruleInfo } from "@/lib/letters/rules";
import { IGNORE_REASONS, type Anchor, type Finding, type IgnoreReason } from "@/lib/letters/types";
import { SEVERITY_TONE, displayVars, excerptContext, pct } from "./shared";

export interface FindingActions {
  onGoTo: (anchor: { blockId: string; start: number; end: number }) => void;
  /** aplica em um clique (Sugestões/Assistido) — o clique é o aceite humano */
  onApply: (f: Finding, chosen?: string) => void;
  /** pede a proposta ✦ (Sob solicitação) */
  onPropose: (f: Finding, chosen?: string) => void;
  onIgnore: (f: Finding, reason: IgnoreReason, note: string) => void;
  onInsertSection: (f: Finding) => void;
}

const SECTION_RULES = new Set(["SECAO_AUSENTE", "SECAO_MODELO_AUSENTE", "SECAO_ADR_AUSENTE"]);

export function FindingCard({ finding: f, blockText, relatedText, caps, fresh, actions }: {
  finding: Finding;
  blockText: string | null;
  relatedText: (a: Anchor) => string | null;
  caps: CopilotCaps;
  /** a análise é da revisão e da política atuais */
  fresh: boolean;
  actions: FindingActions;
}) {
  const { t, intl } = useI18n();
  const [ignoring, setIgnoring] = useState(false);
  const [reason, setReason] = useState<IgnoreReason>("FALSO_POSITIVO");
  const [note, setNote] = useState("");
  const titleId = useId();
  const vars = displayVars(f, t);
  const ctx = blockText !== null && f.blockId ? excerptContext(blockText, f.start, f.end) : null;
  const ref = REFERENCES[ruleInfo(f.ruleId).reference]!;
  const alternatives = f.suggestions.filter((s) => s !== f.replacement);
  const canFix = (caps.oneClick || caps.proposeOnRequest) && fresh;
  const act = (chosen?: string) => (caps.oneClick ? actions.onApply(f, chosen) : actions.onPropose(f, chosen));

  return (
    <Card as="li" padding="sm" className="grid gap-2" aria-labelledby={titleId} data-finding-id={f.id} data-rule={f.ruleId}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[f.severity]}>{t(`letters.severity.${f.severity}`)}</Badge>
        <h4 id={titleId} className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t(`letters.rule.${f.ruleId}.title`)}</h4>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t(`letters.certainty.${f.certainty}`)} · {t("letters.finding.confidence", { value: pct(f.confidence, intl) })} · {t("letters.finding.origin")}
      </p>
      {ctx ? (
        <p className="rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1 text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]">
          <span className="text-ws-text-muted">{ctx.before}</span>
          <mark className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-0.5 text-ws-text">{ctx.match.trim() ? ctx.match : "␣"}</mark>
          <span className="text-ws-text-muted">{ctx.after}</span>
        </p>
      ) : (
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.finding.wholeDocument")}</p>
      )}
      <p className="text-[length:var(--ws-text-body-sm)]">{t(`letters.rule.${f.ruleId}.explain`, vars)}</p>
      <p className="text-[length:var(--ws-text-caption)] text-ws-success-ink">{t(`letters.rule.${f.ruleId}.example`)}</p>
      {f.replacement !== null ? (
        <p className="text-[length:var(--ws-text-caption)]">
          {t("letters.finding.fix", { from: f.excerpt.trim() || "␣", to: f.replacement.trim() || t("letters.finding.removeIt") })}
        </p>
      ) : null}
      {f.related?.length ? (
        <ul className="grid gap-1 text-[length:var(--ws-text-caption)]" aria-label={t("letters.finding.related")}>
          {f.related.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-ws-text-muted [overflow-wrap:anywhere]">«{(relatedText(a) ?? a.excerpt).slice(0, 120)}»</span>
              <Button size="sm" variant="ghost" onClick={() => actions.onGoTo(a)}>{t("letters.finding.goToRelated")}</Button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t("letters.finding.reference", { citation: ref.citation })} {t("letters.finding.unverified")}
      </p>
      <div className="flex flex-wrap gap-2">
        {f.blockId ? (
          <Button size="sm" variant="ghost" onClick={() => actions.onGoTo({ blockId: f.blockId!, start: f.start, end: f.end })}>{t("letters.finding.goTo")}</Button>
        ) : null}
        {f.replacement !== null && (caps.oneClick || caps.proposeOnRequest) ? (
          <Button size="sm" variant="spark" disabled={!canFix} title={fresh ? undefined : t("letters.finding.staleHint")} onClick={() => act()}>
            {caps.oneClick ? t("letters.finding.apply") : t("letters.finding.propose")}
          </Button>
        ) : null}
        {alternatives.length && (caps.oneClick || caps.proposeOnRequest)
          ? alternatives.map((s) => (
              <Button key={s} size="sm" variant="default" disabled={!canFix} onClick={() => act(s)}>{t("letters.finding.useAlternative", { text: s.trim() || "␣" })}</Button>
            ))
          : null}
        {SECTION_RULES.has(f.ruleId) ? <Button size="sm" variant="default" onClick={() => actions.onInsertSection(f)}>{t("letters.finding.insertSection")}</Button> : null}
        <Button size="sm" variant="ghost" aria-expanded={ignoring} onClick={() => setIgnoring((v) => !v)}>{t("letters.finding.ignore")}</Button>
      </div>
      {ignoring ? (
        <div className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-2">
          <Field label={t("letters.ignore.reason")}>
            {({ id }) => (
              <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as IgnoreReason)} options={IGNORE_REASONS.map((r) => ({ value: r, label: t(`letters.ignore.${r}`) }))} />
            )}
          </Field>
          <Field label={t("letters.ignore.note")} hint={t("letters.ignore.noteHint")}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => { actions.onIgnore(f, reason, note); setIgnoring(false); }}>{t("letters.ignore.confirm")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setIgnoring(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

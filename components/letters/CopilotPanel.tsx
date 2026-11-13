"use client";
import { useMemo, useState, type Ref } from "react";
import { Badge, Button, Card, Checkbox, Field, RadioCards, Select, Switch, Tabs, cn } from "@/components/ui";
import { AUTONOMY_MODES, type AutonomyMode } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import type { AnalysisResult } from "@/lib/letters/analyze";
import type { CopilotCaps } from "@/lib/letters/copilot";
import type { LetterPiece } from "@/lib/letters/pieces";
import type { RewriteProposal } from "@/lib/letters/rewrite";
import type { Anchor, CopilotTab, Finding } from "@/lib/letters/types";
import { FindingCard, type FindingActions } from "./FindingCard";
import { HeatMap } from "./HeatMap";
import { PosLegend, TokenTable } from "./MorphView";
import { DiffView, ProposalCard } from "./ProposalCard";
import { SEVERITY_ORDER } from "./shared";

const TABS: readonly CopilotTab[] = ["GRAMATICA", "MORFOSSINTAXE", "COERENCIA", "CITACOES"];

export interface BatchState {
  proposal: RewriteProposal;
  selected: ReadonlySet<string>;
}

export interface CopilotPanelProps {
  piece: LetterPiece;
  analysis: AnalysisResult | null;
  /** análise da revisão, política, gênero e idioma atuais */
  fresh: boolean;
  caps: CopilotCaps;
  /** análise automática aguardando a pausa da digitação */
  pending: boolean;
  onAnalyze: () => void;
  onModeChange: (mode: AutonomyMode) => void;
  findingActions: FindingActions;
  proposals: readonly RewriteProposal[];
  onAccept: (p: RewriteProposal) => void;
  onReject: (p: RewriteProposal) => void;
  onRecompute: (p: RewriteProposal) => void;
  staleReasonOf: (p: RewriteProposal) => string | null;
  batch: BatchState | null;
  onBatchOpen: () => void;
  onBatchToggle: (blockId: string) => void;
  onBatchConfirm: () => void;
  onBatchCancel: () => void;
  blockLabel: (blockId: string) => string;
  highlight: boolean;
  onHighlight: (v: boolean) => void;
  onReopen: (key: string) => void;
  onGoToBlock: (blockId: string) => void;
  status: { text: string; assertive: boolean } | null;
  headingRef: Ref<HTMLHeadingElement>;
}

const bySeverity = (a: Finding, b: Finding) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

/**
 * Painel lateral do Copiloto (região complementar nomeada, não modal — RF73.CA01): autonomia, análise, abas
 * Gramática · Morfossintaxe · Coerência · Citações, propostas ✦, lote com prévia (Assistido), placar e ignorados.
 */
export function CopilotPanel(props: CopilotPanelProps) {
  const { piece, analysis, fresh, caps } = props;
  const { t } = useI18n();
  const [tab, setTab] = useState<CopilotTab>("GRAMATICA");
  const [morphBlock, setMorphBlock] = useState<string>("");
  const ignored = useMemo(() => new Set(piece.ignored.map((i) => i.key)), [piece.ignored]);
  const findings = useMemo(() => (analysis && fresh ? analysis.findings.filter((f) => !ignored.has(f.key)) : []), [analysis, fresh, ignored]);
  const textOf = (blockId: string | null) => (blockId ? piece.blocks.find((b) => b.id === blockId)?.text ?? null : null);
  const relatedText = (a: Anchor) => {
    const text = textOf(a.blockId);
    return text ? text.slice(a.start, a.end) : null;
  };
  const showFindings = caps.enabled && analysis?.supported && fresh;
  const safe = findings.filter((f) => f.replacement !== null).length;
  const proseBlocks = analysis?.blocks.filter((b) => b.words > 0) ?? [];
  const selectedMorph = proseBlocks.find((b) => b.blockId === morphBlock) ?? proseBlocks[0];

  const list = (which: CopilotTab) => {
    const own = findings.filter((f) => f.tab === which).sort(bySeverity);
    if (!own.length) return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("letters.panel.noFindings")}</p>;
    return (
      <ul className="grid gap-2" aria-label={t(`letters.tab.${which}`)}>
        {own.map((f) => <FindingCard key={f.id} finding={f} blockText={textOf(f.blockId)} relatedText={relatedText} caps={caps} fresh={fresh} actions={props.findingActions} />)}
      </ul>
    );
  };

  return (
    <div className="grid gap-[var(--ws-space-3)]">
      <h2 ref={props.headingRef} tabIndex={-1} className="flex items-center gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        {t("letters.panel.title")}
      </h2>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.panel.honesty")}</p>

      <details open className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.mode.summary", { mode: t(`aiAutonomy.${piece.policy.mode}`) })}</summary>
        <div className="mt-2 grid gap-2">
          <RadioCards
            label={t("letters.mode.label")}
            value={piece.policy.mode}
            onValueChange={(v) => props.onModeChange(v as AutonomyMode)}
            columns={1}
            options={AUTONOMY_MODES.map((m) => ({ value: m, label: t(`aiAutonomy.${m}`), hint: t(`letters.mode.${m}`), disabled: m === "AGENTE" }))}
          />
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.mode.agentUnavailable")}</p>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.mode.policyVersion", { version: piece.policy.version })}</p>
        </div>
      </details>

      <div aria-live={props.status?.assertive ? "assertive" : "polite"} role={props.status?.assertive ? "alert" : "status"} className={cn("text-[length:var(--ws-text-body-sm)]", props.status?.assertive ? "text-ws-danger-ink" : "text-ws-text")}>
        {props.status?.text ?? ""}
      </div>

      {!caps.enabled ? (
        <Card tone="soft" padding="sm">
          <p className="text-[length:var(--ws-text-body-sm)]">{t("letters.panel.manual")}</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="spark" onClick={props.onAnalyze}>{analysis && !fresh ? t("letters.panel.reanalyze") : t("letters.panel.analyze")}</Button>
            {caps.batch ? (
              <Button size="sm" variant="default" disabled={!fresh || !safe} onClick={props.onBatchOpen}>{t("letters.batch.open", { count: safe })}</Button>
            ) : null}
          </div>
          {caps.autoAnalyze ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.panel.autoHint")}</p> : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.panel.onRequestHint")}</p>}
          {props.pending ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">{t("letters.panel.pending")}</p> : null}
          {!analysis ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("letters.panel.notYet")}</p> : null}
          {analysis && !fresh ? (
            <Card tone="soft" padding="sm" className="border-ws-warning">
              <p className="text-[length:var(--ws-text-body-sm)]">{t("letters.panel.stale", { old: analysis.revision, current: piece.revision })}</p>
            </Card>
          ) : null}
          {analysis && fresh && !analysis.supported ? (
            <Card tone="soft" padding="sm">
              <p className="text-[length:var(--ws-text-body-sm)]">{t("letters.panel.unsupported", { language: t(`letters.language.${analysis.language}`) })}</p>
            </Card>
          ) : null}
          {props.batch ? (
            <section aria-labelledby="letters-batch-title" className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-ai-spark bg-ws-ai-spark-soft p-2" data-testid="letters-batch">
              <h3 id="letters-batch-title" className="text-[length:var(--ws-text-body-sm)] font-semibold">✦ {t("letters.batch.title", { count: props.batch.proposal.changes.length })}</h3>
              <p className="text-[length:var(--ws-text-caption)]">{t("letters.batch.hint")}</p>
              <ul className="grid gap-2">
                {props.batch.proposal.previews.map((pv) => (
                  <li key={pv.blockId} className="grid gap-1">
                    <Checkbox checked={props.batch!.selected.has(pv.blockId)} onCheckedChange={() => props.onBatchToggle(pv.blockId)} label={t("letters.batch.include", { block: props.blockLabel(pv.blockId) })} />
                    <DiffView before={pv.before} after={pv.after} />
                  </li>
                ))}
              </ul>
              {props.batch.proposal.skipped.length ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.batch.skipped", { count: props.batch.proposal.skipped.length })}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="spark" data-testid="ai-btn-apply" disabled={!props.batch.selected.size} onClick={props.onBatchConfirm}>{t("letters.batch.confirm", { count: props.batch.selected.size })}</Button>
                <Button size="sm" variant="ghost" data-testid="ai-btn-reject" onClick={props.onBatchCancel}>{t("common.cancel")}</Button>
              </div>
            </section>
          ) : null}

          {props.proposals.length ? (
            <ul className="grid gap-2" aria-label={t("letters.proposal.list")}>
              {props.proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p} blockLabel={props.blockLabel} staleReason={props.staleReasonOf(p)} onAccept={() => props.onAccept(p)} onReject={() => props.onReject(p)} onRecompute={() => props.onRecompute(p)} />
              ))}
            </ul>
          ) : null}

          {showFindings && analysis ? (
            <>
              <p className="text-[length:var(--ws-text-body-sm)] text-ws-ai-spark-ink" data-testid="letters-summary">
                ✦ {t("letters.panel.summary", { total: findings.length, erro: findings.filter((f) => f.severity === "ERRO").length, aviso: findings.filter((f) => f.severity === "AVISO").length, sugestao: findings.filter((f) => f.severity === "SUGESTAO").length, safe, revision: analysis.revision })}
              </p>
              {analysis.coverage.truncated ? <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink">{t("letters.panel.coverage", { count: analysis.coverage.skippedBlockIds.length, limit: analysis.coverage.wordLimit })}</p> : null}

              <Tabs
                label={t("letters.panel.tabs")}
                param={null}
                value={tab}
                onChange={(s) => setTab(s as CopilotTab)}
                look="pills"
                tabs={TABS.map((x) => ({ slug: x, label: t(`letters.tab.${x}`), badge: <Badge tone="neutral" className="normal-case tracking-normal">{findings.filter((f) => f.tab === x).length}</Badge> }))}
              >
                {(active) => (
                  <div className="grid gap-3">
                    {active === "MORFOSSINTAXE" ? (
                      <>
                        <Switch checked={props.highlight} onCheckedChange={props.onHighlight} label={t("letters.morph.highlight")} hint={t("letters.morph.highlightHint")} />
                        <PosLegend counts={analysis.summary.posCounts} ambiguous={analysis.summary.ambiguousTokens} />
                        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.morph.disclaimer", { tagged: analysis.summary.taggedTokens, ambiguous: analysis.summary.ambiguousTokens })}</p>
                        {selectedMorph ? (
                          <>
                            <Field label={t("letters.morph.block")}>
                              {({ id }) => <Select id={id} value={selectedMorph.blockId} onChange={(e) => setMorphBlock(e.target.value)} options={proseBlocks.map((b) => ({ value: b.blockId, label: props.blockLabel(b.blockId) }))} />}
                            </Field>
                            <TokenTable tokens={selectedMorph.tokens} caption={t("letters.morph.tableCaption", { block: props.blockLabel(selectedMorph.blockId) })} />
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {active === "COERENCIA" && analysis.coherence ? (
                      <>
                        <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-2">
                          <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.coherence.connectives", { count: analysis.coherence.connectives.length })}</summary>
                          <ul className="mt-2 grid grid-cols-2 gap-1 text-[length:var(--ws-text-caption)]">
                            {Object.entries(analysis.coherence.byRelation).map(([rel, n]) => (
                              <li key={rel} className="flex justify-between gap-2"><span>{t(`letters.relation.${rel}`)}</span><span className="tabular-nums">{n}</span></li>
                            ))}
                          </ul>
                        </details>
                        {analysis.coherence.sections.length ? (
                          <ul className="grid gap-1 text-[length:var(--ws-text-caption)]" aria-label={t("letters.coherence.sections", { docType: t(`letters.docType.${piece.docType}`) })}>
                            {analysis.coherence.sections.map((s) => (
                              <li key={s.key} className="flex items-center gap-2">
                                <Badge tone={!s.present ? "danger" : s.empty ? "warning" : "success"} className="normal-case tracking-normal">{t(!s.present ? "letters.coherence.missing" : s.empty ? "letters.coherence.empty" : "letters.coherence.present")}</Badge>
                                <span>{t(piece.docType === "OFICIO" ? `letters.oficio.${s.key}` : `letters.section.${s.key}`)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.coherence.genreNote", { genre: t(`letters.genre.${piece.genre}`) })}</p>
                      </>
                    ) : null}
                    {active === "CITACOES" && analysis.citations ? (
                      <>
                        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.citations.style", { style: t(`letters.citations.styleName.${analysis.citations.style}`), citations: analysis.citations.citations.length, references: analysis.citations.references.length })}</p>
                        {analysis.citations.citations.length ? (
                          <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
                            <table className="w-full text-left text-[length:var(--ws-text-caption)]">
                              <caption className="sr-only">{t("letters.citations.tableCaption")}</caption>
                              <thead className="bg-ws-surface-2">
                                <tr>
                                  <th scope="col" className="px-2 py-1">{t("letters.citations.colCall")}</th>
                                  <th scope="col" className="px-2 py-1">{t("letters.citations.colStatus")}</th>
                                  <th scope="col" className="px-2 py-1">{t("letters.citations.colSource")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysis.citations.citations.map((c) => (
                                  <tr key={c.id} className="border-t border-ws-border">
                                    <th scope="row" className="px-2 py-1 font-normal">{c.raw}</th>
                                    <td className="px-2 py-1"><Badge tone={c.status === "REFERENCIADA" ? "success" : "danger"} className="normal-case tracking-normal">{t(`letters.citations.status.${c.status}`)}</Badge></td>
                                    <td className="px-2 py-1 text-ws-text-muted">{t("letters.citations.sourceUnverified")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {list(active as CopilotTab)}
                  </div>
                )}
              </Tabs>

              <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-2">
                <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.heat.title")}</summary>
                <div className="mt-2">
                  <HeatMap scores={analysis.scores} blockLabel={props.blockLabel} onGoTo={props.onGoToBlock} />
                </div>
              </details>
            </>
          ) : null}
        </>
      )}

      {piece.ignored.length ? (
        <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-2">
          <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.ignore.listTitle", { count: piece.ignored.length })}</summary>
          <ul className="mt-2 grid gap-2">
            {piece.ignored.map((i) => (
              <li key={i.key} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)]">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{t(`letters.rule.${i.ruleId}.title`)}</span> · «{i.excerpt.trim() || "␣"}» · {t(`letters.ignore.${i.reason}`)}
                  {i.note ? ` · ${i.note}` : ""}
                </span>
                <Button size="sm" variant="ghost" onClick={() => props.onReopen(i.key)}>{t("letters.ignore.reopen")}</Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

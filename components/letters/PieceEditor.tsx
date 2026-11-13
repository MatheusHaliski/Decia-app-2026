"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, Field, Input, LoadingState, Select } from "@/components/ui";
import { evaluateAiAction, type AutonomyMode } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { analyzeDocument, type AnalysisResult } from "@/lib/letters/analyze";
import { AUTO_ANALYZE_DELAY_MS, acceptProposal, applyBatch, copilotCaps, proposalState, type AcceptDenial } from "@/lib/letters/copilot";
import { LETTERS_DEMO_USER } from "@/lib/letters/fixtures";
import {
  changePieceMode, editBlockText, ignoreFinding, insertBlock, insertSection, moveBlock, paragraphNumbers, removeBlock, rename, reopenFinding,
  restoreVersion, setBlockKind, setGenre, setLanguage, undo, type LetterPiece, type PieceResult,
} from "@/lib/letters/pieces";
import { demoLettersRepository, useLetterPiece, type LettersRepository } from "@/lib/letters/repository";
import { buildProposal, type RewriteProposal } from "@/lib/letters/rewrite";
import type { BlockScore } from "@/lib/letters/score";
import { EXPECTED_SECTIONS } from "@/lib/letters/coherence";
import { SECTION_HEADINGS } from "@/lib/letters/templates";
import { TEXT_GENRES, TEXT_LANGUAGES, type BlockKind, type Finding, type IgnoreReason, type TaggedToken, type TextGenre, type TextLanguage } from "@/lib/letters/types";
import { BlockList } from "./BlockList";
import { CopilotPanel, type BatchState } from "./CopilotPanel";
import type { FindingActions } from "./FindingCard";
import { HistoryCard } from "./HistoryCard";
import { useMounted } from "./useMounted";

const run = (p: LetterPiece): AnalysisResult =>
  analyzeDocument(p.blocks, { revision: p.revision, policyVersion: p.policy.version, genre: p.genre, docType: p.docType, language: p.language });
const isFresh = (a: AnalysisResult | null, p: LetterPiece) =>
  !!a && a.revision === p.revision && a.policyVersion === p.policy.version && a.genre === p.genre && a.language === p.language && a.docType === p.docType;

/**
 * Editor da peça Letters com o Copiloto linguístico e narrativo (RF52 mínimo, RF53, RF54; autonomia RF51; painel RF73).
 * O editor e a seleção ficam visíveis com o painel aberto; abrir o painel não dispara análise. Dados DEMO.
 */
export function PieceEditor({ pieceId, repo = demoLettersRepository() }: { pieceId: string; repo?: LettersRepository }) {
  const mounted = useMounted();
  if (!mounted) return <LoadingState />;
  return <Editor pieceId={pieceId} repo={repo} />;
}

function Editor({ pieceId, repo }: { pieceId: string; repo: LettersRepository }) {
  const { t } = useI18n();
  const piece = useLetterPiece(pieceId, repo);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [proposals, setProposals] = useState<RewriteProposal[]>([]);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [status, setStatus] = useState<{ text: string; assertive: boolean } | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusCard = useRef<string | null>(null);
  const actor = LETTERS_DEMO_USER;

  const caps = useMemo(() => (piece ? copilotCaps(piece.policy) : null), [piece]);
  const fresh = !!piece && isFresh(analysis, piece);

  // Sugestões/Assistido: analisa sozinho depois de uma pausa (nunca a cada tecla — RF53.CA06)
  useEffect(() => {
    if (!piece || !caps?.autoAnalyze || isFresh(analysis, piece)) return;
    const id = window.setTimeout(() => setAnalysis(run(piece)), AUTO_ANALYZE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [piece, caps, analysis]);

  // foco no cartão da proposta recém-criada (RF73: proposta pronta → cartão)
  useEffect(() => {
    if (!focusCard.current) return;
    document.querySelector<HTMLElement>(`[data-testid="ai-suggestion-card-${focusCard.current}"]`)?.focus();
    focusCard.current = null;
  }, [proposals]);

  const announce = useCallback((text: string, assertive = false) => setStatus({ text, assertive }), []);
  const denial = useCallback((reason: AcceptDenial | string, vars: Record<string, string | number> = {}) => t(`letters.denial.${reason}`, vars), [t]);

  const focusText = useCallback((blockId: string, start: number, end: number) => {
    const el = refs.current.get(blockId);
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, []);

  if (!piece || !caps) {
    return (
      <EmptyState
        moji="vazio"
        title={t("letters.editor.notFound")}
        description={t("letters.editor.notFoundHint", { code: "404 NAO_ENCONTRADO" })}
        action={<Button href="/letters" variant="primary">{t("letters.editor.backToList")}</Button>}
      />
    );
  }

  const numbers = paragraphNumbers(piece.blocks);
  const blockLabel = (blockId: string) => {
    const index = piece.blocks.findIndex((b) => b.id === blockId) + 1;
    const b = piece.blocks[index - 1];
    if (!b) return blockId;
    if (b.kind === "TITULO") return t("letters.block.labelTitle", { index, level: b.level ?? 2 });
    const n = numbers.get(b.id);
    return n ? t("letters.block.labelNumbered", { index, n, kind: t(`letters.blockKind.${b.kind}`) }) : t("letters.block.labelPlain", { index, kind: t(`letters.blockKind.${b.kind}`) });
  };
  const save = (r: PieceResult, okText?: string) => {
    if (!r.ok) {
      if (r.error !== "SEM_ALTERACAO") announce(denial(r.error), true);
      return null;
    }
    repo.save(r.piece);
    if (okText) announce(okText);
    return r.piece;
  };
  const now = () => new Date();

  /* ── Copiloto ──────────────────────────────────────────────────────────────────────────────────────────── */

  const analyzeNow = () => {
    const v = evaluateAiAction(piece.policy, "RESPONDER", { requestedByUser: true });
    if (!v.ok) return announce(denial(v.reason), true);
    const r = run(piece);
    setAnalysis(r);
    announce(r.supported ? t("letters.status.analyzed", { count: r.findings.filter((f) => !piece.ignored.some((i) => i.key === f.key)).length, revision: r.revision }) : t("letters.panel.unsupported", { language: t(`letters.language.${r.language}`) }));
  };

  const proposalFor = (findings: Finding[], kind: RewriteProposal["kind"], chosen?: Record<string, string>) =>
    buildProposal({ findings, blocks: piece.blocks, revision: analysis?.revision ?? piece.revision, policyVersion: analysis?.policyVersion ?? piece.policy.version, kind, now: now(), chosen });

  const finishAccept = (next: LetterPiece, p: RewriteProposal, text: string) => {
    repo.save(next);
    announce(text);
    const first = p.changes[0];
    if (first) window.setTimeout(() => focusText(first.blockId, first.start, first.start + first.after.length), 0);
  };

  const findingActions: FindingActions = {
    onGoTo: (a) => focusText(a.blockId, a.start, a.end),
    onApply: (f, chosen) => {
      const v = evaluateAiAction(piece.policy, "PROPOR_ALTERACAO", { requestedByUser: false });
      if (!v.ok) return announce(denial(v.reason), true);
      const p = proposalFor([f], "ACHADO", chosen !== undefined ? { [f.id]: chosen } : undefined);
      if (!p.changes.length) return announce(t("letters.status.nothingToApply"), true);
      const r = acceptProposal(piece, p, actor, now());
      if (!r.ok) return announce(denial(r.reason, { base: p.baseRevision, current: piece.revision }), true);
      finishAccept(r.piece, p, t("letters.status.applied", { revision: r.piece.revision }));
    },
    onPropose: (f, chosen) => {
      const v = evaluateAiAction(piece.policy, "PROPOR_ALTERACAO", { requestedByUser: true });
      if (!v.ok) return announce(denial(v.reason), true);
      const p = proposalFor([f], "ACHADO", chosen !== undefined ? { [f.id]: chosen } : undefined);
      if (!p.changes.length) return announce(t("letters.status.nothingToApply"), true);
      focusCard.current = p.id;
      setProposals((list) => [p, ...list.filter((x) => x.id !== p.id)]);
      announce(t("letters.status.proposalReady"));
    },
    onIgnore: (f: Finding, reason: IgnoreReason, note: string) => {
      repo.save(ignoreFinding(piece, f, reason, now(), note));
      announce(t("letters.status.ignored", { reason: t(`letters.ignore.${reason}`) }));
    },
    onInsertSection: (f) => {
      const key = String(f.vars.section ?? "");
      const heading = SECTION_HEADINGS[key];
      if (!heading) return;
      const expected = EXPECTED_SECTIONS[piece.docType];
      const idx = expected.findIndex((e) => e.key === key);
      const before = analysis?.coherence?.sections.slice(idx + 1).find((s) => s.present && s.blockId)?.blockId ?? null;
      save(insertSection(piece, heading, before, now()), t("letters.status.sectionInserted", { section: t(`letters.section.${key}`) }));
    },
  };

  const onAccept = (p: RewriteProposal) => {
    const r = acceptProposal(piece, p, actor, now());
    if (!r.ok) return announce(denial(r.reason, { base: p.baseRevision, current: piece.revision }), true);
    setProposals((list) => list.filter((x) => x.id !== p.id));
    finishAccept(r.piece, p, t("letters.status.applied", { revision: r.piece.revision }));
  };
  const onReject = (p: RewriteProposal) => {
    setProposals((list) => list.filter((x) => x.id !== p.id));
    announce(t("letters.status.rejected"));
    const first = p.changes[0];
    if (first) focusText(first.blockId, first.start, first.end);
  };
  const onRecompute = (p: RewriteProposal) => {
    setProposals((list) => list.filter((x) => x.id !== p.id));
    analyzeNow();
  };
  const staleReasonOf = (p: RewriteProposal) => {
    const s = proposalState(piece, p);
    return s.valid ? null : denial(s.reason, { base: p.baseRevision, current: piece.revision });
  };

  const onModeChange = (mode: AutonomyMode) => {
    const r = changePieceMode(piece, actor, mode, now());
    if (!r.ok) return announce(denial(r.reason), true);
    repo.save(r.piece);
    setBatch(null);
    announce(t("letters.status.modeChanged", { mode: t(`aiAutonomy.${mode}`), version: r.piece.policy.version }));
  };

  const onBatchOpen = () => {
    if (!analysis || !fresh) return;
    const visible = analysis.findings.filter((f) => !piece.ignored.some((i) => i.key === f.key) && f.replacement !== null);
    const p = proposalFor(visible, "LOTE");
    setBatch({ proposal: p, selected: new Set(p.targetIds) });
    announce(t("letters.status.batchReady", { count: p.changes.length }));
  };
  const onBatchToggle = (blockId: string) =>
    setBatch((b) => {
      if (!b) return b;
      const selected = new Set(b.selected);
      if (selected.has(blockId)) selected.delete(blockId);
      else selected.add(blockId);
      return { ...b, selected };
    });
  const onBatchConfirm = () => {
    if (!batch) return;
    const r = applyBatch(piece, batch.proposal, batch.selected, actor, now());
    if (!r.ok) return announce(denial(r.reason, { base: batch.proposal.baseRevision, current: piece.revision }), true);
    setBatch(null);
    finishAccept(r.piece, batch.proposal, t("letters.status.batchApplied", { count: batch.proposal.changes.filter((c) => batch.selected.has(c.blockId)).length, revision: r.piece.revision }));
  };

  /* ── Editor (comandos determinísticos: nunca chamam a IA — RF73.CA02) ─────────────────────────────────── */

  const onEdit = (blockId: string, text: string) => save(editBlockText(piece, blockId, text, now()));
  const onInsert = (afterId: string) => {
    const r = insertBlock(piece, afterId, "PARAGRAFO", now());
    const next = save(r, t("letters.status.blockInserted"));
    if (next && r.blockId) window.setTimeout(() => refs.current.get(r.blockId!)?.focus(), 0);
  };
  const onMove = (blockId: string, dir: -1 | 1) => save(moveBlock(piece, blockId, dir, now()), t("letters.status.blockMoved"));
  const onRemove = (blockId: string) => save(removeBlock(piece, blockId, now()), t("letters.status.blockRemoved"));
  const onKind = (blockId: string, kind: BlockKind) => save(setBlockKind(piece, blockId, kind, now()));
  const onUndo = () => {
    const next = save(undo(piece, now()));
    if (next) announce(t("letters.status.undone", { revision: next.revision }));
  };
  const onRestore = (revision: number) => {
    const next = save(restoreVersion(piece, revision, now()));
    if (next) announce(t("letters.status.restored", { from: revision, revision: next.revision }));
  };

  const togglePanel = () => {
    const open = !panelOpen;
    setPanelOpen(open);
    window.setTimeout(() => (open ? headingRef.current?.focus() : document.getElementById("letters-copilot-toggle")?.focus()), 0);
  };

  const scores = new Map<string, BlockScore>(fresh && analysis ? analysis.scores.map((s) => [s.blockId, s]) : []);
  const gloss = highlight && fresh && analysis?.supported ? new Map<string, TaggedToken[]>(analysis.blocks.map((b) => [b.blockId, b.tokens])) : null;

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <div className="flex flex-wrap items-end gap-[var(--ws-space-3)] rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
        <Field label={t("letters.editor.title")} className="min-w-56 flex-1">
          {({ id }) => <Input id={id} defaultValue={piece.title} key={piece.id} onBlur={(e) => { if (e.target.value.trim() !== piece.title) save(rename(piece, e.target.value, now()), t("letters.status.renamed")); }} />}
        </Field>
        <Field label={t("letters.editor.genre")} className="w-44">
          {({ id }) => <Select id={id} value={piece.genre} onChange={(e) => repo.save(setGenre(piece, e.target.value as TextGenre))} options={TEXT_GENRES.map((g) => ({ value: g, label: t(`letters.genre.${g}`) }))} />}
        </Field>
        <Field label={t("letters.editor.language")} className="w-44">
          {({ id }) => <Select id={id} value={piece.language} onChange={(e) => repo.save(setLanguage(piece, e.target.value as TextLanguage))} options={TEXT_LANGUAGES.map((l) => ({ value: l, label: t(`letters.language.${l}`) }))} />}
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" className="normal-case tracking-normal">{t(`letters.docType.${piece.docType}`)}</Badge>
          <Badge tone="accent" className="normal-case tracking-normal" title={t("letters.editor.revisionHint")}>{t("letters.history.revision", { revision: piece.revision })}</Badge>
          <Badge tone="warning" title={t("letters.demoHint")}>{t("letters.demo")}</Badge>
          <Button id="letters-copilot-toggle" size="sm" variant={panelOpen ? "default" : "spark"} aria-expanded={panelOpen} aria-controls="letters-copilot" data-testid="editor-cmd-toggle-ai" onClick={togglePanel}>
            {panelOpen ? t("letters.editor.hideCopilot") : t("letters.editor.showCopilot")}
          </Button>
        </div>
      </div>

      <div className={panelOpen ? "grid items-start gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]" : "grid gap-[var(--ws-space-4)]"}>
        <section aria-label={t("letters.editor.region")} className="grid min-w-0 gap-[var(--ws-space-4)]">
          <BlockList blocks={piece.blocks} label={blockLabel} scores={scores} gloss={gloss} refs={refs} onEdit={onEdit} onInsert={onInsert} onMove={onMove} onRemove={onRemove} onKind={onKind} />
          <HistoryCard piece={piece} onUndo={onUndo} onRestore={onRestore} />
        </section>
        <aside id="letters-copilot" aria-labelledby="letters-copilot-title" hidden={!panelOpen} className="min-w-0 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] lg:sticky lg:top-[calc(var(--ws-shell-header)+var(--ws-space-3))] lg:max-h-[calc(100dvh-var(--ws-shell-header)-var(--ws-space-6))] lg:overflow-y-auto">
          <span id="letters-copilot-title" className="sr-only">{t("letters.panel.title")}</span>
          <CopilotPanel
            piece={piece}
            analysis={analysis}
            fresh={fresh}
            caps={caps}
            pending={caps.autoAnalyze && !fresh}
            onAnalyze={analyzeNow}
            onModeChange={onModeChange}
            findingActions={findingActions}
            proposals={proposals}
            onAccept={onAccept}
            onReject={onReject}
            onRecompute={onRecompute}
            staleReasonOf={staleReasonOf}
            batch={batch}
            onBatchOpen={onBatchOpen}
            onBatchToggle={onBatchToggle}
            onBatchConfirm={onBatchConfirm}
            onBatchCancel={() => setBatch(null)}
            blockLabel={blockLabel}
            highlight={highlight}
            onHighlight={setHighlight}
            onReopen={(key) => repo.save(reopenFinding(piece, key))}
            onGoToBlock={(id) => focusText(id, 0, 0)}
            status={status}
            headingRef={headingRef}
          />
        </aside>
      </div>
    </div>
  );
}

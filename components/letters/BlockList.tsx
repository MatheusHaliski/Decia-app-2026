"use client";
import type { MutableRefObject } from "react";
import { Badge, Button, Field, Select, Textarea, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { BlockScore } from "@/lib/letters/score";
import { BLOCK_KINDS, type BlockKind, type LetterBlock, type TaggedToken } from "@/lib/letters/types";
import { TokenGloss } from "./MorphView";
import { HEAT_TONE } from "./shared";

export interface BlockListProps {
  blocks: readonly LetterBlock[];
  label: (blockId: string) => string;
  scores: ReadonlyMap<string, BlockScore>;
  /** tokens etiquetados por bloco (só com a análise atual e o realce ligado) */
  gloss: ReadonlyMap<string, TaggedToken[]> | null;
  refs: MutableRefObject<Map<string, HTMLTextAreaElement>>;
  onEdit: (blockId: string, text: string) => void;
  onInsert: (afterId: string) => void;
  onMove: (blockId: string, dir: -1 | 1) => void;
  onRemove: (blockId: string) => void;
  onKind: (blockId: string, kind: BlockKind) => void;
}

/**
 * Editor estruturado por blocos (RF52 mínimo): título, parágrafo, lista, citação e referências, cada um num Textarea
 * do design system com rótulo, numeração de parágrafo e comandos acessíveis por teclado (mover, inserir, remover).
 */
export function BlockList({ blocks, label, scores, gloss, refs, onEdit, onInsert, onMove, onRemove, onKind }: BlockListProps) {
  const { t } = useI18n();
  return (
    <ol className="grid gap-[var(--ws-space-3)]" aria-label={t("letters.editor.blocks")}>
      {blocks.map((b, i) => {
        const name = label(b.id);
        const score = scores.get(b.id);
        const tokens = gloss?.get(b.id);
        return (
          <li key={b.id} className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-block-id={b.id}>
            <Field label={name} hint={b.kind === "LISTA" || b.kind === "REFERENCIAS" ? t(`letters.block.lineHint.${b.kind}`) : undefined}>
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  ref={(el) => {
                    if (el) refs.current.set(b.id, el);
                    else refs.current.delete(b.id);
                  }}
                  value={b.text}
                  placeholder={b.hintKey ? t(b.hintKey) : t(`letters.block.placeholder.${b.kind}`)}
                  onChange={(e) => onEdit(b.id, e.target.value)}
                  rows={b.kind === "TITULO" ? 1 : b.kind === "PARAGRAFO" ? 4 : 3}
                  spellCheck
                  lang="pt-BR"
                  className={cn(b.kind === "TITULO" && "min-h-0 font-[family-name:var(--ws-font-display)] font-semibold", b.kind === "TITULO" && b.level === 1 && "text-[length:var(--ws-text-h2)]", b.kind === "CITACAO" && "border-l-4 border-l-ws-border-strong pl-4 italic")}
                />
              )}
            </Field>
            {tokens ? <TokenGloss tokens={tokens} label={t("letters.morph.glossLabel", { block: name })} /> : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {score && score.words > 0 ? (
                <Badge tone={HEAT_TONE[score.level]} className="normal-case tracking-normal" title={t("letters.heat.badgeHint")}>
                  {t("letters.heat.badge", { level: t(`letters.heat.level.${score.level}`), count: score.findings })}
                </Badge>
              ) : null}
              <span className="flex-1" />
              <span className="w-40">
                <Select
                  aria-label={t("letters.block.kindLabel", { block: name })}
                  value={b.kind}
                  onChange={(e) => onKind(b.id, e.target.value as BlockKind)}
                  options={BLOCK_KINDS.map((k) => ({ value: k, label: t(`letters.blockKind.${k}`) }))}
                  className="min-h-[var(--ws-control-sm)] text-[length:var(--ws-text-body-sm)]"
                />
              </span>
              <Button size="sm" variant="ghost" aria-label={t("letters.block.moveUp", { block: name })} disabled={i === 0} onClick={() => onMove(b.id, -1)}>↑</Button>
              <Button size="sm" variant="ghost" aria-label={t("letters.block.moveDown", { block: name })} disabled={i === blocks.length - 1} onClick={() => onMove(b.id, 1)}>↓</Button>
              <Button size="sm" variant="ghost" aria-label={t("letters.block.insertBelow", { block: name })} onClick={() => onInsert(b.id)}>{t("letters.block.insert")}</Button>
              <Button size="sm" variant="ghost" aria-label={t("letters.block.remove", { block: name })} disabled={blocks.length <= 1} onClick={() => onRemove(b.id)}>{t("letters.block.removeShort")}</Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

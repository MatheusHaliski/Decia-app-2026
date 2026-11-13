"use client";
import { Badge, Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { diffWords, type RewriteProposal } from "@/lib/letters/rewrite";

/** Diff inline: removido riscado, adicionado sublinhado (marca + cor + texto para leitor de tela). */
export function DiffView({ before, after }: { before: string; after: string }) {
  const { t } = useI18n();
  return (
    <p className="rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1 text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]">
      {diffWords(before, after).map((p, i) =>
        p.type === "igual" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "removido" ? (
          <del key={i} className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-0.5 text-ws-danger-ink">
            <span className="sr-only">{t("letters.diff.removed")} </span>
            {p.text}
          </del>
        ) : (
          <ins key={i} className="rounded-[var(--ws-radius-sm)] bg-ws-success-soft px-0.5 text-ws-success-ink underline">
            <span className="sr-only">{t("letters.diff.added")} </span>
            {p.text}
          </ins>
        ),
      )}
    </p>
  );
}

/**
 * Proposta ✦ do copiloto (RF73.CA03): original × prévia no diff, aceitar ou rejeitar. Desatualizada (outra revisão ou
 * política) continua visível com o motivo; o aceite é recusado e dá para recalcular sobre a revisão atual.
 */
export function ProposalCard({ proposal, blockLabel, staleReason, onAccept, onReject, onRecompute }: {
  proposal: RewriteProposal;
  blockLabel: (blockId: string) => string;
  staleReason: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRecompute: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card as="li" padding="sm" className="grid gap-2 border-ws-ai-spark bg-ws-ai-spark-soft" data-testid={`ai-suggestion-card-${proposal.id}`} data-origin="IA" tabIndex={-1}>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <Badge tone="spark">{t("letters.proposal.badge")}</Badge>
        <span className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] font-semibold">
          {t("letters.proposal.title", { count: proposal.changes.length, revision: proposal.baseRevision })}
        </span>
        {staleReason ? <Badge tone="warning">{t("letters.proposal.stale")}</Badge> : null}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-ai-spark-ink">✦ {t("letters.proposal.onlyRules")}</p>
      {proposal.previews.map((pv) => (
        <div key={pv.blockId} className="grid gap-1">
          <p className="text-[length:var(--ws-text-caption)] font-semibold">{blockLabel(pv.blockId)}</p>
          <DiffView before={pv.before} after={pv.after} />
        </div>
      ))}
      {staleReason ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{staleReason}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="spark" data-testid="ai-btn-apply" onClick={onAccept}>{t("letters.proposal.accept")}</Button>
        <Button size="sm" variant="ghost" data-testid="ai-btn-reject" onClick={onReject}>{t("letters.proposal.reject")}</Button>
        {staleReason ? <Button size="sm" variant="default" onClick={onRecompute}>{t("letters.proposal.recompute")}</Button> : null}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.proposal.humanDecides")}</p>
    </Card>
  );
}

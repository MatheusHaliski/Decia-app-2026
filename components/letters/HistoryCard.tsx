"use client";
import { Badge, Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { canUndo, type LetterPiece } from "@/lib/letters/pieces";

/** Histórico de versões da peça com desfazer e restaurar (cada um vira uma revisão nova; nada se perde). */
export function HistoryCard({ piece, onUndo, onRestore }: { piece: LetterPiece; onUndo: () => void; onRestore: (revision: number) => void }) {
  const { t, intl } = useI18n();
  const fmt = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" });
  const versions = [...piece.history].reverse().slice(0, 20);
  return (
    <Card
      title={t("letters.history.title")}
      eyebrow="RF52"
      actions={<Button size="sm" variant="default" onClick={onUndo} disabled={!canUndo(piece)} data-testid="editor-cmd-undo">{t("letters.history.undo")}</Button>}
    >
      <ol className="grid gap-1.5" aria-label={t("letters.history.list")}>
        {versions.map((v) => {
          const current = v.revision === piece.revision;
          return (
            <li key={v.revision} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
              <Badge tone={current ? "accent" : "neutral"} className="normal-case tracking-normal">{t("letters.history.revision", { revision: v.revision })}</Badge>
              <span className="min-w-0 flex-1">
                {t(`letters.history.${v.summary}`, { ...(v.vars ?? {}), kind: v.vars?.kind ? t(`letters.blockKind.${v.vars.kind}`) : "", docType: v.vars?.docType ? t(`letters.docType.${v.vars.docType}`) : "" })}
                <span className="text-ws-text-muted"> · {t(`letters.origin.${v.origin}`)} · {fmt.format(new Date(v.at))}</span>
              </span>
              {current ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.history.current")}</span> : <Button size="sm" variant="ghost" onClick={() => onRestore(v.revision)}>{t("letters.history.restore")}</Button>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

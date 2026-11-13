"use client";
/**
 * Ganho de DECIA Points mostrado com discrição (DECIA_SESSAO_E_MESA §E.3): uma linha pequena, só para quem recebeu, com o motivo
 * em texto — sem placar, sem ranking, sem contador público. Quando não contou (teto, repetida, sem fonte), diz por quê.
 */
import { Glyph } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { PointsNote } from "@/lib/decia/session/types";

export function PointsLine({ note, viewerId }: { note: PointsNote; viewerId?: string }) {
  const { t } = useI18n();
  if (viewerId && note.userId !== viewerId) return null;
  const event = t(`session.points.event.${note.event}`);
  const text = note.status === "CREDITADO"
    ? t("session.points.credited", { n: note.delta ?? 0, event })
    : note.status === "NAO_CONFIRMADO" && note.reason
      ? t("session.points.notConfirmed", { event, reason: t(`session.points.reason.${note.reason}`) })
      : t(`session.points.status.${note.status}`, { event });
  return (
    <p className="flex items-center gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="points-line">
      <Glyph name="decia-points" size={14} decorative />
      <span>{text}</span>
    </p>
  );
}

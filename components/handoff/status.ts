/** Estado do dossiê na tela: tom e marca (o estado nunca só por cor — o texto vem junto). */
import type { Tone } from "@/components/ui";
import type { HandoffStatus } from "@/lib/handoff/types";

export const STATUS_TONE: Record<HandoffStatus, Tone> = { GERADO: "info", AGUARDANDO_SUCESSOR: "warning", TRANSFERIDO: "success", RECUSADO: "danger", CANCELADO: "neutral" };
export const STATUS_MARK: Record<HandoffStatus, string> = { GERADO: "●", AGUARDANDO_SUCESSOR: "◐", TRANSFERIDO: "✓", RECUSADO: "✕", CANCELADO: "–" };

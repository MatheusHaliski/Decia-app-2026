/**
 * Doação de DECIA Points a um colega (RF42 UC7, CA09: `PointsDonation` com limite mensal). Duas linhas no razão — DOACAO_ENVIADA
 * (débito do doador) e DOACAO_RECEBIDA (crédito do colega) — com a mesma referência; o doador não ganha nada por doar. Limite
 * padrão de 50 DP por mês (`donationMonthlyLimit`, docs/produto/DECIA_POINTS.md §5.3; a EMPRESA ajusta quando a API de regras
 * existir). Mês em UTC, como os tetos do razão. Os registros vivem com o razão DEMO desta aba.
 */
import type { PointsEntry, PointsLedger } from "./ledger";

export const DONATION_MONTHLY_LIMIT = 50;
export const DONATION_MESSAGE_MAX = 140;

export type DonationError = "VALOR_INVALIDO" | "DESTINATARIO_INVALIDO" | "PARA_SI_MESMO" | "LIMITE_ESGOTADO" | "SALDO_INSUFICIENTE" | "DUPLICADO" | "REGRA_INATIVA";

export interface DonationInput {
  /** identificador da doação (idempotência: o mesmo id nunca debita duas vezes) */
  id: string;
  fromId: string;
  toId: string;
  points: number;
  message?: string | null;
}

export interface DonationRecord {
  id: string;
  fromId: string;
  toId: string;
  points: number;
  message: string | null;
  at: string;
  debitId: string;
  creditId: string;
}

export type DonationResult =
  | { ok: true; record: DonationRecord; remaining: number }
  | { ok: false; reason: DonationError; remaining: number };

const monthOf = (iso: string) => iso.slice(0, 7);

/** Quanto a pessoa já doou no mês de `now`. */
export function donatedInMonth(entries: readonly PointsEntry[], now: Date): number {
  const month = monthOf(now.toISOString());
  return entries.reduce((sum, e) => (e.event === "DOACAO_ENVIADA" && monthOf(e.at) === month ? sum - e.delta : sum), 0);
}

/** Quanto ainda pode doar no mês (nunca negativo). */
export function donationAllowance(ledger: PointsLedger, fromId: string, now: Date, limit = DONATION_MONTHLY_LIMIT): number {
  return Math.max(0, limit - donatedInMonth(ledger.entries(fromId), now));
}

export interface DonationService {
  donate(input: DonationInput, now?: Date): DonationResult;
  /** doações enviadas e recebidas pela pessoa, da mais nova para a mais antiga */
  history(userId: string): readonly DonationRecord[];
  allowance(fromId: string, now?: Date): number;
}

export function createDonationService(ledger: PointsLedger, limit = DONATION_MONTHLY_LIMIT): DonationService {
  const records: DonationRecord[] = [];
  return {
    allowance: (fromId, now = new Date()) => donationAllowance(ledger, fromId, now, limit),
    history: (userId) => records.filter((r) => r.fromId === userId || r.toId === userId).slice().reverse(),
    donate(input, now = new Date()) {
      const remaining = donationAllowance(ledger, input.fromId, now, limit);
      const points = Number(input.points);
      if (!Number.isInteger(points) || points <= 0 || points > limit) return { ok: false, reason: "VALOR_INVALIDO", remaining };
      if (!input.toId.trim()) return { ok: false, reason: "DESTINATARIO_INVALIDO", remaining };
      if (input.toId === input.fromId) return { ok: false, reason: "PARA_SI_MESMO", remaining };
      if (records.some((r) => r.id === input.id)) return { ok: false, reason: "DUPLICADO", remaining };
      if (points > remaining) return { ok: false, reason: "LIMITE_ESGOTADO", remaining };
      // sem a regra de crédito ativa, nada é debitado (o colega não receberia)
      if (!ledger.rules().DOACAO_RECEBIDA.active) return { ok: false, reason: "REGRA_INATIVA", remaining };
      const message = input.message?.trim().slice(0, DONATION_MESSAGE_MAX) || null;
      const ref = { type: "doacao", id: input.id };
      const debit = ledger.spend({ userId: input.fromId, event: "DOACAO_ENVIADA", points, ref, note: message }, now);
      if (!debit.ok) return { ok: false, reason: debit.reason === "SALDO_INSUFICIENTE" ? "SALDO_INSUFICIENTE" : debit.reason === "DUPLICADO" ? "DUPLICADO" : "VALOR_INVALIDO", remaining };
      const credit = ledger.award({ userId: input.toId, event: "DOACAO_RECEBIDA", points, ref, note: message }, now);
      const record: DonationRecord = {
        id: input.id, fromId: input.fromId, toId: input.toId, points, message, at: now.toISOString(),
        debitId: debit.entry.id, creditId: credit.ok ? credit.entry.id : "",
      };
      records.push(record);
      return { ok: true, record, remaining: remaining - points };
    },
  };
}

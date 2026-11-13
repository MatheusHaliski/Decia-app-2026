/**
 * Métricas dos pactos (RF49.CA12) — determinísticas, só de pactos que a pessoa pode ver, sempre AGREGADAS (sem placar
 * individual). Mediana e p90 (posto mais próximo) da espera até o primeiro compromisso e até a validação, com o tamanho da
 * amostra; devoluções, renegociações, desbloqueios confirmados e casos abertos/recusados/cancelados ficam visíveis. Sem dados é
 * `null` ("sem dados"), nunca zero. "Atraso evitado" não é calculado: seria estimativa contrafactual, não resultado comprovado.
 */
import { PACT_STATES, type CooperationPact, type PactStatus } from "./types";

const DAY = 86_400_000;

export interface Distribution {
  n: number;
  median: number | null;
  p90: number | null;
}

/** Mediana (média dos dois do meio em amostra par) e p90 pelo posto mais próximo. Vazio → nulos. */
export function distribution(values: readonly number[]): Distribution {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0, median: null, p90: null };
  const median = n % 2 ? v[(n - 1) / 2]! : (v[n / 2 - 1]! + v[n / 2]!) / 2;
  const p90 = v[Math.ceil(0.9 * n) - 1]!;
  return { n, median, p90 };
}

export interface PactMetrics {
  total: number;
  byStatus: Record<PactStatus, number>;
  open: number;
  /** dias do pedido até o primeiro acordo */
  waitToCommit: Distribution;
  /** dias do pedido até a validação */
  waitToValidation: Distribution;
  deliveries: number;
  returns: number;
  returnRate: number | null;
  /** renegociações pedidas e aceitas */
  renegotiationsRequested: number;
  renegotiationsAccepted: number;
  unblocksConfirmed: number;
  validatedWithoutUnblock: number;
  /** validados até a data acordada vigente */
  onTime: { eligible: number; onTime: number; rate: number | null };
}

const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY;

export function pactMetrics(pacts: readonly CooperationPact[]): PactMetrics {
  const byStatus = Object.fromEntries(PACT_STATES.map((s) => [s, 0])) as Record<PactStatus, number>;
  for (const p of pacts) byStatus[p.status]++;
  const firstAgreement = pacts.filter((p) => p.agreements.length).map((p) => days(p.createdAt, p.agreements[0]!.agreedAt));
  const validated = pacts.filter((p) => p.validation);
  const deliveries = pacts.reduce((a, p) => a + p.deliveries.length, 0);
  const returns = pacts.reduce((a, p) => a + p.deliveries.filter((d) => d.returned).length, 0);
  const onTime = validated.filter((p) => {
    const agreement = p.agreements.find((a) => !a.supersededAt);
    const delivered = p.deliveries.at(-1)?.at.slice(0, 10);
    return !!agreement && !!delivered && delivered <= agreement.agreedDueDate;
  }).length;
  return {
    total: pacts.length,
    byStatus,
    open: byStatus.SOLICITADO + byStatus.EM_NEGOCIACAO + byStatus.COMPROMETIDO + byStatus.ENTREGUE,
    waitToCommit: distribution(firstAgreement),
    waitToValidation: distribution(validated.map((p) => days(p.createdAt, p.validation!.at))),
    deliveries,
    returns,
    returnRate: deliveries ? returns / deliveries : null,
    renegotiationsRequested: pacts.reduce((a, p) => a + p.proposals.filter((x) => x.kind === "RENEGOCIACAO").length, 0),
    renegotiationsAccepted: pacts.reduce((a, p) => a + Math.max(0, p.agreements.length - 1), 0),
    unblocksConfirmed: pacts.filter((p) => p.unblock).length,
    validatedWithoutUnblock: validated.filter((p) => !p.unblock).length,
    onTime: { eligible: validated.length, onTime, rate: validated.length ? onTime / validated.length : null },
  };
}

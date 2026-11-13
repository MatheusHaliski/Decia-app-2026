/**
 * Histórico DEMO de DECIA Points dos perfis do laboratório (RF42). O saldo fictício de cada perfil (`ViewerUser.points`) vira um
 * extrato coerente: sessões do DECIA nos últimos meses com os eventos de participação de qualidade da tabela do RF42 (argumento
 * com evidência, consenso, pergunta respondida, divergência resolvida, artefato usado, decisão validada com multiplicador, ata,
 * reação de qualidade, presença) e, para o "Pessoa Exemplo", uma compra de créditos de IA na Loja. A soma fecha exatamente no
 * saldo do perfil, então a ficha DP da barra, o perfil e o extrato concordam. Determinístico (mesmas referências a cada chamada) e
 * idempotente: semear de novo não duplica nada (o razão recusa a mesma chave). Nunca usa o dia de hoje, para não ocupar os tetos
 * diários dos ganhos reais da sessão.
 */
import { VIEWER_USERS, VIEWER_PROFILES } from "@/lib/viewer/profiles";
import type { EarnEvent, PointsLedger, PointsRule } from "./ledger";
import { LAB_PERSON_ID, pointsHolderOf } from "./identity";

const DAY_MS = 86_400_000;
const MULTIPLIERS = [1, 1.2, 0.8, 1.5, 1] as const;

/** Compra de exemplo do "Pessoa Exemplo" na Loja: 1 pacote de 10 créditos de IA (a Loja guarda o registro com o mesmo id). */
export const DEMO_PAST_PURCHASE = { holderId: LAB_PERSON_ID, purchaseId: "demo-compra-1", itemId: "creditos-ia-10", points: 50, credits: 10, daysAgo: 41 } as const;

export interface PlannedAward {
  event: EarnEvent;
  refId: string;
  sessionId: string;
  multiplier?: number;
  at: Date;
  /** valor que o razão vai lançar (regra × multiplicador) */
  points: number;
}

const clampMult = (m: number) => Math.min(2, Math.max(0.5, m));
const valueOf = (rule: PointsRule, multiplier?: number) => Math.round(rule.points * (rule.multiplier ? clampMult(multiplier ?? 1) : 1));

/** Plano de lançamentos que soma exatamente `target` pontos (alvo ≥ 2), do mais antigo ao mais recente. */
export function demoHistoryPlan(holderId: string, target: number, rules: Readonly<Record<EarnEvent, PointsRule>>, now: Date): PlannedAward[] {
  const plan: PlannedAward[] = [];
  if (!Number.isInteger(target) || target < 2) return plan;
  let remaining = target;
  const sessions = Math.min(48, Math.max(6, Math.ceil(target / 60)));
  const spacing = Math.max(2, Math.floor(170 / sessions));
  const perArgument = Math.min(9, Math.max(1, Math.round((target / sessions - 20) / 5)));
  const dayOf = (offset: number) => {
    const d = new Date(now.getTime() - offset * DAY_MS);
    return (minute: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 13, minute));
  };
  /** lança o evento se couber sem deixar resto 1 (impossível de fechar com os valores mínimos 2 e 3) */
  const add = (event: EarnEvent, session: string, n: number, at: Date, multiplier?: number) => {
    const rule = rules[event];
    if (!rule?.active) return;
    const points = valueOf(rule, multiplier);
    if (points <= 0 || points > remaining || remaining - points === 1) return;
    plan.push({ event, refId: `${holderId}:${session}:${event}:${n}`, sessionId: `demo-${holderId}-${session}`, multiplier, at, points });
    remaining -= points;
  };
  for (let k = sessions - 1; k >= 0 && remaining > 0; k--) {
    const at = dayOf(2 + k * spacing);
    const s = `s${k}`;
    let minute = 0;
    const args = Math.min(10, Math.max(1, perArgument + (k % 3) - 1));
    for (let a = 0; a < args; a++) add("ARGUMENTO_EVIDENCIA", s, a, at(minute++));
    add("CONSENSO", s, 0, at(minute++));
    if (k % 3 === 1) add("PERGUNTA_RESPONDIDA", s, 0, at(minute++));
    if (k % 4 === 2) add("DIVERGENCIA_RESOLVIDA", s, 0, at(minute++));
    if (k % 5 === 3) add("ARTEFATO_USADO", s, 0, at(minute++));
    if (k % 2 === 0) add("DECISAO_VALIDADA", s, 0, at(minute++), MULTIPLIERS[k % MULTIPLIERS.length]);
    if (k % 6 === 4) add("ATA_RATIFICADA", s, 0, at(minute++));
    for (let r = 0; r < k % 3; r++) add("REACAO_QUALIDADE", s, r, at(minute++));
    add("PRESENCA_ENCERRADA", s, 0, at(minute++));
  }
  // fechamento: sessões curtas com eventos pequenos até zerar o resto (cada uma com a própria sessão, longe dos tetos)
  for (let extra = 0; remaining > 0 && extra < 1000; extra++) {
    const at = dayOf(3 + ((extra * 7) % 160))(30);
    const s = `f${extra}`;
    const before = remaining;
    if (remaining >= 5 && remaining !== 6) add("ARGUMENTO_EVIDENCIA", s, 0, at);
    else if (remaining === 3 || remaining === 6) add("CONSENSO", s, 0, at);
    else add("PRESENCA_ENCERRADA", s, 0, at);
    if (remaining === before) break; // regra desligada: não há como fechar
  }
  return plan.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Lança o plano no razão (idempotente). */
export function seedDemoHistory(ledger: PointsLedger, holderId: string, target: number, now: Date): void {
  for (const p of demoHistoryPlan(holderId, target, ledger.rules(), now)) {
    ledger.award({ userId: holderId, event: p.event, ref: { type: "demo", id: p.refId }, sessionId: p.sessionId, multiplier: p.multiplier }, p.at);
  }
}

/** Saldo inicial de cada perfil do laboratório que acumula pontos (dono do saldo → saldo da ficha). */
export function labOpenings(): { holderId: string; opening: number }[] {
  const out: { holderId: string; opening: number }[] = [];
  for (const profile of VIEWER_PROFILES) {
    const user = VIEWER_USERS[profile];
    const holderId = pointsHolderOf(user);
    if (holderId && user.points !== null && user.points > 0) out.push({ holderId, opening: user.points });
  }
  return out;
}

export const isLabHolder = (holderId: string) => labOpenings().some((o) => o.holderId === holderId);

/** Semeia o histórico de todos os perfis do laboratório (e a compra de exemplo). Idempotente. */
export function seedLabPersonas(ledger: PointsLedger, now = new Date()): void {
  for (const { holderId, opening } of labOpenings()) {
    const purchase = holderId === DEMO_PAST_PURCHASE.holderId ? DEMO_PAST_PURCHASE : null;
    seedDemoHistory(ledger, holderId, opening + (purchase?.points ?? 0), now);
    if (purchase) {
      ledger.spend(
        { userId: holderId, event: "COMPRA_LOJA", points: purchase.points, ref: { type: "compra", id: purchase.purchaseId }, note: purchase.itemId },
        new Date(now.getTime() - purchase.daysAgo * DAY_MS),
      );
    }
  }
}

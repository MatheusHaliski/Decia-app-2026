/**
 * DECIA Points (RF42) — razão em memória (DEMO). A API de pontos ainda não existe e não é presumida: a interface `PointsLedger` é
 * o contrato que um cliente HTTP real implementará depois (`DeciaPointsService.award/spend` do README do RF42). Regras do RF42:
 * ganha-se só por participar bem no DECIA (eventos da tabela `DEFAULT_RULES`, com teto diário e por sessão); cada evento vira UM
 * lançamento idempotente (`idempotencyKey` = evento + referência + pessoa); gasto só com saldo (SALDO_INSUFICIENTE); moeda sem
 * dinheiro real (CA10). Quem chama: sessão do DECIA (ganhos), Loja e Balcão de Modelos (gastos e crédito ao autor), chancelas
 * (bônus de benefício). Os dados vivem só nesta aba do navegador — recarregar volta ao exemplo.
 */

/** Eventos que rendem pontos (participação de qualidade) e os de movimentação (gasto, crédito ao autor, doação, estorno). */
export const EARN_EVENTS = [
  "ARGUMENTO_EVIDENCIA", "CONSENSO", "DIVERGENCIA_RESOLVIDA", "PERGUNTA_RESPONDIDA", "ARTEFATO_USADO", "DECISAO_VALIDADA",
  "PRESENCA_ENCERRADA", "REACAO_QUALIDADE", "ATA_RATIFICADA", "ENCAMINHAMENTO_CUMPRIDO", "BENEFICIO_BONUS", "META_ATINGIDA",
  "CREDITO_AUTOR_MODELO", "DOACAO_RECEBIDA",
] as const;
export const SPEND_EVENTS = ["COMPRA_LOJA", "COMPRA_MODELO", "DOACAO_ENVIADA", "ESTORNO", "EXPIRACAO"] as const;
export type EarnEvent = (typeof EARN_EVENTS)[number];
export type SpendEvent = (typeof SPEND_EVENTS)[number];
export type PointsEvent = EarnEvent | SpendEvent;

export interface PointsRule {
  event: EarnEvent;
  /** pontos por ocorrência (antes do multiplicador) */
  points: number;
  /** teto de ocorrências por pessoa por dia (UTC); 0 = sem teto */
  dailyCap: number;
  /** teto de ocorrências por pessoa por sessão do DECIA; 0 = sem teto */
  perSessionCap: number;
  /** aceita multiplicador (perfil deliberativo, 0,5–2,0) */
  multiplier: boolean;
  active: boolean;
}

/** Regras padrão do README do RF42 (a versão editável pela EMPRESA/ADMIN vem com a API). */
export const DEFAULT_RULES: Readonly<Record<EarnEvent, PointsRule>> = {
  ARGUMENTO_EVIDENCIA: { event: "ARGUMENTO_EVIDENCIA", points: 5, dailyCap: 0, perSessionCap: 10, multiplier: false, active: true },
  CONSENSO: { event: "CONSENSO", points: 3, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  DIVERGENCIA_RESOLVIDA: { event: "DIVERGENCIA_RESOLVIDA", points: 8, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  PERGUNTA_RESPONDIDA: { event: "PERGUNTA_RESPONDIDA", points: 4, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  ARTEFATO_USADO: { event: "ARTEFATO_USADO", points: 6, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  DECISAO_VALIDADA: { event: "DECISAO_VALIDADA", points: 15, dailyCap: 0, perSessionCap: 0, multiplier: true, active: true },
  PRESENCA_ENCERRADA: { event: "PRESENCA_ENCERRADA", points: 2, dailyCap: 0, perSessionCap: 1, multiplier: false, active: true },
  REACAO_QUALIDADE: { event: "REACAO_QUALIDADE", points: 2, dailyCap: 20, perSessionCap: 0, multiplier: false, active: true },
  ATA_RATIFICADA: { event: "ATA_RATIFICADA", points: 3, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  ENCAMINHAMENTO_CUMPRIDO: { event: "ENCAMINHAMENTO_CUMPRIDO", points: 5, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  BENEFICIO_BONUS: { event: "BENEFICIO_BONUS", points: 10, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  META_ATINGIDA: { event: "META_ATINGIDA", points: 10, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  CREDITO_AUTOR_MODELO: { event: "CREDITO_AUTOR_MODELO", points: 0, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
  DOACAO_RECEBIDA: { event: "DOACAO_RECEBIDA", points: 0, dailyCap: 0, perSessionCap: 0, multiplier: false, active: true },
};

export interface PointsRef { type: string; id: string }

export interface PointsEntry {
  id: string;
  userId: string;
  /** positivo = ganho; negativo = gasto */
  delta: number;
  event: PointsEvent;
  ref: PointsRef;
  sessionId: string | null;
  /** evento + referência + pessoa: o mesmo fato nunca conta duas vezes */
  idempotencyKey: string;
  note: string | null;
  at: string;
}

export type AwardResult = { ok: true; entry: PointsEntry } | { ok: false; reason: "DUPLICADO" | "TETO_ATINGIDO" | "REGRA_INATIVA" | "VALOR_INVALIDO" };
export type SpendResult = { ok: true; entry: PointsEntry } | { ok: false; reason: "SALDO_INSUFICIENTE" | "DUPLICADO" | "VALOR_INVALIDO" };

export interface AwardInput {
  userId: string;
  event: EarnEvent;
  ref: PointsRef;
  sessionId?: string | null;
  /** multiplicador do perfil deliberativo (só onde a regra aceita), limitado a 0,5–2,0 */
  multiplier?: number;
  /** pontos explícitos para eventos sem valor fixo (crédito ao autor, doação recebida) */
  points?: number;
  note?: string | null;
}

export interface SpendInput {
  userId: string;
  event: SpendEvent;
  points: number;
  ref: PointsRef;
  note?: string | null;
}

export interface PointsLedger {
  readonly source: "DEMO" | "API";
  balance(userId: string): number;
  /** lançamentos da pessoa, do mais novo para o mais antigo */
  entries(userId: string): readonly PointsEntry[];
  award(input: AwardInput, now?: Date): AwardResult;
  spend(input: SpendInput, now?: Date): SpendResult;
  rules(): Readonly<Record<EarnEvent, PointsRule>>;
  subscribe(listener: () => void): () => void;
  /** muda a cada lançamento (para `useSyncExternalStore`) */
  snapshot(): number;
}

const day = (iso: string) => iso.slice(0, 10);
const keyOf = (event: PointsEvent, ref: PointsRef, userId: string) => `${event}:${ref.type}:${ref.id}:${userId}`;

export function createMemoryLedger(seed: readonly PointsEntry[] = [], rules: Readonly<Record<EarnEvent, PointsRule>> = DEFAULT_RULES): PointsLedger {
  const all: PointsEntry[] = [...seed];
  const keys = new Set(all.map((e) => e.idempotencyKey));
  const listeners = new Set<() => void>();
  let tick = 0;
  let seq = all.length;
  const emit = () => {
    tick++;
    listeners.forEach((l) => l());
  };
  const push = (e: Omit<PointsEntry, "id">): PointsEntry => {
    const entry = { ...e, id: `pt-${++seq}` };
    all.push(entry);
    keys.add(entry.idempotencyKey);
    emit();
    return entry;
  };
  const balance = (userId: string) => all.reduce((sum, e) => (e.userId === userId ? sum + e.delta : sum), 0);
  return {
    source: "DEMO",
    balance,
    entries: (userId) => all.filter((e) => e.userId === userId).slice().reverse(),
    rules: () => rules,
    award(input, now = new Date()) {
      const rule = rules[input.event];
      if (!rule || !rule.active) return { ok: false, reason: "REGRA_INATIVA" };
      const key = keyOf(input.event, input.ref, input.userId);
      if (keys.has(key)) return { ok: false, reason: "DUPLICADO" };
      const at = now.toISOString();
      const mine = all.filter((e) => e.userId === input.userId && e.event === input.event);
      if (rule.dailyCap > 0 && mine.filter((e) => day(e.at) === day(at)).length >= rule.dailyCap) return { ok: false, reason: "TETO_ATINGIDO" };
      if (rule.perSessionCap > 0 && input.sessionId && mine.filter((e) => e.sessionId === input.sessionId).length >= rule.perSessionCap) {
        return { ok: false, reason: "TETO_ATINGIDO" };
      }
      const base = rule.points > 0 ? rule.points : Math.trunc(input.points ?? 0);
      if (!Number.isFinite(base) || base <= 0) return { ok: false, reason: "VALOR_INVALIDO" };
      const mult = rule.multiplier ? Math.min(2, Math.max(0.5, input.multiplier ?? 1)) : 1;
      const delta = Math.round(base * mult);
      return { ok: true, entry: push({ userId: input.userId, delta, event: input.event, ref: input.ref, sessionId: input.sessionId ?? null, idempotencyKey: key, note: input.note ?? null, at }) };
    },
    spend(input, now = new Date()) {
      const points = Math.trunc(input.points);
      if (!Number.isFinite(points) || points <= 0) return { ok: false, reason: "VALOR_INVALIDO" };
      const key = keyOf(input.event, input.ref, input.userId);
      if (keys.has(key)) return { ok: false, reason: "DUPLICADO" };
      if (balance(input.userId) < points) return { ok: false, reason: "SALDO_INSUFICIENTE" };
      return { ok: true, entry: push({ userId: input.userId, delta: -points, event: input.event, ref: input.ref, sessionId: null, idempotencyKey: key, note: input.note ?? null, at: now.toISOString() }) };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}

/** Razão DEMO compartilhado pelas telas (sessão do DECIA, Pontos, Loja, Balcão, Chancelas). */
export const deciaPoints: PointsLedger = createMemoryLedger();

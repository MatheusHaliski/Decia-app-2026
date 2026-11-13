/**
 * Motor transacional do Drawings 2D colaborativo (RF66): funções PURAS sobre o estado compartilhado da peça. Quem as chama
 * (a sessão, sob uma trava exclusiva entre abas) faz papel do servidor: lê o estado, aplica UMA transação e grava.
 *
 * - Reserva (lease) por camada + regiões, com prazo e token de fencing monotônico (`lib/pieces/collab`): conflito com
 *   região igual, ancestral ou descendente de outra pessoa é recusado com dono e prazo; renovar/liberar exige o token.
 * - Patch com revisão esperada por objeto (RF66.CA04): patch antigo nunca sobrescreve revisão nova; patches em escopos
 *   disjuntos convivem (CA01). Toda edição — manual ou de IA — passa pela mesma porta `authorizePatch` (camada, seleção,
 *   reserva alheia) e depois pela cobertura de reserva própria (origem E destino do objeto, RF65.CA07).
 * - Desfazer é um patch inverso próprio, também com revisão esperada: nunca restaura às cegas o trabalho de outra pessoa.
 */
import type { DrawingEditTarget } from "@/lib/drawings/selection";
import { acquireLock, activeLocks, ALL_LAYERS, coveredBy, findConflict, LOCK_TTL_MS, MAX_LOCK_TTL_MS, releaseLock, renewLock, type LeaseDenial, type RegionLock } from "@/lib/pieces/collab";
import { authorizePatch, type PatchDenial, type PatchOrigin } from "@/lib/pieces/patch";
import { insideSheet, layerById, regionById, regionsOfGeom, shapeById, validGeom, viewStack, type Drawing2D, type Shape2D, type ShapeGeom, type ViewState } from "./model";

/* ── Pessoas e cores de presença ─────────────────────────────────────────────────────────────────────────────── */

/** As seis cores de nó do RF38, sempre acompanhadas do nome da cor em texto (COEDICAO_TECNICA §3). */
export const PRESENCE_COLORS = ["blue", "orange", "red", "brown", "yellow", "green"] as const;
export type PresenceColor = (typeof PRESENCE_COLORS)[number];

export interface Participant {
  id: string;
  name: string;
  color: PresenceColor;
  kind: "PESSOA" | "SIMULADA";
  lastSeen: number;
}

/** Quem deu sinal nos últimos 15 s conta como presente (cor e nome não se repetem entre presentes). */
export const PRESENCE_WINDOW_MS = 15_000;
export const MAX_LEASES_PER_PERSON = 4;
export const LOG_LIMIT = 60;

/* ── Patches ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PatchOp =
  /** forma nova; `index` (ordem de desenho) e `baseRev` servem ao desfazer de uma exclusão */
  | { op: "add"; shape: Omit<Shape2D, "rev">; index?: number; baseRev?: number }
  | { op: "update"; id: string; expectedRev: number; geom: ShapeGeom; before: ShapeGeom }
  | { op: "remove"; id: string; expectedRev: number };

export interface Label {
  key: string;
  vars?: Readonly<Record<string, string | number>>;
}

export type AiApplyMode = "ACEITA" | "APLICADA";

export interface DrawingPatch {
  id: string;
  actorId: string;
  origin: PatchOrigin;
  /** IA: ACEITA = pessoa aceitou a proposta (Sugestões); APLICADA = lote revisado aplicado no modo Assistido */
  aiMode?: AiApplyMode;
  /** revisão global que o cliente via ao montar o patch (informativa; a regra é a revisão de cada objeto) */
  baseRevision: number;
  ops: readonly PatchOp[];
  label: Label;
  /** escopo limitado exigido de patches de IA (`aiScopeIsBounded`): as regiões da proposta */
  scopeRegionIds?: readonly string[];
  /** patch inverso de outro (desfazer/refazer), para o histórico */
  undo?: "DESFAZER" | "REFAZER";
}

/* ── Estado compartilhado ────────────────────────────────────────────────────────────────────────────────────── */

export type LogKind = "PATCH" | "RESERVA" | "RENOVACAO" | "LIBERACAO" | "EXPIRACAO" | "SAIDA" | "RESTAURACAO";

export interface LogEntry {
  seq: number;
  at: number;
  actorId: string;
  kind: LogKind;
  revision: number;
  label?: Label;
  origin?: PatchOrigin;
  aiMode?: AiApplyMode;
  undo?: "DESFAZER" | "REFAZER";
  layerId?: string;
  regionIds?: readonly string[];
  expiresAt?: number;
  token?: number;
  /** reserva adquirida automaticamente pela edição */
  auto?: boolean;
}

export interface SharedState {
  v: 1;
  doc: Drawing2D;
  locks: RegionLock[];
  /** próximo token de fencing (monotônico por peça) */
  nextToken: number;
  participants: Record<string, Participant>;
  log: LogEntry[];
  /** sobe a cada transação gravada (patch ou reserva): outras abas releem quando muda */
  seq: number;
  /** colaboradora simulada ligada (padrão) ou desligada — vale para todas as abas */
  botEnabled?: boolean;
}

export type Denial =
  | { code: "REGIAO_RESERVADA"; layerId: string; regionIds: readonly string[]; lock: RegionLock }
  | { code: "SEM_RESERVA"; layerId: string; regionIds: readonly string[] }
  | { code: "RESERVA_EXPIRADA"; layerId: string; regionIds: readonly string[] }
  | { code: "REVISAO_DESATUALIZADA"; shapeId: string; expected: number; actual: number }
  | { code: "OBJETO_INEXISTENTE"; shapeId: string }
  | { code: "OBJETO_DUPLICADO"; shapeId: string }
  | { code: "GEOMETRIA_INVALIDA"; shapeId: string }
  | { code: "FORA_DA_FOLHA"; shapeId: string }
  | { code: "SEM_REGIAO"; shapeId: string }
  | { code: "AUTORIZACAO"; reason: Exclude<PatchDenial, "REGIAO_RESERVADA">; layerId?: string }
  | { code: "LEASE"; reason: LeaseDenial }
  | { code: "LIMITE_DE_RESERVAS"; max: number }
  | { code: "REGIAO_INEXISTENTE"; regionId: string }
  | { code: "CAMADA_INEXISTENTE"; layerId: string }
  | { code: "PRAZO_INVALIDO" }
  | { code: "SEM_ALTERACAO" };

export type TxFail = { ok: false; state: SharedState; denial: Denial };
export type TxOk<T extends object = object> = { ok: true; state: SharedState } & T;

export function initialState(doc: Drawing2D): SharedState {
  return { v: 1, doc, locks: [], nextToken: 1, participants: {}, log: [], seq: 0 };
}

/** Lê um estado gravado; formato desconhecido ou corrompido → null (quem chama recomeça do exemplo). */
export function parseState(raw: unknown): SharedState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<SharedState>;
  if (s.v !== 1 || !s.doc || !Array.isArray(s.locks) || !Array.isArray(s.log) || typeof s.seq !== "number" || typeof s.nextToken !== "number") return null;
  if (!Array.isArray(s.doc.shapes) || !Array.isArray(s.doc.layers) || !Array.isArray(s.doc.regions) || typeof s.doc.revision !== "number") return null;
  return { ...(s as SharedState), participants: s.participants && typeof s.participants === "object" ? s.participants : {} };
}

function pushLog(state: SharedState, entries: Omit<LogEntry, "seq">[]): SharedState {
  if (!entries.length) return state;
  let seq = state.seq;
  const log = [...state.log, ...entries.map((e) => ({ ...e, seq: ++seq }))].slice(-LOG_LIMIT);
  return { ...state, log, seq };
}

/** Remove as reservas vencidas e registra a expiração (no instante em que venceram). */
export function prune(state: SharedState, now: number): SharedState {
  const expired = state.locks.filter((l) => l.expiresAt <= now);
  if (!expired.length) return state;
  const next = { ...state, locks: activeLocks(state.locks, now) };
  return pushLog(next, expired.map((l) => ({ at: l.expiresAt, actorId: l.ownerId, kind: "EXPIRACAO" as const, revision: state.doc.revision, layerId: l.layerId, regionIds: l.regionIds, token: l.token })));
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/* ── Participantes ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Entra na peça: mantém a cor de quem já estava registrado; senão, a primeira cor livre entre os presentes. Nome igual
 * ao de outra pessoa presente ganha sufixo " (2)", " (3)"… — cada aba é um participante.
 */
export function join(state: SharedState, who: { id: string; name: string; kind: Participant["kind"]; color?: PresenceColor }, now: number): TxOk<{ participant: Participant }> {
  const present = Object.values(state.participants).filter((p) => p.id !== who.id && now - p.lastSeen <= PRESENCE_WINDOW_MS);
  const known = state.participants[who.id];
  const taken = new Set(present.map((p) => p.color));
  const color = who.color ?? (known && !taken.has(known.color) ? known.color : (PRESENCE_COLORS.find((c) => !taken.has(c)) ?? PRESENCE_COLORS[present.length % PRESENCE_COLORS.length]!));
  const names = new Set(present.map((p) => p.name));
  let name = who.name;
  for (let i = 2; names.has(name); i++) name = `${who.name} (${i})`;
  const participant: Participant = { id: who.id, name, color, kind: who.kind, lastSeen: now };
  return { ok: true, state: { ...state, participants: { ...state.participants, [who.id]: participant }, seq: state.seq + 1 }, participant };
}

export function heartbeat(state: SharedState, id: string, now: number): SharedState {
  const p = state.participants[id];
  if (!p) return state;
  return { ...state, participants: { ...state.participants, [id]: { ...p, lastSeen: now } } };
}

/** Sai da peça: libera todas as reservas da pessoa (a reserva não sobrevive a quem foi embora) e deixa de contar como presente. */
export function leave(state: SharedState, id: string, now: number): SharedState {
  const s = prune(state, now);
  const mine = s.locks.filter((l) => l.ownerId === id);
  const p = s.participants[id];
  const next: SharedState = { ...s, locks: s.locks.filter((l) => l.ownerId !== id), participants: p ? { ...s.participants, [id]: { ...p, lastSeen: 0 } } : s.participants };
  return pushLog(next, mine.length ? [{ at: now, actorId: id, kind: "SAIDA", revision: s.doc.revision, regionIds: mine.flatMap((l) => l.regionIds) }] : []);
}

export const isPresent = (p: Participant | undefined, now: number) => !!p && now - p.lastSeen <= PRESENCE_WINDOW_MS;

/* ── Reservas ────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface ReserveRequest {
  actorId: string;
  /** camada da reserva ou `ALL_LAYERS` (todas) */
  layerId: string;
  regionIds: readonly string[];
  ttl?: number;
}

export function reserve(state: SharedState, req: ReserveRequest, now: number): TxOk<{ lock: RegionLock; already: boolean }> | TxFail {
  const ttl = req.ttl ?? LOCK_TTL_MS;
  const s = prune(state, now);
  const fail = (denial: Denial): TxFail => ({ ok: false, state: s, denial });
  if (!req.regionIds.length) return fail({ code: "REGIAO_INEXISTENTE", regionId: "" });
  const missingRegion = req.regionIds.find((r) => !regionById(s.doc, r));
  if (missingRegion !== undefined) return fail({ code: "REGIAO_INEXISTENTE", regionId: missingRegion });
  if (req.layerId !== ALL_LAYERS) {
    const layer = layerById(s.doc, req.layerId);
    if (!layer) return fail({ code: "CAMADA_INEXISTENTE", layerId: req.layerId });
    if (layer.locked) return fail({ code: "AUTORIZACAO", reason: "CAMADA_TRAVADA", layerId: layer.id });
  }
  if (!Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_LOCK_TTL_MS) return fail({ code: "PRAZO_INVALIDO" });
  const q = { pieceId: s.doc.pieceId, layerId: req.layerId, regionIds: req.regionIds, userId: req.actorId };
  const conflict = findConflict(s.locks, q, now);
  if (conflict) return fail({ code: "REGIAO_RESERVADA", layerId: req.layerId, regionIds: req.regionIds, lock: conflict });
  const mine = s.locks.filter((l) => l.ownerId === req.actorId);
  // mesma reserva de novo = renovar (idempotente); região já coberta por reserva maior da pessoa = nada a fazer
  const same = mine.find((l) => l.layerId === req.layerId && sameSet(l.regionIds, req.regionIds));
  if (same?.id) {
    const r = renewLock(s.locks, { id: same.id, ownerId: req.actorId, token: same.token }, now, ttl);
    if (r.ok) {
      const next = pushLog({ ...s, locks: r.locks }, [{ at: now, actorId: req.actorId, kind: "RENOVACAO", revision: s.doc.revision, layerId: r.lock.layerId, regionIds: r.lock.regionIds, expiresAt: r.lock.expiresAt, token: r.lock.token }]);
      return { ok: true, state: next, lock: r.lock, already: false };
    }
  }
  if (req.layerId !== ALL_LAYERS && coveredBy(s.locks, q, now)) {
    const cover = mine.find((l) => (l.layerId === req.layerId || l.layerId === ALL_LAYERS) && req.regionIds.every((r) => l.regionIds.some((o) => r === o || r.startsWith(o + "/"))))!;
    return { ok: true, state: s, lock: cover, already: true };
  }
  if (mine.length >= MAX_LEASES_PER_PERSON) return fail({ code: "LIMITE_DE_RESERVAS", max: MAX_LEASES_PER_PERSON });
  const token = s.nextToken;
  const r = acquireLock(s.locks, { pieceId: s.doc.pieceId, layerId: req.layerId, regionIds: req.regionIds, ownerId: req.actorId, id: `L${token}`, token }, now, ttl);
  if (!r.ok) return fail({ code: "REGIAO_RESERVADA", layerId: req.layerId, regionIds: req.regionIds, lock: findConflict(s.locks, q, now)! });
  const next = pushLog({ ...s, locks: r.locks, nextToken: token + 1 }, [{ at: now, actorId: req.actorId, kind: "RESERVA", revision: s.doc.revision, layerId: req.layerId, regionIds: r.lock.regionIds, expiresAt: r.lock.expiresAt, token }]);
  return { ok: true, state: next, lock: r.lock, already: false };
}

/** Renova pelo id da reserva com o token vigente (o cliente antigo, com token velho, é recusado — RF66.CA03). */
export function renew(state: SharedState, req: { actorId: string; lockId: string; token?: number; ttl?: number }, now: number): TxOk<{ lock: RegionLock }> | TxFail {
  const ttl = req.ttl ?? LOCK_TTL_MS;
  if (!Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_LOCK_TTL_MS) return { ok: false, state, denial: { code: "PRAZO_INVALIDO" } };
  const r = renewLock(state.locks, { id: req.lockId, ownerId: req.actorId, token: req.token }, now, ttl);
  const s = prune(state, now);
  if (!r.ok) return { ok: false, state: s, denial: { code: "LEASE", reason: r.reason } };
  const next = pushLog({ ...s, locks: s.locks.map((l) => (l.id === req.lockId ? r.lock : l)) }, [{ at: now, actorId: req.actorId, kind: "RENOVACAO", revision: s.doc.revision, layerId: r.lock.layerId, regionIds: r.lock.regionIds, expiresAt: r.lock.expiresAt, token: r.lock.token }]);
  return { ok: true, state: next, lock: r.lock };
}

export function release(state: SharedState, req: { actorId: string; lockId: string; token?: number }, now: number): TxOk | TxFail {
  const r = releaseLock(state.locks, { id: req.lockId, ownerId: req.actorId, token: req.token }, now);
  const s = prune(state, now);
  if (!r.ok) return { ok: false, state: s, denial: { code: "LEASE", reason: r.reason } };
  const lock = state.locks.find((l) => l.id === req.lockId)!;
  const next = pushLog({ ...s, locks: s.locks.filter((l) => l.id !== req.lockId) }, [{ at: now, actorId: req.actorId, kind: "LIBERACAO", revision: s.doc.revision, layerId: lock.layerId, regionIds: lock.regionIds, token: lock.token }]);
  return { ok: true, state: next };
}

/* ── Patches ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface CommitContext {
  now: number;
  /** preferências de quem edita (camada ativa e camadas ocultas) — a mesma regra vale para manual e IA */
  view: ViewState;
  /**
   * Região livre ainda não reservada pela pessoa: reservar na mesma transação (verdadeiro) ou recusar com SEM_RESERVA.
   * Nunca toma região de outra pessoa.
   */
  autoReserve: boolean;
  ttl?: number;
}

export interface Applied {
  revision: number;
  /** patch inverso (para desfazer), com as revisões esperadas DEPOIS deste patch */
  inverse: PatchOp[];
  /** reservas obtidas automaticamente nesta transação */
  autoLocks: RegionLock[];
  /** ids de objeto alterados */
  touched: string[];
}

/** Alvos do patch: camada e TODAS as regiões tocadas antes e depois (mover exige origem e destino reservados). */
export function patchTargets(doc: Drawing2D, ops: readonly PatchOp[]): { ok: true; targets: DrawingEditTarget[] } | { ok: false; denial: Denial } {
  const work = new Map(doc.shapes.map((s) => [s.id, s]));
  const targets: DrawingEditTarget[] = [];
  for (const op of ops) {
    if (op.op === "add") {
      const s = op.shape;
      if (work.has(s.id)) return { ok: false, denial: { code: "OBJETO_DUPLICADO", shapeId: s.id } };
      if (!validGeom(s.geom)) return { ok: false, denial: { code: "GEOMETRIA_INVALIDA", shapeId: s.id } };
      if (!insideSheet(doc, s.geom)) return { ok: false, denial: { code: "FORA_DA_FOLHA", shapeId: s.id } };
      const regionIds = regionsOfGeom(doc, s.geom, s.group);
      if (!regionIds.length) return { ok: false, denial: { code: "SEM_REGIAO", shapeId: s.id } };
      targets.push({ layerId: s.layerId, regionIds, objectPath: [s.id] });
      work.set(s.id, { ...s, rev: 0 });
      continue;
    }
    const cur = work.get(op.id);
    if (!cur) return { ok: false, denial: { code: "OBJETO_INEXISTENTE", shapeId: op.id } };
    if (cur.rev !== op.expectedRev) return { ok: false, denial: { code: "REVISAO_DESATUALIZADA", shapeId: op.id, expected: op.expectedRev, actual: cur.rev } };
    const before = regionsOfGeom(doc, cur.geom, cur.group);
    if (op.op === "remove") {
      targets.push({ layerId: cur.layerId, regionIds: before, objectPath: [cur.id] });
      work.delete(cur.id);
      continue;
    }
    if (!validGeom(op.geom)) return { ok: false, denial: { code: "GEOMETRIA_INVALIDA", shapeId: op.id } };
    if (!insideSheet(doc, op.geom)) return { ok: false, denial: { code: "FORA_DA_FOLHA", shapeId: op.id } };
    const after = regionsOfGeom(doc, op.geom, cur.group);
    const regionIds = [...new Set([...before, ...after])];
    if (!regionIds.length) return { ok: false, denial: { code: "SEM_REGIAO", shapeId: op.id } };
    targets.push({ layerId: cur.layerId, regionIds, objectPath: [cur.id] });
    work.set(cur.id, { ...cur, geom: op.geom, rev: cur.rev + 1 });
  }
  return { ok: true, targets };
}

/** Aplica as operações (já validadas) e devolve o documento novo, o inverso e os ids tocados. */
function applyOps(doc: Drawing2D, ops: readonly PatchOp[]): { doc: Drawing2D; inverse: PatchOp[]; touched: string[] } {
  let shapes = [...doc.shapes];
  const inverse: PatchOp[] = [];
  const touched: string[] = [];
  for (const op of ops) {
    if (op.op === "add") {
      const rev = (op.baseRev ?? 0) + 1;
      const s: Shape2D = { ...op.shape, rev };
      const at = op.index === undefined ? shapes.length : Math.max(0, Math.min(op.index, shapes.length));
      shapes = [...shapes.slice(0, at), s, ...shapes.slice(at)];
      inverse.unshift({ op: "remove", id: s.id, expectedRev: rev });
      touched.push(s.id);
    } else if (op.op === "remove") {
      const index = shapes.findIndex((s) => s.id === op.id);
      const cur = shapes[index]!;
      shapes = shapes.filter((s) => s.id !== op.id);
      const { rev, ...rest } = cur;
      inverse.unshift({ op: "add", shape: rest, index, baseRev: rev });
      touched.push(op.id);
    } else {
      const index = shapes.findIndex((s) => s.id === op.id);
      const cur = shapes[index]!;
      const next: Shape2D = { ...cur, geom: op.geom, rev: cur.rev + 1 };
      shapes = shapes.map((s, i) => (i === index ? next : s));
      inverse.unshift({ op: "update", id: op.id, expectedRev: next.rev, geom: cur.geom, before: op.geom });
      touched.push(op.id);
    }
  }
  return { doc: { ...doc, shapes, revision: doc.revision + 1 }, inverse, touched: [...new Set(touched)] };
}

/** Regiões sem reserva própria viva, agrupadas por camada. */
function uncovered(state: SharedState, actorId: string, targets: readonly DrawingEditTarget[], now: number): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of targets) {
    for (const r of t.regionIds) {
      if (coveredBy(state.locks, { pieceId: state.doc.pieceId, layerId: t.layerId, regionIds: [r], userId: actorId }, now)) continue;
      const list = out.get(t.layerId) ?? [];
      if (!list.includes(r)) list.push(r);
      out.set(t.layerId, list);
    }
  }
  return out;
}

/**
 * Grava um patch numa transação: revisões, geometria, autorização (camada, escopo, reserva alheia), cobertura de reserva
 * própria (com aquisição automática opcional de região livre) e só então aplica, soma a revisão global e registra.
 */
export function commit(state: SharedState, patch: DrawingPatch, ctx: CommitContext): TxOk<{ applied: Applied }> | TxFail {
  const { now } = ctx;
  const s0 = prune(state, now);
  const fail = (denial: Denial): TxFail => ({ ok: false, state: s0, denial });
  if (!patch.ops.length) return fail({ code: "SEM_ALTERACAO" });
  const t = patchTargets(s0.doc, patch.ops);
  if (!t.ok) return fail(t.denial);

  const pieceId = s0.doc.pieceId;
  const scope = patch.origin === "IA"
    ? { mode: "EDIT" as const, layerId: ctx.view.activeLayerId, regionIds: patch.scopeRegionIds ?? [] }
    : { mode: "EDIT" as const, layerId: ctx.view.activeLayerId };
  const verdict = authorizePatch(viewStack(s0.doc, ctx.view), s0.locks, { pieceId, actorId: patch.actorId, origin: patch.origin, scope, targets: t.targets }, now);
  if (!verdict.ok) {
    if (verdict.reason === "REGIAO_RESERVADA" && verdict.target) {
      const lock = findConflict(s0.locks, { pieceId, layerId: verdict.target.layerId, regionIds: verdict.target.regionIds, userId: patch.actorId }, now)!;
      return fail({ code: "REGIAO_RESERVADA", layerId: verdict.target.layerId, regionIds: verdict.target.regionIds, lock });
    }
    return fail({ code: "AUTORIZACAO", reason: verdict.reason as Exclude<PatchDenial, "REGIAO_RESERVADA">, layerId: verdict.target?.layerId });
  }

  let s = s0;
  const autoLocks: RegionLock[] = [];
  const missing = uncovered(s, patch.actorId, t.targets, now);
  if (missing.size) {
    if (!ctx.autoReserve) {
      const [layerId, regionIds] = [...missing.entries()][0]!;
      // a pessoa tinha uma reserva que venceu: o cliente antigo não escreve depois da expiração (RF66.CA03)
      const hadExpired = state.locks.some((l) => l.ownerId === patch.actorId && l.expiresAt <= now && (l.layerId === layerId || l.layerId === ALL_LAYERS) && regionIds.some((r) => l.regionIds.some((o) => r === o || r.startsWith(o + "/"))));
      return fail({ code: hadExpired ? "RESERVA_EXPIRADA" : "SEM_RESERVA", layerId, regionIds });
    }
    for (const [layerId, regionIds] of missing) {
      const r = reserve(s, { actorId: patch.actorId, layerId, regionIds, ttl: ctx.ttl }, now);
      if (!r.ok) return fail(r.denial);
      s = { ...r.state, log: r.state.log.map((e) => (e.seq === r.state.seq && e.kind === "RESERVA" ? { ...e, auto: true } : e)) };
      autoLocks.push(r.lock);
    }
  }

  const { doc, inverse, touched } = applyOps(s.doc, patch.ops);
  const next = pushLog({ ...s, doc }, [{ at: now, actorId: patch.actorId, kind: "PATCH", revision: doc.revision, label: patch.label, origin: patch.origin, aiMode: patch.aiMode, undo: patch.undo }]);
  return { ok: true, state: next, applied: { revision: doc.revision, inverse, autoLocks, touched } };
}

/** Restaura o exemplo (DEMO): documento novo, sem reservas; as pessoas continuam registradas. */
export function restore(state: SharedState, doc: Drawing2D, actorId: string, now: number): SharedState {
  return pushLog({ ...state, doc, locks: [], nextToken: state.nextToken }, [{ at: now, actorId, kind: "RESTAURACAO", revision: doc.revision }]);
}

/* ── Consultas para a tela ───────────────────────────────────────────────────────────────────────────────────── */

export const shapeOf = (state: SharedState, id: string) => shapeById(state.doc, id);

/** Reservas vivas, da que vence primeiro para a última. */
export const liveLocks = (state: SharedState, now: number) => activeLocks(state.locks, now).sort((a, b) => a.expiresAt - b.expiresAt);

/** Reservas vivas que tocam a região (ela mesma, ancestral ou descendente), de qualquer camada. */
export function locksOnRegion(state: SharedState, regionId: string, now: number): RegionLock[] {
  return liveLocks(state, now).filter((l) => l.regionIds.some((r) => r === regionId || r.startsWith(regionId + "/") || regionId.startsWith(r + "/")));
}

/**
 * A pessoa pode editar a forma agora? (camada visível, destravada; regiões livres ou dela). Seleção e permissão são
 * eixos distintos (RF57.CA06): isto não depende de estar selecionada.
 */
export function canEditShape(state: SharedState, view: ViewState, actorId: string, shape: Shape2D, now: number): boolean {
  const layer = layerById(state.doc, shape.layerId);
  if (!layer || layer.locked || view.hiddenLayerIds.includes(layer.id)) return false;
  const regionIds = regionsOfGeom(state.doc, shape.geom, shape.group);
  return regionIds.length > 0 && !findConflict(state.locks, { pieceId: state.doc.pieceId, layerId: shape.layerId, regionIds, userId: actorId }, now);
}

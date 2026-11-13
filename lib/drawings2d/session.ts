/**
 * Sessão colaborativa de UMA aba no Drawings 2D (DEMO, sem servidor). Cada ação vira uma transação: sob a trava entre
 * abas, lê o estado compartilhado, aplica uma função pura do motor (`engine.ts`), grava e avisa as outras abas pelo
 * BroadcastChannel; as outras releem. Presença (cursor, seleção, atividade) vai só pelo canal e some depois de 15 s sem
 * sinal. A cada segundo a sessão detecta reservas que expiraram e renova as da pessoa enquanto ela estiver editando.
 * A tela lê `getSnapshot()` com `useSyncExternalStore`.
 */
import { activeLocks, type RegionLock } from "@/lib/pieces/collab";
import { newId } from "./commands";
import {
  commit, heartbeat, initialState, join, leave, prune, release as releaseTx, renew as renewTx, reserve as reserveTx, restore,
  PRESENCE_WINDOW_MS, type Applied, type Denial, type DrawingPatch, type Label, type LogEntry, type Participant, type PatchOp, type PresenceColor, type SharedState, type TxFail, type TxOk,
} from "./engine";
import { emptyHistory, popEntry, pushEntry, recordApplied, type LocalHistory, type UndoEntry } from "./history";
import { shapeById, type Drawing2D, type ViewState } from "./model";
import type { Channel, PresencePayload, SharedStore, TxLock, WireMessage } from "./transport";

export interface Timers {
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export const realTimers: Timers = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
};

export interface SessionEnv {
  pieceId: string;
  me: { id: string; name: string };
  store: SharedStore;
  lock: TxLock;
  channel: Channel | null;
  seed: () => Drawing2D;
  now?: () => number;
  timers?: Timers;
}

export type SessionAction = "editar" | "reservar" | "renovar" | "liberar" | "desfazer" | "refazer";

export type SessionEvent =
  | { type: "negado"; action: SessionAction; denial: Denial }
  | { type: "reservou"; lock: RegionLock; auto: boolean; already: boolean }
  | { type: "renovou"; lock: RegionLock; auto: boolean }
  | { type: "liberou"; lock: RegionLock }
  | { type: "expirou"; lock: RegionLock }
  | { type: "aplicado"; label: Label; revision: number; undo?: "DESFAZER" | "REFAZER"; autoLocks: RegionLock[] }
  | { type: "remoto"; entry: LogEntry }
  | { type: "restaurado" };

export interface PeerPresence extends PresencePayload {
  id: string;
  at: number;
}

export interface CommitPart {
  patch: DrawingPatch;
  view: ViewState;
}

/** Patch recusado por revisão antiga: guardado para reconciliar (RF66.CA04), nunca aplicado por cima. */
export interface Draft {
  parts: CommitPart[];
  denial: Denial;
  label: Label;
}

export interface SessionSnapshot {
  state: SharedState;
  me: Participant;
  now: number;
  peers: readonly PeerPresence[];
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: Label | null;
  redoLabel: Label | null;
  draft: Draft | null;
  event: { id: number; e: SessionEvent } | null;
  transport: "broadcast" | "local";
  hostingBot: boolean;
}

export type CommitResult = { ok: true; applied: Applied[] } | { ok: false; denial: Denial };

/** Renova sozinha a reserva que vence em menos de 10 s se a pessoa mexeu nos últimos 45 s; parada, deixa expirar. */
export const AUTO_RENEW_BEFORE_MS = 10_000;
export const ACTIVE_WINDOW_MS = 45_000;

/** Várias partes numa transação só: ou todas gravam, ou nenhuma (lote da IA, desfazer de lote). */
export function commitAll(state: SharedState, parts: readonly CommitPart[], opts: { now: number; autoReserve: boolean; ttl?: number }): TxOk<{ applied: Applied[] }> | TxFail {
  let s = state;
  const applied: Applied[] = [];
  for (const part of parts) {
    const r = commit(s, part.patch, { now: opts.now, view: part.view, autoReserve: opts.autoReserve, ttl: opts.ttl });
    if (!r.ok) return { ok: false, state: prune(state, opts.now), denial: r.denial };
    s = r.state;
    applied.push(r.applied);
  }
  return { ok: true, state: s, applied };
}

/** Entrada de desfazer de um lote aplicado: os inversos, da última parte para a primeira. */
function undoEntryOf(label: Label, parts: readonly CommitPart[], applied: readonly Applied[]): UndoEntry {
  return {
    label,
    parts: parts.map((p, i) => ({ layerId: p.view.activeLayerId, ops: applied[i]!.inverse, scopeRegionIds: p.patch.scopeRegionIds })).reverse(),
  };
}

/** Facade para quem age por esta aba sem ser a pessoa dela (a colaboradora simulada). */
export interface SessionActor {
  readonly id: string;
  state(): SharedState;
  now(): number;
  join(name: string, color: PresenceColor): Promise<void>;
  reserve(layerId: string, regionIds: readonly string[], ttl: number): Promise<{ ok: true; lock: RegionLock } | { ok: false; denial: Denial }>;
  release(lock: RegionLock): Promise<boolean>;
  commit(patch: DrawingPatch): Promise<boolean>;
  presence(p: Pick<PresencePayload, "cursor" | "selection" | "activity">): void;
  leave(): Promise<void>;
}

export class CollabSession {
  private state: SharedState;
  private me: Participant;
  private peers = new Map<string, PeerPresence>();
  private hosted = new Map<string, PresencePayload>();
  private history: LocalHistory = emptyHistory;
  private draft: Draft | null = null;
  private event: { id: number; e: SessionEvent } | null = null;
  private eventSeq = 0;
  private listeners = new Set<() => void>();
  private snapshot: SessionSnapshot;
  private readonly timers: Timers;
  private readonly clock: () => number;
  private intervals: unknown[] = [];
  private unlisten: (() => void) | null = null;
  private lastLive = new Map<string, RegionLock>();
  private lastActivity = 0;
  private renewing = new Set<string>();
  private presence: PresencePayload;
  private presenceTimer: unknown = null;
  private stopped = false;
  private botHostedHere = false;

  constructor(private readonly env: SessionEnv) {
    this.timers = env.timers ?? realTimers;
    this.clock = env.now ?? Date.now;
    this.state = initialState(env.seed());
    this.me = { id: env.me.id, name: env.me.name, color: "blue", kind: "PESSOA", lastSeen: 0 };
    this.presence = { name: env.me.name, color: "blue", kind: "PESSOA", cursor: null, selection: [], activity: null };
    this.snapshot = this.buildSnapshot();
  }

  /* ── ciclo de vida ── */

  async start(): Promise<void> {
    const participant = await this.tx((s) => {
      const j = join(s, { id: this.env.me.id, name: this.env.me.name, kind: "PESSOA" }, this.clock());
      return { state: j.state, result: j.participant };
    });
    this.me = participant;
    this.presence = { ...this.presence, name: participant.name, color: participant.color };
    this.lastLive = this.liveMap(this.clock());
    this.unlisten = this.env.channel?.listen((m) => this.onMessage(m)) ?? null;
    this.env.channel?.post({ t: "hello", from: this.me.id });
    this.postPresence();
    this.intervals.push(this.timers.setInterval(() => this.tick(), 1000));
    this.intervals.push(this.timers.setInterval(() => void this.beat(), 5000));
    this.emit();
  }

  /** Sai da peça: libera as reservas desta aba (e da colaboradora hospedada aqui) e avisa as outras abas. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.intervals.forEach((id) => this.timers.clearInterval(id));
    this.intervals = [];
    if (this.presenceTimer) this.timers.clearTimeout(this.presenceTimer);
    const ids = [this.me.id, ...this.hosted.keys()];
    await this.tx((s) => ({ state: ids.reduce((acc, id) => leave(acc, id, this.clock()), s), result: null }));
    ids.forEach((id) => this.env.channel?.post({ t: "bye", from: id }));
    this.unlisten?.();
    this.env.channel?.close();
  }

  /** Saída síncrona (pagehide): melhor esforço sem a trava — se falhar, a reserva expira sozinha (é para isso o prazo). */
  leaveSync(): void {
    try {
      const s = this.env.store.read();
      const ids = [this.me.id, ...this.hosted.keys()];
      if (s) {
        const next = ids.reduce((acc, id) => leave(acc, id, this.clock()), s);
        this.env.store.write(next);
        this.env.channel?.post({ t: "commit", from: this.me.id, seq: next.seq });
      }
      ids.forEach((id) => this.env.channel?.post({ t: "bye", from: id }));
    } catch {
      /* a aba está fechando */
    }
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): SessionSnapshot => this.snapshot;

  get participantId(): string {
    return this.me.id;
  }

  /* ── reservas ── */

  async reserve(layerId: string, regionIds: readonly string[], ttl?: number): Promise<{ ok: true; lock: RegionLock } | { ok: false; denial: Denial }> {
    this.lastActivity = this.clock();
    const r = await this.tx((s) => {
      const out = reserveTx(s, { actorId: this.me.id, layerId, regionIds, ttl }, this.clock());
      return { state: out.state, result: out };
    });
    if (r.ok) this.notify({ type: "reservou", lock: r.lock, auto: false, already: r.already });
    else this.notify({ type: "negado", action: "reservar", denial: r.denial });
    return r.ok ? { ok: true, lock: r.lock } : { ok: false, denial: r.denial };
  }

  async renew(lock: RegionLock, ttl?: number, auto = false): Promise<boolean> {
    if (!lock.id) return false;
    const r = await this.tx((s) => {
      const out = renewTx(s, { actorId: this.me.id, lockId: lock.id!, token: lock.token, ttl }, this.clock());
      return { state: out.state, result: out };
    });
    if (r.ok) this.notify({ type: "renovou", lock: r.lock, auto });
    else if (!auto) this.notify({ type: "negado", action: "renovar", denial: r.denial });
    return r.ok;
  }

  async release(lock: RegionLock): Promise<boolean> {
    if (!lock.id) return false;
    const r = await this.tx((s) => {
      const out = releaseTx(s, { actorId: this.me.id, lockId: lock.id!, token: lock.token }, this.clock());
      return { state: out.state, result: out };
    });
    if (r.ok) this.notify({ type: "liberou", lock });
    else this.notify({ type: "negado", action: "liberar", denial: r.denial });
    return r.ok;
  }

  /* ── edição ── */

  /**
   * Grava as partes numa transação. `autoReserve` (padrão): região livre que a pessoa ainda não reservou é reservada na
   * mesma transação; região de outra pessoa nunca. Revisão antiga → rascunho guardado para reconciliar.
   */
  async commit(parts: CommitPart[], opts: { autoReserve?: boolean; ttl?: number; history?: boolean; label?: Label } = {}): Promise<CommitResult> {
    if (!parts.length) return { ok: false, denial: { code: "SEM_ALTERACAO" } };
    this.lastActivity = this.clock();
    const label = opts.label ?? parts[0]!.patch.label;
    const r = await this.tx((s) => {
      const out = commitAll(s, parts, { now: this.clock(), autoReserve: opts.autoReserve ?? true, ttl: opts.ttl });
      return { state: out.state, result: out };
    });
    if (!r.ok) {
      if (r.denial.code === "REVISAO_DESATUALIZADA") this.draft = { parts, denial: r.denial, label };
      this.notify({ type: "negado", action: "editar", denial: r.denial });
      return { ok: false, denial: r.denial };
    }
    if (opts.history !== false) this.history = recordApplied(this.history, undoEntryOf(label, parts, r.applied));
    this.notify({ type: "aplicado", label, revision: r.state.doc.revision, autoLocks: r.applied.flatMap((a) => a.autoLocks) });
    return { ok: true, applied: r.applied };
  }

  undo(view: ViewState): Promise<CommitResult | null> {
    return this.replay("undo", view);
  }

  redo(view: ViewState): Promise<CommitResult | null> {
    return this.replay("redo", view);
  }

  /** Desfazer/refazer = patch inverso com revisão esperada; se alguém mexeu depois, é recusado e a entrada sai da pilha. */
  private async replay(side: "undo" | "redo", view: ViewState): Promise<CommitResult | null> {
    const popped = popEntry(this.history, side);
    if (!popped) return null;
    this.history = popped.history;
    this.lastActivity = this.clock();
    const kind = side === "undo" ? "DESFAZER" : "REFAZER";
    const parts: CommitPart[] = popped.entry.parts.map((p) => ({
      patch: { id: newId("u"), actorId: this.me.id, origin: "MANUAL", baseRevision: this.state.doc.revision, ops: p.ops, label: popped.entry.label, undo: kind },
      view: { ...view, activeLayerId: p.layerId },
    }));
    const r = await this.tx((s) => {
      const out = commitAll(s, parts, { now: this.clock(), autoReserve: true });
      return { state: out.state, result: out };
    });
    if (!r.ok) {
      this.notify({ type: "negado", action: side === "undo" ? "desfazer" : "refazer", denial: r.denial });
      return { ok: false, denial: r.denial };
    }
    this.history = pushEntry(this.history, side === "undo" ? "redo" : "undo", undoEntryOf(popped.entry.label, parts, r.applied));
    this.notify({ type: "aplicado", label: popped.entry.label, revision: r.state.doc.revision, undo: kind, autoLocks: r.applied.flatMap((a) => a.autoLocks) });
    return { ok: true, applied: r.applied };
  }

  /**
   * Reconciliar o rascunho recusado: reaplica a MESMA intenção sobre a revisão atual dos objetos (a pessoa viu o aviso e
   * decidiu). Objeto que sumiu sai do patch; se nada sobrar, o rascunho é descartado.
   */
  async reapplyDraft(): Promise<CommitResult | null> {
    const draft = this.draft;
    if (!draft) return null;
    this.draft = null;
    const doc = this.state.doc;
    const parts = draft.parts
      .map((p) => ({
        ...p,
        patch: {
          ...p.patch,
          id: newId("p"),
          baseRevision: doc.revision,
          ops: p.patch.ops.flatMap((op): PatchOp[] => {
            if (op.op === "add") return shapeById(doc, op.shape.id) ? [] : [op];
            const cur = shapeById(doc, op.id);
            if (!cur) return [];
            return op.op === "update" ? [{ ...op, expectedRev: cur.rev, before: cur.geom }] : [{ ...op, expectedRev: cur.rev }];
          }),
        },
      }))
      .filter((p) => p.patch.ops.length);
    if (!parts.length) {
      this.emit();
      return null;
    }
    return this.commit(parts, { label: draft.label });
  }

  discardDraft(): void {
    this.draft = null;
    this.emit();
  }

  async restoreDemo(): Promise<void> {
    await this.tx((s) => ({ state: restore(s, this.env.seed(), this.me.id, this.clock()), result: null }));
    this.history = emptyHistory;
    this.draft = null;
    this.notify({ type: "restaurado" });
  }

  async setBotEnabled(on: boolean): Promise<void> {
    await this.tx((s) => ({ state: { ...s, botEnabled: on, seq: s.seq + 1 }, result: null }));
    this.emit();
  }

  /* ── presença ── */

  /** Cursor/seleção/atividade desta aba (enviados no máximo a cada 60 ms). */
  setPresence(p: Partial<Pick<PresencePayload, "cursor" | "selection" | "activity">>): void {
    this.presence = { ...this.presence, ...p };
    if (p.selection) this.lastActivity = this.clock();
    if (this.presenceTimer) return;
    this.presenceTimer = this.timers.setTimeout(() => {
      this.presenceTimer = null;
      this.postPresence();
    }, 60);
  }

  /** Marca que a pessoa está ativa (renovação automática das reservas dela). */
  touch(): void {
    this.lastActivity = this.clock();
  }

  /** Releitura do estado gravado (outra aba gravou; evento `storage` do navegador). */
  refresh(): void {
    const s = this.env.store.read();
    if (!s || s.seq === this.state.seq) return;
    const prev = this.state;
    this.adopt(s);
    const fresh = s.log.filter((e) => e.seq > prev.seq && e.actorId !== this.me.id && !this.hosted.has(e.actorId) && (e.kind === "PATCH" || e.kind === "RESERVA" || e.kind === "LIBERACAO" || e.kind === "RESTAURACAO"));
    const last = fresh.at(-1);
    if (last) this.notify({ type: "remoto", entry: last });
    else this.emit();
  }

  /** Facade de outra pessoa hospedada nesta aba (colaboradora simulada): mesmas transações, sem histórico local. */
  actor(id: string, view: ViewState): SessionActor {
    const self = this;
    let base: PresencePayload = { name: id, color: "green", kind: "SIMULADA", cursor: null, selection: [], activity: null };
    return {
      id,
      state: () => self.state,
      now: () => self.clock(),
      async join(name, color) {
        const p = await self.tx((s) => {
          const j = join(s, { id, name, kind: "SIMULADA", color }, self.clock());
          return { state: j.state, result: j.participant };
        });
        base = { ...base, name: p.name, color: p.color };
        self.hosted.set(id, base);
        self.botHostedHere = true;
        self.emit();
      },
      async reserve(layerId, regionIds, ttl) {
        const r = await self.tx((s) => {
          const out = reserveTx(s, { actorId: id, layerId, regionIds, ttl }, self.clock());
          return { state: out.state, result: out };
        });
        self.emit();
        return r.ok ? { ok: true, lock: r.lock } : { ok: false, denial: r.denial };
      },
      async release(lock) {
        if (!lock.id) return false;
        const r = await self.tx((s) => {
          const out = releaseTx(s, { actorId: id, lockId: lock.id!, token: lock.token }, self.clock());
          return { state: out.state, result: out.ok };
        });
        self.emit();
        return r;
      },
      async commit(patch) {
        const r = await self.tx((s) => {
          const out = commit(s, patch, { now: self.clock(), view, autoReserve: false });
          return { state: out.state, result: out.ok };
        });
        self.emit();
        return r;
      },
      presence(p) {
        base = { ...base, ...p };
        self.hosted.set(id, base);
        self.peers.set(id, { ...base, id, at: self.clock() });
        self.env.channel?.post({ t: "presence", from: id, p: base });
        self.emit();
      },
      async leave() {
        await self.tx((s) => ({ state: leave(s, id, self.clock()), result: null }));
        self.hosted.delete(id);
        self.peers.delete(id);
        self.botHostedHere = self.hosted.size > 0;
        self.env.channel?.post({ t: "bye", from: id });
        self.emit();
      },
    };
  }

  /* ── interno ── */

  private async tx<T>(fn: (s: SharedState) => { state: SharedState; result: T }): Promise<T> {
    const out = await this.env.lock.run(() => {
      const current = this.env.store.read() ?? initialState(this.env.seed());
      const { state, result } = fn(current);
      if (state !== current) this.env.store.write(state);
      return { state, result, changed: state.seq !== current.seq };
    });
    this.adopt(out.state);
    if (out.changed) this.env.channel?.post({ t: "commit", from: this.me.id, seq: out.state.seq });
    return out.result;
  }

  private adopt(state: SharedState): void {
    this.state = state;
    const me = state.participants[this.me.id];
    if (me) this.me = { ...this.me, name: me.name, color: me.color };
    // reservas vistas agora entram na memória do relógio: a expiração é anunciada mesmo se nasceu entre dois tiques
    for (const [id, lock] of this.liveMap(this.clock())) this.lastLive.set(id, lock);
  }

  private onMessage(m: WireMessage): void {
    if (this.stopped) return;
    const now = this.clock();
    if (m.t === "hello") {
      this.postPresence();
      this.hosted.forEach((p, id) => this.env.channel?.post({ t: "presence", from: id, p }));
      this.refresh();
    } else if (m.t === "presence") {
      if (m.from === this.me.id) return;
      this.peers.set(m.from, { ...m.p, id: m.from, at: now });
      this.emit();
    } else if (m.t === "commit") {
      this.refresh();
    } else {
      this.peers.delete(m.from);
      this.refresh();
      this.emit();
    }
  }

  private postPresence(): void {
    this.env.channel?.post({ t: "presence", from: this.me.id, p: this.presence });
  }

  private async beat(): Promise<void> {
    const now = this.clock();
    await this.tx((s) => ({ state: [this.me.id, ...this.hosted.keys()].reduce((acc, id) => heartbeat(acc, id, now), s), result: null }));
    this.postPresence();
    this.hosted.forEach((p, id) => this.env.channel?.post({ t: "presence", from: id, p }));
  }

  private liveMap(now: number): Map<string, RegionLock> {
    return new Map(activeLocks(this.state.locks, now).map((l) => [l.id ?? `${l.ownerId}:${l.layerId}:${l.regionIds.join(",")}`, l]));
  }

  /** A cada segundo: relógio da tela, reservas que expiraram, presença antiga e renovação por atividade. */
  tick(): void {
    if (this.stopped) return;
    const now = this.clock();
    const live = this.liveMap(now);
    let expired: RegionLock | null = null;
    for (const [id, lock] of this.lastLive) if (!live.has(id) && lock.expiresAt <= now) expired = lock;
    this.lastLive = live;
    for (const [id, p] of this.peers) if (now - p.at > PRESENCE_WINDOW_MS && !this.hosted.has(id)) this.peers.delete(id);
    if (now - this.lastActivity <= ACTIVE_WINDOW_MS) {
      for (const lock of live.values()) {
        if (lock.ownerId !== this.me.id || !lock.id || lock.expiresAt - now > AUTO_RENEW_BEFORE_MS || this.renewing.has(lock.id)) continue;
        this.renewing.add(lock.id);
        void this.renew(lock, undefined, true).finally(() => this.renewing.delete(lock.id!));
      }
    }
    if (expired) this.notify({ type: "expirou", lock: expired });
    else this.emit();
  }

  private notify(e: SessionEvent): void {
    this.event = { id: ++this.eventSeq, e };
    this.emit();
  }

  private buildSnapshot(): SessionSnapshot {
    const undo = this.history.undo.at(-1);
    const redo = this.history.redo.at(-1);
    return {
      state: this.state,
      me: this.me,
      now: this.clock(),
      peers: [...this.peers.values()].sort((a, b) => a.name.localeCompare(b.name)),
      canUndo: !!undo,
      canRedo: !!redo,
      undoLabel: undo?.label ?? null,
      redoLabel: redo?.label ?? null,
      draft: this.draft,
      event: this.event,
      transport: this.env.channel ? "broadcast" : "local",
      hostingBot: this.botHostedHere,
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }
}

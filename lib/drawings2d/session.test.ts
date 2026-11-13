import { describe, expect, it } from "vitest";
import { LOCK_TTL_MS } from "@/lib/pieces/collab";
import { BOT_REGION, BotRunner, botCycle } from "./bot";
import { movePatch, setGeomPatch } from "./commands";
import { DEMO_BOT, DEMO_START_LAYER, demoDrawing } from "./fixture";
import { shapeById, type ViewState } from "./model";
import { CollabSession, type Timers } from "./session";
import { localMutex, memoryStore, openChannel, parseWire, type BroadcastCtor, type SharedStore, type TxLock } from "./transport";

const VIEW: ViewState = { activeLayerId: DEMO_START_LAYER, hiddenLayerIds: [] };
const T0 = 1_700_000_000_000;

/** BroadcastChannel simulado: entrega às OUTRAS instâncias de mesmo nome, de forma assíncrona e com cópia (como o navegador). */
function fakeBroadcast() {
  const rooms = new Map<string, Set<{ onmessage: ((e: { data: unknown }) => void) | null }>>();
  const sent: unknown[] = [];
  class FakeChannel {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    constructor(private readonly name: string) {
      const room = rooms.get(name) ?? new Set();
      room.add(this);
      rooms.set(name, room);
    }
    postMessage(data: unknown) {
      const copy = structuredClone(data);
      sent.push(copy);
      for (const other of rooms.get(this.name) ?? []) if (other !== this) queueMicrotask(() => other.onmessage?.({ data: copy }));
    }
    close() {
      rooms.get(this.name)?.delete(this);
    }
  }
  return { Ctor: FakeChannel as unknown as BroadcastCtor, sent, size: (name: string) => rooms.get(name)?.size ?? 0 };
}

/** Temporizadores manuais: nada roda sozinho; o teste avança o relógio e dispara os intervalos. */
function manualTimers() {
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();
  let next = 1;
  const timers: Timers = {
    setInterval: (fn) => { intervals.set(next, fn); return next++; },
    clearInterval: (id) => { intervals.delete(id as number); },
    setTimeout: (fn) => { timeouts.set(next, fn); return next++; },
    clearTimeout: (id) => { timeouts.delete(id as number); },
  };
  return { timers, runTimeouts: () => { const fns = [...timeouts.values()]; timeouts.clear(); fns.forEach((f) => f()); } };
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

function tab(id: string, name: string, shared: { store: SharedStore; lock: TxLock; Ctor: BroadcastCtor; clock: { now: number } }) {
  const t = manualTimers();
  const session = new CollabSession({
    pieceId: "demo-fachada",
    me: { id, name },
    store: shared.store,
    lock: shared.lock,
    channel: openChannel("demo-fachada", shared.Ctor),
    seed: () => demoDrawing(),
    now: () => shared.clock.now,
    timers: t.timers,
  });
  return { session, ...t };
}

const setup = () => {
  const bc = fakeBroadcast();
  const shared = { store: memoryStore(), lock: localMutex(), Ctor: bc.Ctor, clock: { now: T0 } };
  return { bc, shared };
};

describe("transporte entre abas (BroadcastChannel simulado)", () => {
  it("canal com o nome da peça; mensagem malformada é ignorada; sem BroadcastChannel a peça fica só nesta aba", () => {
    const bc = fakeBroadcast();
    const ch = openChannel("demo-fachada", bc.Ctor)!;
    expect(bc.size("ws-drawings-demo-fachada")).toBe(1);
    ch.close();
    expect(bc.size("ws-drawings-demo-fachada")).toBe(0);
    expect(openChannel("x", null)).toBeNull();
    expect(parseWire({ t: "commit", from: "a", seq: "1" })).toBeNull();
    expect(parseWire({ t: "presence", from: "a", p: { name: "Ana", color: "green", kind: "ROBO" } })).toBeNull();
    expect(parseWire({ t: "presence", from: "a", p: { name: "Ana", color: "green", kind: "SIMULADA", cursor: { x: Number.NaN, y: 1 }, selection: ["s-js1", 3] } }))
      .toEqual({ t: "presence", from: "a", p: { name: "Ana", color: "green", kind: "SIMULADA", cursor: null, selection: ["s-js1"], activity: null } });
  });

  it("duas abas: presença com nome e cor, reserva vista pela outra, conflito explicado e edição recusada na região alheia", async () => {
    const { shared } = setup();
    const a = tab("tab-a", "Pessoa exemplo", shared);
    const b = tab("tab-b", "Pessoa exemplo", shared);
    await a.session.start();
    await b.session.start();
    await flush();
    const sa = () => a.session.getSnapshot();
    const sb = () => b.session.getSnapshot();
    expect(sb().me.name).toBe("Pessoa exemplo (2)");
    expect(sb().me.color).not.toBe(sa().me.color);
    expect(sb().transport).toBe("broadcast");
    expect(sa().peers.map((p) => p.id)).toEqual(["tab-b"]);

    a.session.setPresence({ cursor: { x: 200, y: 500 }, selection: ["s-porta"] });
    a.runTimeouts();
    await flush();
    expect(sb().peers[0]).toMatchObject({ id: "tab-a", cursor: { x: 200, y: 500 }, selection: ["s-porta"] });

    const r = await a.session.reserve("esquadrias", ["fachada/terreo"]);
    expect(r.ok).toBe(true);
    await flush();
    expect(sb().state.locks).toMatchObject([{ ownerId: "tab-a", regionIds: ["fachada/terreo"] }]);
    const denied = await b.session.reserve("esquadrias", ["fachada"]);
    expect(denied).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA", lock: { ownerId: "tab-a" } } });
    expect(sb().event?.e).toMatchObject({ type: "negado", action: "reservar" });

    const patchB = movePatch(sb().state.doc, "tab-b", ["s-porta"], 10, 0)!;
    expect(await b.session.commit([{ patch: patchB, view: VIEW }])).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA" } });
    const patchA = movePatch(sa().state.doc, "tab-a", ["s-porta"], 10, 0)!;
    expect((await a.session.commit([{ patch: patchA, view: VIEW }])).ok).toBe(true);
    await flush();
    expect(shapeById(sb().state.doc, "s-porta")!.geom).toMatchObject({ x: 400 });
    expect(sb().event?.e).toMatchObject({ type: "remoto", entry: { kind: "PATCH", actorId: "tab-a" } });

    // a aba A sai: a reserva dela é liberada e ela some da presença da B
    await a.session.stop();
    await flush();
    expect(sb().state.locks).toEqual([]);
    expect(sb().peers).toEqual([]);
    expect((await b.session.reserve("esquadrias", ["fachada/terreo"])).ok).toBe(true);
    await b.session.stop();
  });

  it("reserva que expira: a aba percebe no relógio e anuncia; ativa, a pessoa tem a reserva renovada sozinha", async () => {
    const { shared } = setup();
    const a = tab("tab-a", "Pessoa", shared);
    const b = tab("tab-b", "Outra", shared);
    await a.session.start();
    await b.session.start();
    await b.session.reserve("esquadrias", ["fachada/terreo"], 30_000);
    await flush();
    shared.clock.now = T0 + 30_001;
    a.session.tick();
    expect(a.session.getSnapshot().event?.e).toMatchObject({ type: "expirou", lock: { ownerId: "tab-b" } });

    // A edita (fica ativa) e a reserva automática dela é renovada perto do fim do prazo
    const p = movePatch(a.session.getSnapshot().state.doc, "tab-a", ["s-porta"], 10, 0)!;
    expect((await a.session.commit([{ patch: p, view: VIEW }])).ok).toBe(true);
    const lock = a.session.getSnapshot().state.locks.find((l) => l.ownerId === "tab-a")!;
    shared.clock.now = lock.expiresAt - 20_000;
    a.session.touch(); // mexeu na prancheta há pouco
    shared.clock.now = lock.expiresAt - 5_000;
    a.session.tick();
    await flush();
    const renewed = a.session.getSnapshot().state.locks.find((l) => l.ownerId === "tab-a")!;
    expect(renewed.expiresAt).toBe(shared.clock.now + LOCK_TTL_MS);
    expect(a.session.getSnapshot().event?.e).toMatchObject({ type: "renovou", auto: true });
    // parada (sem atividade há mais de 45 s): não renova e a reserva expira
    shared.clock.now = renewed.expiresAt - 5_000;
    a.session.tick();
    await flush();
    expect(a.session.getSnapshot().state.locks.find((l) => l.ownerId === "tab-a")!.expiresAt).toBe(renewed.expiresAt);
    shared.clock.now = renewed.expiresAt + 1;
    a.session.tick();
    expect(a.session.getSnapshot().event?.e).toMatchObject({ type: "expirou", lock: { ownerId: "tab-a" } });
    await a.session.stop();
    await b.session.stop();
  });

  it("desfazer recusado quando outra aba mexeu depois; patch com revisão antiga vira rascunho para reconciliar", async () => {
    const { shared } = setup();
    const a = tab("tab-a", "A", shared);
    const b = tab("tab-b", "B", shared);
    await a.session.start();
    await b.session.start();
    const doc0 = a.session.getSnapshot().state.doc;
    expect((await a.session.commit([{ patch: movePatch(doc0, "tab-a", ["s-porta"], 10, 0)!, view: VIEW }])).ok).toBe(true);
    expect(a.session.getSnapshot()).toMatchObject({ canUndo: true, undoLabel: { key: "drw2d.op.move" } });
    // A libera; B reserva e altera a mesma porta
    const lockA = a.session.getSnapshot().state.locks[0]!;
    await a.session.release(lockA);
    await flush();
    const docB = b.session.getSnapshot().state.doc;
    expect((await b.session.commit([{ patch: movePatch(docB, "tab-b", ["s-porta"], 0, -10)!, view: VIEW }])).ok).toBe(true);
    await flush();
    await b.session.release(b.session.getSnapshot().state.locks[0]!);
    await flush();
    expect(await a.session.undo(VIEW)).toMatchObject({ ok: false, denial: { code: "REVISAO_DESATUALIZADA", shapeId: "s-porta" } });
    expect(shapeById(a.session.getSnapshot().state.doc, "s-porta")!.geom).toMatchObject({ x: 400, y: 440 });

    // patch montado sobre a revisão antiga: recusado, guardado como rascunho, reaplicado só por decisão da pessoa
    const stale = setGeomPatch(doc0, "tab-a", "s-porta", { kind: "retangulo", x: 390, y: 450, w: 110, h: 150 })!;
    expect((await a.session.commit([{ patch: stale, view: VIEW }])).ok).toBe(false);
    expect(a.session.getSnapshot().draft).toMatchObject({ denial: { code: "REVISAO_DESATUALIZADA" } });
    expect((await a.session.reapplyDraft())?.ok).toBe(true);
    expect(shapeById(a.session.getSnapshot().state.doc, "s-porta")!.geom).toMatchObject({ w: 110 });
    expect(a.session.getSnapshot().draft).toBeNull();
    await a.session.stop();
    await b.session.stop();
  });
});

describe("ciclo de vida da sessão", () => {
  it("parada antes de terminar de entrar (StrictMode): sai da peça e não liga relógio, canal nem batimento", async () => {
    const { shared, bc } = setup();
    const a = tab("tab-a", "A", shared);
    const starting = a.session.start();
    const stopping = a.session.stop();
    await starting;
    await stopping;
    await flush();
    expect(shared.store.read()!.participants["tab-a"]!.lastSeen).toBe(0);
    expect(bc.sent.filter((m) => (m as { t: string }).t === "hello")).toHaveLength(0);
    expect(bc.size("ws-drawings-demo-fachada")).toBe(0);
  });
});

describe("colaboradora simulada (determinística)", () => {
  it("roteiro: ciclo par sobe as janelas a 120 cm e libera; ciclo ímpar volta a 100 cm e deixa a reserva de 30 s expirar", () => {
    const even = botCycle(0).map((s) => s.action.kind);
    expect(even).toEqual(["cursor", "reserve", "cursor", "edit", "cursor", "edit", "cursor", "edit", "release", "cursor", "wait"]);
    expect(botCycle(1).some((s) => s.action.kind === "release")).toBe(false);
    expect(botCycle(1).find((s) => s.action.kind === "reserve")).toMatchObject({ action: { ttl: 30_000 } });
    expect(botCycle(2)).toEqual(botCycle(0));
  });

  it("reserva, edita em passos sob a reserva e libera; com a região reservada por outra pessoa, espera sem editar", async () => {
    const { shared } = setup();
    const a = tab("tab-a", "Pessoa", shared);
    await a.session.start();
    const runner = new BotRunner(a.session.actor(DEMO_BOT.id, { activeLayerId: "esquadrias", hiddenLayerIds: [] }), a.timers);
    await runner.start();
    expect(a.session.getSnapshot().hostingBot).toBe(true);
    await runner.step(); // cursor
    await runner.step(); // reserva
    expect(a.session.getSnapshot().state.locks).toMatchObject([{ ownerId: DEMO_BOT.id, regionIds: [BOT_REGION], layerId: "esquadrias" }]);
    expect(a.session.getSnapshot().peers.find((p) => p.id === DEMO_BOT.id)).toMatchObject({ name: "Ana", kind: "SIMULADA", color: "green" });
    // a pessoa não edita na região da Ana
    const doc = a.session.getSnapshot().state.doc;
    expect(await a.session.commit([{ patch: movePatch(doc, "tab-a", ["s-js1"], 10, 0)!, view: VIEW }])).toMatchObject({ ok: false, denial: { code: "REGIAO_RESERVADA", lock: { ownerId: DEMO_BOT.id } } });
    for (let i = 0; i < 6; i++) await runner.step(); // três janelas
    for (const id of ["s-js1", "s-js2", "s-js3"]) expect(shapeById(a.session.getSnapshot().state.doc, id)!.geom).toMatchObject({ h: 120 });
    await runner.step(); // libera
    expect(a.session.getSnapshot().state.locks).toEqual([]);
    await runner.stop();
    expect(a.session.getSnapshot().state.participants[DEMO_BOT.id]!.lastSeen).toBe(0);

    // a pessoa reserva o pavimento superior antes: a simulada espera (não edita) e tenta de novo
    const b = setup();
    const t = tab("tab-x", "Pessoa", b.shared);
    await t.session.start();
    await t.session.reserve("esquadrias", ["fachada/superior"]);
    const bot = new BotRunner(t.session.actor(DEMO_BOT.id, { activeLayerId: "esquadrias", hiddenLayerIds: [] }), t.timers);
    await bot.start();
    await bot.step();
    expect(await bot.step()).toBe(4000);
    expect(bot.position.index).toBe(1);
    expect(t.session.getSnapshot().peers.find((p) => p.id === DEMO_BOT.id)!.activity).toMatchObject({ key: "drw2d.bot.waiting" });
    expect(t.session.getSnapshot().state.doc.revision).toBe(1);
    await bot.stop();
    await t.session.stop();
    await a.session.stop();
  });

  it("desligada para todas as abas: libera a reserva dela e para", async () => {
    const { shared } = setup();
    const a = tab("tab-a", "Pessoa", shared);
    await a.session.start();
    const runner = new BotRunner(a.session.actor(DEMO_BOT.id, { activeLayerId: "esquadrias", hiddenLayerIds: [] }), a.timers);
    await runner.start();
    await runner.step();
    await runner.step();
    expect(a.session.getSnapshot().state.locks).toHaveLength(1);
    await a.session.setBotEnabled(false);
    expect(await runner.step()).toBe(2000);
    expect(a.session.getSnapshot().state.locks).toEqual([]);
    await runner.stop();
    await a.session.stop();
  });
});

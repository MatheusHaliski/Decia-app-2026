/**
 * Colaboradora SIMULADA da demonstração (Ana): roteiro determinístico que usa as MESMAS transações de uma pessoa —
 * reserva o Pavimento superior na camada Esquadrias, ajusta a altura das três janelas em passos, e então libera (ciclo
 * par) ou "esquece" a reserva para ela expirar sozinha (ciclo ímpar). Os valores são absolutos (120 ↔ 100 cm), então
 * recomeçar o roteiro não acumula mudança. Se a região estiver reservada por outra pessoa, ela espera e tenta de novo:
 * a simulação respeita as reservas como qualquer participante. Roda em uma aba só (liderança por Web Locks).
 */
import type { RegionLock } from "@/lib/pieces/collab";
import { setGeomPatch } from "./commands";
import type { Label } from "./engine";
import { regionById, shapeById, type Point, type ShapeGeom } from "./model";
import type { SessionActor, Timers } from "./session";
import { DEMO_BOT } from "./fixture";

export const BOT_REGION = "fachada/superior";
export const BOT_LAYER = "esquadrias";
export const BOT_WINDOWS = ["s-js1", "s-js2", "s-js3"] as const;

export type BotAction =
  | { kind: "cursor"; to: Point | null; selection: readonly string[]; activity: Label | null }
  | { kind: "reserve"; ttl: number }
  | { kind: "edit"; shapeId: string; height: number }
  | { kind: "release" }
  | { kind: "wait" };

export interface BotStep {
  /** espera ANTES de executar a ação */
  delay: number;
  action: BotAction;
}

const CENTER: Record<(typeof BOT_WINDOWS)[number], Point> = { "s-js1": { x: 215, y: 340 }, "s-js2": { x: 440, y: 343 }, "s-js3": { x: 665, y: 340 } };

/** Roteiro de um ciclo. Par: janelas a 120 cm e libera. Ímpar: volta a 100 cm, sai e deixa a reserva (30 s) expirar. */
export function botCycle(cycle: number): BotStep[] {
  const odd = cycle % 2 === 1;
  const height = odd ? 100 : 120;
  const steps: BotStep[] = [
    { delay: 1500, action: { kind: "cursor", to: { x: 300, y: 330 }, selection: [], activity: { key: "drw2d.bot.arriving" } } },
    { delay: 1500, action: { kind: "reserve", ttl: odd ? 30_000 : 60_000 } },
  ];
  for (const id of BOT_WINDOWS) {
    steps.push({ delay: 1200, action: { kind: "cursor", to: CENTER[id], selection: [id], activity: { key: "drw2d.bot.editing" } } });
    steps.push({ delay: 1800, action: { kind: "edit", shapeId: id, height } });
  }
  if (odd) {
    steps.push({ delay: 1500, action: { kind: "cursor", to: { x: 990, y: 120 }, selection: [], activity: { key: "drw2d.bot.away" } } });
    steps.push({ delay: 40_000, action: { kind: "wait" } });
  } else {
    steps.push({ delay: 1500, action: { kind: "release" } });
    steps.push({ delay: 800, action: { kind: "cursor", to: { x: 440, y: 160 }, selection: [], activity: { key: "drw2d.bot.reviewing" } } });
    steps.push({ delay: 12_000, action: { kind: "wait" } });
  }
  return steps;
}

export class BotRunner {
  private cycle = 0;
  private index = 0;
  private steps: BotStep[] = botCycle(0);
  private lock: RegionLock | null = null;
  private retries = 0;
  private timer: unknown = null;
  private running = false;

  constructor(private readonly actor: SessionActor, private readonly timers: Timers) {}

  /** Entra na peça e começa o roteiro. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.actor.join(DEMO_BOT.name, "green");
    this.schedule(this.steps[0]!.delay);
  }

  /** Para e sai da peça (as reservas dela são liberadas). */
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) this.timers.clearTimeout(this.timer);
    this.timer = null;
    this.lock = null;
    await this.actor.leave();
  }

  get position(): { cycle: number; index: number } {
    return { cycle: this.cycle, index: this.index };
  }

  private schedule(delay: number): void {
    if (!this.running) return;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      void this.step().then((next) => this.schedule(next));
    }, delay);
  }

  /** Executa a ação atual e devolve a espera até a próxima (exposto para os testes andarem passo a passo). */
  async step(): Promise<number> {
    const state = this.actor.state();
    if (state.botEnabled === false) {
      if (this.lock) await this.actor.release(this.lock);
      this.lock = null;
      this.actor.presence({ cursor: null, selection: [], activity: { key: "drw2d.bot.paused" } });
      return 2000;
    }
    const current = this.steps[this.index]!;
    const a = current.action;
    let advance = true;
    if (a.kind === "cursor") {
      const target = a.selection[0] ? shapeById(state.doc, a.selection[0]) : undefined;
      const activity = a.activity && target ? { ...a.activity, vars: { name: target.name } } : a.activity;
      this.actor.presence({ cursor: a.to, selection: a.selection, activity });
    } else if (a.kind === "reserve") {
      const r = await this.actor.reserve(BOT_LAYER, [BOT_REGION], a.ttl);
      if (r.ok) {
        this.lock = r.lock;
        this.retries = 0;
      } else if (this.retries < 5) {
        this.retries += 1;
        advance = false;
        this.actor.presence({ cursor: { x: 300, y: 330 }, selection: [], activity: { key: "drw2d.bot.waiting", vars: { region: regionById(state.doc, BOT_REGION)?.name ?? BOT_REGION } } });
      } else {
        // desiste deste ciclo: pula para a pausa final
        this.retries = 0;
        this.index = this.steps.length - 1;
        return this.steps[this.index]!.delay;
      }
    } else if (a.kind === "edit") {
      const shape = shapeById(state.doc, a.shapeId);
      if (this.lock && shape?.geom.kind === "retangulo") {
        const geom: ShapeGeom = { ...shape.geom, h: a.height };
        const patch = setGeomPatch(state.doc, this.actor.id, a.shapeId, geom, { key: "drw2d.op.height", vars: { name: shape.name, height: a.height } });
        if (patch) await this.actor.commit(patch); // recusado (reserva vencida, revisão nova) → segue o roteiro sem insistir
      }
    } else if (a.kind === "release") {
      if (this.lock) await this.actor.release(this.lock);
      this.lock = null;
    }
    if (!advance) return 4000;
    this.index += 1;
    if (this.index >= this.steps.length) {
      this.cycle += 1;
      this.index = 0;
      this.steps = botCycle(this.cycle);
      this.lock = null; // a reserva "esquecida" do ciclo ímpar vence sozinha
    }
    return this.steps[this.index]!.delay;
  }
}

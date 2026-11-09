/**
 * Cronograma pelo Método do Caminho Crítico (CPM) — RF21.CA08, RF22 (linha do tempo), RF31 (simulador).
 *
 * Rede de atividades no nó (AON) com os quatro tipos de dependência do PMBOK e defasagem (lag, em dias; negativa = antecipação):
 *   FS término→início: ES(suc) ≥ EF(pred) + lag      SS início→início:   ES(suc) ≥ ES(pred) + lag
 *   FF término→término: EF(suc) ≥ EF(pred) + lag     SF início→término:  EF(suc) ≥ ES(pred) + lag
 * Ida (forward pass) calcula ES/EF; volta (backward pass) calcula LS/LF a partir do término do projeto; folga total = LS − ES;
 * folga livre = quanto a atividade atrasa sem atrasar nenhuma sucessora. Caminho crítico = atividades com folga total zero (o
 * caminho mais longo da rede: é ele que define a duração mínima do projeto — aula "Processos de planejamento" §3.3).
 * Dias corridos a partir do início do projeto (offset 0). Função pura: a mesma entrada dá sempre a mesma saída (D-12).
 */
export type DependencyType = "FS" | "SS" | "FF" | "SF";
export const DEPENDENCY_TYPES: readonly DependencyType[] = ["FS", "SS", "FF", "SF"];

export interface SchedTask { id: string; duration: number }
export interface SchedDep { from: string; to: string; type: DependencyType; lag: number }

export interface SchedRow {
  id: string;
  duration: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  freeFloat: number;
  critical: boolean;
}

export type ScheduleResult =
  | { ok: true; rows: Record<string, SchedRow>; order: string[]; finish: number; criticalPath: string[] }
  | { ok: false; error: "CICLO"; cycle: string[] }
  | { ok: false; error: "DEPENDENCIA_INVALIDA"; detail: string };

const EPS = 1e-9;
/** Arredonda a 4 casas para não carregar erro de ponto flutuante de PERT (ex.: 7.000000000001). */
const round = (x: number) => Math.round(x * 1e4) / 1e4;

/** Ordem topológica (Kahn); devolve `null` e os nós do ciclo quando a rede não é acíclica. */
export function topologicalOrder(ids: readonly string[], deps: readonly SchedDep[]): { order: string[] } | { cycle: string[] } {
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const d of deps) {
    out.get(d.from)!.push(d.to);
    indeg.set(d.to, (indeg.get(d.to) ?? 0) + 1);
  }
  // fila estável: respeita a ordem de entrada das atividades (desempate determinístico)
  const queue = ids.filter((id) => indeg.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const nx of out.get(id)!) {
      const n = indeg.get(nx)! - 1;
      indeg.set(nx, n);
      if (n === 0) queue.push(nx);
    }
  }
  if (order.length === ids.length) return { order };
  return { cycle: ids.filter((id) => (indeg.get(id) ?? 0) > 0) };
}

/** Ligar `from → to` criaria ciclo? (há caminho de `to` até `from` na rede atual, ou é a mesma atividade). */
export function wouldCreateCycle(deps: readonly SchedDep[], from: string, to: string): boolean {
  if (from === to) return true;
  const out = new Map<string, string[]>();
  for (const d of deps) out.set(d.from, [...(out.get(d.from) ?? []), d.to]);
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(out.get(id) ?? []));
  }
  return false;
}

export function schedule(tasks: readonly SchedTask[], deps: readonly SchedDep[]): ScheduleResult {
  const ids = tasks.map((t) => t.id);
  const dur = new Map(tasks.map((t) => [t.id, Math.max(0, t.duration)]));
  for (const d of deps) {
    if (!dur.has(d.from) || !dur.has(d.to)) return { ok: false, error: "DEPENDENCIA_INVALIDA", detail: `${d.from}→${d.to}` };
    if (d.from === d.to) return { ok: false, error: "CICLO", cycle: [d.from] };
  }
  const topo = topologicalOrder(ids, deps);
  if ("cycle" in topo) return { ok: false, error: "CICLO", cycle: topo.cycle };
  const { order } = topo;
  const preds = new Map<string, SchedDep[]>(ids.map((id) => [id, []]));
  const succs = new Map<string, SchedDep[]>(ids.map((id) => [id, []]));
  for (const d of deps) {
    preds.get(d.to)!.push(d);
    succs.get(d.from)!.push(d);
  }

  // ida
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const d = dur.get(id)!;
    let start = 0;
    for (const p of preds.get(id)!) {
      const pes = es.get(p.from)!;
      const pef = ef.get(p.from)!;
      const bound =
        p.type === "FS" ? pef + p.lag
        : p.type === "SS" ? pes + p.lag
        : p.type === "FF" ? pef + p.lag - d
        : pes + p.lag - d; // SF
      start = Math.max(start, bound);
    }
    es.set(id, round(start));
    ef.set(id, round(start + d));
  }
  const finish = round(Math.max(0, ...order.map((id) => ef.get(id)!)));

  // volta
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const d = dur.get(id)!;
    let late = finish;
    for (const s of succs.get(id)!) {
      const sls = ls.get(s.to)!;
      const slf = lf.get(s.to)!;
      const bound =
        s.type === "FS" ? sls - s.lag
        : s.type === "SS" ? sls - s.lag + d
        : s.type === "FF" ? slf - s.lag
        : slf - s.lag + d; // SF
      late = Math.min(late, bound);
    }
    lf.set(id, round(late));
    ls.set(id, round(late - d));
  }

  const rows: Record<string, SchedRow> = {};
  for (const id of order) {
    const d = dur.get(id)!;
    const out = succs.get(id)!;
    const free = out.length
      ? Math.min(...out.map((s) => {
          const ses = es.get(s.to)!;
          const sef = ef.get(s.to)!;
          return s.type === "FS" ? ses - s.lag - ef.get(id)!
            : s.type === "SS" ? ses - s.lag - es.get(id)!
            : s.type === "FF" ? sef - s.lag - ef.get(id)!
            : sef - s.lag - es.get(id)!;
        }))
      : finish - ef.get(id)!;
    const totalFloat = round(ls.get(id)! - es.get(id)!);
    rows[id] = {
      id, duration: d, es: es.get(id)!, ef: ef.get(id)!, ls: ls.get(id)!, lf: lf.get(id)!,
      totalFloat, freeFloat: round(Math.max(0, free)), critical: Math.abs(totalFloat) < EPS,
    };
  }
  const criticalPath = order.filter((id) => rows[id]!.critical);
  return { ok: true, rows, order, finish, criticalPath };
}

/** Caminhos de início a fim (para ensinar "liste todos os caminhos, some, o maior é o crítico"); só FS sem lag fazem sentido aqui. */
export function enumeratePaths(tasks: readonly SchedTask[], deps: readonly SchedDep[], limit = 50): { ids: string[]; length: number }[] {
  const dur = new Map(tasks.map((t) => [t.id, t.duration]));
  const hasPred = new Set(deps.map((d) => d.to));
  const out = new Map<string, SchedDep[]>();
  for (const d of deps) out.set(d.from, [...(out.get(d.from) ?? []), d]);
  const paths: { ids: string[]; length: number }[] = [];
  const walk = (id: string, acc: string[], len: number, seen: Set<string>) => {
    if (paths.length >= limit || seen.has(id)) return;
    const nextSeen = new Set(seen).add(id);
    const ids = [...acc, id];
    const total = len + (dur.get(id) ?? 0);
    const nx = out.get(id) ?? [];
    if (!nx.length) {
      paths.push({ ids, length: round(total) });
      return;
    }
    for (const d of nx) walk(d.to, ids, total + d.lag, nextSeen);
  };
  for (const t of tasks) if (!hasPred.has(t.id)) walk(t.id, [], 0, new Set());
  return paths.sort((a, b) => b.length - a.length);
}

/** Offset em dias corridos → data ISO (AAAA-MM-DD) a partir do início do projeto. */
export function offsetToDate(startIso: string, offsetDays: number): string {
  const [y, m, d] = startIso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + Math.floor(offsetDays + EPS));
  return dt.toISOString().slice(0, 10);
}

/** Data ISO → offset em dias corridos desde o início do projeto (negativo antes do início). */
export function dateToOffset(startIso: string, dateIso: string): number {
  const a = Date.parse(`${startIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

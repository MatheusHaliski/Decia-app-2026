/**
 * Janelas segmentadas do visualizador de card: 2 ou 3 painéis lado a lado, cada um com uma janela escolhida pela pessoa, e as
 * proporções ajustadas pelos divisores (arrastar ou setas). Funções puras + leitura/escrita da preferência local (por conta e por
 * tipo de card), sempre com try/catch: sem armazenamento, só não lembra.
 */
export const WINDOW_IDS = ["resumo", "atividade", "relacoes", "arquivos", "previa", "melhorias"] as const;
export type WindowId = (typeof WINDOW_IDS)[number];
export type PaneCount = 2 | 3;

export interface ViewerLayout { count: PaneCount; panes: WindowId[]; ratios: number[] }

/** Menor fatia de um painel (fração da largura). */
export const MIN_RATIO = 0.18;
export const STEP = 0.05;

export const DEFAULT_PANES: Record<PaneCount, WindowId[]> = {
  2: ["resumo", "previa"],
  3: ["resumo", "previa", "melhorias"],
};

const round = (x: number) => Math.round(x * 1000) / 1000;
export const evenRatios = (n: number) => Array.from({ length: n }, () => round(1 / n));

export const defaultLayout = (count: PaneCount = 2): ViewerLayout => ({ count, panes: [...DEFAULT_PANES[count]], ratios: evenRatios(count) });

const isWindow = (x: unknown): x is WindowId => typeof x === "string" && (WINDOW_IDS as readonly string[]).includes(x);

/** Conserta qualquer coisa lida do armazenamento: quantidade 2/3, janelas válidas e sem repetição, proporções que somam 1. */
export function normalizeLayout(raw: unknown): ViewerLayout {
  if (!raw || typeof raw !== "object") return defaultLayout();
  const r = raw as Partial<ViewerLayout>;
  const count: PaneCount = r.count === 3 ? 3 : 2;
  const panes: WindowId[] = [];
  for (const p of Array.isArray(r.panes) ? r.panes : []) if (isWindow(p) && !panes.includes(p) && panes.length < count) panes.push(p);
  for (const p of [...DEFAULT_PANES[count], ...WINDOW_IDS]) if (panes.length < count && !panes.includes(p)) panes.push(p);
  const ratios = Array.isArray(r.ratios) && r.ratios.length === count && r.ratios.every((x) => typeof x === "number" && Number.isFinite(x) && x >= MIN_RATIO)
    ? r.ratios
    : evenRatios(count);
  const sum = ratios.reduce((a, b) => a + b, 0);
  return { count, panes, ratios: ratios.map((x) => round(x / sum)) };
}

/** Muda a quantidade de painéis, mantendo as janelas que já estavam na frente. */
export function withCount(layout: ViewerLayout, count: PaneCount): ViewerLayout {
  if (layout.count === count) return layout;
  return normalizeLayout({ count, panes: layout.panes, ratios: evenRatios(count) });
}

/** Põe a janela `win` no painel `index`; se ela já estava noutro painel, os dois trocam de lugar (nunca a mesma janela duas vezes). */
export function assignWindow(layout: ViewerLayout, index: number, win: WindowId): ViewerLayout {
  if (index < 0 || index >= layout.count) return layout;
  const panes = [...layout.panes];
  const other = panes.indexOf(win);
  if (other === index) return layout;
  if (other >= 0) panes[other] = panes[index]!;
  panes[index] = win;
  return { ...layout, panes };
}

/** Mostra a janela `win` (aba do visualizador): se já está num painel, nada muda; senão entra no ÚLTIMO painel. */
export function showWindow(layout: ViewerLayout, win: WindowId): ViewerLayout {
  return layout.panes.includes(win) ? layout : assignWindow(layout, layout.count - 1, win);
}

/**
 * Move o divisor `sep` (entre o painel `sep` e o `sep + 1`) em `delta` (fração da largura): só os dois vizinhos mudam, cada um
 * com pelo menos `MIN_RATIO`; a soma continua 1.
 */
export function resizeAt(ratios: readonly number[], sep: number, delta: number): number[] {
  if (sep < 0 || sep >= ratios.length - 1) return [...ratios];
  const a = ratios[sep]!;
  const b = ratios[sep + 1]!;
  const pair = a + b;
  const nextA = Math.max(MIN_RATIO, Math.min(pair - MIN_RATIO, a + delta));
  const out = [...ratios];
  out[sep] = round(nextA);
  out[sep + 1] = round(pair - nextA);
  return out;
}

/** Posição do divisor (soma das fatias à esquerda) → nova proporção, a partir de um ponto do arraste (0–1 da largura). */
export function resizeToPoint(ratios: readonly number[], sep: number, point: number): number[] {
  const before = ratios.slice(0, sep).reduce((s, x) => s + x, 0);
  return resizeAt(ratios, sep, point - before - ratios[sep]!);
}

/** Valor do divisor para leitores de tela: % da largura à esquerda dele. */
export const separatorValue = (ratios: readonly number[], sep: number) => Math.round(ratios.slice(0, sep + 1).reduce((s, x) => s + x, 0) * 100);

/** `grid-template-columns` das telas largas: painéis em `fr` com uma faixa fixa para cada divisor. */
export const gridColumns = (ratios: readonly number[]) => ratios.map((r) => `minmax(0,${r}fr)`).join(" 0.75rem ");

/* ── preferência local, por conta e tipo de card ─────────────────────────────────────────────────────────────── */

export const layoutKey = (account: string, kind: string) => `ws.cardviewer.layout.v1.${account || "anon"}.${kind}`;

export function loadLayout(account: string, kind: string): ViewerLayout {
  try {
    const raw = window.localStorage.getItem(layoutKey(account, kind));
    return raw ? normalizeLayout(JSON.parse(raw)) : defaultLayout();
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(account: string, kind: string, layout: ViewerLayout): void {
  try {
    window.localStorage.setItem(layoutKey(account, kind), JSON.stringify(layout));
  } catch {
    /* armazenamento indisponível: só não lembra */
  }
}

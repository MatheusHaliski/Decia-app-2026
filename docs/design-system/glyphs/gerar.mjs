#!/usr/bin/env node
// WS Glyphs — gerador. Regra de forma: todo ícone nasce do MONITOR do logo (moldura arredondada + base) ou da MALHA de nós.
// Grade 24 px, traço 1,75, duas variantes: --outline (currentColor) e --clay (carcaça ink preenchida, brilho superior,
// detalhes creme, nós coloridos). Cores via var(--ws-*) com fallback literal (funciona inline e como <img>).
// Gera: svg/<nome>--outline.svg, svg/<nome>--clay.svg, svg/moji-<nome>.svg, catalog.ts, GLYPHS.md, index.html.
// Uso: node docs/design-system/glyphs/gerar.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, THEME_IDS, BRAND, NODES } from '../anatomias/lib/tokens-ws.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SW = 1.75;
const V = (name, fb) => `var(--ws-${name}, ${fb})`;
const INK = V('ink', BRAND.ink[0]), CREAM = V('cream', BRAND.cream[0]);
const NODE = (k) => V(`node-${k}`, NODES[k][0]);
const SCREEN = V('glyph-screen', '#47443C');
const SHINE = V('glyph-shine', 'rgba(102,99,98,.55)');
const RIM = V('glyph-rim', 'transparent');

/* ---------------- primitivas ---------------- */
const S = (d, { sw = SW, color = 'currentColor', dash, cls } = {}) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}${cls ? ` class="${cls}"` : ''}/>`;
const F = (d, color = 'currentColor', cls) => `<path d="${d}" fill="${color}" stroke="none"${cls ? ` class="${cls}"` : ''}/>`;
const C = (cx, cy, r, { fill = 'none', stroke = 'none', sw = SW, cls } = {}) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}"${stroke !== 'none' ? ` stroke-width="${sw}"` : ''}${cls ? ` class="${cls}"` : ''}/>`;
const R = (x, y, w, h, rx, { fill = 'none', stroke = 'none', sw = SW, cls, op } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"${stroke !== 'none' ? ` stroke-width="${sw}"` : ''}${cls ? ` class="${cls}"` : ''}${op != null ? ` opacity="${op}"` : ''}/>`;

/** Monitor padrão: moldura 2.5..21.5 × 3..15.5 (rx 2.5), pescoço e base. Tela útil: x 5..19, y 5.5..13, centro (12, 9.25). */
const MON = { x: 2.5, y: 3, w: 19, h: 12.5, rx: 2.5 };
function monitorOutline(m = MON, { stand = true } = {}) {
  const cx = m.x + m.w / 2, by = m.y + m.h;
  return R(m.x, m.y, m.w, m.h, m.rx, { stroke: 'currentColor' }) + (stand ? S(`M${cx} ${by}v2.5`) + S(`M${cx - 3.5} ${by + 5}h7`) : '');
}
function monitorClay(m = MON, { stand = true, screen = true } = {}) {
  const cx = m.x + m.w / 2, by = m.y + m.h, inset = 1.75;
  let s = R(m.x, m.y, m.w, m.h, m.rx, { fill: INK, stroke: RIM, sw: 0.75 });
  // brilho superior (clay): faixa clara no topo da carcaça
  s += `<path d="M${m.x + m.rx} ${m.y + 0.6}h${m.w - 2 * m.rx}a${m.rx - 0.6} ${m.rx - 0.6} 0 0 1 ${m.rx - 0.6} ${m.rx - 0.6}v0.6h-${m.w - 1.2}v-0.6a${m.rx - 0.6} ${m.rx - 0.6} 0 0 1 ${m.rx - 0.6}-${m.rx - 0.6}z" fill="${SHINE}"/>`;
  if (screen) s += R(m.x + inset, m.y + inset, m.w - 2 * inset, m.h - 2 * inset, Math.max(1, m.rx - 1.25), { fill: SCREEN });
  if (stand) s += R(cx - 1, by - 0.5, 2, 3.25, 0.5, { fill: INK }) + R(cx - 3.75, by + 2.25, 7.5, 2, 1, { fill: INK });
  return s;
}
/** Tela do monitor com borda de 1px de separação em dark (clay). */
const gear = (cx, cy, color, filled) => {
  let s = C(cx, cy, filled ? 1.6 : 2.1, filled ? { fill: color } : { stroke: color, sw: 1.6 });
  for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6, r1 = filled ? 2.4 : 2.9, r2 = 4.1; s += S(`M${(cx + Math.cos(a) * r1).toFixed(2)} ${(cy + Math.sin(a) * r1).toFixed(2)}L${(cx + Math.cos(a) * r2).toFixed(2)} ${(cy + Math.sin(a) * r2).toFixed(2)}`, { color, sw: SW }); }
  return s;
};
const spark = (cx, cy, r) => `M${cx} ${cy - r}l${r * 0.29} ${r * 0.71} ${r * 0.71} ${r * 0.29}-${r * 0.71} ${r * 0.29}-${r * 0.29} ${r * 0.71}-${r * 0.29}-${r * 0.71}-${r * 0.71}-${r * 0.29} ${r * 0.71}-${r * 0.29}z`;

/* ---------------- catálogo (17 glyphs) ----------------
 * Cada glyph: { label, forma, nodes, outline(): string, clay(): string }. `nodes` = tokens de nó usados como detalhe. */
const prompt = (x, y, color = 'currentColor', sw = SW) => S(`M${x} ${y - 2.25}l2.25 2.25-2.25 2.25`, { color, sw });
const underscore = (x, y, color = 'currentColor', sw = SW) => S(`M${x} ${y + 2.25}h3`, { color, sw });

export const GLYPHS = {
  'criar-tarefa': {
    label: 'Criar tarefa', forma: 'monitor com `>+` na tela: o prompt abre e o sinal de mais cria', nodes: ['green'],
    outline: () => monitorOutline() + prompt(7, 9.25) + S('M14.5 6.5v5.5') + S('M11.75 9.25h5.5'),
    clay: () => monitorClay() + prompt(7, 9.25, CREAM) + S('M14.5 6.5v5.5', { color: NODE('green') }) + S('M11.75 9.25h5.5', { color: NODE('green') }),
  },
  'criar-projeto': {
    label: 'Criar projeto', forma: 'três monitores pequenos ligados em triângulo pela malha; cada tela tem um nó', nodes: ['red', 'blue', 'green'],
    outline: () => {
      const a = { x: 1.5, y: 3, w: 8, h: 5.5, rx: 1.5 }, b = { x: 14.5, y: 3, w: 8, h: 5.5, rx: 1.5 }, c = { x: 8, y: 14.5, w: 8, h: 5.5, rx: 1.5 };
      return S('M9.5 5.75h5') + S('M7 8.5l3.5 6') + S('M17 8.5l-3.5 6') +
        [a, b, c].map((m) => R(m.x, m.y, m.w, m.h, m.rx, { stroke: 'currentColor' })).join('') +
        C(5.5, 5.75, 1.1, { fill: NODE('red') }) + C(18.5, 5.75, 1.1, { fill: NODE('blue') }) + C(12, 17.25, 1.1, { fill: NODE('green') }) +
        S('M5.5 8.5v1.5') + S('M18.5 8.5v1.5') + S('M12 20v1.5');
    },
    clay: () => {
      const a = { x: 1.5, y: 3, w: 8, h: 5.5, rx: 1.5 }, b = { x: 14.5, y: 3, w: 8, h: 5.5, rx: 1.5 }, c = { x: 8, y: 14.5, w: 8, h: 5.5, rx: 1.5 };
      return S('M9.5 5.75h5', { color: V('orange-500', BRAND['orange-500'][0]) }) + S('M7 8.5l3.5 6', { color: V('orange-500', BRAND['orange-500'][0]) }) + S('M17 8.5l-3.5 6', { color: V('orange-500', BRAND['orange-500'][0]) }) +
        [a, b, c].map((m) => monitorClay(m, { stand: false })).join('') +
        C(5.5, 5.75, 1.2, { fill: NODE('red') }) + C(18.5, 5.75, 1.2, { fill: NODE('blue') }) + C(12, 17.25, 1.2, { fill: NODE('green') });
    },
  },
  'sessao-decia': {
    label: 'Sessão DECIA', forma: 'monitor com balão de fala e o prompt `>_` dentro do balão', nodes: ['orange'],
    outline: () => monitorOutline() + S('M6 5.75h12a1 1 0 0 1 1 1v3.75a1 1 0 0 1-1 1h-7.5l-2.5 2v-2H6a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1z') + prompt(8.25, 8.6, 'currentColor', 1.5) + S('M12.5 10.5h3.5', { sw: 1.5 }),
    clay: () => monitorClay() + F('M6 5.75h12a1 1 0 0 1 1 1v3.75a1 1 0 0 1-1 1h-7.5l-2.5 2v-2H6a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1z', CREAM) + prompt(8.25, 8.6, INK, 1.5) + S('M12.5 10.5h3.5', { color: V('orange-600', BRAND['orange-600'][0]), sw: 1.5 }),
  },
  notificacoes: {
    label: 'Notificações', forma: 'monitor com um nó pulsando no centro da tela (anéis concêntricos)', nodes: ['orange'],
    outline: () => monitorOutline() + C(12, 9.25, 1.75, { fill: NODE('orange'), cls: 'ws-node' }) + C(12, 9.25, 4, { stroke: 'currentColor', sw: 1.4, cls: 'ws-pulse' }),
    clay: () => monitorClay() + C(12, 9.25, 4.25, { stroke: CREAM, sw: 1.1, cls: 'ws-pulse' }) + C(12, 9.25, 2, { fill: NODE('orange'), cls: 'ws-node' }),
  },
  perfil: {
    label: 'Perfil', forma: 'monitor com avatar (cabeça e ombros) na tela', nodes: [],
    outline: () => monitorOutline() + C(12, 8, 2.1, { stroke: 'currentColor' }) + S('M7.75 13.25c0-2.1 1.9-3.25 4.25-3.25s4.25 1.15 4.25 3.25'),
    clay: () => monitorClay() + C(12, 8, 2.1, { fill: CREAM }) + F('M7.5 13.25c0-2.3 2-3.5 4.5-3.5s4.5 1.2 4.5 3.5z', CREAM),
  },
  configuracoes: {
    label: 'Configurações', forma: 'monitor com engrenagem na tela', nodes: [],
    outline: () => monitorOutline() + gear(12, 9.25, 'currentColor', false),
    clay: () => monitorClay() + gear(12, 9.25, CREAM, true),
  },
  acervo: {
    label: 'Acervo', forma: 'pilha de telas: dois monitores atrás, um na frente com base', nodes: ['blue'],
    outline: () => R(7, 2, 14, 3.5, 1.5, { stroke: 'currentColor' }) + R(4.5, 5, 15, 3, 1.5, { stroke: 'currentColor' }) + monitorOutline({ x: 2.5, y: 7.5, w: 19, h: 8, rx: 2.5 }) + S('M7 11.5h7') + C(16.5, 11.5, 1.1, { fill: NODE('blue') }),
    clay: () => R(7, 2, 14, 3.5, 1.5, { fill: INK, op: 0.45 }) + R(4.5, 5, 15, 3, 1.5, { fill: INK, op: 0.7 }) + monitorClay({ x: 2.5, y: 7.5, w: 19, h: 8, rx: 2.5 }) + S('M7 11.5h7', { color: CREAM }) + C(16.5, 11.5, 1.2, { fill: NODE('blue') }),
  },
  mesa: {
    label: 'Mesa', forma: 'monitor com grade kanban: três colunas e cartões (nós) distribuídos', nodes: ['red', 'yellow', 'green'],
    outline: () => monitorOutline() + S('M9.25 5.75v7', { sw: 1.4 }) + S('M14.75 5.75v7', { sw: 1.4 }) + R(5.25, 6.25, 2.75, 2.25, 0.6, { fill: NODE('red') }) + R(5.25, 9.5, 2.75, 2.25, 0.6, { fill: 'currentColor' }) + R(10.6, 6.25, 2.75, 2.25, 0.6, { fill: NODE('yellow') }) + R(16, 6.25, 2.75, 2.25, 0.6, { fill: NODE('green') }),
    clay: () => monitorClay() + S('M9.25 5.75v7', { color: CREAM, sw: 0.9 }) + S('M14.75 5.75v7', { color: CREAM, sw: 0.9 }) + R(5.25, 6.25, 2.75, 2.25, 0.6, { fill: NODE('red') }) + R(5.25, 9.5, 2.75, 2.25, 0.6, { fill: CREAM }) + R(10.6, 6.25, 2.75, 2.25, 0.6, { fill: NODE('yellow') }) + R(16, 6.25, 2.75, 2.25, 0.6, { fill: NODE('green') }),
  },
  'tarefa-do-dia': {
    label: 'Tarefa do dia', forma: 'monitor com sol nascendo no horizonte da tela', nodes: ['yellow'],
    outline: () => monitorOutline() + S('M6 12h12') + S('M8.75 12a3.25 3.25 0 0 1 6.5 0') + S('M12 5v2') + S('M7.75 6.75l1.4 1.4') + S('M16.25 6.75l-1.4 1.4'),
    clay: () => monitorClay() + S('M6 12.25h12', { color: CREAM, sw: 1.2 }) + F('M8.75 12.25a3.25 3.25 0 0 1 6.5 0z', NODE('yellow')) + S('M12 5v2', { color: NODE('yellow'), sw: 1.5 }) + S('M7.75 6.75l1.4 1.4', { color: NODE('yellow'), sw: 1.5 }) + S('M16.25 6.75l-1.4 1.4', { color: NODE('yellow'), sw: 1.5 }),
  },
  hype: {
    label: 'Hype', forma: 'monitor com gráfico subindo; os pontos do gráfico são nós', nodes: ['red', 'yellow', 'green'],
    outline: () => monitorOutline() + S('M6 12l3.5-3 2.5 2 5.5-4.75') + S('M15 6.25h2.5v2.5') + C(9.5, 9, 1, { fill: NODE('red') }) + C(12, 11, 1, { fill: NODE('yellow') }),
    clay: () => monitorClay() + S('M6 12l3.5-3 2.5 2 5.5-4.75', { color: CREAM }) + S('M15 6.25h2.5v2.5', { color: NODE('green') }) + C(9.5, 9, 1.1, { fill: NODE('red') }) + C(12, 11, 1.1, { fill: NODE('yellow') }),
  },
  'decia-points': {
    label: 'DECIA Points', forma: 'nó-moeda: anel externo (anel do logo), disco com "DP", três nós da malha encostados no anel', nodes: ['yellow', 'orange', 'red'],
    outline: () => C(12, 12, 8.5, { stroke: 'currentColor' }) + C(12, 12, 5.75, { stroke: 'currentColor', sw: 1.4 }) + S('M9.25 9.25v5.5h1.25a2.75 2.75 0 0 0 0-5.5z', { sw: 1.4 }) + S('M13.5 14.75v-5.5h1.5a1.6 1.6 0 0 1 0 3.2h-1.5', { sw: 1.4 }) + C(12, 3.5, 1.2, { fill: NODE('yellow') }) + C(19.36, 16.25, 1.2, { fill: NODE('orange') }) + C(4.64, 16.25, 1.2, { fill: NODE('red') }),
    clay: () => C(12, 12, 8.5, { fill: INK, stroke: RIM, sw: 0.75 }) + `<circle cx="12" cy="12" r="5.75" fill="url(#ws-disc)"/>` + S('M9.25 9.25v5.5h1.25a2.75 2.75 0 0 0 0-5.5z', { color: CREAM, sw: 1.4 }) + S('M13.5 14.75v-5.5h1.5a1.6 1.6 0 0 1 0 3.2h-1.5', { color: CREAM, sw: 1.4 }) + C(12, 3.5, 1.3, { fill: NODE('yellow') }) + C(19.36, 16.25, 1.3, { fill: NODE('orange') }) + C(4.64, 16.25, 1.3, { fill: NODE('red') }),
  },
  chancela: {
    label: 'Chancela', forma: 'nó-lacre: anel externo com nó central (disco) e duas fitas; o lacre é um nó da malha com peso', nodes: ['orange', 'red'],
    outline: () => C(12, 9.5, 6, { stroke: 'currentColor' }) + C(12, 9.5, 2.25, { fill: NODE('orange') }) + S('M9.25 14.75L7.5 21l2.5-1.5L12 21') + S('M14.75 14.75L16.5 21 14 19.5 12 21'),
    clay: () => F('M9.25 14.5L7.5 21l2.5-1.5L12 21z', NODE('red')) + F('M14.75 14.5L16.5 21 14 19.5 12 21z', NODE('red')) + C(12, 9.5, 6, { fill: INK, stroke: RIM, sw: 0.75 }) + `<circle cx="12" cy="9.5" r="3.5" fill="url(#ws-disc)"/>` + C(12, 9.5, 1.1, { fill: CREAM }),
  },
  balcao: {
    label: 'Balcão', forma: 'monitor com etiqueta de preço na tela (aba à esquerda, furo, ponta à direita)', nodes: ['yellow'],
    outline: () => monitorOutline() + S('M6.5 6.75h5.75l4.25 2.5-4.25 2.5H6.5z') + C(8.5, 9.25, 0.7, { fill: 'currentColor' }),
    clay: () => monitorClay() + F('M6.5 6.75h5.75l4.25 2.5-4.25 2.5H6.5z', NODE('yellow')) + C(8.5, 9.25, 0.75, { fill: INK }),
  },
  'insights-ia': {
    label: 'Insights da IA', forma: 'monitor com a faísca ✦ grande e uma faísca pequena na tela', nodes: [],
    outline: () => monitorOutline() + S(spark(11.5, 9.5, 3.5)) + F(spark(16.75, 6.75, 1.25)),
    clay: () => monitorClay() + F(spark(11.5, 9.5, 3.5), V('ai-spark', '#E39B12')) + F(spark(16.75, 6.75, 1.25), CREAM),
  },
  buscar: {
    label: 'Buscar', forma: 'monitor com lupa na tela', nodes: [],
    outline: () => monitorOutline() + C(11, 8.25, 2.75, { stroke: 'currentColor' }) + S('M13 10.25l2.75 2.5'),
    clay: () => monitorClay() + C(11, 8.25, 2.75, { stroke: CREAM }) + S('M13 10.25l2.75 2.5', { color: CREAM }),
  },
  mural: {
    label: 'Mural', forma: 'mosaico 2×2 de telas sobre uma única base; uma tela carrega um nó', nodes: ['red'],
    outline: () => R(2.5, 3, 8.75, 5.75, 1.5, { stroke: 'currentColor' }) + R(12.75, 3, 8.75, 5.75, 1.5, { stroke: 'currentColor' }) + R(2.5, 10.25, 8.75, 5.75, 1.5, { stroke: 'currentColor' }) + R(12.75, 10.25, 8.75, 5.75, 1.5, { stroke: 'currentColor' }) + C(17.125, 5.875, 1.1, { fill: NODE('red') }) + S('M12 16v2.5') + S('M8.5 21h7'),
    clay: () => [[2.5, 3], [12.75, 3], [2.5, 10.25], [12.75, 10.25]].map(([x, y]) => monitorClay({ x, y, w: 8.75, h: 5.75, rx: 1.5 }, { stand: false })).join('') + C(17.125, 5.875, 1.2, { fill: NODE('red') }) + R(11, 15.5, 2, 3.25, 0.5, { fill: INK }) + R(8.25, 18.25, 7.5, 2, 1, { fill: INK }),
  },
  sair: {
    label: 'Sair', forma: 'monitor com seta saindo pela borda direita da tela', nodes: [],
    outline: () => monitorOutline() + S('M7 9.25h7.5') + S('M12 6.75l2.5 2.5-2.5 2.5') + S('M17 6v6.5'),
    clay: () => monitorClay() + S('M7 9.25h7.5', { color: CREAM }) + S('M12 6.75l2.5 2.5-2.5 2.5', { color: CREAM }) + S('M17 6v6.5', { color: V('orange-500', BRAND['orange-500'][0]) }),
  },
};

/* ---------------- WS Moji: rostos de monitor com sintaxe de terminal ---------------- */
export const MOJI = {
  util: { face: '>✓', label: 'Útil', uso: 'reação "útil"' },
  'bem-fundamentado': { face: '>§', label: 'Bem fundamentado', uso: 'reação "bem fundamentado"' },
  inovador: { face: '>✦', label: 'Inovador', uso: 'reação "inovador"' },
  conforme: { face: '>⚖', label: 'Conforme', uso: 'reação "conforme"' },
  curtir: { face: '>♥', label: 'Curtir', uso: 'reação "curtir"' },
  ok: { face: '^_^', label: 'OK', uso: 'sucesso, confirmação' },
  erro: { face: 'x_x', label: 'Erro', uso: 'falha, estado de erro' },
  carregando: { face: '>_▌', label: 'Carregando', uso: 'carregamento; o cursor ▌ pisca (CSS, respeita prefers-reduced-motion)', blink: true },
  vazio: { face: '>_ ?', label: 'Vazio', uso: 'estado vazio, nada encontrado' },
};
const MONO = `var(--ws-font-mono, "IBM Plex Mono"), "DejaVu Sans Mono", ui-monospace, Menlo, monospace`;
function mojiInner(key, { clay = true } = {}) {
  const m = MOJI[key];
  const face = m.blink ? m.face.slice(0, -1) : m.face;
  const color = clay ? CREAM : 'currentColor';
  let s = clay ? monitorClay() : monitorOutline();
  s += `<text x="12" y="11.4" text-anchor="middle" font-family='${MONO}' font-size="6.2" font-weight="600" fill="${color}" style="letter-spacing:-.1px">${face}${m.blink ? `<tspan class="ws-blink" fill="${clay ? V('orange-500', BRAND['orange-500'][0]) : 'currentColor'}">▌</tspan>` : ''}</text>`;
  return s;
}

/* ---------------- montagem dos SVGs ---------------- */
const DEFS = `<defs><radialGradient id="ws-disc" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${V('orange-500', BRAND['orange-500'][0])}"/><stop offset=".58" stop-color="${V('orange-600', BRAND['orange-600'][0])}"/><stop offset="1" stop-color="${V('orange-700', BRAND['orange-700'][0])}"/></radialGradient></defs>`;
const STYLE = `<style>@keyframes ws-pulse{0%{opacity:.9;transform:scale(.8)}100%{opacity:0;transform:scale(1.25)}}@keyframes ws-blink{0%,49%{opacity:1}50%,100%{opacity:0}}.ws-pulse{transform-origin:12px 9.25px;animation:ws-pulse var(--ws-duration-pulse,1800ms) var(--ws-ease,ease-out) infinite}.ws-blink{animation:ws-blink var(--ws-duration-blink,1000ms) steps(1) infinite}@media(prefers-reduced-motion:reduce){.ws-pulse,.ws-blink{animation:none;opacity:1}}</style>`;
const wrap = (inner, label, { animated = false, defs = false } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="${label}"><title>${label}</title>${defs ? DEFS : ''}${animated ? STYLE : ''}${inner}</svg>\n`;
export const glyphSvg = (name, variant) => wrap(GLYPHS[name][variant](), GLYPHS[name].label, { animated: name === 'notificacoes', defs: variant === 'clay' && GLYPHS[name].clay().includes('ws-disc') });
export const mojiSvg = (key, clay = true) => wrap(mojiInner(key, { clay }), `${MOJI[key].label} ${MOJI[key].face}`, { animated: !!MOJI[key].blink });
/** Para o preview: símbolo inline (sem <svg> externo). */
export const glyphInner = (name, variant) => GLYPHS[name][variant]();

/* ---------------- catalog.ts ---------------- */
function catalogTs() {
  const g = Object.entries(GLYPHS).map(([n, g]) => `  { name: '${n}', labelKey: 'glyph.${n}', outline: 'svg/${n}--outline.svg', clay: 'svg/${n}--clay.svg'${g.nodes.length ? `, nodes: [${g.nodes.map((x) => `'${x}'`).join(', ')}]` : ''} },`).join('\n');
  const m = Object.entries(MOJI).map(([k, m]) => `  { name: '${k}', labelKey: 'moji.${k}', face: '${m.face}', file: 'svg/moji-${k}.svg'${m.blink ? ', animated: true' : ''} },`).join('\n');
  return `// WS Glyphs — catálogo. GERADO por docs/design-system/glyphs/gerar.mjs; não editar à mão.
// Destino na etapa (b): packages/ui/src/glyphs/catalog.ts (os SVGs viram componentes React via SVGR ou sprite).
// Regra de forma: todo glyph nasce do monitor do logo (moldura arredondada + base) ou da malha de nós.
// labelKey = chave i18n (pt-BR/en/es) em src/i18n/glyphs.*.json — o ícone nunca aparece sem rótulo (RF38.CA01).

export type WsNode = 'red' | 'yellow' | 'green' | 'blue' | 'brown' | 'orange';

export interface WsGlyph {
  /** id em kebab-case; também é o nome do arquivo e o sufixo da classe .ws-glyph--<name> */
  name: string;
  /** chave i18n do rótulo acessível (aria-label) */
  labelKey: string;
  /** SVG da variante outline — traço 1,75, currentColor */
  outline: string;
  /** SVG da variante clay — carcaça --ws-ink, brilho superior, detalhes --ws-cream */
  clay: string;
  /** nós categóricos usados como detalhe (tokens --ws-node-<n>) */
  nodes?: WsNode[];
}

export interface WsMoji {
  name: string;
  labelKey: string;
  /** rosto em sintaxe de terminal, também é o texto alternativo */
  face: string;
  file: string;
  /** usa animação CSS (desligada com prefers-reduced-motion) */
  animated?: boolean;
}

export const WS_GLYPHS: readonly WsGlyph[] = [
${g}
] as const;

export const WS_MOJI: readonly WsMoji[] = [
${m}
] as const;

export type WsGlyphName = (typeof WS_GLYPHS)[number]['name'];
export type WsMojiName = (typeof WS_MOJI)[number]['name'];
`;
}

/* ---------------- GLYPHS.md ---------------- */
function glyphsMd() {
  let md = `# WS Glyphs — catálogo (v2)

> Gerado por [\`glyphs/gerar.mjs\`](glyphs/gerar.mjs). Catálogo TS em [\`glyphs/catalog.ts\`](glyphs/catalog.ts), SVGs em \`glyphs/svg/\`, preview em [\`glyphs/index.html\`](glyphs/index.html) (\`/lab/glyphs\`), capturas em \`glyphs/capturas/\`.

**Regra de forma:** todo ícone nasce do **monitor do logo** (moldura arredondada rx 2,5 + pescoço + base, tela útil 14×7,5 px) ou da **malha de nós** (anel + disco + nós coloridos). Grade 24 px, traço 1,75, pontas e junções redondas. Duas variantes: **outline** (\`currentColor\`, para navegação, botões e listas) e **clay** (carcaça \`--ws-ink\` com brilho superior \`--ws-glyph-shine\`, aro \`--ws-glyph-rim\` nos temas escuros, detalhes \`--ws-cream\`, nós \`--ws-node-*\`, disco \`--ws-gradient-brand\`; para heróis, estados vazios, cards de destaque, ≥ 32 px). Os nós são **detalhe**, nunca o único portador de significado (daltonismo) — o rótulo i18n (\`labelKey\`) é obrigatório (RF38.CA01). Tamanho mínimo: 20 px outline, 32 px clay (a 24 px o clay lê, mas o detalhe interno fica no limite — ver capturas).

## Glyphs (${Object.keys(GLYPHS).length})

| Nome | Função | Forma | Nós | labelKey |
|---|---|---|---|---|
`;
  for (const [n, g] of Object.entries(GLYPHS)) md += `| \`${n}\` | ${g.label} | ${g.forma} | ${g.nodes.join(', ') || '—'} | \`glyph.${n}\` |\n`;
  md += `
## WS Moji (${Object.keys(MOJI).length}) — rostos de monitor com sintaxe de terminal

Monitor (mesma moldura) com o rosto em \`--ws-font-mono\` (fallback DejaVu Sans Mono, que cobre ✓ § ✦ ⚖ ♥ ▌). Uso: feedback de reação, estados de sucesso/erro/carregando/vazio. Sempre acompanhado de texto — o \`face\` é também o texto alternativo. Tamanho recomendado 32–96 px.

| Nome | Rosto | Função | labelKey |
|---|---|---|---|
`;
  for (const [k, m] of Object.entries(MOJI)) md += `| \`${k}\` | \`${m.face}\` | ${m.uso} | \`moji.${k}\` |\n`;
  md += `
## i18n (pt-BR como referência; en/es na etapa (b))

\`\`\`json
{
${Object.entries(GLYPHS).map(([n, g]) => `  "glyph.${n}": "${g.label}"`).join(',\n')},
${Object.entries(MOJI).map(([k, m]) => `  "moji.${k}": "${m.label}"`).join(',\n')}
}
\`\`\`

## Movimento
\`notificacoes\` (anel \`.ws-pulse\`, \`--ws-duration-pulse\`) e \`carregando\` (cursor \`.ws-blink\`, \`--ws-duration-blink\`, \`steps(1)\`) animam por CSS; \`@media (prefers-reduced-motion: reduce)\` e \`data-reduce-motion="true"\` desligam e deixam o elemento visível e estático.
`;
  return md;
}

/* ---------------- index.html (preview /lab/glyphs) ---------------- */
function indexHtml() {
  const tokensCss = readFileSync(join(here, '..', 'tokens-ws.css'), 'utf8');
  const card = (inner, name, sub, cls = '') => `<figure class="g ${cls}"><div class="box"><svg viewBox="0 0 24 24" class="gl" aria-hidden="true">${inner}</svg></div><div class="sizes"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${inner}</svg><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${inner}</svg><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">${inner}</svg></div><figcaption><b>${name}</b><span>${sub}</span></figcaption></figure>`;
  const outl = Object.entries(GLYPHS).map(([n, g]) => card(g.outline(), n, g.label)).join('');
  const clay = Object.entries(GLYPHS).map(([n, g]) => card(g.clay(), n, g.label, 'clay')).join('');
  const moji = Object.entries(MOJI).map(([k, m]) => card(mojiInner(k), k, `${m.face} · ${m.label}`, 'clay moji')).join('');
  const mojiO = Object.entries(MOJI).map(([k, m]) => card(mojiInner(k, { clay: false }), k, `${m.face} · ${m.label}`, 'moji')).join('');
  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WS Glyphs — /lab/glyphs</title>
<meta name="description" content="Preview estático dos WS Glyphs (outline e clay) e WS Moji nos 4 temas, consumindo tokens-ws.css">
<style>
${tokensCss}
*{box-sizing:border-box}
body{margin:0;background:var(--ws-surface-0);color:var(--ws-text);font-family:var(--ws-body-font);font-size:var(--ws-text-body);line-height:1.5}
header{position:sticky;top:0;z-index:var(--ws-z-header);display:flex;flex-wrap:wrap;gap:var(--ws-space-3);align-items:center;padding:var(--ws-space-3) var(--ws-space-4);background:var(--ws-glass-bg);border-bottom:1px solid var(--ws-glass-border);backdrop-filter:blur(var(--ws-blur-glass)) saturate(var(--ws-scrim-saturate))}
header h1{margin:0;font:600 var(--ws-text-h3)/1.2 var(--ws-font-display);display:flex;gap:var(--ws-space-2);align-items:center}
header h1 svg{width:28px;height:28px}
header .sp{flex:1}
.seg{display:flex;gap:2px;padding:2px;border:1px solid var(--ws-border);border-radius:var(--ws-radius-pill);background:var(--ws-surface-2)}
.seg button{border:0;background:transparent;color:var(--ws-text-muted);font:inherit;font-size:var(--ws-text-body-sm);padding:4px 12px;border-radius:var(--ws-radius-pill);cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--ws-accent);color:var(--ws-on-accent);font-weight:600}
.seg button:focus-visible{box-shadow:var(--ws-focus-ring)}
main{padding:var(--ws-space-4);max-width:1240px;margin:0 auto}
section{margin:var(--ws-space-6) 0}
h2{font:600 var(--ws-text-h2)/1.25 var(--ws-font-display);margin:0 0 var(--ws-space-1)}
.lead{color:var(--ws-text-muted);margin:0 0 var(--ws-space-4);font-size:var(--ws-text-body-sm)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:var(--ws-space-3)}
.g{margin:0;background:var(--ws-surface-1);border:1px solid var(--ws-border);border-radius:var(--ws-radius-md);padding:var(--ws-space-3);display:flex;flex-direction:column;gap:var(--ws-space-2);align-items:center}
.g.clay{box-shadow:var(--ws-shadow-clay)}
.box{width:72px;height:72px;display:grid;place-items:center;border-radius:var(--ws-radius-md);background:var(--ws-surface-2)}
.gl{width:48px;height:48px;color:var(--ws-text)}
.sizes{display:flex;gap:var(--ws-space-2);align-items:center;color:var(--ws-text)}
figcaption{text-align:center;font-size:var(--ws-text-caption);line-height:1.35}
figcaption b{display:block;font-family:var(--ws-font-mono);font-weight:600;font-size:var(--ws-text-caption)}
figcaption span{color:var(--ws-text-muted)}
.moji .box{width:96px;height:72px}
.moji .gl{width:64px;height:64px}
.strip{display:flex;flex-wrap:wrap;gap:var(--ws-space-4);align-items:center;padding:var(--ws-space-3) var(--ws-space-4);border-radius:var(--ws-radius-lg);background:var(--ws-surface-1);border:1px solid var(--ws-border);color:var(--ws-text)}
.strip svg{width:20px;height:20px}
.strip .accent{color:var(--ws-accent-ink)}
.strip .mesh{background:var(--ws-gradient-mesh);color:var(--ws-cream);border-radius:var(--ws-radius-md);padding:var(--ws-space-2) var(--ws-space-3);display:flex;gap:var(--ws-space-3)}
.prompt{font-family:var(--ws-font-mono);font-size:var(--ws-text-prompt);color:var(--ws-accent-ink)}
.note{font-size:var(--ws-text-caption);color:var(--ws-text-faint);margin-top:var(--ws-space-2)}
${STYLE.replace(/<\/?style>/g, '')}
</style>
</head>
<body>
<header>
  <h1><svg viewBox="0 0 24 24" aria-hidden="true">${DEFS}${GLYPHS['sessao-decia'].clay()}</svg>WS Glyphs <span class="prompt">&gt;_</span></h1>
  <div class="sp"></div>
  <div class="seg" role="group" aria-label="Tema">${THEME_IDS.map((t) => `<button type="button" data-set-theme="${t}" aria-pressed="${t === 'claro'}">${THEMES[t].label}</button>`).join('')}</div>
</header>
<main>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}</svg>
<section>
  <h2>Em contexto</h2>
  <p class="lead">Outline em texto corrente e navegação; clay sobre a malha; tamanhos 16 / 24 / 32 em cada card abaixo.</p>
  <div class="strip">
    <span><svg viewBox="0 0 24 24">${GLYPHS.acervo.outline()}</svg> Acervo</span>
    <span><svg viewBox="0 0 24 24">${GLYPHS.mesa.outline()}</svg> Mesa</span>
    <span><svg viewBox="0 0 24 24">${GLYPHS.balcao.outline()}</svg> Balcão</span>
    <span><svg viewBox="0 0 24 24">${GLYPHS.mural.outline()}</svg> Mural</span>
    <span class="accent"><svg viewBox="0 0 24 24">${GLYPHS['criar-tarefa'].outline()}</svg> Criar tarefa</span>
    <span class="mesh"><svg viewBox="0 0 24 24">${GLYPHS['decia-points'].clay()}</svg><svg viewBox="0 0 24 24">${GLYPHS.chancela.clay()}</svg><svg viewBox="0 0 24 24">${GLYPHS['insights-ia'].clay()}</svg></span>
  </div>
</section>
<section><h2>Outline (${Object.keys(GLYPHS).length})</h2><p class="lead">Traço 1,75 · currentColor · nós como detalhe.</p><div class="grid">${outl}</div></section>
<section><h2>Clay (${Object.keys(GLYPHS).length})</h2><p class="lead">Carcaça <code>--ws-ink</code>, brilho superior, aro nos temas escuros, detalhes creme.</p><div class="grid">${clay}</div></section>
<section><h2>WS Moji (${Object.keys(MOJI).length}) — clay</h2><p class="lead">Rostos de monitor em <code>--ws-font-mono</code>. "carregando" pisca o cursor; desliga com <code>prefers-reduced-motion</code>.</p><div class="grid">${moji}</div></section>
<section><h2>WS Moji — outline</h2><div class="grid">${mojiO}</div><p class="note">Paleta medida no logo oficial (public/brand/work-station-logo.png). Ver TOKENS.md.</p></section>
</main>
<script>
(function(){
  var root=document.documentElement, q=new URLSearchParams(location.search), t=q.get('theme');
  function set(th){root.setAttribute('data-theme',th);document.querySelectorAll('[data-set-theme]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.setTheme===th))});try{localStorage.setItem('ws-lab-theme',th)}catch(e){}}
  document.querySelectorAll('[data-set-theme]').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.setTheme)})});
  if(t){set(t)}else{try{var s=localStorage.getItem('ws-lab-theme');if(s)set(s)}catch(e){}}
})();
</script>
</body>
</html>
`;
}

/* ---------------- escrita ---------------- */
mkdirSync(join(here, 'svg'), { recursive: true });
let n = 0;
for (const name of Object.keys(GLYPHS)) { for (const v of ['outline', 'clay']) { writeFileSync(join(here, 'svg', `${name}--${v}.svg`), glyphSvg(name, v)); n++; } }
for (const k of Object.keys(MOJI)) { writeFileSync(join(here, 'svg', `moji-${k}.svg`), mojiSvg(k)); n++; }
writeFileSync(join(here, 'catalog.ts'), catalogTs());
writeFileSync(join(here, '..', 'GLYPHS.md'), glyphsMd());
writeFileSync(join(here, 'index.html'), indexHtml());
console.log(`${n} SVGs, catalog.ts, GLYPHS.md e index.html escritos em ${here}`);

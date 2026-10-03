#!/usr/bin/env node
// Placeholders das artes de fundo — gerados SÓ com tokens --ws-* (fallback = hex do tokens-ws.mjs). Não são as artes
// finais (o dono fornece); servem para o seletor funcionar e para validar scrim/legibilidade. 1920×1080, SVG puro.
// Uso: node docs/design-system/backgrounds/gerar.mjs  (depois: node docs/design-system/backgrounds/backgrounds-thumbs.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, NODES, THEMES } from '../anatomias/lib/tokens-ws.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const V = (n, fb) => `var(--ws-${n}, ${fb})`;
const INK = V('ink', BRAND.ink[0]), CREAM = V('cream', BRAND.cream[0]), O5 = V('orange-500', BRAND['orange-500'][0]), O6 = V('orange-600', BRAND['orange-600'][0]), O7 = V('orange-700', BRAND['orange-700'][0]);
const W = 1920, H = 1080;
const svg = (id, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Placeholder: ${id}"><title>Placeholder — ${id} (substituir pela arte final)</title>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>\n`;
const f = (n) => Math.round(n * 10) / 10;
let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const KEYS = Object.keys(NODES);

/** malha: pontos semi-regulares + ligações aos 2 vizinhos mais próximos */
function mesh(nx, ny, jitter, { line, lineW = 2, nodeR = 0, colored = false, op = 1 }) {
  const P = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) P.push([i * (W / nx) + (rnd() - 0.5) * jitter, j * (H / ny) + (rnd() - 0.5) * jitter]);
  let s = `<g stroke="${line}" stroke-width="${lineW}" stroke-linecap="round" opacity="${op}">`;
  for (let a = 0; a < P.length; a++) {
    const near = P.map((q, b) => [Math.hypot(q[0] - P[a][0], q[1] - P[a][1]), b]).filter(([d, b]) => b !== a && d > 1).sort((x, y) => x[0] - y[0]).slice(0, 3);
    for (const [, b] of near) if (b > a) s += `<line x1="${f(P[a][0])}" y1="${f(P[a][1])}" x2="${f(P[b][0])}" y2="${f(P[b][1])}"/>`;
  }
  s += '</g>';
  if (nodeR) { s += '<g>'; for (const [x, y] of P) { const k = KEYS[Math.floor(rnd() * KEYS.length)]; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${nodeR}" fill="${colored ? V(`node-${k}`, NODES[k][0]) : line}"/>`; } s += '</g>'; }
  return s;
}

export const PLACEHOLDERS = {
  'malha-laranja': () => svg('malha-laranja',
    `<rect width="${W}" height="${H}" fill="${INK}"/><rect width="${W}" height="${H}" fill="url(#halo)"/>` + mesh(14, 8, 70, { line: O5, lineW: 2, nodeR: 5, op: 0.75 }),
    `<radialGradient id="halo" cx="30%" cy="35%" r="70%"><stop offset="0" stop-color="${O6}" stop-opacity=".45"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient>`),
  'nos-multicolor': () => svg('nos-multicolor',
    `<rect width="${W}" height="${H}" fill="${V('surface-0', THEMES.claro.surface[0])}"/>` + mesh(12, 7, 90, { line: O5, lineW: 1.5, nodeR: 11, colored: true, op: 0.55 })),
  'terminal-noturno': () => svg('terminal-noturno',
    `<rect width="${W}" height="${H}" fill="${INK}"/>` +
    `<g font-family="${V('font-mono', 'IBM Plex Mono')}, DejaVu Sans Mono, monospace" font-size="28" fill="${CREAM}" opacity=".10">` +
    Array.from({ length: 30 }, (_, r) => `<text x="${60 + (r % 3) * 24}" y="${80 + r * 34}">${'&gt;_ '.repeat(1)}${['ws run mesa', 'ws open acervo', 'ws decia --session', 'ws points --ledger', 'ws chancela --seal', 'ws balcao --offer', 'ws mural --post', 'ws hype --score'][r % 8]}${'  '.repeat((r * 5) % 9)}#</text>`).join('') + '</g>' +
    `<rect x="0" y="0" width="${W}" height="6" fill="${O5}"/><text x="${W - 80}" y="${H - 60}" font-family="${V('font-mono', 'monospace')}, monospace" font-size="64" fill="${O5}" text-anchor="end">&gt;_</text>`),
  'disco-creme': () => svg('disco-creme',
    `<rect width="${W}" height="${H}" fill="${V('surface-0', THEMES.claro.surface[0])}"/><circle cx="${W * 0.72}" cy="${H * 0.5}" r="${H * 0.62}" fill="url(#field)"/><circle cx="${W * 0.72}" cy="${H * 0.5}" r="${H * 0.62}" fill="none" stroke="${O7}" stroke-width="10" opacity=".6"/><circle cx="${W * 0.72}" cy="${H * 0.5}" r="${H * 0.3}" fill="url(#disc)"/>`,
    `<radialGradient id="field" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${O5}"/><stop offset="1" stop-color="${O6}"/></radialGradient><radialGradient id="disc" cx="40%" cy="32%" r="70%"><stop offset="0" stop-color="#FDF2D7"/><stop offset=".7" stop-color="${CREAM}"/><stop offset="1" stop-color="#D6B892"/></radialGradient>`),
  'blueprint-de-rede': () => svg('blueprint-de-rede',
    `<rect width="${W}" height="${H}" fill="${V('node-blue-soft', '#0F2A44')}"/><rect width="${W}" height="${H}" fill="url(#grid)"/>` + mesh(10, 6, 40, { line: CREAM, lineW: 1.25, nodeR: 4, op: 0.5 }),
    `<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${CREAM}" stroke-opacity=".12" stroke-width="1"/></pattern>`),
  'grade-minima': () => svg('grade-minima',
    `<rect width="${W}" height="${H}" fill="${V('surface-1', '#FFFFFF')}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`,
    `<pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1.5" fill="${INK}" fill-opacity=".18"/></pattern>`),
};

mkdirSync(join(here, 'placeholders'), { recursive: true });
for (const [id, fn] of Object.entries(PLACEHOLDERS)) writeFileSync(join(here, 'placeholders', `${id}.svg`), fn());
console.log(`${Object.keys(PLACEHOLDERS).length} placeholders escritos em ${join(here, 'placeholders')}`);

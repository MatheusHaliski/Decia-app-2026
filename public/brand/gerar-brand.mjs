#!/usr/bin/env node
// Vetores oficiais do logo Work Station, desenhados a partir de work-station-logo.png (formas próprias, sem embutir o PNG).
// Gera: work-station-monitor.svg (monitor >_ isolado), work-station-emblema.svg (emblema completo simplificado),
// work-station-monograma.svg (24 px). Cores = BRAND/NODES de docs/design-system/anatomias/lib/tokens-ws.mjs.
// Uso: node public/brand/gerar-brand.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, NODES } from '../../docs/design-system/anatomias/lib/tokens-ws.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const INK = BRAND.ink[0], CREAM = BRAND.cream[0], O5 = BRAND['orange-500'][0], O6 = BRAND['orange-600'][0], O7 = BRAND['orange-700'][0];
const SCREEN = '#47443C', SHINE = '#666362', BASE = '#212223', CREAM_HI = '#FDF2D7', CREAM_LO = '#D6B892', LINE = '#F78D42';
const NODE_KEYS = ['red', 'yellow', 'green', 'blue', 'brown', 'orange'];
const f = (n) => (Math.round(n * 100) / 100).toString();

/** Monitor clay centrado em (cx,cy), largura w. Devolve os elementos (sem <svg>). */
function monitor(cx, cy, w, { prompt = true } = {}) {
  const h = w * 0.72, rx = w * 0.11, x = cx - w / 2, y = cy - h / 2 - w * 0.06;
  const inset = w * 0.075, sw = w * 0.055;
  const px = cx - w * 0.17, py = cy + w * 0.03;
  return `
  <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${INK}"/>
  <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h * 0.5)}" rx="${f(rx)}" fill="url(#ws-shine)"/>
  <rect x="${f(x + inset)}" y="${f(y + inset)}" width="${f(w - 2 * inset)}" height="${f(h - 2 * inset)}" rx="${f(rx * 0.6)}" fill="${SCREEN}"/>
  <rect x="${f(x + inset * 1.5)}" y="${f(y + inset * 1.5)}" width="${f(w - 3 * inset)}" height="${f(h - 3 * inset)}" rx="${f(rx * 0.5)}" fill="${INK}"/>
  <rect x="${f(cx - w * 0.07)}" y="${f(y + h - w * 0.02)}" width="${f(w * 0.14)}" height="${f(w * 0.14)}" fill="${BASE}"/>
  <rect x="${f(cx - w * 0.26)}" y="${f(y + h + w * 0.09)}" width="${f(w * 0.52)}" height="${f(w * 0.075)}" rx="${f(w * 0.0375)}" fill="${BASE}"/>
  <rect x="${f(cx - w * 0.26)}" y="${f(y + h + w * 0.09)}" width="${f(w * 0.52)}" height="${f(w * 0.03)}" rx="${f(w * 0.015)}" fill="${SHINE}" opacity=".6"/>
  ${prompt ? `<path d="M${f(px - w * 0.1)} ${f(py - w * 0.16)}l${f(w * 0.17)} ${f(w * 0.16)}-${f(w * 0.17)} ${f(w * 0.16)}" fill="none" stroke="${CREAM}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${f(px + w * 0.14)} ${f(py + w * 0.16)}h${f(w * 0.24)}" fill="none" stroke="${CREAM}" stroke-width="${f(sw)}" stroke-linecap="round"/>` : ''}`;
}
const DEFS = `<defs>
  <linearGradient id="ws-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SHINE}" stop-opacity=".75"/><stop offset="1" stop-color="${SHINE}" stop-opacity="0"/></linearGradient>
  <radialGradient id="ws-field" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#F9923C"/><stop offset=".7" stop-color="${O5}"/><stop offset="1" stop-color="${O6}"/></radialGradient>
  <radialGradient id="ws-disc" cx="40%" cy="32%" r="70%"><stop offset="0" stop-color="${CREAM_HI}"/><stop offset=".7" stop-color="${CREAM}"/><stop offset="1" stop-color="${CREAM_LO}"/></radialGradient>
  <linearGradient id="ws-ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3B3B"/><stop offset="1" stop-color="${BASE}"/></linearGradient>
</defs>`;

/* 1. monitor isolado (256 × 256) */
const monitorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="Work Station"><title>Work Station — monitor &gt;_</title>${DEFS}${monitor(128, 124, 200)}
</svg>
`;

/* 2. emblema completo simplificado (512 × 512): anel preto, anel tijolo, campo laranja com malha (3 anéis de nós), disco creme, monitor */
function emblema() {
  const C = 256, R = 248;
  const rings = [{ r: 118, n: 10 }, { r: 162, n: 16 }, { r: 204, n: 22 }];
  const pts = rings.map(({ r, n }, ri) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (ri % 2 ? Math.PI / n : 0); return [C + Math.cos(a) * r, C + Math.sin(a) * r]; }));
  let lines = '', nodes = '', k = 0;
  // ligações: vizinhos no mesmo anel + anel seguinte (dois vizinhos mais próximos)
  for (let ri = 0; ri < pts.length; ri++) {
    const P = pts[ri];
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
      lines += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
      if (ri + 1 < pts.length) {
        const Q = pts[ri + 1].map((q, j) => [Math.hypot(q[0] - x1, q[1] - y1), j]).sort((a, b) => a[0] - b[0]).slice(0, 2);
        for (const [, j] of Q) lines += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(pts[ri + 1][j][0])}" y2="${f(pts[ri + 1][j][1])}"/>`;
      }
    }
  }
  const nodeR = [9, 8.5, 8];
  for (let ri = 0; ri < pts.length; ri++) for (const [x, y] of pts[ri]) {
    const key = NODE_KEYS[(k * 7 + ri) % NODE_KEYS.length]; k++;
    nodes += `<circle cx="${f(x)}" cy="${f(y)}" r="${nodeR[ri]}" fill="${NODES[key][0]}"/><circle cx="${f(x - nodeR[ri] * 0.25)}" cy="${f(y - nodeR[ri] * 0.3)}" r="${f(nodeR[ri] * 0.35)}" fill="#fff" opacity=".35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Work Station"><title>Work Station — emblema</title>${DEFS}
  <circle cx="${C}" cy="${C + 4}" r="${R}" fill="#000" opacity=".18"/>
  <circle cx="${C}" cy="${C}" r="${R}" fill="url(#ws-ring)"/>
  <circle cx="${C}" cy="${C}" r="${R - 14}" fill="none" stroke="${INK}" stroke-width="6"/>
  <circle cx="${C}" cy="${C}" r="${R - 24}" fill="url(#ws-field)"/>
  <circle cx="${C}" cy="${C}" r="${R - 24}" fill="none" stroke="${O7}" stroke-width="5"/>
  <g stroke="${LINE}" stroke-width="3" stroke-linecap="round" opacity=".95">${lines}</g>
  ${nodes}
  <circle cx="${C}" cy="${C + 3}" r="98" fill="${O7}" opacity=".35"/>
  <circle cx="${C}" cy="${C}" r="96" fill="url(#ws-disc)"/>
  ${monitor(C, C - 2, 136)}
</svg>
`;
}

/* 3. monograma 24 px: anel, campo, disco, monitor minúsculo */
const monograma = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Work Station"><title>Work Station</title>
  <circle cx="12" cy="12" r="11.5" fill="${INK}"/>
  <circle cx="12" cy="12" r="9.5" fill="${O5}"/>
  <circle cx="12" cy="12" r="9.5" fill="none" stroke="${O7}" stroke-width=".75"/>
  <circle cx="12" cy="12" r="5.75" fill="${CREAM}"/>
  <rect x="8.25" y="9" width="7.5" height="5.25" rx="1.1" fill="${INK}"/>
  <rect x="10.75" y="14.25" width="2.5" height="1.5" fill="${BASE}"/>
  <path d="M10 10.6l1.1 1.05-1.1 1.05" fill="none" stroke="${CREAM}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12.1 12.9h1.9" fill="none" stroke="${CREAM}" stroke-width=".9" stroke-linecap="round"/>
  <circle cx="12" cy="3.6" r="1" fill="${NODES.red[0]}"/><circle cx="19.3" cy="7.8" r="1" fill="${NODES.yellow[0]}"/><circle cx="19.3" cy="16.2" r="1" fill="${NODES.green[0]}"/>
  <circle cx="12" cy="20.4" r="1" fill="${NODES.blue[0]}"/><circle cx="4.7" cy="16.2" r="1" fill="${NODES.brown[0]}"/><circle cx="4.7" cy="7.8" r="1" fill="${NODES.orange[0]}"/>
</svg>
`;

writeFileSync(join(here, 'work-station-monitor.svg'), monitorSvg);
writeFileSync(join(here, 'work-station-emblema.svg'), emblema());
writeFileSync(join(here, 'work-station-monograma.svg'), monograma);
console.log('work-station-monitor.svg, work-station-emblema.svg, work-station-monograma.svg escritos em', here);

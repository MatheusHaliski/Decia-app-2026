#!/usr/bin/env node
// Miniaturas 320×180 PNG das artes de fundo (`npm run backgrounds:thumbs`). Lê o catálogo, renderiza cada arte (final em
// public/backgrounds/<file> ou placeholder em placeholders/<id>.svg) com Chromium headless e grava thumbs/<id>.png.
// Esboço para a etapa (b): trocar o parse do catálogo por `import { WS_BACKGROUNDS } from './backgrounds'` (tsx) e,
// se preferir sem navegador, usar sharp: sharp(file).resize(320,180,{fit:'cover'}).png().toFile(thumb).
// Uso: node docs/design-system/backgrounds/backgrounds-thumbs.mjs [--chrome=/caminho/chrome]
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.argv.find((a) => a.startsWith('--chrome='))?.slice(9) || process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TW = 320, TH = 180;

// catálogo: regex sobre backgrounds.ts (sem compilador TS nesta etapa)
const ts = readFileSync(join(here, 'backgrounds.ts'), 'utf8');
const entries = [...ts.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?file:\s*'([^']*)'[^}]*?thumb:\s*'([^']+)'[^}]*?tone:\s*'(light|dark)'[^}]*?placeholder:\s*(true|false)/g)]
  .map(([, id, file, thumb, tone, placeholder]) => ({ id, file, thumb, tone, placeholder: placeholder === 'true' }));
if (!entries.length) { console.error('catálogo vazio ou formato inesperado'); process.exit(1); }

mkdirSync(join(here, 'thumbs'), { recursive: true });
const tmp = join(here, 'thumbs', '.tmp.html');
let n = 0;
for (const e of entries) {
  let src;
  if (e.id === 'sem-arte') src = null;
  else if (e.placeholder) src = join(here, 'placeholders', `${e.id}.svg`);
  else src = join(here, '..', '..', '..', 'public', 'backgrounds', e.file);
  if (src && !existsSync(src)) { console.warn(`  pulado ${e.id}: ${src} não existe`); continue; }
  // página mínima: a arte cobre a janela (object-fit: cover), tokens-ws.css resolve os var(--ws-*) dos placeholders
  const html = `<!doctype html><html data-theme="${e.tone === 'dark' ? 'escuro' : 'claro'}"><head><meta charset="utf-8"><style>${readFileSync(join(here, '..', 'tokens-ws.css'), 'utf8')}
html,body{margin:0;width:${TW}px;height:${TH}px;overflow:hidden;background:var(--ws-surface-0)}
img{width:${TW}px;height:${TH}px;object-fit:cover;display:block}
.none{width:${TW}px;height:${TH}px;display:grid;place-items:center;font:600 14px var(--ws-font-mono);color:var(--ws-text-muted);border:1px dashed var(--ws-border)}</style></head>
<body>${src ? `<img src="${pathToFileURL(src).href}" alt="">` : '<div class="none">&gt;_ sem arte</div>'}</body></html>`;
  writeFileSync(tmp, html);
  const out = join(here, 'thumbs', e.thumb);
  execFileSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${TW},${TH}`, `--screenshot=${out}`, pathToFileURL(tmp).href], { stdio: 'ignore' });
  n++; console.log(`  ${e.id} → thumbs/${e.thumb}`);
}
rmSync(tmp, { force: true });
console.log(`${n} miniaturas ${TW}×${TH} escritas`);

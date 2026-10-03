#!/usr/bin/env node
// Gerador do design system Work Station / DECIA: tokens.css, ícones SVG, anatomias SVG (variações × temas), tabela de
// contraste (DESIGN_SYSTEM.md) e galeria estática (index.html). Sem dependências. Uso: node docs/design-system/anatomias/gerar.mjs
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTokensCss, contrastMarkdown, contrastReport, THEME_IDS } from './lib/tokens.mjs';
import { ICONS, iconSvg } from './lib/icons.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ds = join(here, '..');
const out = (rel, content) => { const p = join(here, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };

// 1. tokens.css
writeFileSync(join(ds, 'tokens.css'), emitTokensCss());
console.log('tokens.css escrito');

// 2. tabela de contraste → DESIGN_SYSTEM.md (entre marcadores), se o arquivo existir
const dsMd = join(ds, 'DESIGN_SYSTEM.md');
if (existsSync(dsMd)) {
  const md = readFileSync(dsMd, 'utf8');
  const a = '<!-- contraste:inicio -->', b = '<!-- contraste:fim -->';
  if (md.includes(a) && md.includes(b)) {
    writeFileSync(dsMd, md.slice(0, md.indexOf(a) + a.length) + '\n' + contrastMarkdown() + md.slice(md.indexOf(b)));
    console.log('tabela de contraste atualizada em DESIGN_SYSTEM.md');
  }
}
const { rows, failures } = contrastReport();
console.log(`contraste: ${rows.length} pares, ${failures} falhas`);
if (failures) process.exitCode = 1;

// 3. ícones
mkdirSync(join(here, 'icones'), { recursive: true });
for (const n of Object.keys(ICONS)) out(`icones/${n}.svg`, iconSvg(n));
console.log(`${Object.keys(ICONS).length} ícones escritos`);

// 4. anatomias SVG
const cards = await import('./lib/cards.mjs').catch((e) => { console.warn('cards.mjs indisponível:', e.message); return null; });
let svgCount = 0;
if (cards) {
  const dir = join(here, 'svg'); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.svg')) unlinkSync(join(dir, f));
  for (const theme of THEME_IDS) for (const varn of cards.VARIACOES) { out(`svg/${varn.id}--${theme}.svg`, cards.render(varn, theme)); svgCount++; }
  console.log(`${svgCount} anatomias SVG (${cards.VARIACOES.length} variações × ${THEME_IDS.length} temas)`);
  // 5. galeria
  const gal = await import('./lib/galeria.mjs').catch((e) => { console.warn('galeria.mjs indisponível:', e.message); return null; });
  if (gal) { out('index.html', gal.renderIndex(cards.VARIACOES)); console.log('index.html escrito'); }
}

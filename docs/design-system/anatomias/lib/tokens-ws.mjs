#!/usr/bin/env node
// Work Station — tokens `--ws-*` (v2, briefing do dono do produto). Fonte de verdade da paleta derivada do logo
// (monitor preto clay com prompt `>_` creme, disco creme, malha laranja, nós vermelho/amarelo/verde/azul/marrom/laranja).
// Gera: docs/design-system/tokens-ws.css (4 temas: claro · escuro · contraste · terminal) e a tabela de contraste de
// docs/design-system/TOKENS.md (entre <!-- tokens-ws:inicio --> e <!-- tokens-ws:fim -->). Sai com código 1 se algum par
// reprovar. Uso: node docs/design-system/anatomias/lib/tokens-ws.mjs
//
// Hex de marca e dos nós medidos por amostragem (PIL) em public/brand/work-station-logo.png (1448×1086). Para recalibrar
// basta trocar os valores em BRAND/NODES e rodar o script — as derivações (-ink, -soft, on-*, contraste) acompanham.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, ensure, lighten, mix, hexToRgb } from './cor.mjs';

/* ------------------------------------------------------------------------------------------------
 * 1. Marca (medida no PNG oficial)
 * ------------------------------------------------------------------------------------------------ */
export const BRAND = {
  ink: ['#242525', 'preto-monitor'],          // carcaça do monitor e anel externo (base #212223, tela #47443C, brilho #666362)
  cream: ['#F1DEC0', 'creme'],                 // prompt `>_` e disco central (claro #FDF2D7, sombra #D6B892)
  'orange-500': ['#F28222', 'laranja-malha'],  // campo da malha (#F28222/#F9923C) e linhas (#F78D42)
  'orange-600': ['#E06A1B', 'laranja-escuro'], // escurecido: hover, 2º stop do disco
  'orange-700': ['#AB2C16', 'vermelho-tijolo'],// anel interno do logo: borda inferior clay / active
};
/** Nós categóricos da malha (medidos no PNG). */
export const NODES = {
  red: ['#FC4E2B', 'vermelho'],
  yellow: ['#F6B507', 'amarelo'],
  green: ['#7DC549', 'verde'],
  blue: ['#019FF4', 'azul'],
  brown: ['#8B4628', 'marrom'],
  orange: ['#FCB809', 'laranja-dourado'],
};
/** Semânticos: cada um aponta para uma base (nó do logo ou cor própria) + nome em texto. */
export const SEMANTIC = {
  success: ['#7DC549', 'verde'], warning: ['#F6B507', 'amarelo'], danger: ['#FC4E2B', 'vermelho'], info: ['#019FF4', 'azul'],
  'ai-spark': ['#E39B12', 'âmbar'],
  'msg-argument': ['#019FF4', 'azul'], 'msg-divergence': ['#F28222', 'laranja'], 'msg-risk': ['#FC4E2B', 'vermelho'],
  'msg-consensus': ['#7DC549', 'verde'], 'msg-question': ['#7B4FC6', 'roxo'],
};

/* ------------------------------------------------------------------------------------------------
 * 2. Temas — neutros escolhidos à mão; o resto é derivado
 * ------------------------------------------------------------------------------------------------ */
export const THEMES = {
  claro: {
    'glyph-rim': 'transparent', 'glyph-shine': 'rgba(102,99,98,.55)', 'glyph-screen': '#47443C',
    label: 'Claro', scheme: 'light', dir: 'darker', textMin: 4.5, softMix: 0.14,
    surface: { 0: '#F7EEDC', 1: '#FFFFFF', 2: '#F6EBD6', 3: '#E9DAB9' }, container: '#FFFFFF',
    text: '#242525', 'text-muted': '#5C5A55', 'text-faint': '#6B6861',
    border: '#D6C6A4', 'border-strong': '#242525', focus: '#AB2C16',
    accent: '#E06A1B', 'accent-strong': '#AB2C16', 'accent-nome': 'laranja',
    'scrim-tint': 'rgba(36,37,37,.35)', 'glass-bg': 'rgba(255,255,255,.55)', 'glass-border': 'rgba(36,37,37,.12)',
    'shadow-clay': 'inset 0 1px 0 rgba(253,242,215,.9), inset 0 -2px 3px rgba(214,184,146,.45), 0 1px 2px rgba(36,37,37,.08), 0 10px 24px -14px rgba(36,37,37,.28)',
    'shadow-1': '0 1px 2px rgba(36,37,37,.08), 0 2px 6px -2px rgba(36,37,37,.10)',
    'shadow-2': '0 1px 2px rgba(36,37,37,.08), 0 10px 28px -14px rgba(36,37,37,.22)',
    'body-font': 'var(--ws-font-body)',
  },
  escuro: {
    'glyph-rim': 'rgba(241,222,192,.55)', 'glyph-shine': 'rgba(102,99,98,.7)', 'glyph-screen': '#47443C',
    label: 'Escuro', scheme: 'dark', dir: 'lighter', textMin: 4.5, softMix: 0.24,
    surface: { 0: '#151616', 1: '#1E1F1F', 2: '#272828', 3: '#313232' }, container: '#1E1F1F',
    text: '#F1DEC0', 'text-muted': '#B8AC95', 'text-faint': '#A39780',
    border: '#3C3D3C', 'border-strong': '#CBBB9C', focus: '#F9923C',
    accent: '#F28222', 'accent-strong': '#F9923C', 'accent-nome': 'laranja',
    'scrim-tint': 'rgba(36,37,37,.55)', 'glass-bg': 'rgba(30,31,31,.62)', 'glass-border': 'rgba(241,222,192,.14)',
    'shadow-clay': 'inset 0 1px 0 rgba(102,99,98,.6), inset 0 -2px 3px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.4), 0 12px 28px -14px rgba(0,0,0,.7)',
    'shadow-1': '0 1px 2px rgba(0,0,0,.4), 0 2px 6px -2px rgba(0,0,0,.5)',
    'shadow-2': '0 1px 2px rgba(0,0,0,.45), 0 10px 28px -14px rgba(0,0,0,.7)',
    'body-font': 'var(--ws-font-body)',
  },
  contraste: {
    'glyph-rim': '#FFFFFF', 'glyph-shine': 'rgba(255,255,255,.35)', 'glyph-screen': '#000000',
    label: 'Alto contraste', scheme: 'dark', dir: 'lighter', textMin: 7, softMix: 0,
    surface: { 0: '#000000', 1: '#000000', 2: '#0F0F0F', 3: '#1A1A1A' }, container: '#000000',
    text: '#FFFFFF', 'text-muted': '#FFFFFF', 'text-faint': '#E6E6E6',
    border: '#FFFFFF', 'border-strong': '#FFFFFF', focus: '#FFFF00',
    accent: '#FFB15C', 'accent-strong': '#FFC784', 'accent-nome': 'laranja-claro',
    'scrim-tint': 'rgba(0,0,0,.85)', 'glass-bg': '#000000', 'glass-border': '#FFFFFF',
    'shadow-clay': 'none', 'shadow-1': 'none', 'shadow-2': 'none',
    'body-font': 'var(--ws-font-body)',
  },
  terminal: {
    'glyph-rim': 'rgba(242,130,34,.75)', 'glyph-shine': 'rgba(242,130,34,.28)', 'glyph-screen': '#47443C',
    label: 'Terminal', scheme: 'dark', dir: 'lighter', textMin: 4.5, softMix: 0.22,
    surface: { 0: '#242525', 1: '#2A2B2B', 2: '#313232', 3: '#393A3A' }, container: '#2A2B2B',
    text: '#F1DEC0', 'text-muted': '#CDBB97', 'text-faint': '#B8A682',
    border: '#47443C', 'border-strong': '#F28222', focus: '#F28222',
    accent: '#F28222', 'accent-strong': '#F9923C', 'accent-nome': 'laranja',
    'scrim-tint': 'rgba(36,37,37,.55)', 'glass-bg': 'rgba(36,37,37,.70)', 'glass-border': 'rgba(242,130,34,.28)',
    'shadow-clay': 'inset 0 1px 0 rgba(242,130,34,.22), inset 0 -2px 3px rgba(0,0,0,.5), 0 0 0 1px rgba(242,130,34,.18), 0 12px 28px -14px rgba(0,0,0,.8)',
    'shadow-1': '0 0 0 1px rgba(242,130,34,.14)',
    'shadow-2': '0 0 0 1px rgba(242,130,34,.18), 0 10px 28px -14px rgba(0,0,0,.8)',
    'body-font': 'var(--ws-font-mono)',
  },
};
export const THEME_IDS = Object.keys(THEMES);

/* ------------------------------------------------------------------------------------------------
 * 3. Tokens estáticos (iguais em todos os temas)
 * ------------------------------------------------------------------------------------------------ */
export const STATIC = {
  'font-display': '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif',
  'font-body': '"Public Sans", Inter, system-ui, "Segoe UI", Roboto, sans-serif',
  'font-mono': '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace',
  'text-display': '2rem', 'text-display--lh': '1.15', 'text-display--tracking': '-0.015em',
  'text-h1': '1.5rem', 'text-h1--lh': '1.2', 'text-h2': '1.25rem', 'text-h2--lh': '1.25', 'text-h3': '1.0625rem', 'text-h3--lh': '1.3',
  'text-body-lg': '1rem', 'text-body': '0.875rem', 'text-body--lh': '1.5', 'text-body-sm': '0.8125rem', 'text-caption': '0.75rem',
  'text-label': '0.6875rem', 'text-label--tracking': '0.08em', 'text-prompt': '0.9375rem', 'text-prompt--font': 'var(--ws-font-mono)',
  'space-0': '0', 'space-1': '4px', 'space-2': '8px', 'space-3': '12px', 'space-4': '16px', 'space-5': '20px', 'space-6': '24px', 'space-7': '32px', 'space-8': '40px', 'space-9': '48px', 'space-10': '64px',
  'radius-sm': '6px', 'radius-md': '10px', 'radius-lg': '16px', 'radius-pill': '999px', 'radius-monitor': '22%',
  'ease': 'cubic-bezier(.2,.8,.2,1)', 'ease-in-out': 'cubic-bezier(.4,0,.2,1)', 'ease-snap': 'cubic-bezier(.34,1.56,.64,1)',
  'duration-fast': '80ms', 'duration-base': '160ms', 'duration-slow': '320ms', 'duration-blink': '1000ms', 'duration-pulse': '1800ms', 'duration-spark': '1200ms',
  'blur-scrim': '12px', 'blur-glass': '20px', 'scrim-saturate': '1.2',
  'glyph-stroke': '1.75', 'glyph-size': '24px',
  'control-sm': '34px', 'control-md': '40px', 'control-lg': '48px', 'control-touch': '44px',
  'z-sticky': '20', 'z-header': '40', 'z-popover': '50', 'z-dialog': '60', 'z-toast': '70',
};

/* ------------------------------------------------------------------------------------------------
 * 4. Derivação
 * ------------------------------------------------------------------------------------------------ */
const ON_DARK = BRAND.ink[0];
const pickOn = (fill) => (contrast(fill, '#FFFFFF') >= contrast(fill, ON_DARK) ? '#FFFFFF' : ON_DARK);
/** Empurra a cor cheia até que branco OU ink tenha ≥ 4,5:1 sobre ela (texto sobre botão/nó). */
function ensureOnFill(hex, dir) {
  let out = hex, i = 0;
  while (i < 400 && Math.max(contrast(out, '#FFFFFF'), contrast(out, ON_DARK)) < 4.5) { out = lighten(out, dir === 'darker' ? -0.005 : 0.005); i++; }
  return out;
}
/** fill (glifo/borda ≥ 3:1 sobre surface-1), ink (texto ≥ textMin sobre surface-1, surface-2 e soft), soft (fundo de etiqueta), on (texto sobre fill). */
function triplet(theme, base) {
  const t = THEMES[theme], S1 = t.surface[1], S2 = t.surface[2];
  if (theme === 'contraste') { const ink = ensure(base, [S1, S2, t.surface[3]], 7, 'lighter'); return { fill: ink, ink, soft: '#000000', on: '#000000' }; }
  let fill = ensure(base, [S1], 3, t.dir);
  fill = ensureOnFill(fill, t.dir);
  const soft = mix(S1, base, t.softMix);
  const ink = ensure(fill, [S1, S2, soft], t.textMin, t.dir);
  return { fill, ink, soft, on: pickOn(fill) };
}
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

/** Todos os tokens de um tema → { nome-sem-prefixo: valor } */
export function resolveTheme(theme) {
  const t = THEMES[theme], hc = theme === 'contraste';
  const o = { 'theme-nome': `"${t.label}"` };
  // marca (fixa, mesma nos 4 temas — é o logo)
  for (const [k, [hex, nome]] of Object.entries(BRAND)) { o[k] = hex; o[`${k}-nome`] = `"${nome}"`; }
  o['gradient-brand'] = hc ? `radial-gradient(circle, ${t.accent}, ${t.accent})`
    : `radial-gradient(circle at 38% 32%, ${BRAND['orange-500'][0]} 0%, ${BRAND['orange-600'][0]} 58%, ${BRAND['orange-700'][0]} 100%)`;
  o['gradient-field'] = hc ? t.accent : `radial-gradient(circle at 50% 50%, ${BRAND['orange-500'][0]} 0%, #F9923C 60%, ${BRAND['orange-600'][0]} 100%)`;
  o['gradient-mesh'] = hc ? '#000000'
    : `radial-gradient(circle at 22% 28%, ${rgba(BRAND['orange-500'][0], .38)} 0, transparent 38%), radial-gradient(circle at 78% 70%, ${rgba(BRAND['orange-600'][0], .30)} 0, transparent 42%), repeating-linear-gradient(60deg, ${rgba(BRAND['orange-500'][0], .10)} 0 1px, transparent 1px 28px), repeating-linear-gradient(-60deg, ${rgba(BRAND['orange-500'][0], .10)} 0 1px, transparent 1px 28px), ${BRAND.ink[0]}`;
  // superfícies e neutros
  for (const [k, v] of Object.entries(t.surface)) o[`surface-${k}`] = v;
  o.container = t.container;
  for (const k of ['text', 'text-muted', 'text-faint', 'border', 'border-strong', 'focus']) o[k] = t[k];
  o['focus-ring'] = hc ? `0 0 0 3px ${t.focus}` : `0 0 0 2px ${t.surface[1]}, 0 0 0 4px ${t.focus}`;
  // acento (laranja da malha, adaptado ao tema)
  { const a = triplet(theme, t.accent); o.accent = hc ? a.fill : t.accent; o['accent-strong'] = t['accent-strong']; o['accent-ink'] = a.ink; o['accent-soft'] = a.soft; o['on-accent'] = pickOn(o.accent); o['accent-nome'] = `"${t['accent-nome']}"`; }
  // nós categóricos
  for (const [k, [base, nome]] of Object.entries(NODES)) { const n = triplet(theme, base); o[`node-${k}`] = n.fill; o[`node-${k}-ink`] = n.ink; o[`node-${k}-soft`] = n.soft; o[`on-node-${k}`] = n.on; o[`node-${k}-nome`] = `"${nome}"`; }
  // semânticos
  for (const [k, [base, nome]] of Object.entries(SEMANTIC)) { const n = triplet(theme, base); o[k] = n.fill; o[`${k}-ink`] = n.ink; o[`${k}-soft`] = n.soft; o[`on-${k}`] = n.on; o[`${k}-nome`] = `"${nome}"`; }
  o['ai-spark-glow'] = theme === 'claro' ? '#F5B942' : hc ? '#FFE680' : '#FFD27A';
  // relevo, vidro, scrim
  o['shadow-clay'] = t['shadow-clay']; o['shadow-1'] = t['shadow-1']; o['shadow-2'] = t['shadow-2'];
  o['scrim-tint'] = t['scrim-tint']; o['glass-bg'] = t['glass-bg']; o['glass-border'] = t['glass-border'];
  o['blur-scrim'] = hc ? '0px' : 'var(--ws-blur-scrim-base)'; o['blur-glass'] = hc ? '0px' : 'var(--ws-blur-glass-base)';
  o['body-font'] = t['body-font'];
  for (const k of ['glyph-rim', 'glyph-shine', 'glyph-screen']) o[k] = t[k];
  return o;
}
/** Valores literais (var() resolvidos) — para o relatório de contraste. */
export function resolveLiteral(theme) {
  const r = { ...resolveTheme(theme) }, all = { ...STATIC, ...r };
  const deref = (v, d = 0) => (typeof v !== 'string' || d > 5) ? v : v.replace(/var\(--ws-([a-z0-9-]+)\)/g, (_, n) => deref(all[n], d + 1));
  for (const k of Object.keys(r)) r[k] = deref(r[k]);
  return r;
}

/* ------------------------------------------------------------------------------------------------
 * 5. Relatório de contraste
 * ------------------------------------------------------------------------------------------------ */
export function contrastReport() {
  const rows = []; let failures = 0;
  for (const theme of THEME_IDS) {
    const r = resolveLiteral(theme), min = THEMES[theme].textMin;
    const push = (uso, fg, bg, lim = min) => { const c = contrast(r[fg], r[bg]); if (c < lim) failures++; rows.push({ theme, uso, fg, bg, fgHex: r[fg], bgHex: r[bg], c, lim, ok: c >= lim }); };
    for (const s of ['surface-0', 'surface-1', 'surface-2', 'surface-3', 'container']) push('texto principal', 'text', s);
    for (const s of ['surface-0', 'surface-1', 'surface-2']) push('texto secundário', 'text-muted', s);
    push('texto terciário / placeholder', 'text-faint', 'surface-1');
    push('marca: prompt `>_` creme sobre o monitor', 'cream', 'ink');
    push('marca: malha laranja sobre o monitor (glifo ≥ 3:1)', 'orange-500', 'ink', 3);
    push('marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco)', 'orange-700', 'cream', 3);
    push('marca: ink sobre creme (disco com `>_` invertido)', 'ink', 'cream');
    push('acento: texto/link sobre surface-1', 'accent-ink', 'surface-1'); push('acento: texto na etiqueta', 'accent-ink', 'accent-soft');
    push('acento: glifo/borda (≥ 3:1)', 'accent', 'surface-1', 3); push('acento: texto sobre o botão cheio', 'on-accent', 'accent');
    for (const k of Object.keys(NODES)) {
      push(`nó ${k}: texto`, `node-${k}-ink`, 'surface-1'); push(`nó ${k}: texto na etiqueta`, `node-${k}-ink`, `node-${k}-soft`); push(`nó ${k}: texto (surface-2)`, `node-${k}-ink`, 'surface-2');
      push(`nó ${k}: glifo/nó (≥ 3:1)`, `node-${k}`, 'surface-1', 3); push(`nó ${k}: texto sobre o nó cheio`, `on-node-${k}`, `node-${k}`);
    }
    for (const k of Object.keys(SEMANTIC)) {
      push(`${k}: texto`, `${k}-ink`, 'surface-1'); push(`${k}: texto na etiqueta`, `${k}-ink`, `${k}-soft`); push(`${k}: glifo/borda (≥ 3:1)`, k, 'surface-1', 3); push(`${k}: texto sobre a cor cheia`, `on-${k}`, k);
    }
    push('foco sobre surface-0 (≥ 3:1)', 'focus', 'surface-0', 3); push('foco sobre surface-1 (≥ 3:1)', 'focus', 'surface-1', 3);
    push('borda forte (≥ 3:1)', 'border-strong', 'surface-1', 3);
  }
  return { rows, failures };
}
const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
export function contrastMarkdown() {
  const { rows, failures } = contrastReport();
  let md = `Pares verificados: **${rows.length}** · falhas: **${failures}** · limites: texto ≥ 4,5:1 (≥ 7:1 no alto contraste), glifo/borda/foco ≥ 3:1 (WCAG 1.4.3 / 1.4.6 / 1.4.11). Gerado por \`anatomias/lib/tokens-ws.mjs\`.\n\n`;
  for (const theme of THEME_IDS) {
    const tr = rows.filter((r) => r.theme === theme);
    md += `#### ${THEMES[theme].label} (\`data-theme="${theme}"\`) — ${tr.length} pares, mínimo ${f2(Math.min(...tr.map((r) => r.c)))}:1\n\n| Uso | Frente | Fundo | Razão | Limite | OK |\n|---|---|---|---|---|---|\n`;
    for (const r of tr) md += `| ${r.uso} | \`--ws-${r.fg}\` ${r.fgHex} | \`--ws-${r.bg}\` ${r.bgHex} | ${f2(r.c)}:1 | ${r.lim}:1 | ${r.ok ? '✓' : '✗'} |\n`;
    md += '\n';
  }
  return md;
}
/** Tabela "paleta por tema" (hex nos 4 temas + nome + uso) para o TOKENS.md. */
export function paletteMarkdown() {
  const R = Object.fromEntries(THEME_IDS.map((t) => [t, resolveLiteral(t)]));
  const USO = {
    ink: 'carcaça do monitor, anel externo, fundo do tema terminal', cream: 'prompt `>_`, disco central, texto nos temas escuros',
    'orange-500': 'linhas da malha, acento, foco (terminal)', 'orange-600': 'hover do acento, 2º stop do disco', 'orange-700': 'borda inferior clay, active, foco (claro)',
    'surface-0': 'fundo do app', 'surface-1': 'card, painel', 'surface-2': 'etiqueta, campo', 'surface-3': 'trilha, divisória de mosaico', container: 'contêiner de página',
    text: 'texto principal', 'text-muted': 'texto secundário', 'text-faint': 'placeholder', border: 'divisória', 'border-strong': 'borda ≥ 3:1', focus: 'anel de foco',
    accent: 'botão primário, link, estado ativo', 'accent-ink': 'texto do acento', 'accent-soft': 'fundo da etiqueta do acento', 'on-accent': 'texto sobre o acento',
  };
  const rows = ['ink', 'cream', 'orange-500', 'orange-600', 'orange-700', 'surface-0', 'surface-1', 'surface-2', 'surface-3', 'container', 'text', 'text-muted', 'text-faint', 'border', 'border-strong', 'focus', 'accent', 'accent-ink', 'accent-soft', 'on-accent'];
  for (const k of Object.keys(NODES)) rows.push(`node-${k}`, `node-${k}-ink`, `node-${k}-soft`, `on-node-${k}`);
  for (const k of Object.keys(SEMANTIC)) rows.push(k, `${k}-ink`, `${k}-soft`, `on-${k}`);
  const nome = (k) => { const b = k.replace(/-(ink|soft)$/, '').replace(/^on-/, ''); const n = R.claro[`${b}-nome`]; return n ? n.replace(/"/g, '') : (k.startsWith('surface') || k === 'container' ? 'neutro' : k.startsWith('text') ? 'tinta' : '—'); };
  const uso = (k) => USO[k] ?? (k.endsWith('-ink') ? 'texto ≥ 4,5:1 sobre surface-1/2 e -soft' : k.endsWith('-soft') ? 'fundo da etiqueta' : k.startsWith('on-') ? 'texto sobre a cor cheia' : 'glifo, nó, borda ≥ 3:1');
  let md = `| Token | Claro | Escuro | Alto contraste | Terminal | Cor (texto) | Uso |\n|---|---|---|---|---|---|---|\n`;
  for (const k of rows) md += `| \`--ws-${k}\` | ${R.claro[k]} | ${R.escuro[k]} | ${R.contraste[k]} | ${R.terminal[k]} | ${nome(k)} | ${uso(k)} |\n`;
  return md;
}

/* ------------------------------------------------------------------------------------------------
 * 6. Emissão do CSS
 * ------------------------------------------------------------------------------------------------ */
const block = (sel, vars, extra = '') => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --ws-${k}: ${v};`).join('\n')}${extra}\n}\n`;
export function emitCss() {
  const st = { ...STATIC, 'blur-scrim-base': STATIC['blur-scrim'], 'blur-glass-base': STATIC['blur-glass'] };
  delete st['blur-scrim']; delete st['blur-glass'];
  const tb = (theme, sel) => block(sel, resolveTheme(theme), `\n  color-scheme: ${THEMES[theme].scheme};`);
  let css = `/* ============================================================================================
   Work Station — tokens de design v2, namespace --ws-* (briefing do dono do produto). GERADO por
   docs/design-system/anatomias/lib/tokens-ws.mjs — não editar à mão. Paleta derivada do logo (monitor clay preto,
   prompt >_ creme, disco creme, malha laranja, nós multicoloridos); hex medidos em public/brand/work-station-logo.png.
   Temas: <html data-theme="claro|escuro|contraste|terminal">; sem data-theme (ou "auto") segue prefers-color-scheme.
   Toda cor "-ink" tem ≥ 4,5:1 (≥ 7:1 no alto contraste) sobre surface-1, surface-2 e o "-soft"; toda cor cheia ≥ 3:1
   sobre surface-1; "on-*" ≥ 4,5:1 sobre a cor cheia. Tabela em TOKENS.md. Mapa de migração (tokens.css → --ws-*) idem.
   ============================================================================================ */\n\n`;
  css += `/* ---- 1. Estáticos: tipografia, espaço, raio, movimento, blur, glifo, controles, camadas ---- */\n` + block(':root', st);
  css += `\n/* ---- 2. Claro (padrão) ---- */\n` + tb('claro', ':root, :root[data-theme="claro"]');
  css += `\n/* ---- 3. Escuro: automático pelo sistema ou forçado ---- */\n@media (prefers-color-scheme: dark) {\n` + tb('escuro', ':root:not([data-theme]), :root[data-theme="auto"]').replace(/^/gm, '  ') + `}\n` + tb('escuro', ':root[data-theme="escuro"]');
  css += `\n/* ---- 4. Alto contraste: preto/branco, foco amarelo, sem sombra, sem blur, texto ≥ 7:1 ---- */\n` + tb('contraste', ':root[data-theme="contraste"]');
  css += `\n/* ---- 5. Terminal: fundo = --ws-ink, texto creme, acentos laranja, corpo em mono ---- */\n` + tb('terminal', ':root[data-theme="terminal"]');
  css += `
/* ---- 6. Vidro e scrim (RF38): classes utilitárias mínimas que consomem os tokens ---- */
.ws-scrim { background: var(--ws-scrim-tint); backdrop-filter: blur(var(--ws-blur-scrim)) saturate(var(--ws-scrim-saturate)); -webkit-backdrop-filter: blur(var(--ws-blur-scrim)) saturate(var(--ws-scrim-saturate)); }
.ws-glass { background: var(--ws-glass-bg); border: 1px solid var(--ws-glass-border); backdrop-filter: blur(var(--ws-blur-glass)) saturate(var(--ws-scrim-saturate)); -webkit-backdrop-filter: blur(var(--ws-blur-glass)) saturate(var(--ws-scrim-saturate)); }
.ws-clay { background: var(--ws-surface-1); border-radius: var(--ws-radius-lg); box-shadow: var(--ws-shadow-clay); }
:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
body { font-family: var(--ws-body-font); }

/* ---- 7. Preferências e movimento ---- */
:root[data-reduce-motion="true"] *, :root[data-reduce-motion="true"] *::before, :root[data-reduce-motion="true"] *::after {
  animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important;
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; } }
@media (pointer: coarse) { :root { --ws-control-sm: 40px; --ws-control-md: var(--ws-control-touch); } }
@media (forced-colors: active) { :root { --ws-border: CanvasText; --ws-border-strong: CanvasText; --ws-focus: Highlight; } }
::selection { background: var(--ws-accent-soft); color: var(--ws-text); }
`;
  return css;
}

/* ------------------------------------------------------------------------------------------------
 * 7. CLI
 * ------------------------------------------------------------------------------------------------ */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url)), ds = join(here, '..', '..');
  writeFileSync(join(ds, 'tokens-ws.css'), emitCss());
  console.log('tokens-ws.css escrito');
  const md = join(ds, 'TOKENS.md');
  const table = `\n### Paleta por tema (gerada)\n\n${paletteMarkdown()}\n### Contraste verificado (gerado)\n\n${contrastMarkdown()}`;
  if (existsSync(md)) {
    const s = readFileSync(md, 'utf8'), a = '<!-- tokens-ws:inicio -->', b = '<!-- tokens-ws:fim -->';
    if (s.includes(a) && s.includes(b)) { writeFileSync(md, s.slice(0, s.indexOf(a) + a.length) + table + s.slice(s.indexOf(b))); console.log('tabelas atualizadas em TOKENS.md'); }
  }
  console.log(table);
  const { rows, failures } = contrastReport();
  console.log(`contraste: ${rows.length} pares, ${failures} falhas`);
  if (failures) { console.error('FALHA: há pares de contraste reprovados'); process.exit(1); }
}

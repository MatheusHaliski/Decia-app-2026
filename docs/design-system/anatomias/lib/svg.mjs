// Primitivas SVG das anatomias — tudo tematizado por variáveis CSS declaradas no <style> do próprio SVG.
// Em SVG, var() só funciona em propriedades CSS (style="fill:var(--x)"), não em atributos de apresentação.
import { resolveLiteral, THEMES, STATIC, PHASES } from './tokens.mjs';
import { iconAt } from './icons.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
export const el = (tag, a = {}, inner) => inner === undefined || inner === '' ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${inner}</${tag}>`;
export const g = (a, inner) => el('g', a, inner);
/** estilo com tokens: st({fill:'surface', stroke:'line-soft', sw:1}) → "fill:var(--surface);stroke:var(--line-soft);stroke-width:1" */
export const v = (tok) => (tok === 'none' || /^#|^rgba?\(|^url\(/.test(tok)) ? tok : `var(--${tok})`;
export const st = ({ fill, stroke, sw, dash, op, extra } = {}) => [
  fill !== undefined ? `fill:${v(fill)}` : '', stroke !== undefined ? `stroke:${v(stroke)}` : '', sw !== undefined ? `stroke-width:${sw}` : '',
  dash ? `stroke-dasharray:${dash}` : '', op !== undefined ? `opacity:${op}` : '', extra || '',
].filter(Boolean).join(';');

export const rect = (x, y, w, h, s = {}, a = {}) => el('rect', { x, y, width: w, height: h, rx: s.rx, style: st(s), ...a });
export const circle = (cx, cy, r, s = {}, a = {}) => el('circle', { cx, cy, r, style: st(s), ...a });
export const line = (x1, y1, x2, y2, s = {}) => el('line', { x1, y1, x2, y2, style: st({ fill: 'none', ...s }), 'stroke-linecap': 'round' });
export const path = (d, s = {}, a = {}) => el('path', { d, style: st(s), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a });

export const FONT = { serif: STATIC.font.editorial, sans: STATIC.font.ui, mono: STATIC.font.data };
/** texto: fam serif|sans|mono; size px; weight; fill token; anchor; upper; tracking */
export function text(x, y, str, { fam = 'sans', size = 11, weight = 500, fill = 'ink', anchor = 'start', upper = false, tracking, italic = false, op, extra = '' } = {}) {
  const style = `font-family:${FONT[fam]};font-size:${size}px;font-weight:${weight};fill:${v(fill)};${anchor !== 'start' ? `text-anchor:${anchor};` : ''}${upper ? 'text-transform:uppercase;' : ''}${tracking ? `letter-spacing:${tracking};` : ''}${italic ? 'font-style:italic;' : ''}${op !== undefined ? `opacity:${op};` : ''}${extra}`;
  return el('text', { x, y, style }, esc(str));
}
/** largura aproximada em px (fator por família) */
export const tw = (str, size, fam = 'sans') => String(str).length * size * (fam === 'mono' ? 0.6 : fam === 'serif' ? 0.5 : 0.52);
export function wrap(str, maxChars, maxLines = 2) {
  const words = String(str).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); const last = keep[maxLines - 1]; const cut = last.includes(' ') ? last.replace(/\s*\S*$/, '') : last.slice(0, Math.max(3, maxChars - 1)); keep[maxLines - 1] = cut + '…'; return keep; }
  return lines;
}
export const lines = (x, y, arr, lh, opts) => arr.map((s, i) => text(x, y + i * lh, s, opts)).join('');

let uid = 0; export const id = (p = 'id') => `${p}${(++uid).toString(36)}`;
export const clipRect = (cid, x, y, w, h, rx) => `<clipPath id="${cid}">${el('rect', { x, y, width: w, height: h, rx })}</clipPath>`;

/* ---------------------------------- <style> do tema ---------------------------------- */
export function themeStyle(theme) {
  const lit = resolveLiteral(theme);
  const vars = Object.entries(lit).filter(([, val]) => /^#[0-9A-F]{3,8}$/i.test(val) || /^rgba?\(/.test(val) || /^[0-9.]+$/.test(val)).map(([k, val]) => `--${k}:${val}`).join(';');
  return `<style>svg{${vars};color-scheme:${THEMES[theme].scheme}}` +
    `.num text{font-family:${FONT.mono};font-weight:700;font-size:11px;fill:var(--surface);text-anchor:middle}` +
    `.lg{font-family:${FONT.sans};font-size:11px;fill:var(--ink)} .lg b{font-weight:700} .lg .m{fill:var(--muted)} .lg .k{font-family:${FONT.mono};font-size:10px;fill:var(--primary-ink)}` +
    `.kicker{font-family:${FONT.mono};font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;fill:var(--muted)}` +
    `.h{font-family:${FONT.serif};font-size:17px;font-weight:600;fill:var(--ink)}` +
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;
}

/* ---------------------------------- peças compartilhadas ---------------------------------- */
/** número de camada (círculo preto com número branco, como no FAI) */
export const callout = (n, x, y, r = 10) => g({ class: 'num' }, circle(x, y, r, { fill: 'ink', stroke: 'surface', sw: 1.5 }) + el('text', { x, y: y + 4 }, String(n)));
/** marcador de parte (letra, quadrado pequeno) */
export const mark = (ch, x, y) => g({ class: 'num' }, rect(x - 8, y - 8, 16, 16, { fill: 'primary-ink', stroke: 'surface', sw: 1.5, rx: 3 }) + el('text', { x, y: y + 3.6, style: 'font-size:9.5px' }, ch));

export function spark(x, y, size = 14, { glow = false, color = 'spark', anim = false } = {}) {
  const r = size / 2;
  const star = `M${x} ${y - r}l${r * .34} ${r * .66} ${r * .66} ${r * .34}-${r * .66} ${r * .34}-${r * .34} ${r * .66}-${r * .34}-${r * .66}-${r * .66}-${r * .34} ${r * .66}-${r * .34}z`;
  return g({ 'aria-label': 'gerado por IA' },
    (glow ? circle(x, y, r * 1.25, { fill: 'spark-glow', op: .35 }) : '') +
    path(star, { fill: color }) + (anim ? `<animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="90 ${x} ${y}" dur="1.2s" repeatCount="indefinite"/>` : ''));
}

export function avatar(x, y, r, initials, { fill = 'primary-soft', ink = 'primary-ink' } = {}) {
  return circle(x, y, r, { fill, stroke: 'surface', sw: 1.5 }) + text(x, y + r * .38, initials, { fam: 'mono', size: r * .95, weight: 700, fill: ink, anchor: 'middle' });
}
export function monogram(x, y, s, letters, colorTok) {
  return rect(x, y, s, s, { fill: colorTok, rx: Math.max(3, s * .22) }) + text(x + s / 2, y + s * .68, letters, { fam: 'serif', size: s * .5, weight: 700, fill: `on-${colorTok}`, anchor: 'middle', tracking: '-.02em' });
}

/** etiqueta de protocolo (estado) — nome do estado em texto (RF38.CA05). Devolve { svg, w } */
export function tag(x, y, label, { tok = 'primary', ink, soft, h = 20, icon, dashed = false, pulse = false, filled = false, star = false } = {}) {
  const inkT = ink ?? (tok === 'neutral' ? 'muted' : `${tok}-ink`);
  const softT = soft ?? (tok === 'neutral' ? 'surface-2' : `${tok}-soft`);
  const fillT = tok === 'neutral' ? 'line-soft' : tok;
  const size = 10, padX = 8, iconW = icon ? 14 : 0, dotW = pulse ? 10 : 0;
  const w = padX * 2 + iconW + dotW + tw(label, size, 'mono') + 1 + (star ? 14 : 0);
  let out = rect(x, y, w, h, { fill: filled ? fillT : softT, stroke: fillT, sw: 1, dash: dashed ? '3 2.5' : undefined, rx: h / 2 });
  let cx = x + padX;
  if (pulse) { out += circle(cx + 3, y + h / 2, 3, { fill: fillT }) + circle(cx + 3, y + h / 2, 5.5, { fill: 'none', stroke: fillT, sw: 1, op: .55 }) + `<circle cx="${cx + 3}" cy="${y + h / 2}" r="5.5" style="fill:none;stroke:${v(fillT)};stroke-width:1"><animate attributeName="r" values="4;8" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite"/></circle>`; cx += dotW; }
  if (icon) { out += iconAt(icon, cx, y + (h - 12) / 2, 12, v(filled ? `on-${fillT}` : inkT)); cx += iconW; }
  out += text(cx, y + h / 2 + 3.6, label, { fam: 'mono', size, weight: 600, fill: filled ? `on-${fillT}` : inkT, upper: true, tracking: '.05em' });
  if (star) out += iconAt('estrela', x + w - padX - 2, y + 3, 12, v(inkT));
  return { svg: g({ role: 'status', 'aria-label': `estado: ${label}` }, out), w };
}

/** prazo: relógio ou balança ⚖ (prazo legal) + texto; kind ok|soon|over */
export function due(x, y, label, { kind = 'ok', legal = false } = {}) {
  const ink = kind === 'soon' ? 'due-soon-ink' : kind === 'over' ? 'due-over-ink' : 'muted';
  const soft = kind === 'soon' ? 'due-soon-soft' : kind === 'over' ? 'due-over-soft' : null;
  const w = 8 + 14 + tw(label, 10, 'mono') + 8;
  return { svg: g({ 'aria-label': `prazo ${label}${legal ? ' (prazo legal)' : ''}` }, (soft ? rect(x, y, w, 20, { fill: soft, stroke: kind === 'soon' ? 'due-soon' : 'due-over', sw: 1, rx: 10 }) : '') + iconAt(legal ? 'balanca' : 'relogio', x + 7, y + 4, 12, v(ink)) + text(x + 23, y + 13.6, label, { fam: 'mono', size: 10, weight: 600, fill: ink, upper: true, tracking: '.04em' })), w };
}

/** carimbo VALIDADO / DEVOLVIDO / CONCLUÍDA (RF38.CA06) */
export function stamp(x, y, label, { tok = 'class-consenso', sub, angle = -8, w, h } = {}) {
  const size = sub ? 13 : 11; const W = w ?? Math.max(72, tw(label, size, 'mono') + 26); const H = h ?? (sub ? 40 : 26);
  const ink = `${tok}-ink`;
  return g({ transform: `rotate(${angle} ${x + W / 2} ${y + H / 2})`, role: 'img', 'aria-label': `carimbo ${label}${sub ? ' · ' + sub : ''}`, style: 'opacity:.94' },
    rect(x, y, W, H, { fill: 'surface', stroke: ink, sw: 2.5, rx: 4, op: .96 }) + rect(x + 4, y + 4, W - 8, H - 8, { fill: 'none', stroke: ink, sw: 1, rx: 2 }) +
    text(x + W / 2, y + (sub ? 18 : H / 2 + 4), label, { fam: 'mono', size, weight: 700, fill: ink, anchor: 'middle', upper: true, tracking: '.1em' }) +
    (sub ? text(x + W / 2, y + 31, sub, { fam: 'mono', size: 7.5, weight: 600, fill: ink, anchor: 'middle', upper: true, tracking: '.04em' }) : ''));
}

/** lacre de cera (chancela, RF38.CA06): kind gold|navy; ribbon = Excelência; broken = recusada/caducada */
export function seal(cx, cy, r, { kind = 'gold', ribbon = false, broken = false, letter = 'S' } = {}) {
  const pts = []; const n = 14;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rr = r * (i % 2 ? 1 : 0.93); pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`); }
  const blob = `M${pts.join('L')}Z`;
  const base = broken ? 'seal-broken' : `seal-${kind}`, hi = broken ? 'surface-3' : `seal-${kind}-hi`, lo = broken ? 'muted' : `seal-${kind}-lo`, edge = `seal-${kind}-edge`;
  let out = '';
  if (ribbon) out += path(`M${cx - r * .55} ${cy + r * .4}l-${r * .5} ${r * 1.4}h${r * .55}l${r * .35}-${r * .9}z`, { fill: 'seal-ribbon' }) + path(`M${cx + r * .55} ${cy + r * .4}l${r * .5} ${r * 1.4}h-${r * .55}l-${r * .35}-${r * .9}z`, { fill: 'seal-ribbon' });
  out += path(blob, { fill: base, stroke: edge, sw: 1.2 });
  out += circle(cx, cy, r * .66, { fill: 'none', stroke: hi, sw: 1, op: .9 });
  out += path(`M${cx - r * .55} ${cy - r * .35}a${r * .7} ${r * .7} 0 0 1 ${r * .35}-${r * .32}`, { fill: 'none', stroke: hi, sw: 1.4, op: .8 });
  out += text(cx, cy + r * .33, letter, { fam: 'serif', size: r * .95, weight: 700, fill: lo, anchor: 'middle' });
  if (broken) out += path(`M${cx - r * .2} ${cy - r}L${cx + r * .15} ${cy - r * .2}L${cx - r * .1} ${cy + r * .3}L${cx + r * .25} ${cy + r}`, { fill: 'none', stroke: 'surface', sw: 2.2 });
  return g({ role: 'img', 'aria-label': `chancela ${kind === 'gold' ? 'da empresa (lacre dourado)' : 'do chefe de departamento (lacre azul-marinho)'}${ribbon ? ', de Excelência' : ''}${broken ? ', recusada/caducada' : ''}` }, out);
}

/** barra de 7 fases (DEMANDA → ENCERRAMENTO), fase atual destacada */
export function phaseBar(x, y, w, current, { h = 6, gap = 2, label = true, done = true } = {}) {
  const segW = (w - gap * 6) / 7; let out = '';
  for (let i = 0; i < 7; i++) {
    const sx = x + i * (segW + gap);
    const s = i < current ? { fill: done ? 'primary' : 'line-soft' } : i === current ? { fill: 'primary-strong' } : { fill: 'surface-3', stroke: 'line-soft', sw: .5 };
    out += rect(sx, y, segW, h, { ...s, rx: h / 2 });
    if (i === current) out += rect(sx - 1, y - 2, segW + 2, h + 4, { fill: 'none', stroke: 'primary-strong', sw: 1, rx: (h + 4) / 2 });
  }
  if (label) out += text(x, y + h + 13, `${PHASES[current]} · ${current + 1}/7`, { fam: 'mono', size: 9.5, weight: 600, fill: 'primary-ink', upper: true, tracking: '.06em' });
  return g({ role: 'img', 'aria-label': `fase ${current + 1} de 7: ${PHASES[current]}` }, out);
}

/** anel de progresso por fase */
export function ring(cx, cy, r, pct, { sw = 4, label } = {}) {
  const c = 2 * Math.PI * r;
  return g({ role: 'img', 'aria-label': `progresso ${Math.round(pct * 100)}%` },
    circle(cx, cy, r + sw / 2 + 2, { fill: 'surface' }) + circle(cx, cy, r, { fill: 'none', stroke: 'surface-3', sw }) +
    el('circle', { cx, cy, r, style: st({ fill: 'none', stroke: 'primary', sw }), 'stroke-dasharray': `${(c * pct).toFixed(2)} ${c.toFixed(2)}`, 'stroke-linecap': 'round', transform: `rotate(-90 ${cx} ${cy})` }) +
    (label ? text(cx, cy + 3.3, label, { fam: 'mono', size: 9, weight: 700, fill: 'primary-ink', anchor: 'middle' }) : ''));
}

/** contadores sociais */
export function counters(x, y, c, { size = 13, gap = 12, fill = 'muted' } = {}) {
  const items = [['curtir', c.likes], ['comentar', c.comments], ['salvar', c.saves], ['remixar', c.remixes]].filter(([, n]) => n !== undefined);
  let cx = x, out = '';
  for (const [ic, n] of items) { out += iconAt(ic, cx, y, size, v(fill)); const label = String(n); out += text(cx + size + 3, y + size - 2.5, label, { fam: 'sans', size: 10.5, weight: 600, fill }); cx += size + 3 + tw(label, 10.5) + gap; }
  return { svg: g({ 'aria-label': `curtidas ${c.likes}, comentários ${c.comments}, salvos ${c.saves}, remixes ${c.remixes}` }, out), w: cx - x - gap };
}

/** nó do fio de decisão */
export const node = (x, y, cls, r = 5) => circle(x, y, r, { fill: `class-${cls}`, stroke: 'surface', sw: 1.5 });

/* ---------------------------------- miniaturas (camada 4) ---------------------------------- */
/** arte da miniatura por tipo: página, gráfico, silhueta, monograma, favicon+captura, imagem, pasta, gantt, formulário, envelope, recibo */
export function thumbArt(x, y, w, h, { type = 'DOCUMENTO', ext, tok = 'type-documento', initials = 'PT', cid } = {}) {
  const c = cid ?? id('t'); let inner = '';
  const extTok = ext ? `ext-${ext}` : tok;
  switch (type) {
    case 'PLANILHA': { inner = rect(x, y, w, h, { fill: 'surface-2' }); const bars = [.45, .7, .35, .85, .6, .5]; const bw = w / 9; bars.forEach((p, i) => { inner += rect(x + bw * (i * 1.4 + 0.6), y + h * (1 - p * .78) - 4, bw, h * p * .78, { fill: i === 3 ? 'type-planilha' : 'type-planilha', op: i === 3 ? 1 : .6, rx: 1 }); }); inner += line(x + 4, y + h - 4, x + w - 4, y + h - 4, { stroke: 'line-soft', sw: 1 }); break; }
    case 'DESENHO_TECNICO': case 'DESENHO_TECNICO_3D': {
      inner = rect(x, y, w, h, { fill: '#16437A' }); for (let i = 1; i < 6; i++) inner += line(x + (w / 6) * i, y, x + (w / 6) * i, y + h, { stroke: '#FFFFFF', sw: .5, op: .18 }); for (let i = 1; i < 4; i++) inner += line(x, y + (h / 4) * i, x + w, y + (h / 4) * i, { stroke: '#FFFFFF', sw: .5, op: .18 });
      inner += path(`M${x + w * .15} ${y + h * .75}h${w * .7}v-${h * .35}h-${w * .25}v-${h * .2}h-${w * .2}v${h * .2}h-${w * .25}z`, { fill: 'none', stroke: '#DCE9FB', sw: 1.4 }) + line(x + w * .15, y + h * .86, x + w * .85, y + h * .86, { stroke: '#8EC5FF', sw: .8 }) + line(x + w * .15, y + h * .82, x + w * .15, y + h * .9, { stroke: '#8EC5FF', sw: .8 }) + line(x + w * .85, y + h * .82, x + w * .85, y + h * .9, { stroke: '#8EC5FF', sw: .8 }); break; }
    case 'TEXTO_MANUAL': case 'TEXTO_IA': {
      inner = rect(x, y, w, h, { fill: `${tok}-soft` }) + text(x + w / 2, y + h / 2 + h * .17, initials, { fam: 'serif', size: h * .5, weight: 700, fill: `${tok}-ink`, anchor: 'middle', tracking: '-.03em' });
      if (type === 'TEXTO_IA') inner += spark(x + w - 12, y + 12, 12, { glow: true }); break; }
    case 'LINK': { inner = rect(x, y, w, h, { fill: 'surface-2' }) + rect(x, y, w, h * .22, { fill: 'surface-3' }) + circle(x + 7, y + h * .11, 2.2, { fill: 'due-over' }) + circle(x + 13, y + h * .11, 2.2, { fill: 'due-soon' }) + circle(x + 19, y + h * .11, 2.2, { fill: 'class-consenso' }) + rect(x + 26, y + h * .06, w - 32, h * .1, { fill: 'surface', rx: 2 }) + rect(x + 8, y + h * .32, w * .45, h * .08, { fill: 'type-link', op: .5, rx: 1 }) + rect(x + 8, y + h * .48, w * .8, h * .06, { fill: 'line-soft', rx: 1 }) + rect(x + 8, y + h * .6, w * .7, h * .06, { fill: 'line-soft', rx: 1 }) + rect(x + 8, y + h * .72, w * .5, h * .06, { fill: 'line-soft', rx: 1 }) + circle(x + w - 12, y + h - 12, 7, { fill: 'type-link' }) + iconAt('link', x + w - 17, y + h - 17, 10, v('on-type-link')); break; }
    case 'IMAGEM_WEB': case 'IMAGEM_EDITADA': { inner = rect(x, y, w, h, { fill: `${tok}-soft` }) + circle(x + w * .75, y + h * .3, h * .12, { fill: tok, op: .8 }) + path(`M${x} ${y + h}L${x + w * .3} ${y + h * .45}L${x + w * .5} ${y + h * .7}L${x + w * .7} ${y + h * .5}L${x + w} ${y + h}z`, { fill: tok, op: .55 }); break; }
    case 'PASTA': { inner = rect(x, y, w, h, { fill: 'type-pasta-soft' }) + path(`M${x + w * .2} ${y + h * .3}h${w * .22}l${w * .06} ${h * .1}h${w * .32}v${h * .45}h-${w * .6}z`, { fill: 'type-pasta', op: .85 }) + line(x + w * .5, y + h * .42, x + w * .5, y + h * .85, { stroke: 'surface', sw: 1.2, dash: '2 2' }); break; }
    case 'EMAIL': { inner = rect(x, y, w, h, { fill: 'type-email-soft' }) + rect(x + w * .2, y + h * .25, w * .6, h * .5, { fill: 'surface', stroke: 'type-email', sw: 1.2, rx: 2 }) + path(`M${x + w * .2} ${y + h * .27}L${x + w * .5} ${y + h * .55}L${x + w * .8} ${y + h * .27}`, { fill: 'none', stroke: 'type-email', sw: 1.2 }); break; }
    case 'CRONOGRAMA': { inner = rect(x, y, w, h, { fill: 'surface-2' }); [[.1, .35], [.3, .4], [.5, .3], [.65, .3]].forEach(([s, l], i) => { inner += rect(x + w * s, y + h * (.18 + i * .18), w * l, h * .1, { fill: 'type-cronograma', op: .55 + i * .12, rx: 2 }); }); inner += line(x + w * .55, y + 4, x + w * .55, y + h - 4, { stroke: 'due-over', sw: 1, dash: '2 2' }); break; }
    case 'FORMULARIO': { inner = rect(x, y, w, h, { fill: 'surface' }); for (let i = 0; i < 3; i++) { inner += rect(x + w * .12, y + h * (.18 + i * .24), h * .12, h * .12, { fill: i < 2 ? 'type-formulario' : 'surface', stroke: 'type-formulario', sw: 1, rx: 1.5 }) + rect(x + w * .12 + h * .2, y + h * (.2 + i * .24), w * .5, h * .07, { fill: 'line-soft', rx: 1 }); } break; }
    case 'PROTOCOLO': { inner = rect(x, y, w, h, { fill: 'type-protocolo-soft' }) + rect(x + w * .25, y + h * .12, w * .5, h * .8, { fill: 'surface', stroke: 'line-soft', sw: .8 }) + text(x + w / 2, y + h * .42, 'Nº 2026/0931', { fam: 'mono', size: h * .13, weight: 700, fill: 'type-protocolo-ink', anchor: 'middle' }) + rect(x + w * .33, y + h * .55, w * .34, h * .05, { fill: 'line-soft' }) + rect(x + w * .33, y + h * .66, w * .26, h * .05, { fill: 'line-soft' }); break; }
    case 'ATA_REGISTRO': { inner = rect(x, y, w, h, { fill: 'surface' }); for (let i = 0; i < 5; i++) inner += rect(x + w * .15, y + h * (.18 + i * .14), w * (.7 - (i === 4 ? .3 : 0)), h * .05, { fill: 'line-soft', rx: 1 }); inner += g({ transform: `rotate(-14 ${x + w * .7} ${y + h * .6})` }, circle(x + w * .7, y + h * .6, h * .22, { fill: 'none', stroke: 'type-ata-registro', sw: 1.6, op: .85 }) + circle(x + w * .7, y + h * .6, h * .16, { fill: 'none', stroke: 'type-ata-registro', sw: .8, op: .85 }) + text(x + w * .7, y + h * .63, 'ATA', { fam: 'mono', size: h * .11, weight: 700, fill: 'type-ata-registro-ink', anchor: 'middle', op: .9 })); break; }
    case 'ESTUDO_TECNICO_PRELIMINAR': { inner = rect(x, y, w, h, { fill: 'surface' }) + rect(x + w * .12, y + h * .14, w * .5, h * .07, { fill: tok, op: .8, rx: 1 }); for (let i = 0; i < 4; i++) inner += rect(x + w * .12, y + h * (.32 + i * .13), w * .72, h * .045, { fill: 'line-soft', rx: 1 }); inner += circle(x + w * .72, y + h * .62, h * .17, { fill: 'surface', stroke: tok, sw: 1.6 }) + line(x + w * .72 + h * .12, y + h * .62 + h * .12, x + w * .84, y + h * .9, { stroke: tok, sw: 2 }); break; }
    default: { // DOCUMENTO: primeira página estilizada + selo da extensão
      inner = rect(x, y, w, h, { fill: 'surface-2' }) + rect(x + w * .18, y + h * .08, w * .64, h * 1.1, { fill: 'surface', stroke: 'line-soft', sw: .8 }) + rect(x + w * .25, y + h * .16, w * .3, h * .06, { fill: extTok, op: .9, rx: 1 });
      for (let i = 0; i < 5; i++) inner += rect(x + w * .25, y + h * (.3 + i * .11), w * (.5 - (i % 3 === 2 ? .15 : 0)), h * .04, { fill: 'line-soft', rx: 1 });
      if (ext) inner += rect(x + w - 30, y + h - 16, 26, 12, { fill: extTok, rx: 2 }) + text(x + w - 17, y + h - 7.2, ext, { fam: 'mono', size: 7.5, weight: 700, fill: `on-${extTok}`, anchor: 'middle', upper: true });
    }
  }
  return `<defs>${clipRect(c, x, y, w, h, 0)}</defs>` + g({ 'clip-path': `url(#${c})`, 'aria-hidden': 'true' }, inner);
}

/** capa-mosaico 2×3 (RF38.CA03) */
export function mosaic(x, y, w, h, tiles, { gap = 2 } = {}) {
  const tw_ = (w - gap * 2) / 3, th = (h - gap) / 2; let out = rect(x, y, w, h, { fill: 'surface-3' });
  tiles.slice(0, 6).forEach((t, i) => { const col = i % 3, row = Math.floor(i / 3); out += thumbArt(x + col * (tw_ + gap), y + row * (th + gap), tw_, th, t); });
  for (let i = tiles.length; i < 6; i++) { const col = i % 3, row = Math.floor(i / 3); out += rect(x + col * (tw_ + gap), y + row * (th + gap), tw_, th, { fill: 'surface-2' }) + iconAt('pasta-vazia', x + col * (tw_ + gap) + tw_ / 2 - 8, y + row * (th + gap) + th / 2 - 8, 16, v('line-soft')); }
  return g({ role: 'img', 'aria-label': `capa: mosaico de ${Math.min(tiles.length, 6)} tarefas` }, out);
}

/* ---------------------------------- composição da prancha ---------------------------------- */
/**
 * Monta o SVG final: título, card (com números/letras) e legenda. layout 'lado' (legenda à direita) ou 'baixo'.
 * card: { svg, w, h, callouts: [{n|ch, x, y}], legend: [[n, titulo, descricao]] }
 */
export function anatomy({ theme, kicker, title, card, layout, note }) {
  const side = layout ?? (card.w > 420 ? 'baixo' : 'lado');
  const pad = 24, legendW = side === 'lado' ? 372 : card.w, lh = 14;
  const legendLines = []; // {x, y, segs}
  for (const [k, t, d] of card.legend) {
    const ls = wrap(`${t} — ${d}`, side === 'lado' ? 54 : Math.floor(card.w / 6.6), 7);
    legendLines.push({ k, ls });
  }
  const legendH = legendLines.reduce((a, l) => a + l.ls.length * lh + 6, 0);
  const headH = 58;
  const W = side === 'lado' ? pad + card.w + 36 + legendW + pad : pad * 2 + card.w;
  const H = side === 'lado' ? headH + Math.max(card.h, legendH) + pad + (note ? 28 : 0) : headH + card.h + 24 + legendH + pad + (note ? 28 : 0);
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ttl" lang="pt-BR">${themeStyle(theme)}`;
  out += `<title id="ttl">${esc(title)} — tema ${esc(THEMES[theme].label)}</title>`;
  out += rect(0, 0, W, H, { fill: 'ground' });
  out += el('text', { x: pad, y: 22, class: 'kicker' }, esc(kicker)) + el('text', { x: pad, y: 44, class: 'h' }, esc(title));
  out += g({ transform: `translate(${pad} ${headH})` }, card.svg + card.callouts.map((c) => (typeof c.n === 'number' ? callout(c.n, c.x, c.y) : mark(c.n, c.x, c.y))).join(''));
  const lx = side === 'lado' ? pad + card.w + 36 : pad, ly = side === 'lado' ? headH + 6 : headH + card.h + 24;
  let cy = ly;
  for (const { k, ls } of legendLines) {
    const isNum = typeof k === 'number';
    out += isNum ? callout(k, lx + 8, cy + 5, 8) : g({ class: 'num' }, rect(lx + 1, cy - 2, 14, 14, { fill: 'primary-ink', rx: 3 }) + el('text', { x: lx + 8, y: cy + 8.6, style: 'font-size:9px' }, k));
    ls.forEach((s, i) => { const [a, b] = i === 0 ? s.split(' — ') : [null, s]; out += `<text x="${lx + 24}" y="${cy + 9 + i * lh}" class="lg">${a ? `<tspan style="font-weight:700">${esc(a)}</tspan>${b !== undefined ? `<tspan class="m"> — ${esc(b)}</tspan>` : ''}` : `<tspan class="m">${esc(s)}</tspan>`}</text>`; });
    cy += ls.length * lh + 6;
  }
  if (note) out += text(pad, H - 12, note, { fam: 'sans', size: 10.5, fill: 'muted', italic: true });
  return out + '</svg>\n';
}

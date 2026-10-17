// Anatomias dos demais cards do Work Station (ANATOMIA_CARDS.md v2, §9 em diante): tarefa real da API, Decision Card
// (frente · verso · compacto), entrada do Mural, atribuição, notificação, cabeçalhos de perfil e de instituição, pessoa
// na busca, card da sessão DECIA, evidência, sugestão da IA, cards da conta (2FA, exclusão, aviso, dispositivo), bloco
// de RF/CA e item salvo indisponível. Mesmo contrato de cards.mjs: cada variação devolve { svg, w, h, callouts, legend }
// e render(varn, theme) monta a prancha com anatomy(). Diferença: as chamadas ficam numa calha à esquerda (números =
// camadas) e à direita (letras = elementos de conteúdo), ligadas ao alvo por linhas-guia com cotovelo.
import { rect, circle, line, path, text, g, v, wrap, lines, tw, id, clipRect, avatar, monogram, due, seal, spark, thumbArt, mosaic, anatomy } from './svg.mjs';
import { iconAt } from './icons.mjs';

/* ------------------------------------------------ calha de chamadas com linhas-guia ------------------------------------------------ */
const G = 46; // largura de cada calha
const PADY = 14;
/** body desenhado em (0,0)-(cw,ch); marks = [{ k: número|letra, x, y, side? }] em coordenadas do body */
function guides({ body, cw, ch, marks, legend }) {
  const sides = { l: [], r: [] };
  for (const m of marks) sides[m.side ?? (typeof m.k === 'number' ? 'l' : 'r')].push(m);
  let H = ch + 2 * PADY;
  const W = cw + 2 * G;
  const placed = [];
  for (const s of ['l', 'r']) {
    const arr = sides[s].slice().sort((a, b) => a.y - b.y);
    // posição ideal = altura do alvo; empurra para baixo quando colide (mín. 22 px entre chamadas)
    let prev = -Infinity;
    const ys = arr.map((m) => { const by = Math.max(m.y + PADY, prev + 22, 12); prev = by; return by; });
    // se estourou a base, puxa o bloco para cima mantendo o espaçamento
    const over = ys.length ? ys[ys.length - 1] - (H - 12) : 0;
    if (over > 0) { for (let i = ys.length - 1; i >= 0; i--) { const lim = i === ys.length - 1 ? H - 12 : ys[i + 1] - 22; ys[i] = Math.min(ys[i], lim); } }
    if (ys.length && ys[0] < 12) { let p = -Infinity; for (let i = 0; i < ys.length; i++) { ys[i] = Math.max(ys[i], p + 22, 12); p = ys[i]; } H = Math.max(H, p + 14); }
    arr.forEach((m, i) => placed.push({ ...m, side: s, by: ys[i] }));
  }
  let guidesSvg = '';
  for (const p of placed) {
    p.bx = p.side === 'l' ? G / 2 - 6 : W - G / 2 + 6;
    const tx = p.x + G, ty = p.y + PADY;
    const sx = p.side === 'l' ? p.bx + 11 : p.bx - 11;
    const ex = p.side === 'l' ? G - 4 : G + cw + 4; // cotovelo junto à borda do card
    // diagonal só dentro da calha; dentro do card a linha corre na altura do alvo
    const d = Math.abs(p.by - ty) < 1 ? `M${sx} ${p.by}H${tx}` : `M${sx} ${p.by}L${ex} ${ty}H${tx}`;
    guidesSvg += path(d, { fill: 'none', stroke: 'muted', sw: 1, op: .7 }) + circle(tx, ty, 2.6, { fill: 'primary-ink', stroke: 'surface', sw: 1 });
  }
  const svg = g({ transform: `translate(${G} ${PADY})` }, body) + g({ 'aria-hidden': 'true', style: 'pointer-events:none' }, guidesSvg);
  // legenda na ordem de leitura: camadas (números) e depois elementos (letras)
  const ord = (k) => (typeof k === 'number' ? k : 100 + k.charCodeAt(0));
  return { svg, w: W, h: H, callouts: placed.map((p) => ({ n: p.k, x: p.bx, y: p.by })), legend: legend.slice().sort((a, b) => ord(a[0]) - ord(b[0])) };
}

/* ------------------------------------------------ peças de interface (espelham components/ui) ------------------------------------------------ */
// tons do Badge/Tag do app → famílias de token das pranchas: [fundo suave, traço, tinta]
const TONE = {
  neutral: ['surface-2', 'line-soft', 'muted'], accent: ['primary-soft', 'primary', 'primary-ink'], info: ['class-argumento-soft', 'class-argumento', 'class-argumento-ink'],
  success: ['class-consenso-soft', 'class-consenso', 'class-consenso-ink'], warning: ['due-soon-soft', 'due-soon', 'due-soon-ink'], danger: ['class-risco-soft', 'class-risco', 'class-risco-ink'],
  spark: ['spark-soft', 'spark', 'spark-ink'], orange: ['class-divergencia-soft', 'class-divergencia', 'class-divergencia-ink'], purple: ['class-pergunta-soft', 'class-pergunta', 'class-pergunta-ink'],
};
/** Tag (sans, raio sm, caixa normal) ou Badge (badge:true → mono maiúsculo em pílula). Devolve { svg, w, h } */
function pill(x, y, label, { tone = 'neutral', filled = false, dashed = false, badge = false, glyph, pulse = false, h } = {}) {
  const [soft, stroke, ink] = TONE[tone];
  const size = badge ? 8.5 : 10.5, fam = badge ? 'mono' : 'sans', H = h ?? (badge ? 17 : 20);
  const lab = badge ? String(label).toUpperCase() : String(label);
  const gw = glyph ? size + 3 : 0, dw = pulse ? 10 : 0;
  const w = Math.round((badge ? 14 : 14) + gw + dw + tw(lab, size, fam) * (badge ? 1.12 : 1.02));
  const fill = filled ? stroke : soft, inkT = filled ? `on-${stroke}` : ink;
  let s = rect(x, y, w, H, { fill, stroke: dashed ? 'muted' : stroke, sw: 1, dash: dashed ? '3 2.5' : undefined, rx: badge ? H / 2 : 4 });
  let cx = x + 7;
  if (pulse) { s += circle(cx + 3, y + H / 2, 3, { fill: stroke }) + circle(cx + 3, y + H / 2, 5.5, { fill: 'none', stroke, sw: 1, op: .5 }); cx += dw; }
  if (glyph) { s += text(cx, y + H / 2 + size * .36, glyph, { fam: 'sans', size, weight: 700, fill: inkT }); cx += gw; }
  s += text(cx, y + H / 2 + size * .36, lab, { fam, size, weight: badge ? 700 : 600, fill: inkT, tracking: badge ? '.06em' : undefined });
  return { svg: s, w, h: H };
}
/** Button do app: primary · secondary · danger · ghost · default · spark · pressed. Devolve { svg, w, h } */
function button(x, y, label, { variant = 'default', size = 11, h = 28, icon } = {}) {
  const iw = icon ? 16 : 0;
  const w = Math.round(22 + iw + tw(label, size));
  const V = {
    primary: ['primary', 'primary', 'on-primary'], secondary: ['secondary', 'secondary', 'on-secondary'], danger: ['class-risco', 'class-risco', 'on-class-risco'],
    ghost: ['none', 'none', 'primary-ink'], default: ['surface', 'line-soft', 'ink'], spark: ['spark', 'spark', 'on-spark'], pressed: ['primary-soft', 'primary', 'primary-ink'],
  }[variant];
  let s = rect(x, y, w, h, { fill: V[0], stroke: V[1], sw: 1, rx: 7 });
  if (icon) s += iconAt(icon, x + 10, y + (h - 13) / 2, 13, v(V[2]));
  s += text(x + 11 + iw, y + h / 2 + 3.9, label, { size, weight: 600, fill: V[2] });
  return { svg: g({ role: 'button' }, s), w, h };
}
/** coloca peças em linha com quebra; items = funções (x,y) => {svg,w,h}. Devolve { svg, h, xs } */
function flow(x, y, maxW, items, { gap = 6, rowGap = 6 } = {}) {
  let cx = x, cy = y, rowH = 0, s = ''; const pos = [];
  for (const make of items) {
    const probe = make(0, 0);
    if (cx > x && cx + probe.w > x + maxW) { cx = x; cy += rowH + rowGap; rowH = 0; }
    const it = make(cx, cy); s += it.svg; pos.push({ x: cx, y: cy, w: it.w, h: it.h }); cx += it.w + gap; rowH = Math.max(rowH, it.h);
  }
  return { svg: s, h: cy - y + rowH, pos };
}
/** sequência de trechos de texto na mesma linha: [[str, opts], …] → { svg, w } */
function runs(x, y, parts) {
  let cx = x, s = '';
  // espaços nas pontas colapsam em SVG: viram deslocamento explícito
  for (const [raw, o = {}] of parts) {
    const size = o.size ?? 11, lead = raw.length - raw.trimStart().length, trail = raw.length - raw.trimEnd().length, str = raw.trim();
    cx += lead * size * .3; s += text(cx, y, str, { size: 11, ...o }); cx += tw(str, size, o.fam ?? 'sans') * (o.weight >= 600 ? 1.1 : 1.02) + trail * size * .3;
  }
  return { svg: s, w: cx - x };
}
const card = (x, y, w, h, { rx = 14, stroke = 'line-soft', sw = 1, fill = 'surface', dashed = false, shadow = true } = {}) =>
  rect(x, y, w, h, { fill, stroke, sw, rx, dash: dashed ? '6 4' : undefined, extra: shadow ? 'filter:drop-shadow(0 1px 2px rgba(0,0,0,.08))' : '' });
const hr = (x1, x2, y) => line(x1, y, x2, y, { stroke: 'line-soft', sw: 1 });
const progress = (x, y, w, pct, { tok = 'primary', h = 6 } = {}) => g({ role: 'progressbar', 'aria-valuenow': Math.round(pct * 100) }, rect(x, y, w, h, { fill: 'surface-3', rx: h / 2 }) + (pct > 0 ? rect(x, y, Math.max(h, w * pct), h, { fill: tok, rx: h / 2 }) : ''));
/** fieldset de cabeçalho do ui/Card (eyebrow mono + título serif + ações à direita). Devolve { svg, h } */
function cardHeader(x, y, w, { eyebrow, title, action }) {
  let s = '', yy = y;
  const aw = action ? action(0, 0).w : 0;
  if (eyebrow) { s += text(x, yy + 9, eyebrow, { fam: 'mono', size: 8.5, weight: 600, fill: 'muted', upper: true, tracking: '.08em' }); yy += 15; }
  const tl = wrap(title, Math.floor((w - aw - 10) / 8.6), 2); s += lines(x, yy + 15, tl, 21, { fam: 'serif', size: 17, weight: 600 });
  if (action) s += action(x + w - aw, y + (eyebrow ? 2 : 0)).svg;
  return { svg: s, h: yy - y + tl.length * 21 + 4 };
}

/* ------------------------------------------------ dados de exemplo (fictícios) ------------------------------------------------ */
const DEPT = { acr: 'SECID-UTS', mono: 'UTS', tok: 'dept-gralha-azul', name: 'Unidade Técnica de Saneamento' };
const TITULO = 'Parecer técnico — pavimentação da PR-445, lote 2';

/* =============================================== 1. Tarefa real (PersistedTaskCard) =============================================== */
const WORK = {
  'a-realizar': { tag: ['A realizar', 'accent'], pri: ['Alta', 'warning'], done: 2, next: 'Iniciar' },
  concluida: { tag: ['Concluído', 'success'], pri: null, done: 5, next: null },
  bloqueada: { tag: ['Bloqueado', 'danger'], pri: ['Crítica', 'warning'], done: 3, next: 'Retomar (desbloquear)' },
  rascunho: { tag: ['A realizar · Rascunho', 'accent', true], pri: null, done: 0, next: 'Revisar e publicar no acervo' },
};
function tarefaReal(kind) {
  const W = 300, P = 16, k = WORK[kind], total = 5; let s = '', y = P; const marks = [];
  const b = pill(P, y, 'Tarefa', { badge: true }); s += b.svg; s += text(P + b.w + 7, y + 12, 'Documento · Engenharia', { size: 10.5, fill: 'muted' });
  marks.push({ k: 'a', x: P, y: y + 8, side: 'l' }, { k: 'b', x: P + b.w + 7 + tw('Documento · Engenharia', 10.5) + 4, y: y + 8 }); y += 17 + 10;
  const tl = wrap(TITULO, 30, 2); s += lines(P, y + 13, tl, 19, { size: 15, weight: 600 }); marks.push({ k: 'c', x: Math.min(W - 6, P + tw(tl[0], 15) * 1.08 + 4), y: y + 8 }); y += tl.length * 19 + 4;
  const ol = wrap('Verificar a conformidade do projeto executivo do lote 2 com o termo de referência e apontar os ajustes de drenagem.', 44, 2);
  s += lines(P, y + 11, ol, 15, { size: 11, fill: 'muted' }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(ol[0], 11) + 4), y: y + 7 }); y += ol.length * 15 + 8;
  const items = [(x, yy) => pill(x, yy, k.tag[0], { tone: k.tag[1], dashed: !!k.tag[2] })];
  if (k.pri) items.push((x, yy) => pill(x, yy, k.pri[0], { tone: k.pri[1] }));
  items.push((x, yy) => ({ svg: text(x, yy + 14, 'prazo 24 de out. de 2026', { size: 10, fill: 'ink' }), w: tw('prazo 24 de out. de 2026', 10), h: 20 }));
  const f = flow(P, y, W - 2 * P, items); s += f.svg; marks.push({ k: 'e', x: f.pos[0].x, y: f.pos[0].y + 10, side: 'l' }); if (k.pri) marks.push({ k: 'f', x: f.pos[1].x + f.pos[1].w / 2, y: f.pos[1].y - 1 });
  const lp = f.pos[f.pos.length - 1]; marks.push({ k: 'g', x: Math.min(W - 6, lp.x + lp.w + 4), y: lp.y + 10 }); y += f.h + 10;
  s += progress(P, y, W - 2 * P, k.done / total); s += text(P, y + 20, `${k.done} de ${total} critérios atendidos`, { size: 10, fill: 'muted' }); marks.push({ k: 'h', x: W - P + 2, y: y + 3 }); y += 28;
  if (k.next) { const rn = runs(P, y + 11, [['Próxima ação: ', { size: 10.5, weight: 700 }], [k.next, { size: 10.5 }]]); s += rn.svg; marks.push({ k: 'i', x: Math.min(W - 6, P + rn.w + 4), y: y + 7 }); y += 18; }
  const H = y + P - 4;
  const body = card(0, 0, W, H) + s;
  marks.push({ k: 1, x: 0, y: H / 2 });
  const legend = [
    [1, 'Superfície', 'components/ui/Card as="article" tom surface: borda 1 px --ws-border, raio lg, padding md; aria-labelledby = id do título. Sem borda de departamento, sem arte e sem mídia (≠ TaskSchemeCard, §3).'],
    ['a', 'Tipo de registro', 'Badge neutro fixo "Tarefa" (mono, maiúsculas) — derivado; não vem da API.'],
    ['b', 'Tipo · área', 'TaskView.type → social.taskType; TaskView.area → tasks.area (opcional). Categoria: Conteúdo autoral.'],
    ['c', 'Título (link)', 'TaskView.title, h3 → /tasks/[id]. Categoria: Identificação.'],
    ['d', 'Objetivo', 'TaskView.objective em 2 linhas (line-clamp); vazio = "Objetivo não informado". Categoria: Conteúdo autoral.'],
    ['e', 'Estado de execução', `WorkStatusTag: workStatusOf(TaskView.state) → A realizar · Em andamento · Bloqueado · Concluído · Arquivado; RASCUNHO soma "· Rascunho" e borda tracejada; MODELO_PUBLICO/OFERECIDA viram etiqueta âmbar de publicação. Categoria: Estado e ciclo de vida.`],
    ['g', 'Prazo', 'TaskView.dueAt em data média (Intl, UTC). Categoria: Conteúdo autoral (briefing).'],
    ['h', 'Progresso pelos critérios', 'criteriaProgress(acceptanceCriteria): barra role=progressbar com aria-valuenow e texto "n de N critérios atendidos"; sem critérios = "sem percentual". Derivado de Conteúdo autoral.'],
  ];
  if (k.pri) legend.splice(7, 0, ['f', 'Prioridade', 'TaskView.priority: só aparece quando ≠ MÉDIA (Baixa neutra; Alta/Crítica âmbar). Categoria: Conteúdo autoral.']);
  if (k.next) legend.push(['i', 'Próxima ação', `nextActionOf(state) → "${k.next}" (o botão de verdade fica no detalhe). Derivado de Estado e ciclo de vida.`]);
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 2. Decision Card (frente · verso · compacto) =============================================== */
function decisaoShell(W, H, barTok) {
  const cid = id('dc');
  return `<defs>${clipRect(cid, 0, 0, W, H, 12)}</defs>` + card(0, 0, W, H, { rx: 12 }) + g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, 5, { fill: barTok }));
}
function decisaoRodape(W, y, P, { flipped }) {
  let s = hr(P, W - P, y);
  s += text(P, y + 26, 'Atalho: F vira o card', { size: 10, fill: 'muted' });
  const lab = flipped ? 'Frente ↻' : 'Por quê? ↻';
  const b2 = button(0, 0, lab, { variant: flipped ? 'pressed' : 'default', size: 10.5, h: 26 });
  const bx = W - P - b2.w; s += button(bx, y + 9, lab, { variant: flipped ? 'pressed' : 'default', size: 10.5, h: 26 }).svg;
  let ox = bx;
  if (flipped) { const b1 = button(0, 0, 'Abrir workspace →', { variant: 'ghost', size: 10.5, h: 26 }); ox = bx - b1.w - 4; s += button(ox, y + 9, 'Abrir workspace →', { variant: 'ghost', size: 10.5, h: 26 }).svg; }
  return { svg: s, h: 44, btnX: bx, btnW: b2.w, ghostX: ox };
}
function decisaoFrente() {
  const W = 360, P = 16; let s = '', y = 5 + P; const marks = [];
  const st = pill(P, y, 'Aguardando decisão', { tone: 'warning', glyph: '⧗' }); s += st.svg; marks.push({ k: 'a', x: P, y: y + 10, side: 'l' });
  const cf = pill(0, 0, 'Confiança média · 70 %', { tone: 'info', glyph: '◔' }); const cfx = W - P - cf.w - 18;
  s += pill(cfx, y, 'Confiança média · 70 %', { tone: 'info', glyph: '◔' }).svg + circle(W - P - 7, y + 10, 7, { fill: 'surface-2', stroke: 'line-soft', sw: 1 }) + text(W - P - 7, y + 13.5, '?', { size: 9.5, weight: 700, fill: 'muted', anchor: 'middle' });
  marks.push({ k: 'b', x: W - P + 1, y: y + 10 }); y += 20 + 12;
  const q = wrap('Contratar a sondagem do km 12 ao 14 antes de fechar o TR do lote 2?', 34, 3); s += lines(P, y + 15, q, 21, { fam: 'serif', size: 16.5, weight: 600 });
  marks.push({ k: 'c', x: Math.min(W - 6, P + tw(q[0], 16.5, 'serif') * 1.1 + 4), y: y + 10 }); y += q.length * 21 + 6;
  const ro = runs(P, y + 11, [['Lidera no modelo: ', { size: 11, fill: 'muted' }], ['B — Sondagem completa ', { size: 11, weight: 700 }], ['3,8', { size: 11, weight: 700, fill: 'primary-ink', fam: 'mono' }]]); s += ro.svg;
  marks.push({ k: 'd', x: Math.min(W - 6, P + ro.w + 4), y: y + 7 }); y += 18;
  s += runs(P, y + 11, [['Ana Costa', { size: 10, weight: 700 }], [' · prazo 24 de out. (em 7 dias)', { size: 10, fill: 'muted' }]]).svg; marks.push({ k: 'e', x: P, y: y + 7, side: 'l' }); y += 22;
  const f = flow(P, y, W - 2 * P, [(x, yy) => pill(x, yy, 'Risco alto', { tone: 'warning', glyph: '▲' }), (x, yy) => pill(x, yy, 'Impacto alto', { tone: 'warning', glyph: '◎' }), (x, yy) => pill(x, yy, 'Evidência moderada', { tone: 'info', glyph: '▥' }), (x, yy) => pill(x, yy, 'Revisão devida', { tone: 'warning', glyph: '⏱' })]);
  s += f.svg; marks.push({ k: 'f', x: f.pos[2].x + f.pos[2].w + 2, y: f.pos[2].y + 10 }); y += f.h + 8;
  const cr = pill(P, y, 'Confiança acima do que o registro sustenta', { tone: 'warning', glyph: '⚠' }); s += cr.svg; marks.push({ k: 'g', x: P + cr.w + 2, y: y + 10 }); y += 28;
  const rd = pill(P, y, 'Pronta para revisão', { tone: 'warning', glyph: '⚠' }); s += rd.svg + text(P + rd.w + 7, y + 14, '1 alerta', { size: 10, weight: 600, fill: 'muted' }); marks.push({ k: 'h', x: P + rd.w + 7 + tw('1 alerta', 10) + 6, y: y + 10 }); y += 28;
  const facesBottom = y;
  const r = decisaoRodape(W, y, P, { flipped: false }); s += r.svg; marks.push({ k: 'i', x: W - P + 1, y: y + 22 }, { k: 4, x: P, y: y + 22 }); y += r.h;
  s += rect(P, y + 2, W - 2 * P, 16, { fill: 'none', stroke: 'line-soft', sw: 1, dash: '3 3', rx: 3 }) + text(P + 6, y + 13, 'sr-only · aria-live="polite": "Mostrando o verso"', { fam: 'mono', size: 8, fill: 'faint' });
  marks.push({ k: 5, x: P, y: y + 10 });
  const H = y + 26;
  // contorno das faces sobrepostas (camada 3)
  const faces = rect(P - 6, 5 + P - 6, W - 2 * P + 12, facesBottom - 5 - P + 6, { fill: 'none', stroke: 'primary', sw: 1, dash: '2 3', rx: 6, op: .55 });
  const body = decisaoShell(W, H, 'due-soon') + faces + s;
  marks.push({ k: 2, x: 0, y: 2.5 }, { k: 3, x: P - 6, y: 90 }, { k: 1, x: 0, y: H - 6 });
  const legend = [
    [1, 'Superfície', 'article: borda 1 px (tracejada em RASCUNHO), raio --ws-decision-card-radius, overflow:hidden; em DETAIL/HERO tabIndex=0, aria-labelledby = pergunta, aria-keyshortcuts="F"; ARQUIVADA = opacity .8.'],
    [2, 'Faixa de estado', 'span aria-hidden de --ws-decision-status-bar no topo, na cor do estado (STATUS_META.bar); vermelha (CRITICAL_BAR) quando há risco crítico.'],
    [3, 'Faces sobrepostas', 'frente e verso no DOM com altura fixa; a oculta recebe inert + aria-hidden; giro 3D de 320 ms só sem redução de movimento.'],
    [4, 'Rodapé de ações', 'fora das faces (não gira): dica "Atalho: F vira o card" + botão Por quê? (aria-pressed, aria-controls = faces). Em STANDARD: Abrir + Por quê? abre a folha DETAIL (sem flip em grade).'],
    [5, 'Anúncio', 'p.sr-only aria-live="polite" diz "Mostrando o verso/a frente"; o foco vai ao título da face nova.'],
    ['a', 'Estado', 'Decision.status → DecisionStatusBadge (ícone + texto, nunca só cor). Categoria: Estado e ciclo de vida.'],
    ['b', 'Confiança', 'Decision.confidence declarada pelo responsável (passos de 5 %), com % só em DETAIL/HERO e ajuda "?". Categoria: Conteúdo autoral.'],
    ['c', 'Pergunta', 'Decision.question em serif, até 3 linhas; em STANDARD é link esticado para o workspace. Categoria: Conteúdo autoral.'],
    ['d', 'Opção', 'selectedAlternative ("Escolhida") ou leadingAlternative + nota do modelo ("Lidera no modelo"); empate técnico em texto. Conteúdo autoral + derivado.'],
    ['e', 'Responsável · prazo', 'owner.name (Identificação) + deadline/daysToDeadline em texto (Estado e ciclo de vida).'],
    ['f', 'Sinais', 'risco (derivado) · impacto (declarado) · força da evidência (derivada, ≠ confiança) · frescor · resultado; no máximo 5 sinais. Métricas e reputação / Conteúdo autoral.'],
    ['g', 'Estados transversais', 'risco crítico, atrasada, revisão vencida, confiança acima da evidência — Tag com ícone e texto. Derivado (Estado e ciclo de vida).'],
    ['h', 'Prontidão', 'ReadinessSummary só antes da decisão: nível em texto + nº de alertas/faltas, nunca um número de 0 a 100. Derivado.'],
    ['i', 'Virar', 'Button "Por quê? ↻" (Enter/Espaço ou F com o card focado); nunca só hover.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
const NODES = [
  ['Evidência', 'class-consenso', 'Laudo SPT do lote 1 (sustenta, alta)'],
  ['Premissa', 'spark', 'Solo do lote 2 é parecido com o do lote 1 · 40 %'],
  ['Critérios', 'class-argumento', 'Prazo 35 % · Custo 30 % · Risco técnico 35 %'],
  ['Trade-off', 'class-pergunta', null],
  ['Risco', 'class-risco', 'Recalque no km 13 (média × alto)'],
  ['Rejeitada', 'class-ruido', 'A — Reaproveitar o parecer (dominada por B)'],
  ['Sensível', 'due-soon', 'Se Prazo for de 35 % a 55 %, A passa a liderar'],
  ['Checkpoint', 'class-argumento', '15 de nov. de 2026'],
];
function decisaoVerso() {
  const W = 360, P = 16; let s = '', y = 5 + P; const marks = [];
  const head = 'Por que esta opção?';
  s += text(P, y + 10, head, { fam: 'mono', size: 9.5, weight: 700, fill: 'muted', upper: true, tracking: '.08em' }); marks.push({ k: 'a', x: P + tw(head, 9.5, 'mono') * 1.12 + 6, y: y + 6 }); y += 22;
  const top = y; const lx = P + 5, labX = P + 18, valX = P + 96;
  const rows = [];
  for (const [lab, tok, val] of NODES) {
    const vl = val ? wrap(val, 34, 2) : ['+ reduz retrabalho', '− adia o TR em 20 dias'];
    rows.push({ lab, tok, vl, y }); y += vl.length * 14 + 8;
  }
  s += line(lx, top + 4, lx, y - 12, { stroke: 'line-soft', sw: 1 });
  for (const r of rows) {
    s += circle(lx, r.y + 6, 5, { fill: r.tok, stroke: 'surface', sw: 2 }) + text(labX, r.y + 10, r.lab, { size: 10.5, weight: 700, fill: 'muted' });
    r.vl.forEach((t, i) => { const fill = r.lab === 'Trade-off' ? (i === 0 ? 'class-consenso-ink' : 'class-risco-ink') : 'ink'; s += text(valX, r.y + 10 + i * 14, t, { size: 10.5, fill }); });
  }
  const end = (r) => Math.min(W - 6, valX + tw(r.vl[0], 10.5) + 4);
  marks.push({ k: 'b', x: lx, y: rows[1].y + 16, side: 'l' }, { k: 'c', x: lx - 5, y: rows[4].y + 6, side: 'l' }, { k: 'd', x: end(rows[2]), y: rows[2].y + 6 }, { k: 'e', x: end(rows[3]), y: rows[3].y + 6 }, { k: 'f', x: end(rows[7]), y: rows[7].y + 6 });
  const facesBottom = y;
  const r = decisaoRodape(W, y, P, { flipped: true }); s += r.svg; marks.push({ k: 'g', x: r.ghostX + 40, y: y + 37 }, { k: 'h', x: W - P + 1, y: y + 22 }, { k: 4, x: P, y: y + 22 }); y += r.h;
  const H = y + 8;
  const faces = rect(P - 6, 5 + P - 6, W - 2 * P + 12, facesBottom - 5 - P + 2, { fill: 'none', stroke: 'primary', sw: 1, dash: '2 3', rx: 6, op: .55 });
  const body = decisaoShell(W, H, 'due-soon') + faces + s;
  marks.push({ k: 2, x: 0, y: 2.5 }, { k: 3, x: P - 6, y: rows[6].y + 6 });
  const legend = [
    [2, 'Faixa de estado', 'igual à da frente: o estado continua visível com o card virado.'],
    [3, 'Face do verso', 'section data-face="back"; quando a frente está visível ela fica inert + aria-hidden. Mesma altura da frente.'],
    [4, 'Rodapé de ações', 'com o card virado: "Abrir workspace →" (ghost, só quando há href) e "Frente ↻" com aria-pressed=true.'],
    ['a', 'Título do verso', 'h3 mono "Por que esta opção?" com tabIndex=-1: recebe o foco ao virar.'],
    ['b', 'Fio', 'linha vertical decorativa (::before) que liga os nós — "mapa de lógica resumido".'],
    ['c', 'Nós', '8 tipos em ordem fixa: evidência · premissa · critérios · trade-off · risco · rejeitada · sensível · checkpoint; cor por tipo (--ws-decision-node-*) + rótulo em texto.'],
    ['d', 'Valores', 'CardBack: topEvidence (posição e confiabilidade), topAssumptions (% de confiança), keyCriteria (peso %), principalRisk (probabilidade × impacto), rejectedAlternative (dominada por), sensitivity, nextCheckpoint. "—" quando vazio. Conteúdo autoral + Métricas derivadas.'],
    ['e', 'Trade-off', 'mainTradeOff.pro em verde (+) e .con em vermelho (−), sempre com o sinal em texto.'],
    ['f', 'Checkpoint', 'nextCheckpoint em data (Intl). Categoria: Estado e ciclo de vida.'],
    ['g', 'Abrir workspace', 'Button ghost → /decia/decisoes/[id] (só com href e virado).'],
    ['h', 'Voltar', 'Button "Frente ↻" (aria-pressed=true, aria-controls); F de novo também volta.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
function decisaoCompacta() {
  const W = 600, H = 66, P = 12; let s = card(0, 0, W, H, { rx: 10 }); const marks = [];
  const st = pill(P, (H - 20) / 2, 'Comparando', { tone: 'accent', glyph: '⇄' }); s += st.svg; marks.push({ k: 'a', x: P, y: H / 2, side: 'l' });
  const qx = P + 176 + 12; const q = wrap('Qual traçado adotar para a ciclovia da Av. Brasil?', 27, 1)[0];
  s += text(qx, 28, q, { fam: 'serif', size: 14.5, weight: 600 });
  s += text(qx, 46, 'Lidera no modelo: B — Canteiro central', { size: 10, fill: 'muted' }); marks.push({ k: 'b', x: qx - 3, y: 18, side: 'l' }, { k: 'c', x: qx - 3, y: 46, side: 'l' });
  const rx = W - P; const t2 = pill(0, 0, 'Atrasada', { tone: 'danger', glyph: '⏰' }); const t1 = pill(0, 0, 'Risco crítico', { tone: 'danger', glyph: '▲', filled: true });
  s += pill(rx - t2.w, 8, 'Atrasada', { tone: 'danger', glyph: '⏰' }).svg + pill(rx - t2.w - 6 - t1.w, 8, 'Risco crítico', { tone: 'danger', glyph: '▲', filled: true }).svg;
  s += text(rx, 50, 'Carlos P. · prazo 10 de out. (há 7 dias)', { size: 10, fill: 'muted', anchor: 'end' });
  marks.push({ k: 'd', x: rx + 1, y: 18 }, { k: 'e', x: rx + 1, y: 46 }, { k: 1, x: 0, y: 8 });
  const legend = [
    [1, 'Superfície', 'article data-mode="COMPACT": borda 1 px, raio md, padding 3; grade 11rem · 1fr · auto (uma coluna no celular). Sem faixa de estado, sem flip; ARQUIVADA = opacity .8.'],
    ['a', 'Estado', 'DecisionStatusBadge na coluna fixa de 11rem (alinha as linhas da lista). Estado e ciclo de vida.'],
    ['b', 'Pergunta', 'Decision.question em 1 linha (truncate + title com o texto inteiro); link esticado para o workspace. Conteúdo autoral.'],
    ['c', 'Opção', '"Escolhida: …" ou "Lidera no modelo: …" ou "Sem opção ainda", 1 linha. Conteúdo autoral + derivado.'],
    ['d', 'Alertas', 'só os dois que mudam a prioridade da fila: risco crítico (preenchido) e atrasada. Derivado.'],
    ['e', 'Responsável · prazo', 'OwnerDeadline alinhado à direita no desktop. Identificação + Estado e ciclo de vida.'],
  ];
  return guides({ body: s, cw: W, ch: H, marks, legend });
}

/* =============================================== 3. Entrada do Mural (MuralFeed) =============================================== */
function muralEntrada() {
  const W = 520; let s = ''; const marks = [];
  s += avatar(12, 12, 12, 'AC', { fill: 'dept-ipe-roxo-soft', ink: 'dept-ipe-roxo-ink' });
  const r1 = runs(30, 16, [['Ana Costa', { size: 11.5, weight: 700 }]]); const r2 = runs(30 + r1.w + 5, 16, [['compartilhou', { size: 11.5, fill: 'muted' }]]); const r3 = runs(30 + r1.w + 5 + r2.w + 4, 16, [['· há 2 h', { size: 10, fill: 'muted' }]]);
  s += r1.svg + r2.svg + r3.svg;
  marks.push({ k: 'a', x: 0, y: 12, side: 'l' }, { k: 'b', x: 30 + r1.w + 5 + r2.w / 2, y: 2 }, { k: 'c', x: 30 + r1.w + 5 + r2.w + 4 + r3.w + 4, y: 12 });
  const y0 = 34, CH = 96; const ix = 10;
  s += card(0, y0, W, CH, { rx: 10, stroke: DEPT.tok, sw: 2 });
  s += thumbArt(ix, y0 + 10, 64, 64, { type: 'DOCUMENTO', ext: 'pdf', tok: 'type-documento', cid: id('mt') }) + rect(ix, y0 + 10, 64, 64, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 3 });
  const tx = ix + 64 + 12;
  s += rect(tx, y0 + 10, 20, 20, { fill: 'type-documento-soft', rx: 5 }) + iconAt('documento', tx + 3, y0 + 13, 14, v('ext-pdf'));
  const st = pill(tx + 26, y0 + 10, 'A realizar', { tone: 'accent' }); s += st.svg + spark(tx + 26 + st.w + 12, y0 + 20, 13);
  const tt = wrap(TITULO, 34, 1)[0]; s += text(tx, y0 + 50, tt, { fam: 'serif', size: 13.5, weight: 600 });
  const due1 = due(tx - 6, y0 + 58, '24 OUT', { kind: 'ok' }); s += due1.svg;
  s += avatar(tx + due1.w + 6, y0 + 68, 8, 'MH') + text(tx + due1.w + 18, y0 + 72, 'Matheus H. · resp.: Ana C.', { size: 10, fill: 'muted' });
  // barra social à direita (terceira coluna do layout lista)
  const sx = W - 150; let cx = sx;
  for (const [ic, n] of [['curtir', 12], ['comentar', 3], ['salvar', 5], ['compartilhar', ''], ['remixar', 1]]) { s += iconAt(ic, cx, y0 + 40, 14, v('muted')); if (n !== '') s += text(cx + 16, y0 + 51, String(n), { size: 10, weight: 600, fill: 'muted' }); cx += n !== '' ? 30 : 20; }
  marks.push({ k: 'd', x: tx + tw(tt, 13.5, 'serif') * 1.08 + 4, y: y0 + 36 }, { k: 'e', x: cx - 6, y: y0 + 47 });
  const H = y0 + CH;
  marks.push({ k: 1, x: 0, y: 26 }, { k: 2, x: 0, y: y0 + CH - 10 }, { k: 3, x: ix, y: y0 + 42 });
  const legend = [
    [1, 'Item do feed', 'li dentro de ol[aria-label = aba do Mural] (ordem cronológica, RF27.CA01); sem superfície própria: a linha do ator fica sobre o fundo da página. data-kind = MuralEntry.kind.'],
    [2, 'Card do alvo', 'TaskSchemeCard layout="list" (prancha tarefa-lista) quando o alvo é tarefa; ProjectCard layout="mural" (projeto-linha-mural) quando é projeto. Só entra o que o viewer pode ver (outra empresa: só PUBLICA).'],
    [3, 'Mídia', 'miniatura 64 px do tipo (CoverArt), sem a arte de família do card compacto.'],
    ['a', 'Ator', 'MuralEntry.actorId → PersonLink (avatar 24 + nome, link /u/[username]). Identificação.'],
    ['b', 'Verbo', 'MuralEntry.kind → "compartilhou", "validou uma decisão", "publicou o projeto", "é destaque"… Proveniência e auditoria.'],
    ['c', 'Quando', 'MuralEntry.at em tempo relativo (Intl.RelativeTimeFormat). Proveniência e auditoria.'],
    ['d', 'Título e meta do alvo', 'título (link), tipo, estado, ✦, prazo, autor e responsável — ver tarefa-lista (§3).'],
    ['e', 'Barra social inline', 'SocialBar: curtir · comentar · salvar · compartilhar · remixar com contagem no nome acessível e aria-pressed (RF26). Métricas e reputação.'],
  ];
  return guides({ body: s, cw: W, ch: H, marks, legend });
}

/* =============================================== 4. Atribuição (AssignmentInbox) =============================================== */
function atribuicao(kind) {
  const W = 340, P = 12; let s = '', y = P; const marks = [];
  const recebida = kind === 'recebida';
  const when = recebida ? 'há 3 h' : 'há 1 d';
  const items = [(x, yy) => pill(x, yy, recebida ? 'Aguardando resposta' : 'Recusada', { tone: recebida ? 'warning' : 'danger' }), (x, yy) => pill(x, yy, recebida ? 'Minha equipe' : 'botão Delegar', { badge: true, h: 20 }), (x, yy) => ({ svg: text(x, yy + 14, when, { size: 10, fill: 'muted' }), w: tw(when, 10), h: 20 })];
  const f = flow(P, y, W - 2 * P, items); s += f.svg;
  marks.push({ k: 'a', x: P, y: y + 10, side: 'l' }, { k: 'b', x: f.pos[1].x + f.pos[1].w / 2, y: y - 1 }, { k: 'c', x: f.pos[2].x + f.pos[2].w + 4, y: y + 10 }); y += f.h + 10;
  const tl = wrap(recebida ? TITULO : 'Planilha orçamentária — lote 2', 40, 2); s += lines(P, y + 12, tl, 17, { size: 13, weight: 700 }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(tl[0], 13) * 1.1 + 4), y: y + 8 }); y += tl.length * 17 + 4;
  const who = recebida ? 'de Ana Costa · prazo da delegação: 30 de out.' : 'para Carlos P. · prazo da delegação: 22 de out.';
  s += avatar(P + 10, y + 10, 10, recebida ? 'AC' : 'CP') + text(P + 26, y + 14, who, { size: 10.5, fill: 'muted' }); marks.push({ k: 'e', x: P, y: y + 10, side: 'l' }); y += 26;
  const msg = wrap(recebida ? '“Preciso do parecer antes da reunião do conselho de obras.”' : '“Fecha a planilha com os preços do SINAPI de setembro?”', 50, 2);
  s += rect(P, y, W - 2 * P, msg.length * 14 + 10, { fill: 'surface-2', rx: 4 }) + lines(P + 8, y + 15, msg, 14, { size: 10.5 }); marks.push({ k: 'f', x: W - P + 1, y: y + 8 }); y += msg.length * 14 + 18;
  if (recebida) {
    const b1 = button(P, y, 'Aceitar', { variant: 'primary', h: 26, size: 10.5 }); const b2 = button(P + b1.w + 8, y, 'Recusar', { variant: 'danger', h: 26, size: 10.5 }); s += b1.svg + b2.svg;
    marks.push({ k: 'g', x: P + b1.w + 8 + b2.w + 2, y: y + 13 }); y += 26 + P;
  } else {
    const rs = 'Motivo: sem capacidade nesta semana; sugiro a Júlia.';
    s += text(P, y + 10, rs, { size: 10, fill: 'class-risco-ink' }); marks.push({ k: 'h', x: Math.min(W - 6, P + tw(rs, 10) + 4), y: y + 6 }); y += 14 + P;
  }
  const H = y; const body = card(0, 0, W, H, { rx: 10, shadow: false }) + s; marks.push({ k: 1, x: 0, y: H - 8 });
  const legend = [
    [1, 'Linha', 'li com borda 1 px, raio md, padding 3, fundo surface-1; data-status = Assignment.status. Duas listas: "Delegadas a mim" (recebidas) e "Delegadas por mim" (enviadas, em details aberto).'],
    ['a', 'Estado', 'Assignment.status: PROPOSTA "Aguardando resposta" (âmbar) · ACEITA (verde preenchida) · RECUSADA (vermelha) · DEVOLVIDA (neutra). Estado e ciclo de vida.'],
    ['b', 'Origem', 'Assignment.origin → Minha equipe · botão Delegar · pelo chat · pelo chat DECIA (Badge). Proveniência e auditoria.'],
    ['c', 'Quando', 'createdAt em tempo relativo. Proveniência e auditoria.'],
    ['d', 'Alvo', 'título da tarefa/projeto (titleOf) como link → /tasks/[id] ou /projects/[id]. Identificação.'],
    ['e', 'Contraparte · prazo', 'avatar + "de {quem atribuiu}" (recebida) ou "para {destinatário}" (enviada) — Identificação; dueAt — Estado e ciclo de vida.'],
    ['f', 'Mensagem', 'Assignment.message entre aspas (≤ 500). Conteúdo autoral.'],
  ];
  if (recebida) legend.push(['g', 'Ações', 'PROPOSTA recebida: Aceitar (primary) · Recusar (danger → ReasonDialog, motivo obrigatório). ACEITA recebida: Abrir · Devolver (motivo ≥ 20 caracteres). Enviadas não têm ações.']);
  else legend.push(['h', 'Motivo', 'Assignment.reason em tinta de perigo quando RECUSADA/DEVOLVIDA. Conteúdo autoral.']);
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 5. Notificação (NotificationRow) =============================================== */
function notificacao() {
  const W = 360; let s = ''; const marks = [];
  const row = (y, { unread, icon, title, when }) => {
    let r = '';
    if (unread) r += rect(0, y, W, 50, { fill: 'primary-soft', rx: 8, op: .6 });
    r += iconAt(icon, 12, y + 10, 20, v(unread ? 'primary-ink' : 'muted'));
    const t = wrap(title, 44, 1)[0];
    r += text(42, y + 21, t, { size: 11.5, weight: unread ? 700 : 500 }) + text(42, y + 37, when, { size: 10, fill: 'muted' });
    if (unread) r += circle(W - 14, y + 18, 4, { fill: 'primary' });
    return { svg: r, tEnd: 42 + tw(t, 11.5) * (unread ? 1.1 : 1.02), wEnd: 42 + tw(when, 10) };
  };
  const a = row(0, { unread: true, icon: 'abrir-decia', title: 'Decisão validada na sessão “Orçamento 2027”', when: 'há 5 horas' });
  const b = row(54, { unread: false, icon: 'lacre', title: 'Chancela aprovada por CPOE', when: 'há 1 dia' });
  s += a.svg + b.svg;
  marks.push({ k: 1, x: 0, y: 4 }, { k: 2, x: 0, y: 44 }, { k: 'a', x: 12, y: 20, side: 'l' }, { k: 'b', x: Math.min(W - 24, a.tEnd + 4), y: 9 }, { k: 'c', x: a.wEnd + 4, y: 34 }, { k: 'd', x: W - 9, y: 18 }, { k: 'e', x: b.tEnd + 4, y: 71 });
  const legend = [
    [1, 'Linha-link', 'li > Link variant="card": a linha inteira é o alvo do clique (href da notificação) e marca como lida ao abrir. Lista ul[aria-label="Notificações"] no Popover do sino (5 itens) e em /notifications.'],
    [2, 'Fundo de não lida', 'bg accent-soft a 60 % só enquanto read=false; a leitura nunca depende só da cor (negrito + ponto com rótulo).'],
    ['a', 'Glifo do tipo', 'NotificationKind → KIND_GLYPH (menção/decisão → sessão DECIA, chancela, DECIA Points, Tarefa do Dia, atribuição, sistema); decorativo, 20 px. Proveniência e auditoria.'],
    ['b', 'Título', 'titleKey + vars traduzidos (ex.: notif.decisionValidated); negrito quando não lida. Derivado do evento.'],
    ['c', 'Quando', 'minutesAgo → Intl.RelativeTimeFormat ("há 5 horas"). Proveniência e auditoria.'],
    ['d', 'Ponto de não lida', 'span 8 px com aria-label "não lida". Estado e ciclo de vida.'],
    ['e', 'Lida', 'mesma linha sem fundo, sem negrito e sem ponto. Variação social (SocialNotifications, RF26.CA09): ponto à esquerda, agrupamento por hora "e mais n", "· não lida" em texto.'],
  ];
  return guides({ body: s, cw: W, ch: 104, marks, legend });
}

/* =============================================== 6. Cabeçalhos de perfil e de instituição =============================================== */
function contadores(x, y, items, colW) {
  let s = '';
  items.forEach(([lab, val], i) => {
    const cx = x + i * colW + colW / 2;
    s += text(cx, y + 9, lab, { fam: 'mono', size: 7.5, weight: 600, fill: 'muted', anchor: 'middle', upper: true, tracking: '.04em' });
    s += text(cx, y + 30, val, { fam: 'mono', size: 16, weight: 600, anchor: 'middle', fill: val === '—' ? 'muted' : 'ink' });
  });
  return s;
}
function perfilCabecalho() {
  const W = 800, P = 18; let s = ''; const marks = [];
  s += circle(P + 32, P + 32, 34, { fill: 'none', stroke: 'dept-ipe-roxo', sw: 2.5 }) + avatar(P + 32, P + 32, 31, 'AC', { fill: 'dept-ipe-roxo-soft', ink: 'dept-ipe-roxo-ink' });
  const x0 = P + 80; let y = P;
  s += text(x0, y + 20, 'Ana Costa', { fam: 'serif', size: 22, weight: 600 }); marks.push({ k: 'b', x: x0 + tw('Ana Costa', 22, 'serif') * 1.1 + 4, y: y + 12 }); y += 28;
  const hd = '@ana.costa · Engenheira civil'; s += text(x0, y + 12, hd, { size: 11, fill: 'muted' }); marks.push({ k: 'c', x: x0 + tw(hd, 11) + 4, y: y + 8 }); y += 20;
  const yd = y;
  s += monogram(x0, y, 22, 'UTS', DEPT.tok) + text(x0 + 28, y + 15, 'SECID-UTS', { size: 10.5, weight: 600 });
  const co = 'Secretaria das Cidades'; s += text(x0 + 100, y + 15, co, { size: 10.5, fill: 'primary-ink', extra: 'text-decoration:underline' });
  const bx = x0 + 100 + tw(co, 10.5) + 12; const bd = pill(bx, y + 2, 'Chefe de SECID-UTS', { badge: true, tone: 'orange', h: 18 }); s += bd.svg;
  marks.push({ k: 'd', x: x0, y: yd + 21, side: 'l' }, { k: 'e', x: x0 + 100 + tw(co, 10.5) / 2, y: yd - 1 }, { k: 'f', x: bx + bd.w + 2, y: yd + 11 }); y += 28;
  const vt = pill(x0, y, 'Visão de terceiros: sub-abas 1–5', { badge: true, h: 18 }); s += vt.svg; marks.push({ k: 'g', x: x0 + vt.w + 2, y: y + 9 }); y += 26;
  const b1 = button(x0, y, 'Seguir', { variant: 'primary', h: 28 }); const b2 = button(x0 + b1.w + 8, y, 'Abrir página da SECID-UTS', { variant: 'secondary', h: 28 }); s += b1.svg + b2.svg; marks.push({ k: 'h', x: x0, y: y + 14, side: 'l' }); y += 28;
  const H = y + P;
  const colW = 46, cx = W - P - 7 * colW, cy = H - P - 40;
  s += contadores(cx, cy, [['Tarefas', '42'], ['Projetos', '9'], ['Decisões', '17'], ['Seguid.', '120'], ['Seguindo', '35'], ['DP', '—'], ['Hype', '—']], colW);
  const body = card(0, 0, W, H, { rx: 16, stroke: 'line-soft' }) + s;
  marks.push({ k: 1, x: 0, y: H - 10 }, { k: 'a', x: P - 2, y: P + 32, side: 'l' }, { k: 'i', x: W - P + 1, y: cy + 24 });
  const legend = [
    [1, 'Superfície', 'components/ui/Card tone="clay" (relevo por token), grade 1fr · auto no desktop e empilhada no celular; data-testid="profile-header". Dados DEMO até a API de pessoas (GET /api/people/by-username, em curso).'],
    ['a', 'Avatar', 'Avatar 64 px com anel na cor do nó; conta EMPRESA usa Monogram laranja. Identificação.'],
    ['b', 'Nome', 'User.fullName (displayName quando houver), display h2. Identificação.'],
    ['c', '@username · cargo', 'User.username (Identificação) + jobTitle (Profissional); EMPRESA mostra "Conta institucional".'],
    ['d', 'Departamento', 'departmentId → Monogram 24 + sigla, link /departments/[slug] (RF14). Institucional.'],
    ['e', 'Empresa', 'companyId → nome, link /companies/[slug] (RF15). Institucional.'],
    ['f', 'Etiqueta institucional', 'DeptRole CHEFE → "Chefe de {sigla}" (laranja, com dica); EMPRESA → "Conta institucional". Institucional.'],
    ['g', 'Visão de terceiros', 'Badge neutro quando viewer ≠ dono (Matriz B, ABAS_POR_PERFIL §3). Derivado do viewer.'],
    ['h', 'Ações', 'FollowButton (primary "Seguir" / default "Seguindo", aria-pressed) só para terceiros + atalho institucional (Abrir página da sigla / da empresa).'],
    ['i', 'Contadores', 'dl com dt/dd: tarefas · projetos · decisões · seguidores · seguindo · DP (só o dono) · Hype (conforme hypeVisibility); oculto = "—" + sr-only "oculto para você". Métricas e reputação; a ocultação é Classificação e visibilidade.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
function instituicaoCabecalho() {
  const W = 800, P = 18; let s = ''; const marks = [];
  s += rect(P, P, 64, 64, { fill: DEPT.tok, rx: 14 }) + text(P + 32, P + 40, 'UTS', { fam: 'serif', size: 22, weight: 700, fill: `on-${DEPT.tok}`, anchor: 'middle' });
  const x0 = P + 80; let y = P;
  s += text(x0, y + 20, 'SECID-UTS', { fam: 'serif', size: 22, weight: 600 }); marks.push({ k: 'b', x: x0 + tw('SECID-UTS', 22, 'serif') * 1.12 + 4, y: y + 12 }); y += 28;
  const dl = runs(x0, y + 12, [[`${DEPT.name} · `, { size: 11, fill: 'muted' }], ['Secretaria das Cidades', { size: 11, fill: 'primary-ink', extra: 'text-decoration:underline' }]]); s += dl.svg; marks.push({ k: 'c', x: x0 + dl.w + 4, y: y + 8 }); y += 22;
  const hl = runs(x0 + 30, y + 15, [['Chefe da SECID-UTS:  ', { size: 11 }], ['Ana Costa', { size: 11, fill: 'primary-ink', extra: 'text-decoration:underline' }]]);
  s += avatar(x0 + 12, y + 11, 12, 'AC', { fill: 'dept-gralha-azul-soft', ink: 'dept-gralha-azul-ink' }) + hl.svg; marks.push({ k: 'd', x: x0 + 30 + hl.w + 4, y: y + 11 }); y += 30;
  const b1 = button(x0, y, 'Seguir', { variant: 'primary', h: 28 }); const b2 = button(x0 + b1.w + 8, y, 'Abrir modo gestão', { variant: 'default', h: 28 }); s += b1.svg + b2.svg;
  marks.push({ k: 'e', x: x0, y: y + 14, side: 'l' }, { k: 'f', x: x0 + b1.w + 8 + b2.w / 2, y: y + 31, side: 'l' }); y += 28;
  const H = y + P + 6;
  const colW = 62, cx = W - P - 4 * colW, cy = H - P - 40;
  s += contadores(cx, cy, [['Pessoas', '14'], ['Projetos', '6'], ['Decisões', '31'], ['Seguid.', '88']], colW);
  const body = card(0, 0, W, H, { rx: 16 }) + s;
  marks.push({ k: 1, x: 0, y: H - 10 }, { k: 'a', x: P, y: P + 32, side: 'l' }, { k: 'g', x: W - P + 1, y: cy + 24 });
  const legend = [
    [1, 'Superfície', 'ui/Card tone="clay" (DepartmentHeader, data-testid="department-header"); o CompanyHeader usa a mesma casca. Abaixo dele, PublishedProjects lista os ProjectCard publicados visíveis ao viewer (RF14.CA02/RF15.CA02). DEMO.'],
    ['a', 'Monograma', 'Department.color + sigla sem "SECID-" (3 letras), 64 px; empresa = Monogram laranja com o slug. Identificação.'],
    ['b', 'Sigla', 'Department.acronym (display h2); empresa: legalName. Identificação.'],
    ['c', 'Nome · empresa', 'Department.name + link para a empresa (RF15); empresa mostra "/companies/{slug} · métricas públicas". Institucional.'],
    ['d', 'Chefe', 'headUserId → avatar + "Chefe da {sigla}:" + link para o perfil pessoal (RF16); sem chefe = texto "sem chefe". Institucional.'],
    ['e', 'Seguir', 'FollowButton targetType DEPARTMENT/COMPANY (aria-pressed).'],
    ['f', 'Gestão', 'só para o chefe: "Abrir modo gestão" → /departments/[slug]/team?mode=manage; na empresa, "Ver conta institucional" (ghost).'],
    ['g', 'Contadores', 'departamento: pessoas · projetos publicados visíveis · decisões · seguidores; empresa: departamentos · pessoas · projetos · seguidores (sem cargo, Hype ou DP). Métricas e reputação.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 7. Pessoa na busca (planejado, RF17 aba PESSOAS) =============================================== */
function pessoaResultado(kind) {
  const W = 300, P = 16; let s = ''; const marks = []; const restrito = kind === 'restrito';
  if (restrito) s += avatar(P + 24, P + 24, 24, 'RS', { fill: 'surface-3', ink: 'muted' });
  else s += circle(P + 24, P + 24, 26, { fill: 'none', stroke: 'dept-araucaria', sw: 2 }) + avatar(P + 24, P + 24, 24, 'JP', { fill: 'dept-araucaria-soft', ink: 'dept-araucaria-ink' });
  const x0 = P + 60; let y = P;
  const nm = restrito ? 'Rafael Souza' : 'Júlia Prado'; s += text(x0, y + 15, nm, { size: 14.5, weight: 700 }); marks.push({ k: 'b', x: x0 + tw(nm, 14.5) * 1.1 + 4, y: y + 10 }); y += 20;
  const hd = restrito ? '@rafael.souza' : '@julia.prado · Analista de projetos'; s += text(x0, y + 11, hd, { size: 10.5, fill: 'muted' }); marks.push({ k: 'c', x: Math.min(W - 6, x0 + tw(hd, 10.5) + 4), y: y + 7 }); y += 18;
  marks.push({ k: 'a', x: P - 3, y: P + 24, side: 'l' });
  if (!restrito) {
    y += 2; const lt = 'SECID-PRJ · Secretaria das Cidades';
    s += monogram(x0, y, 18, 'PRJ', 'dept-araucaria') + text(x0 + 24, y + 13, lt, { size: 10, fill: 'muted' }); marks.push({ k: 'd', x: x0 + 24 + tw(lt, 10) + 4, y: y + 9 }); y += 26;
    s += rect(P, y, W - 2 * P, 22, { fill: 'surface-2', rx: 4 }) + runs(P + 8, y + 15, [['cargo: Analista de ', { size: 10.5, fill: 'muted' }], ['projetos', { size: 10.5, weight: 700, fill: 'ink', extra: 'text-decoration:underline' }]]).svg; marks.push({ k: 'e', x: W - P + 1, y: y + 11 }); y += 30;
    s += text(P, y + 11, '12 tarefas públicas · 3 projetos · 48 seguidores', { fam: 'mono', size: 9.5, fill: 'muted' }); marks.push({ k: 'f', x: P, y: y + 7, side: 'l' }); y += 22;
  } else {
    y += 4; const rt = 'Perfil restrito — siga para ver as produções';
    s += iconAt('cadeado', P, y, 14, v('muted')) + text(P + 20, y + 11, rt, { size: 10.5, fill: 'muted', italic: true }); marks.push({ k: 'g', x: Math.min(W - 6, P + 20 + tw(rt, 10.5) + 4), y: y + 7 }); y += 22;
    s += text(P, y + 11, '— tarefas · — projetos · — seguidores', { fam: 'mono', size: 9.5, fill: 'muted' }); marks.push({ k: 'f', x: P, y: y + 7, side: 'l' }); y += 22;
  }
  y += 4; s += hr(P, W - P, y); y += 10;
  const b1 = button(P, y, 'Seguir', { variant: 'primary', h: 26, size: 10.5 }); s += b1.svg;
  let endX = P + b1.w;
  if (!restrito) { const b2 = button(P + b1.w + 8, y, 'Ver perfil', { variant: 'ghost', h: 26, size: 10.5 }); s += b2.svg; endX += 8 + b2.w; }
  marks.push({ k: 'h', x: endX + 2, y: y + 13 }); y += 26 + P;
  const H = y; const body = card(0, 0, W, H, { rx: 14, dashed: true }) + s; marks.push({ k: 1, x: 0, y: H - 10 });
  const legend = [
    [1, 'Superfície (planejada)', 'article em grade da aba PESSOAS de /search (RF17.CA01): borda 1 px, raio lg; o card inteiro leva a /u/[username] (link esticado no nome). Tracejado aqui = ainda não existe no código (/search é RfPage-esqueleto).'],
    ['a', 'Avatar', restrito ? 'só iniciais em cinza, sem foto nem anel de cor. Identificação.' : 'Avatar 48 px com anel na cor do departamento. Identificação.'],
    ['b', 'Nome', 'PublicProfileView.fullName/displayName (fonte real em curso: GET /api/people/by-username). Identificação.'],
    ['c', '@username · cargo', restrito ? 'só @username: cargo e lotação somem. Identificação.' : 'username (Identificação) + jobTitle (Profissional).'],
  ];
  if (!restrito) legend.push(
    ['d', 'Lotação', 'departamento (monograma + sigla) · empresa. Institucional.'],
    ['e', 'Trecho que casou', 'campo onde o termo foi encontrado (nome, cargo, competência) com o termo sublinhado e em negrito — nunca só cor. Proposta (RF17.CA01).'],
    ['f', 'Contadores', 'só o que o viewer pode ver (AccessPolicy.visibilityFilter, RF17.CA03): tarefas e projetos visíveis, seguidores. Métricas e reputação.'],
  );
  else legend.push(
    ['g', 'Aviso de restrição', 'cadeado + texto em itálico. PROPOSTA: o domínio hoje não tem perfil privado (D-90) e invisível = inexistente (404); a variação só vale se a visibilidade de perfil for criada (lacuna "descoberta do perfil / visibilidade por campo", ATORES_E_ATRIBUTOS §5.3). Classificação e visibilidade.'],
    ['f', 'Contadores ocultos', '"—" com sr-only "oculto para você", igual ao cabeçalho do perfil.'],
  );
  legend.push(['h', 'Ações', restrito ? 'Seguir (aria-pressed); sem "Ver perfil" enquanto restrito.' : 'Seguir (FollowButton, aria-pressed) + Ver perfil (ghost).']);
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 8. Card da sessão DECIA (planejado, Q-44) =============================================== */
function sessaoDecia() {
  const W = 330, P = 14; let s = ''; const marks = [];
  let y = P;
  s += rect(P, y, 26, 26, { fill: 'primary-soft', rx: 7 }) + iconAt('abrir-decia', P + 4, y + 4, 18, v('primary-ink'));
  const tl = wrap('Drenagem do km 12 — sondagem antes do TR?', 26, 2); s += lines(P + 34, y + 12, tl, 18, { fam: 'serif', size: 14.5, weight: 600 });
  marks.push({ k: 'a', x: P, y: y + 13, side: 'l' }, { k: 'b', x: P + 34 + tw(tl[tl.length - 1], 14.5, 'serif') * 1.1 + 4, y: y + 8 + (tl.length - 1) * 18 }); y += Math.max(30, tl.length * 18) + 6;
  const ob = wrap('Decidir se a sondagem do lote 2 entra antes do termo de referência.', 48, 2); s += lines(P, y + 11, ob, 14, { size: 10.5, fill: 'muted' }); marks.push({ k: 'c', x: Math.min(W - 6, P + tw(ob[0], 10.5) + 4), y: y + 7 }); y += ob.length * 14 + 8;
  const t = pill(P, y, 'Aberta · Divergir', { tone: 'accent', pulse: true }); s += t.svg; const d1 = due(P + t.w + 8, y, '24 OUT', { kind: 'soon' }); s += d1.svg;
  marks.push({ k: 'd', x: P, y: y + 10, side: 'l' }, { k: 'h', x: P + t.w + 8 + d1.w + 2, y: y + 10 }); y += 30;
  const ini = ['AC', 'MH', 'CP', 'JP', 'RS']; ini.forEach((n, i) => { s += avatar(P + 11 + i * 19, y + 11, 11, n, { fill: i % 2 ? 'class-argumento-soft' : 'primary-soft', ink: i % 2 ? 'class-argumento-ink' : 'primary-ink' }); });
  s += circle(P + 19, y + 19, 3.5, { fill: 'class-consenso', stroke: 'surface', sw: 1.2 }) + circle(P + 57, y + 19, 3.5, { fill: 'class-consenso', stroke: 'surface', sw: 1.2 });
  s += text(P + 11 + 5 * 19 - 2, y + 15, '+2', { fam: 'mono', size: 10, weight: 700, fill: 'muted' }) + spark(P + 136, y + 11, 14, { glow: true }) + text(P + 148, y + 15, 'IA', { size: 10, fill: 'spark-ink', weight: 700 });
  marks.push({ k: 'e', x: P + 164, y: y + 11 }); y += 30;
  s += rect(P, y, W - 2 * P, 42, { fill: 'surface-2', rx: 6 }) + mosaic(P + 6, y + 6, 46, 30, [{ type: 'DOCUMENTO', ext: 'pdf', tok: 'type-documento' }, { type: 'PLANILHA', tok: 'type-planilha' }, { type: 'DESENHO_TECNICO', tok: 'type-desenho-tecnico' }, { type: 'CRONOGRAMA', tok: 'type-cronograma' }]);
  s += text(P + 60, y + 18, 'Projeto vinculado', { fam: 'mono', size: 8, weight: 600, fill: 'muted', upper: true, tracking: '.06em' }) + text(P + 60, y + 32, 'Pavimentação urbana — PR-445, lote 2', { size: 10.5, weight: 600 });
  marks.push({ k: 'f', x: P + 6, y: y + 21, side: 'l' }); y += 50;
  s += text(P, y + 10, 'rumo à decisão', { size: 10, fill: 'muted' }) + text(W - P, y + 10, '58 %', { fam: 'mono', size: 10, weight: 700, fill: 'spark-ink', anchor: 'end' }); y += 15;
  const segW = (W - 2 * P - 8) / 5; for (let i = 0; i < 5; i++) { const fillPct = Math.max(0, Math.min(1, (0.58 * 5) - i)); s += rect(P + i * (segW + 2), y, segW, 7, { fill: 'surface-3', rx: 3.5 }) + (fillPct ? rect(P + i * (segW + 2), y, segW * fillPct, 7, { fill: 'spark', rx: 3.5 }) : ''); }
  marks.push({ k: 'g', x: W - P + 1, y: y + 3 }); y += 18;
  s += hr(P, W - P, y); y += 8;
  const ft = '34 mensagens · 5 divergências (3 resolvidas) · 2 perguntas';
  s += text(P, y + 11, ft, { size: 9.5, fill: 'muted' }); marks.push({ k: 'i', x: Math.min(W - 6, P + tw(ft, 9.5) + 4), y: y + 7 }); y += 18;
  s += iconAt('curtir', P, y, 12, v('muted')) + text(P + 15, y + 10, '8', { size: 10, weight: 600, fill: 'muted' }) + iconAt('comentar', P + 32, y, 12, v('muted')) + text(P + 47, y + 10, '4', { size: 10, weight: 600, fill: 'muted' });
  y += 16 + P;
  const H = y;
  const body = card(0, 0, W, H, { rx: 12, stroke: DEPT.tok, sw: 2, dashed: true }) + seal(W - 18, 18, 11, { kind: 'gold', letter: 'U' }) + s;
  marks.push({ k: 1, x: 0, y: H - 10 }, { k: 'j', x: W - 6, y: 18 });
  const legend = [
    [1, 'Superfície (planejada)', 'borda 2 px na cor do departamento (RF38.CA09), raio md; mesma família visual do card de projeto. Tracejado aqui = não existe no código: /decia e /decia/[sessionId] são RfPage com note="sessionCards" (Q-44, Q-103). Spec: DECIA_SESSAO_E_MESA.md §B.1.'],
    ['a', 'Ícone da sessão', 'chip com o glifo abrir-decia. Decorativo.'],
    ['b', 'Tema', 'DeciaSession.topic em serif, 2 linhas (RF4). Identificação.'],
    ['c', 'Objetivo', 'DeciaSession.objective (1 frase, proposta), 2 linhas. Conteúdo autoral.'],
    ['d', 'Estado · fase', 'SessionStatus + fase de deliberação em texto ("Aberta · Divergir"); pulso em ABERTA, faísca em CONVERGINDO/DECISAO_PROPOSTA, cadeado em EM_REVISAO, tracejado em RASCUNHO. Estado e ciclo de vida.'],
    ['e', 'Participantes', 'até 5 avatares + "+n"; ponto verde = online (presença Redis, TTL 30 s); a IA aparece sempre como ✦. Identificação + Estado.'],
    ['f', 'Projeto vinculado', 'linkedProjectId → mosaico mini + título (RF29.CA01). Identificação.'],
    ['g', 'Rumo à decisão', 'PercentBar 0–100 % com 5 marcas de fase (serviço determinístico, proposta §B.5) com o % em texto. Métricas (derivado).'],
    ['h', 'Prazo', 'scheduledAt (AGENDADA) ou prazo da fase/revisão; âmbar ≤ 3 dias, vermelho vencido (Due). Estado e ciclo de vida.'],
    ['i', 'Rodapé', '"n mensagens · n divergências (k resolvidas) · n perguntas abertas" + contadores sociais da decisão (RF26). Métricas e reputação.'],
    ['j', 'Lacre / carimbo', 'lacre se a decisão ou o projeto foi chancelado (RF39); carimbo mini VALIDADO/DEVOLVIDO quando há decisão final (RF38.CA06).'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 9. Evidência e sugestão da IA (workspace DECIA) =============================================== */
function evidencia() {
  const W = 380, P = 16; let s = '', y = P; const marks = [];
  const f = flow(P, y, W - 2 * P, [(x, yy) => pill(x, yy, 'Evidência', { tone: 'success', glyph: '▦' }), (x, yy) => pill(x, yy, '✦ Sugestão da IA', { badge: true, tone: 'spark', h: 20 })]);
  const ttl = 'Sondagem SPT do lote 1'; const tx = f.pos[1].x + f.pos[1].w + 8;
  s += f.svg; s += text(tx, y + 14, ttl, { size: 12, weight: 700 });
  marks.push({ k: 'a', x: P, y: y + 10, side: 'l' }, { k: 'b', x: f.pos[1].x + f.pos[1].w / 2, y: y - 1 }, { k: 'c', x: tx + tw(ttl, 12) * 1.1 + 4, y: y + 10 }); y += f.h + 10;
  const sm = wrap('Seis furos entre o km 10 e o km 11 mostram argila mole até 4 m; o lote 2 não tem sondagem própria.', 56, 2); s += lines(P, y + 11, sm, 15, { size: 11 }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(sm[0], 11) + 4), y: y + 7 }); y += sm.length * 15 + 8;
  const meta = ['Fonte: Laudo geotécnico · Geo Sul', 'Observada em: 12 de mar. de 2025', 'Obtida em: 02 de out. de 2026', 'Qualidade da fonte: Primária', 'Relevância: Alta', 'Confiabilidade: Alta'];
  const mf = flow(P, y, W - 2 * P, meta.map((m) => (x, yy) => ({ svg: text(x, yy + 11, m, { size: 9.5, fill: 'muted' }), w: tw(m, 9.5), h: 14 })), { gap: 12, rowGap: 3 }); s += mf.svg; marks.push({ k: 'e', x: P, y: y + 7, side: 'l' }); y += mf.h + 10;
  const lf = flow(P, y, W - 2 * P, [(x, yy) => pill(x, yy, 'Sustenta B', { tone: 'success', glyph: '+' }), (x, yy) => pill(x, yy, 'Contradiz A', { tone: 'danger', glyph: '−' }), (x, yy) => pill(x, yy, 'Sustenta Premissa', { tone: 'success', glyph: '+' })]);
  const lp = lf.pos[lf.pos.length - 1];
  s += lf.svg; marks.push({ k: 'f', x: lp.x + lp.w + 2, y: lp.y + 10 }); y += lf.h + P;
  const H = y; const body = card(0, 0, W, H) + s; marks.push({ k: 1, x: 0, y: H - 8 });
  const legend = [
    [1, 'Superfície', 'ui/Card padding md dentro de ul[aria-label="Evidências"] (EvidenceSection do workspace). Evidência substituída (supersededAt) fica a 70 % de opacidade com a Tag "Substituída". DEMO (repositório em memória).'],
    ['a', 'Natureza', 'StatementNatureChip: fato ≠ premissa ≠ opinião ≠ previsão ≠ evidência, com ícone e texto (G4). Conteúdo autoral.'],
    ['b', 'Origem IA', 'Badge spark "✦ Sugestão da IA" quando Evidence.origin = IA. Proveniência e auditoria.'],
    ['c', 'Título', 'Evidence.title (h3). Conteúdo autoral.'],
    ['d', 'Resumo', 'Evidence.summary. Conteúdo autoral.'],
    ['e', 'Metadados', 'fonte + autor, observada em, obtida em, qualidade da fonte, relevância, confiabilidade — rótulo e valor sempre em texto. Proveniência e auditoria.'],
    ['f', 'Vínculos', 'EvidenceLink.stance (sustenta + verde · contradiz − vermelho · neutra ·) e alvo (alternativa, critério, premissa, risco). Conteúdo autoral.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
function sugestaoIa() {
  const W = 360, P = 14; let s = '', y = P; const marks = [];
  s += text(P, y + 14, '✦', { size: 14, weight: 700, fill: 'spark-ink' });
  const bd = pill(P + 18, y + 1, 'Sugestão da IA', { badge: true, tone: 'spark', h: 18 }); s += bd.svg;
  const tx = P + 18 + bd.w + 8; const tl = wrap('Adicionar o critério “Prazo de execução” (peso 20 %)', 30, 2); s += lines(tx, y + 14, tl, 15, { size: 11, weight: 700 });
  marks.push({ k: 'a', x: P, y: y + 9, side: 'l' }, { k: 'b', x: P + 18 + bd.w / 2, y: y - 1 }, { k: 'c', x: Math.min(W - 6, tx + tw(tl[0], 11) * 1.1 + 4), y: y + 10 }); y += Math.max(20, tl.length * 15) + 8;
  const bt = wrap('Três decisões parecidas da SECID-UTS usaram o prazo como critério; hoje ele não está na matriz.', 54, 2); s += lines(P, y + 11, bt, 15, { size: 10.5 }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(bt[0], 10.5) + 4), y: y + 7 }); y += bt.length * 15 + 8;
  const b1 = button(P, y, 'Aceitar', { variant: 'spark', h: 26, size: 10.5 }); const b2 = button(P + b1.w + 6, y, 'Descartar', { variant: 'ghost', h: 26, size: 10.5 }); s += b1.svg + b2.svg;
  const rule = 'A IA sugere; quem decide é uma pessoa.'; const rx = P + b1.w + b2.w + 14;
  s += text(rx, y + 17, rule, { size: 9.5, fill: 'muted' });
  marks.push({ k: 'e', x: P, y: y + 13, side: 'l' }, { k: 'f', x: Math.min(W - 6, rx + tw(rule, 9.5) + 4), y: y + 13 }); y += 26 + P;
  const H = y; const body = rect(0, 0, W, H, { fill: 'spark-soft', stroke: 'spark', sw: 1, rx: 10 }) + s; marks.push({ k: 1, x: 0, y: H - 6 });
  const legend = [
    [1, 'Superfície', 'div data-origin="IA": borda e fundo nos tokens --ws-ai-spark* (exclusivos da IA, RF38.CA04), raio md. DESCARTADA = opacidade 70 %. DEMO (nenhum motor de IA registrado).'],
    ['a', 'Faísca ✦', 'glifo decorativo (aria-hidden); a origem é dita em texto pelo Badge.'],
    ['b', 'Origem', 'Badge spark "Sugestão da IA"; depois do aceite, Badge "Aceita" (verde) ou "Descartada" (neutra). Proveniência e auditoria.'],
    ['c', 'Título', 'o que a IA propõe, em uma frase. Conteúdo proposto (vira Conteúdo autoral só com aceite humano).'],
    ['d', 'Justificativa', 'children: por que sugere, com a base citada.'],
    ['e', 'Aceitar / Descartar', 'Button spark + ghost; disabled enquanto o serviço de IA não está conectado ([REF-AMERSHI] G8/G9).'],
    ['f', 'Regra', '"A IA sugere; quem decide é uma pessoa." sempre visível.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== 10. Conta e segurança =============================================== */
function conta2fa(kind) {
  const W = 360, P = 18; let s = '', y = P; const marks = []; const on = kind === 'ativa';
  const ttl = 'Verificação em duas etapas';
  const hd = cardHeader(P, y, W - 2 * P, { eyebrow: 'RF2.CA02', title: ttl, action: (x, yy) => pill(x, yy, on ? 'Ativa' : 'Desativada', { badge: true, tone: on ? 'success' : 'neutral', h: 18 }) });
  s += hd.svg; marks.push({ k: 'a', x: P, y: y + 6, side: 'l' }, { k: 'b', x: P, y: y + 26, side: 'l' }, { k: 'c', x: W - P + 1, y: y + 11 }); y += hd.h + 6;
  const intro = wrap(on ? 'O login pede a senha e o código do aplicativo. Se perder o celular, use um código de recuperação.' : 'Além da senha, o login passa a pedir um código de 6 dígitos gerado por um aplicativo autenticador no seu celular (Google Authenticator, Microsoft Authenticator, Authy, 1Password ou Bitwarden).', 52, 4);
  s += lines(P, y + 11, intro, 15, { size: 10.5, fill: 'muted' }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(intro[0], 10.5) + 4), y: y + 7 }); y += intro.length * 15 + 10;
  if (on) {
    const sm = 'Ativa desde 02/10/2026. Códigos de recuperação restantes: 8.';
    s += text(P, y + 11, sm, { size: 10.5 }); marks.push({ k: 'e', x: Math.min(W - 6, P + tw(sm, 10.5) + 4), y: y + 7 }); y += 22;
    const b1 = button(P, y, 'Gerar novos códigos de recuperação', { h: 28, size: 10.5 }); s += b1.svg; marks.push({ k: 'f', x: P + b1.w + 2, y: y + 14 }); y += 34;
    const b2 = button(P, y, 'Desativar verificação em duas etapas', { variant: 'danger', h: 28, size: 10.5 }); s += b2.svg; marks.push({ k: 'g', x: P + b2.w + 2, y: y + 14 }); y += 28;
  } else {
    const b = button(P, y, 'Ativar verificação em duas etapas', { variant: 'primary', h: 30, size: 11 }); s += b.svg; marks.push({ k: 'f', x: P + b.w + 2, y: y + 15 }); y += 30;
  }
  y += P; const H = y; const body = card(0, 0, W, H) + s; marks.push({ k: 1, x: 0, y: H - 8 });
  const legend = [
    [1, 'Superfície', 'ui/Card com eyebrow, título e actions (data-testid="two-factor-card"); carregando = LoadingState, erro = ErrorState com Tentar de novo. Real: GET /api/me/2fa (RF2.CA02, D-144).'],
    ['a', 'Eyebrow', 'id do CA ("RF2.CA02") em mono — rastreabilidade, não dado.'],
    ['b', 'Título', `h2 serif "${ttl}".`],
    ['c', 'Estado', `Badge ${on ? '"Ativa" (verde)' : '"Desativada" (neutra)'} ← TwoFactorStatus.enabled. Segurança.`],
    ['d', 'Explicação', on ? 'onIntro: o que muda no login e o que fazer se perder o celular.' : 'offIntro: o que é o código, com aplicativos de exemplo.'],
  ];
  if (on) legend.push(['e', 'Resumo', 'enabledAt (data local) + recoveryCodesLeft. Segurança (o segredo e os códigos nunca saem da API).'], ['f', 'Novos códigos', 'abre Dialog com senha + código; os códigos aparecem uma única vez (copiar, baixar, "Já guardei").'], ['g', 'Desativar', 'Button danger → Dialog com senha + código ou código de recuperação; toast de aviso.']);
  else legend.push(['f', 'Ativar', 'Button primary → Dialog em 3 passos: senha → segredo + link otpauth do aplicativo → primeiro código → códigos de recuperação. Ao ativar, as outras sessões são encerradas.']);
  return guides({ body, cw: W, ch: H, marks, legend });
}
function contaExclusao(kind) {
  const W = 360, P = 18; let s = '', y = P; const marks = []; const ag = kind === 'agendada';
  const hd = cardHeader(P, y, W - 2 * P, { eyebrow: 'RF3.CA19', title: 'Excluir minha conta' }); s += hd.svg; marks.push({ k: 'a', x: P + tw('Excluir minha conta', 17, 'serif') * 1.1 + 4, y: y + 26 }); y += hd.h + 6;
  if (ag) {
    const bd = pill(P, y, 'Exclusão agendada', { badge: true, tone: 'warning', h: 18 }); s += bd.svg; marks.push({ k: 'b', x: P, y: y + 9, side: 'l' }); y += 24;
    const tx = wrap('Sua conta será excluída em 16/11/2026 (faltam 30 dias). Até lá, você pode reativá-la.', 52, 3); s += lines(P, y + 11, tx, 15, { size: 10.5 }); marks.push({ k: 'c', x: Math.min(W - 6, P + tw(tx[0], 10.5) + 4), y: y + 7 }); y += tx.length * 15 + 8;
    const b = button(P, y, 'Reativar conta', { variant: 'primary', h: 30 }); s += b.svg; marks.push({ k: 'd', x: P + b.w + 2, y: y + 15 }); y += 30;
  } else {
    const tx = wrap('A exclusão fica agendada por 30 dias. Nesse prazo você pode entrar e reativar a conta; depois os dados pessoais são anonimizados.', 52, 4); s += lines(P, y + 11, tx, 15, { size: 10.5, fill: 'muted' }); marks.push({ k: 'c', x: Math.min(W - 6, P + tw(tx[0], 10.5) + 4), y: y + 7 }); y += tx.length * 15 + 8;
    const b = button(P, y, 'Excluir conta…', { variant: 'danger', h: 30 }); s += b.svg; marks.push({ k: 'd', x: P + b.w + 2, y: y + 15 }); y += 30;
  }
  y += P; const H = y; const body = card(0, 0, W, H) + s; marks.push({ k: 1, x: 0, y: H - 8 });
  const legend = [
    [1, 'Superfície', 'ui/Card (data-testid="delete-account-card") em Configurações › Dados. Real: POST/DELETE /api/me/deletion (RF3.CA19/CA20, D-18, D-145).'],
    ['a', 'Cabeçalho', 'eyebrow "RF3.CA19" + título "Excluir minha conta".'],
  ];
  if (ag) legend.push(['b', 'Estado', 'Badge âmbar "Exclusão agendada" ← User.status = DELETION_SCHEDULED. Estado e ciclo de vida.'], ['c', 'Prazo', 'deletionScheduledAt (data local) + daysLeft; sem data = texto genérico. Estado e ciclo de vida.'], ['d', 'Reativar', 'Button primary (useReactivate): cancela a exclusão, recarrega a sessão e mostra toast "Conta reativada".']);
  else legend.push(['c', 'Consequências', 'intro com o prazo de 30 dias (DELETION_GRACE_DAYS) e a anonimização.'], ['d', 'Excluir', 'Button danger com reticências → DeleteAccountDialog: consequências, senha atual, motivo opcional, "entendi" e a palavra EXCLUIR; o botão final só habilita com tudo preenchido.']);
  return guides({ body, cw: W, ch: H, marks, legend });
}
function contaAviso() {
  const W = 640, P = 12; let s = ''; const marks = [];
  const H = 58;
  const bd = pill(P + 4, (H - 18) / 2, 'Exclusão agendada', { badge: true, tone: 'warning', h: 18 }); s += bd.svg;
  const b = button(0, 0, 'Reativar conta', { variant: 'primary', h: 26, size: 10.5 }); s += button(W - P - b.w, (H - 26) / 2, 'Reativar conta', { variant: 'primary', h: 26, size: 10.5 }).svg;
  const txX = P + 4 + bd.w + 12; const txl = wrap('Sua conta será excluída em 16/11/2026 (faltam 30 dias). Até lá, você pode reativá-la.', Math.floor((W - P - b.w - 16 - txX) / 5.5), 2); const tx = txl[0];
  s += lines(txX, H / 2 + 4 - (txl.length - 1) * 7.5, txl, 15, { size: 10.5 });
  const body = rect(0, 0, W, H, { fill: 'surface-2', stroke: 'due-soon', sw: 1, rx: 14 }) + s;
  marks.push({ k: 1, x: 0, y: 10 }, { k: 'a', x: P + 4, y: H / 2, side: 'l' }, { k: 'b', x: txX + tw(tx, 10.5) / 2, y: 7 }, { k: 'c', x: W - P + 1, y: H / 2 });
  const legend = [
    [1, 'Superfície', 'ui/Card tone="soft" com borda --ws-warning, role="status", no topo de TODAS as páginas do shell (data-testid="deletion-banner"); some quando a conta volta a ACTIVE. Real.'],
    ['a', 'Estado', 'Badge âmbar "Exclusão agendada" (User.status = DELETION_SCHEDULED). Estado e ciclo de vida.'],
    ['b', 'Prazo', 'deletionScheduledAt + dias restantes (daysLeft), em texto; ocupa o espaço que sobrar (flex-1) e quebra no celular. Estado e ciclo de vida.'],
    ['c', 'Reativar', 'Button primary sm com busy durante a chamada; mesma ação do card de exclusão (useReactivate).'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
function contaDispositivo() {
  const W = 660, P = 14; let s = ''; const marks = [];
  const row = (y, { name, current, remembered, when, action }) => {
    const H = 62; let r = card(0, y, W, H, { shadow: false });
    r += iconAt('perfil', P, y + (H - 28) / 2, 28, v('muted'));
    const nx = P + 40; r += text(nx, y + 25, name, { size: 12, weight: 700 }); let bx = nx + tw(name, 12) * 1.1 + 8; const nameEnd = bx - 8;
    if (current) { const b = pill(bx, y + 12, 'Esta sessão', { badge: true, tone: 'success', h: 17 }); r += b.svg; bx += b.w + 6; }
    if (remembered) { const b = pill(bx, y + 12, 'Lembrar-me', { badge: true, h: 17 }); r += b.svg; bx += b.w + 6; }
    r += text(nx, y + 44, when, { size: 10, fill: 'muted' });
    const b = button(0, 0, action[0], { variant: action[1], h: 28, size: 10.5 }); r += button(W - P - b.w, y + (H - 28) / 2, action[0], { variant: action[1], h: 28, size: 10.5 }).svg;
    return { svg: r, nameEnd, badgesEnd: bx - 6, nx };
  };
  const r1 = row(0, { name: 'Chrome no Linux', current: true, remembered: true, when: 'Última atividade 17 de out. de 2026 10:42 · expira 16 de nov. de 2026 10:42', action: ['Sair deste dispositivo', 'ghost'] });
  const r2 = row(72, { name: 'Safari no iPhone', current: false, remembered: false, when: 'Última atividade 15 de out. de 2026 18:03 · expira 14 de nov. de 2026 18:03', action: ['Encerrar sessão', 'secondary'] });
  s += r1.svg + r2.svg;
  marks.push({ k: 1, x: 0, y: 8 }, { k: 2, x: 0, y: 80 }, { k: 'a', x: P, y: 31, side: 'l' }, { k: 'b', x: r1.nameEnd / 2 + r1.nx / 2, y: 8 }, { k: 'c', x: r1.badgesEnd + 2, y: 11 }, { k: 'd', x: r1.nx, y: 52, side: 'l' }, { k: 'e', x: W - P + 1, y: 31 }, { k: 'f', x: W - P + 1, y: 103 });
  const legend = [
    [1, 'Sessão atual', 'Card as="li" padding md (data-current="true") dentro de ul[aria-label="Sessões ativas"]; acima, um Card de cabeçalho com "Sair de todos os outros" (danger). Real: GET /api/auth/sessions (RF2.CA05, D-62).'],
    [2, 'Outra sessão', 'mesma casca (data-current="false"); encerrar revoga a família do refresh token.'],
    ['a', 'Glifo', 'Glyph "perfil" 28 px, decorativo.'],
    ['b', 'Dispositivo', 'SessionInfo.deviceName (navegador + sistema); vazio = "Dispositivo sem nome". Segurança.'],
    ['c', 'Marcadores', 'Badge "Esta sessão" (verde) se current; "Lembrar-me" (neutro) se persistent. Segurança.'],
    ['d', 'Datas', 'lastActiveAt e expiresAt em data e hora (Intl, dateStyle medium + timeStyle short). Proveniência e auditoria.'],
    ['e', 'Sair daqui', 'na sessão atual: ghost "Sair deste dispositivo" → logout do BFF (apaga cookies, avisa as outras abas).'],
    ['f', 'Encerrar', 'nas outras: secondary "Encerrar sessão" → Dialog de confirmação → DELETE /api/auth/sessions/{id}.'],
  ];
  return guides({ body: s, cw: W, ch: 134, marks, legend });
}

/* =============================================== 11. Bloco de RF/CA (RfPage) e item salvo indisponível =============================================== */
function rfBloco() {
  const W = 560, P = 12; let s = ''; const marks = []; let y = 0;
  const bd = pill(P, 11, 'RF41', { badge: true, tone: 'accent', h: 18 }); const tt = 'Acervo de tarefas — grade, filtros e ações rápidas';
  s += bd.svg + text(P + bd.w + 8, 24, tt, { size: 11.5, weight: 700 }) + text(W - P - 8, 24, '⌄', { size: 13, fill: 'muted', anchor: 'end' });
  marks.push({ k: 'a', x: P, y: 20, side: 'l' }, { k: 'b', x: P + bd.w + 8 + tw(tt, 11.5) / 2, y: 9 }, { k: 'c', x: W - P + 1, y: 19 });
  y = 40; s += hr(0, W, y); y += 12;
  const hu = wrap('História: Como servidor, quero ver e filtrar as minhas tarefas e as que posso usar, para reaproveitar o que já foi feito.', 88, 2); s += lines(P, y + 11, hu, 15, { size: 10.5 }); marks.push({ k: 'd', x: Math.min(W - 6, P + tw(hu[0], 10.5) + 4), y: y + 7 }); y += hu.length * 15 + 4;
  const rt = 'Aba/rota no README: /tasks (Acervo) · Critérios de aceite cobertos: RF41.CA01–CA08';
  s += text(P, y + 11, rt, { size: 10.5, fill: 'muted' }); marks.push({ k: 'e', x: Math.min(W - 6, P + tw(rt, 10.5) + 4), y: y + 7 }); y += 22;
  const cas = [['CA01', 'info', 'Dado um usuário autenticado em /tasks, então a grade mostra as tarefas visíveis com filtros por estado…'], ['CA02', 'neutral', 'Rastreabilidade: TaskController.list, AccessPolicy.visibilityFilter (CA a confirmar)'], ['CA03', 'info', 'Dado um card, quando o abro, então vejo o detalhe ampliado com a ação principal única…']];
  const caY = y; let caEnd = 0;
  for (const [ca, tone, tx] of cas) { const b = pill(P, y, ca, { badge: true, tone, h: 17 }); const t = wrap(tx, 80, 1)[0]; s += b.svg + text(P + 46, y + 12.5, t, { size: 10.5 }); if (!caEnd) caEnd = P + 46 + tw(t, 10.5); y += 22; }
  marks.push({ k: 'f', x: P, y: caY + 30, side: 'l' }, { k: 'g', x: Math.min(W - 6, caEnd + 4), y: caY + 8 });
  s += text(P, y + 11, 'Fonte: docs/diagramas/RF41/README.md', { size: 9.5, fill: 'muted' }) + line(P + 32, y + 13, P + 196, y + 13, { stroke: 'primary-ink', sw: .8 }); marks.push({ k: 'h', x: P + 200, y: y + 7 }); y += 22;
  const H = y; const body = card(0, 0, W, H, { rx: 10, shadow: false }) + s; marks.push({ k: 1, x: 0, y: 8 }, { k: 2, x: 0, y: 70 });
  const legend = [
    [1, 'Resumo (summary)', 'details/summary nativo: teclado e leitor de tela de graça; foco com --ws-focus-ring; o primeiro RF da página abre aberto. Seção "O que esta aba vai fazer" com a nota pt-BR do gerador. Real (texto do catálogo gerado lib/rf/catalog.gen.ts).'],
    [2, 'Corpo', 'borda superior 1 px, padding 3, quebra com overflow-wrap:anywhere.'],
    ['a', 'Chip do RF', 'Badge accent com RfEntry.id. Identificação.'],
    ['b', 'Título', 'RfEntry.title (README do RF).'],
    ['c', 'Chevron', '⌄ decorativo (aria-hidden) que gira 180° quando aberto.'],
    ['d', 'História', 'RfEntry.hu (ou summary quando não há HU). Conteúdo autoral (documentação).'],
    ['e', 'Rota · cobertura', 'RfEntry.route e coverage, quando existem.'],
    ['f', 'Tipo do CA', 'Badge com o número do CA: info = enunciado, neutro = rastreabilidade (title explica a diferença).'],
    ['g', 'Texto do CA', 'ca.text + ca.note entre parênteses em muted; ol[aria-label="Critérios de aceite"].'],
    ['h', 'Fonte', 'link para docs/diagramas/RFnn/README.md no GitHub. Proveniência e auditoria. Abaixo do bloco, o Card soft "matrixNote" diz matriz, rota e arquivo da página.'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}
function salvoIndisponivel() {
  const W = 260, P = 16; let s = '', y = P; const marks = [];
  const bd = pill(P, y, 'Indisponível', { badge: true, h: 18 }); s += bd.svg; marks.push({ k: 'a', x: P, y: y + 9, side: 'l' }); y += 26;
  const tx = wrap('O item salvo mudou de visibilidade e você não tem mais acesso.', 38, 3); s += lines(P, y + 11, tx, 15, { size: 10.5, fill: 'muted' }); marks.push({ k: 'b', x: Math.min(W - 6, P + tw(tx[0], 10.5) + 4), y: y + 7 }); y += tx.length * 15 + 4;
  s += rect(P, y, W - 2 * P, 14, { fill: 'none', stroke: 'line-soft', sw: 1, dash: '3 3', rx: 3 }) + text(P + 5, y + 10, 'sr-only: título do item (se ainda existe)', { fam: 'mono', size: 7.5, fill: 'faint' }); marks.push({ k: 'c', x: W - P + 1, y: y + 7 }); y += 22;
  const b = button(P, y, 'Remover dos salvos', { h: 26, size: 10.5 }); s += b.svg; marks.push({ k: 'd', x: P + b.w + 2, y: y + 13 }); y += 26 + P;
  const H = y; const body = card(0, 0, W, H, { fill: 'surface-2', shadow: false }) + s; marks.push({ k: 1, x: 0, y: H - 8 });
  const legend = [
    [1, 'Superfície', 'ui/Card tone="soft" (data-testid="saved-unavailable") ocupando a célula da grade de Tarefas/Projetos salvos quando o alvo sumiu ou ficou invisível — sem capa, sem arte, sem título visível. DEMO.'],
    ['a', 'Estado', 'Badge neutro "Indisponível" ← savedListOf(...).available = false. Classificação e visibilidade.'],
    ['b', 'Explicação', 'diz o porquê sem revelar o item (invisível = inexistente, D-65/D-141).'],
    ['c', 'Título oculto', 'p.sr-only com o título apenas se o item ainda existe para o viewer.'],
    ['d', 'Remover', 'Button → toggleSave (desfaz o SavedItem) com toast "removido dos salvos".'],
  ];
  return guides({ body, cw: W, ch: H, marks, legend });
}

/* =============================================== catálogo =============================================== */
const R = 'real (API)', D = 'DEMO (repositório em memória)', M = 'MOCK tipado (D-36)', PL = 'planejado (sem código)';
export const VARIACOES_EXTRA = [
  { id: 'tarefa-real-a-realizar', grupo: 'Tarefa real (API)', titulo: 'Card da tarefa real', nome: 'A realizar (com prioridade e próxima ação)', uso: 'Minhas tarefas (/tasks), PersistedTaskCard', situacao: R, kicker: 'TAREFA REAL · PERSISTEDTASKCARD · A REALIZAR', fn: () => tarefaReal('a-realizar'), layout: 'lado' },
  { id: 'tarefa-real-concluida', grupo: 'Tarefa real (API)', titulo: 'Card da tarefa real', nome: 'Concluída', uso: 'Minhas tarefas, filtro Concluído', situacao: R, kicker: 'TAREFA REAL · PERSISTEDTASKCARD · CONCLUÍDA', fn: () => tarefaReal('concluida'), layout: 'lado' },
  { id: 'tarefa-real-bloqueada', grupo: 'Tarefa real (API)', titulo: 'Card da tarefa real', nome: 'Bloqueada', uso: 'Minhas tarefas, filtro Bloqueado', situacao: R, kicker: 'TAREFA REAL · PERSISTEDTASKCARD · BLOQUEADA', fn: () => tarefaReal('bloqueada'), layout: 'lado' },
  { id: 'decisao-frente', grupo: 'Decisão (DECIA)', titulo: 'Decision Card', nome: 'Frente (DETAIL, virável)', uso: 'workspace › Visão geral, folha de detalhe, Atenção (HERO)', situacao: D, kicker: 'DECISION CARD · FRENTE · DETAIL', fn: () => decisaoFrente(), layout: 'lado' },
  { id: 'decisao-verso', grupo: 'Decisão (DECIA)', titulo: 'Decision Card', nome: 'Verso (mapa de lógica)', uso: 'DETAIL/HERO virado (botão Por quê? ou tecla F)', situacao: D, kicker: 'DECISION CARD · VERSO · DETAIL', fn: () => decisaoVerso(), layout: 'lado' },
  { id: 'decisao-compacta', grupo: 'Decisão (DECIA)', titulo: 'Decision Card', nome: 'Compacto (linha da lista)', uso: 'Quadro de decisões em lista, revisões', situacao: D, kicker: 'DECISION CARD · COMPACT · RISCO CRÍTICO + ATRASADA', fn: () => decisaoCompacta() },
  { id: 'mural-entrada', grupo: 'Social', titulo: 'Entrada do Mural', nome: 'Ator + verbo + card do alvo', uso: 'Mural (/mural), abas Para você · Seguindo', situacao: D, kicker: 'MURAL · MURALENTRY', fn: () => muralEntrada() },
  { id: 'atribuicao-recebida', grupo: 'Social', titulo: 'Atribuição', nome: 'Recebida, aguardando resposta', uso: 'Perfil › Delegadas a mim', situacao: D, kicker: 'ATRIBUIÇÃO · RECEBIDA · PROPOSTA', fn: () => atribuicao('recebida'), layout: 'lado' },
  { id: 'atribuicao-enviada-recusada', grupo: 'Social', titulo: 'Atribuição', nome: 'Enviada e recusada (com motivo)', uso: 'Perfil › Delegadas por mim', situacao: D, kicker: 'ATRIBUIÇÃO · ENVIADA · RECUSADA', fn: () => atribuicao('enviada'), layout: 'lado' },
  { id: 'notificacao-item', grupo: 'Social', titulo: 'Notificação', nome: 'Não lida × lida', uso: 'sino do TopBar e /notifications', situacao: M, kicker: 'NOTIFICAÇÃO · NOTIFICATIONROW', fn: () => notificacao(), layout: 'lado' },
  { id: 'perfil-cabecalho', grupo: 'Perfil e instituição', titulo: 'Cabeçalho do perfil', nome: 'Pessoa, visão de terceiros', uso: '/profile e /u/[username]', situacao: D, kicker: 'PERFIL · SOCIALPROFILEHEADER · TERCEIROS', fn: () => perfilCabecalho() },
  { id: 'instituicao-cabecalho', grupo: 'Perfil e instituição', titulo: 'Cabeçalho institucional', nome: 'Departamento (empresa = mesma casca)', uso: '/departments/[slug] e /companies/[slug]', situacao: D, kicker: 'INSTITUIÇÃO · DEPARTMENTHEADER', fn: () => instituicaoCabecalho() },
  { id: 'pessoa-resultado', grupo: 'Busca (planejado)', titulo: 'Card de pessoa', nome: 'Resultado visível', uso: '/search › PESSOAS e CHEFES (RF17)', situacao: PL, kicker: 'BUSCA · PESSOA · VISÍVEL (PLANEJADO)', fn: () => pessoaResultado('visivel'), layout: 'lado' },
  { id: 'pessoa-resultado-restrito', grupo: 'Busca (planejado)', titulo: 'Card de pessoa', nome: 'Perfil restrito (proposta)', uso: '/search › PESSOAS, se houver visibilidade de perfil', situacao: PL, kicker: 'BUSCA · PESSOA · PERFIL RESTRITO (PROPOSTA)', fn: () => pessoaResultado('restrito'), layout: 'lado' },
  { id: 'sessao-decia-card', grupo: 'Sessão DECIA (planejado)', titulo: 'Card da sessão DECIA', nome: 'Aberta · divergir', uso: 'lista /decia, Mural, perfil › Decisões, painel do projeto', situacao: PL, kicker: 'SESSÃO DECIA · CARD (PLANEJADO, Q-44)', fn: () => sessaoDecia(), layout: 'lado' },
  { id: 'evidencia-decia', grupo: 'Decisão (DECIA)', titulo: 'Card de evidência', nome: 'Evidência com vínculos', uso: 'workspace › Evidências', situacao: D, kicker: 'DECIA · EVIDÊNCIA', fn: () => evidencia(), layout: 'lado' },
  { id: 'sugestao-ia', grupo: 'Decisão (DECIA)', titulo: 'Sugestão da IA', nome: 'Sugerida (aceitar · descartar)', uso: 'workspace (critérios, alternativas, riscos)', situacao: D, kicker: 'DECIA · AISUGGESTION', fn: () => sugestaoIa(), layout: 'lado' },
  { id: 'conta-2fa-desativada', grupo: 'Conta e segurança', titulo: 'Verificação em duas etapas', nome: 'Desativada', uso: 'Configurações › Conta', situacao: R, kicker: 'CONTA · TWOFACTORCARD · DESATIVADA', fn: () => conta2fa('desativada'), layout: 'lado' },
  { id: 'conta-2fa-ativa', grupo: 'Conta e segurança', titulo: 'Verificação em duas etapas', nome: 'Ativa', uso: 'Configurações › Conta', situacao: R, kicker: 'CONTA · TWOFACTORCARD · ATIVA', fn: () => conta2fa('ativa'), layout: 'lado' },
  { id: 'conta-exclusao', grupo: 'Conta e segurança', titulo: 'Excluir conta', nome: 'Padrão', uso: 'Configurações › Dados', situacao: R, kicker: 'CONTA · EXCLUSÃO · PADRÃO', fn: () => contaExclusao('padrao'), layout: 'lado' },
  { id: 'conta-exclusao-agendada', grupo: 'Conta e segurança', titulo: 'Excluir conta', nome: 'Exclusão agendada', uso: 'Configurações › Dados', situacao: R, kicker: 'CONTA · EXCLUSÃO · AGENDADA', fn: () => contaExclusao('agendada'), layout: 'lado' },
  { id: 'conta-aviso-exclusao', grupo: 'Conta e segurança', titulo: 'Aviso de exclusão', nome: 'DeletionBanner', uso: 'topo de todas as páginas do shell', situacao: R, kicker: 'CONTA · DELETIONBANNER', fn: () => contaAviso() },
  { id: 'conta-sessao-dispositivo', grupo: 'Conta e segurança', titulo: 'Sessão por dispositivo', nome: 'Atual × outra', uso: 'Configurações › Sessões', situacao: R, kicker: 'CONTA · SESSIONSPANEL · DISPOSITIVOS', fn: () => contaDispositivo() },
  { id: 'rf-bloco', grupo: 'Shell', titulo: 'Bloco de RF/CA', nome: 'Aberto', uso: 'rodapé de toda página RfPage ("O que esta aba vai fazer")', situacao: 'real (catálogo gerado)', kicker: 'SHELL · RFPAGE · RFBLOCK', fn: () => rfBloco() },
  { id: 'salvo-indisponivel', grupo: 'Social', titulo: 'Item salvo', nome: 'Indisponível', uso: 'Perfil › Tarefas/Projetos salvos', situacao: D, kicker: 'PERFIL · SALVO INDISPONÍVEL', fn: () => salvoIndisponivel(), layout: 'lado' },
].map((x) => ({ ...x, kind: 'extra' }));

export function render(varn, theme) {
  const card = varn.fn();
  const side = varn.layout ?? (card.w > 420 ? 'baixo' : 'lado');
  const max = Math.floor(((side === 'lado' ? card.w + 456 : card.w + 48) - 48) / 5.6);
  const base = `Situação: ${varn.situacao}. Uso: ${varn.uso}.`;
  const tail = [' Diagrama gerado por anatomias/gerar.mjs (não é captura do produto).', ' Diagrama, não captura do produto.', ''].find((t) => (base + t).length <= max) ?? '';
  return anatomy({ theme, kicker: varn.kicker, title: `${varn.titulo} — ${varn.nome}`, card, layout: varn.layout, note: base + tail });
}

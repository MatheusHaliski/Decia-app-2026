// Variações de anatomia do card de tarefa (TaskItem) e do card de projeto (ProjectScheme) — ANATOMIA_CARDS.md.
// Cada variação = função que devolve { svg, w, h, callouts, legend }; render(varn, theme) monta a prancha final.
import { rect, circle, line, path, text, g, el, st, v, wrap, lines, tw, id, clipRect, spark, avatar, monogram, tag, due, stamp, seal, phaseBar, ring, counters, node, thumbArt, mosaic, anatomy } from './svg.mjs';
import { iconAt, TASK_TYPE_ICON, TASK_TYPE_TOKEN } from './icons.mjs';
import { TASK_STATES, PROJECT_STATUS } from './tokens.mjs';

/* ------------------------------------------------ dados de exemplo ------------------------------------------------ */
const DEPT = { acr: 'SECID-UTS', mono: 'UTS', tok: 'dept-gralha-azul' };
const TAREFA = {
  title: 'Parecer técnico — pavimentação da PR-445, lote 2 (Londrina)', type: 'DOCUMENTO', ext: 'pdf', category: 'Parecer técnico', state: 'disponivel',
  due: '12 OUT', dueKind: 'ok', legal: false, owner: { ini: 'MH', name: 'Matheus H.' }, dept: DEPT, ai: true, seal: 'gold',
  counters: { likes: 12, comments: 3, saves: 5, remixes: 1 }, protocolo: '2026/0931-SECID', access: 'Interno', docSit: 'Revisado', effort: 'M · 6 h',
  summary: 'Analisa a conformidade do projeto executivo do lote 2 com o TR e recomenda ajustes na drenagem do km 12. Baseado no parecer do lote 1 (reutilizado).',
  usedIn: 'Pavimentação PR-445 — 2026',
};
const TILES = [
  { type: 'DOCUMENTO', ext: 'pdf', tok: 'type-documento' }, { type: 'PLANILHA', tok: 'type-planilha' }, { type: 'DESENHO_TECNICO', tok: 'type-desenho-tecnico' },
  { type: 'TEXTO_IA', tok: 'type-texto-ia', initials: 'TR' }, { type: 'CRONOGRAMA', tok: 'type-cronograma' }, { type: 'ATA_REGISTRO', tok: 'type-ata-registro' },
];
const PROJETO = {
  title: 'Pavimentação urbana — PR-445, lote 2', objective: 'Entregar o projeto executivo e licitar a obra até dezembro de 2026.', dept: DEPT, phase: 2, status: 'publicado',
  milestone: '18 OUT · Entrega do TR', tasks: 7, people: 4, lastEvent: 'decisão validada há 2 dias', counters: { likes: 24, comments: 9, saves: 11, remixes: 2 }, ai: false, tiles: TILES, emoji: 'UTS',
};

const typeIcon = (d) => TASK_TYPE_ICON[d.type]; const typeTok = (d) => d.ext ? `ext-${d.ext}` : TASK_TYPE_TOKEN(d.type);

/* ------------------------------------------------ camada 2: famílias de arte ------------------------------------------------ */
// desenhadas no card inteiro, por baixo do container; só aparecem nas quatro faixas (x, top, bottom)
function familyArt(fam, W, H, { x, top, bottom, d, cid }) {
  let a = '';
  switch (fam) {
    case 'carimbo': a = rect(0, 0, W, H, { fill: 'surface-2' }) + g({ transform: `rotate(-18 ${W - 26} 22)`, style: 'opacity:.55' }, circle(W - 26, 22, 22, { fill: 'none', stroke: 'type-ata-registro', sw: 2 }) + circle(W - 26, 22, 16, { fill: 'none', stroke: 'type-ata-registro', sw: .8, dash: '2 2' }) + text(W - 26, 25, 'SECID', { fam: 'mono', size: 7, weight: 700, fill: 'type-ata-registro-ink', anchor: 'middle', tracking: '.1em' })) + text(x, H - bottom / 2 + 3.5, `Nº ${d.protocolo}`, { fam: 'mono', size: 7.5, weight: 600, fill: 'muted', tracking: '.08em' }); break;
    case 'pasta': a = rect(0, 0, W, H, { fill: 'type-pasta-soft' }) + rect(0, 0, W, 5, { fill: 'type-pasta', op: .55 }) + path(`M${x + 6} ${top - 2}v-${top - 9}a3 3 0 0 1 3-3h${W * .42}a3 3 0 0 1 3 3v${top - 9}`, { fill: 'surface', stroke: 'type-pasta', sw: 1 }) + text(x + 14, top - 7, d.category.toUpperCase(), { fam: 'mono', size: 7.5, weight: 700, fill: 'type-pasta-ink', tracking: '.08em' }); break;
    case 'blueprint': { a = rect(0, 0, W, H, { fill: '#16437A' }); for (let i = 1; i < W / 12; i++) a += line(i * 12, 0, i * 12, H, { stroke: '#FFFFFF', sw: .5, op: i % 2 ? .08 : .16 }); for (let i = 1; i < H / 12; i++) a += line(0, i * 12, W, i * 12, { stroke: '#FFFFFF', sw: .5, op: i % 2 ? .08 : .16 });
      a += path(`M6 14v-8h8M${W - 6} 14v-8h-8M6 ${H - 14}v8h8M${W - 6} ${H - 14}v8h-8`, { fill: 'none', stroke: '#DCE9FB', sw: 1 }) + rect(x, H - bottom + 3, W - 2 * x, bottom - 7, { fill: 'none', stroke: '#DCE9FB', sw: .8 }) + text(x + 5, H - bottom / 2 + 3, `FL. 01 · ESC. 1:500 · ${d.protocolo}`, { fam: 'mono', size: 7, weight: 600, fill: '#DCE9FB', tracking: '.06em' }); break; }
    case 'monograma': { const tk = typeTok(d); a = rect(0, 0, W, H, { fill: `${TASK_TYPE_TOKEN(d.type)}-soft` }) + text(W - 4, H - 2, (d.initials ?? 'PT'), { fam: 'serif', size: H * .62, weight: 700, fill: tk, anchor: 'end', op: .22, tracking: '-.06em' }); break; }
    default: // protocolo: papelaria pautada + picote
      a = rect(0, 0, W, H, { fill: 'surface-2' }); for (let yy = 8; yy < H; yy += 8) a += line(0, yy, W, yy, { stroke: 'ink', sw: .5, op: .05 }); for (let xx = 8; xx < W; xx += 8) a += circle(xx, 4, 1.4, { fill: 'ground' }); a += line(x, H - bottom / 2, W - x, H - bottom / 2, { stroke: 'line-soft', sw: 1, dash: '1 3' }) + text(x, 11, `PROTOCOLO Nº ${d.protocolo}`, { fam: 'mono', size: 7, weight: 600, fill: 'muted', tracking: '.1em' });
  }
  return g({ 'clip-path': `url(#${cid})`, 'aria-hidden': 'true', style: 'pointer-events:none' }, a);
}
const STRIPS = { protocolo: [16, 16], carimbo: [16, 16], monograma: [16, 16], pasta: [22, 10], blueprint: [10, 22] };

function stateTag(x, y, state, { h = 20 } = {}) {
  const s = TASK_STATES[state]; const tok = s.cor === 'neutral' ? 'neutral' : s.cor === 'spark' ? 'spark' : s.cor;
  return tag(x, y, s.nome, { tok, h, dashed: s.estilo === 'tracejado', pulse: s.estilo === 'pulso', icon: s.estilo === 'cadeado' ? 'cadeado' : s.estilo === 'ficha' ? 'ficha-dp' : undefined, star: s.estilo === 'estrela' });
}
function statusTag(x, y, status, { h = 20 } = {}) {
  const s = PROJECT_STATUS[status]; const tok = s.cor === 'neutral' ? 'neutral' : s.cor;
  return tag(x, y, s.nome, { tok, h, dashed: s.estilo === 'tracejado', pulse: s.estilo === 'pulso' });
}

/* ------------------------------------------------ TAREFA · Compacto (grade do Acervo) ------------------------------------------------ */
function tarefaCompacto(d, { family = 'protocolo', W = 240 } = {}) {
  const [top, bottom] = STRIPS[family]; const x = 12, pad = 10, cw = W - 2 * x, iw = cw - 2 * pad, mediaH = Math.round(iw * 2 / 3);
  const state = d.state ?? 'disponivel';
  const extraLine = ['em-uso', 'bloqueada', 'oferecida'].includes(state) ? 16 : 0;
  const ch = pad + 24 + 6 + mediaH + 8 + 34 + 8 + 20 + extraLine + 10 + 20 + pad; const H = top + ch + bottom;
  const cOut = id('o'), cCont = id('c');
  const dashed = state === 'rascunho';
  let s = `<defs>${clipRect(cOut, 0, 0, W, H, 12)}${clipRect(cCont, x, top, cw, ch, 8)}<filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>`;
  // 1 superfície externa
  s += rect(0, 0, W, H, { fill: 'surface', stroke: dashed ? 'line-soft' : d.dept.tok, sw: dashed ? 1.5 : 2, dash: dashed ? '6 4' : undefined, rx: 12, extra: 'filter:drop-shadow(0 1px 2px rgba(0,0,0,.08))' });
  // 2 arte
  s += familyArt(family, W, H, { x, top, bottom, d, cid: cOut });
  // 5 aura (atrás do container) — só decorativa, exemplo na família protocolo
  if (d.aura) s += rect(x - 2, top - 2, cw + 4, ch + 4, { fill: 'none', stroke: 'primary', sw: 4, op: .25, rx: 10 });
  // 3 container
  s += rect(x, top, cw, ch, { fill: 'surface', rx: 8, extra: 'filter:drop-shadow(0 1px 3px rgba(0,0,0,.10))' });
  let y = top + pad; const ix = x + pad;
  // cabeçalho: ícone do tipo + categoria + faísca
  const tk = typeTok(d);
  s += rect(ix, y, 24, 24, { fill: `${TASK_TYPE_TOKEN(d.type)}-soft`, rx: 6 }) + iconAt(typeIcon(d), ix + 3, y + 3, 18, v(tk));
  s += text(ix + 30, y + 10, d.category, { fam: 'mono', size: 9, weight: 600, fill: 'muted', upper: true, tracking: '.07em' });
  s += text(ix + 30, y + 21, `${d.dept.acr}${d.ext ? ' · ' + d.ext.toUpperCase() : ''}`, { fam: 'sans', size: 9.5, fill: 'faint' });
  if (d.ai) s += spark(ix + iw - 8, y + 12, 14, { glow: true });
  y += 24 + 6;
  // 4 mídia
  s += thumbArt(ix, y, iw, mediaH, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), initials: d.initials, cid: id('m') });
  s += rect(ix, y, iw, mediaH, { fill: 'none', stroke: 'line-soft', sw: .8 });
  if (state === 'concluida') s += stamp(ix + iw - 86, y + mediaH - 32, 'Concluída', { tok: 'class-consenso', angle: -10, w: 80, h: 24 });
  const mediaY = y; y += mediaH + 8;
  // título
  const tl = wrap(d.title, 27, 2); s += lines(ix, y + 12, tl, 17, { fam: 'serif', size: 14, weight: 600, fill: state === 'rascunho' ? 'muted' : 'ink' }); y += 34 + 8;
  // etiqueta de estado + prazo
  const t1 = stateTag(ix, y, state); s += t1.svg; const d1 = due(ix + t1.w + 6, y, d.due, { kind: d.dueKind, legal: d.legal }); if (ix + t1.w + 6 + d1.w <= ix + iw) s += d1.svg; const metaY = y; y += 20;
  if (state === 'em-uso') s += text(ix, y + 11, `no projeto ${d.usedIn}`, { fam: 'sans', size: 9.5, fill: 'class-argumento-ink', italic: true });
  if (state === 'bloqueada') s += text(ix, y + 11, `aguarda ${d.blockedBy ?? 'parecer jurídico (Ana C.)'}`, { fam: 'sans', size: 9.5, fill: 'class-divergencia-ink', italic: true });
  if (state === 'oferecida') s += iconAt('ficha-dp', ix, y + 1, 12, v('spark')) + text(ix + 15, y + 11, `${d.price ?? 40} DP · licença: atribuição`, { fam: 'mono', size: 9, weight: 600, fill: 'type-link-ink' });
  y += extraLine + 10;
  // rodapé: responsável + contadores
  s += avatar(ix + 10, y + 10, 10, d.owner.ini) + text(ix + 25, y + 13.5, d.owner.name, { fam: 'sans', size: 10, fill: 'muted' });
  const cnt = counters(0, 0, d.counters, { size: 12, gap: 8 }); s += g({ transform: `translate(${ix + iw - cnt.w} ${y + 4})` }, cnt.svg);
  // lacre (zona do selo: canto superior direito)
  if (d.seal) s += seal(W - x - 6, top + 6, 15, { kind: d.seal === 'navy' ? 'navy' : 'gold', ribbon: d.seal === 'excelencia', broken: d.seal === 'broken', letter: d.dept.mono[0] });
  let svg = s;
  if (state === 'arquivada') svg = `<defs><filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>` + g({ style: `opacity:.62;filter:url(#${cOut}f)` }, s);
  const callouts = [{ n: 1, x: 2, y: 2 }, { n: 2, x: W / 2, y: H - 2 }, { n: 3, x: x + cw - 2, y: top + ch - 2 }, { n: 4, x: ix + iw / 2, y: mediaY + mediaH / 2 },
    { n: 'a', x: ix + 2, y: top + pad + 2 }, { n: 'b', x: ix + 30, y: top + pad + 22 }, { n: 'c', x: ix - 4, y: mediaY + mediaH + 20 }, { n: 'd', x: ix + 2, y: metaY + 10 }, { n: 'e', x: ix + t1.w + 10, y: metaY + 10 },
    { n: 'f', x: ix + 10, y: y + 10 }, { n: 'g', x: ix + iw - cnt.w / 2, y: y + 10 }];
  if (d.ai) callouts.push({ n: 'h', x: ix + iw - 8, y: top + pad + 12 });
  if (d.seal) callouts.push({ n: 'i', x: W - x - 6, y: top + 24 });
  const legend = [
    [1, 'Superfície externa', `article.card-tarefa: borda 2 px na cor do departamento (${d.dept.acr}, RF38.CA09), raio --card-r-out e overflow:hidden que recorta a arte. Rascunho = borda tracejada.`],
    [2, 'Área artística', `família "${family}": fundo + composição só nas quatro faixas (--card-x = 12 px; topo/base ${top}/${bottom} px). aria-hidden, pointer-events:none.`],
    [3, 'Container de conteúdo', 'fundo --surface, raio --card-r-in (70 % do externo), relevo --shadow-1; tudo o que é interativo mora aqui.'],
    [4, 'Área da mídia', `thumbnail automático 3:2 (${d.type === 'DOCUMENTO' ? '1ª página estilizada + selo da extensão' : 'arte do tipo'}, RF38.CA02); nada da arte passa por cima.`],
    ['a', 'Ícone do tipo', `glifo próprio "${typeIcon(d)}" em chip na cor do tipo (${d.ext ? 'por extensão: ' + d.ext : TASK_TYPE_TOKEN(d.type)}), RF38.CA01.`],
    ['b', 'Categoria e origem', 'TaskCategory em label mono maiúsculo; departamento · formato em caption.'],
    ['c', 'Título', 'serif editorial 14/17, 2 linhas com reticências; é o link para o detalhe.'],
    ['d', 'Etiqueta de estado', `TaskState "${TASK_STATES[state].nome}" com o nome em texto e estilo "${TASK_STATES[state].estilo}" (RF38.CA05).`],
    ['e', 'Prazo', 'relógio (ou balança ⚖ se prazo legal); âmbar a 3 dias, vermelho vencido.'],
    ['f', 'Responsável', 'avatar 20 px com iniciais + nome; responsibleId (padrão: dono).'],
    ['g', 'Contadores sociais', 'curtir · comentar · salvar · remixar com contagem (ReactionType CURTIR + SavedItem + Remix).'],
  ];
  if (d.ai) legend.push(['h', 'Faísca ✦', 'aiGenerated: tooltip "gerado por IA em [data], revisado por [pessoa]" (RF38.CA04).']);
  if (d.seal) legend.push(['i', 'Lacre de chancela', `SealBond APROVADA: lacre ${d.seal === 'navy' ? 'azul-marinho (chefe)' : 'dourado (empresa)'} na zona do selo, com aria-label.`]);
  return { svg, w: W, h: H, callouts, legend };
}

/* ------------------------------------------------ TAREFA · Lista (linha) ------------------------------------------------ */
function tarefaLista(d, { W = 560 } = {}) {
  const H = 72, pad = 8, thW = 64, thH = 43; const cid = id('l');
  let s = rect(0, 0, W, H, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 10 }) + rect(0, 10, 3, H - 20, { fill: d.dept.tok, rx: 1.5 });
  s += thumbArt(pad + 6, (H - thH) / 2, thW, thH, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), cid }) + rect(pad + 6, (H - thH) / 2, thW, thH, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 2 });
  s += rect(pad + 2, (H - thH) / 2 - 4, 20, 20, { fill: 'surface', rx: 5, extra: 'filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))' }) + iconAt(typeIcon(d), pad + 5, (H - thH) / 2 - 1, 14, v(typeTok(d)));
  const tx = pad + 6 + thW + 12;
  s += text(tx, 30, wrap(d.title, 36, 1)[0], { fam: 'serif', size: 14, weight: 600 }) + text(tx, 47, `${d.category} · ${d.dept.acr}${d.ext ? ' · ' + d.ext.toUpperCase() : ''} · ${d.effort}`, { fam: 'sans', size: 10.5, fill: 'muted' });
  if (d.ai) s += spark(tx + tw(wrap(d.title, 36, 1)[0], 14, 'serif') + 10, 26, 12);
  const t1 = stateTag(318, 26, d.state ?? 'disponivel'); s += t1.svg; const d1 = due(318, 26 + 0, '', {}); // reserva
  const dd = due(410, 26, d.due, { kind: d.dueKind, legal: d.legal }); s += dd.svg;
  s += avatar(486, 36, 10, d.owner.ini) + iconAt('curtir', 502, 29, 13, v('muted')) + text(518, 39.5, String(d.counters.likes), { fam: 'sans', size: 10.5, weight: 600, fill: 'muted' });
  if (d.seal) s += seal(W - 16, 18, 11, { kind: d.seal === 'navy' ? 'navy' : 'gold', letter: d.dept.mono[0] });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 3, x: W / 2, y: H - 2 }, { n: 4, x: pad + 6 + thW / 2, y: H / 2 }, { n: 'a', x: pad + 2, y: (H - thH) / 2 - 4 }, { n: 'c', x: tx - 6, y: 26 }, { n: 'd', x: 318 + t1.w / 2, y: 50 }, { n: 'e', x: 410 + dd.w / 2, y: 50 }, { n: 'f', x: 486, y: 52 }, { n: 'g', x: 520, y: 52 }, ...(d.seal ? [{ n: 'i', x: W - 16, y: 34 }] : [])],
    legend: [
      [1, 'Superfície externa', 'linha de 72 px (64 na densidade compacta), raio 10, borda --line-soft; filete esquerdo de 3 px na cor do departamento.'],
      [3, 'Container', 'na lista não há área artística: a linha é só container. Toda a linha é alvo de clique (o título é o link).'],
      [4, 'Miniatura', '64 × 43 px (3:2), o mesmo thumbnail do card compacto, com o ícone do tipo sobreposto no canto (a).'],
      ['a', 'Ícone do tipo', 'chip 20 px flutuando sobre a miniatura — na lista ele precisa ser legível mesmo com a miniatura pequena.'],
      ['c', 'Título + metadados', 'serif 14, 1 linha com reticências; abaixo categoria · departamento · formato · esforço em caption.'],
      ['d', 'Etiqueta de estado', 'coluna fixa (largura mínima 110 px) para alinhar entre linhas.'],
      ['e', 'Prazo', 'coluna fixa; âmbar/vermelho; ⚖ quando legalDueAt.'],
      ['f', 'Responsável', 'avatar 20 px; nome só no tooltip.'],
      ['g', 'Contagem', 'só curtidas na lista (as demais no detalhe).'],
      ...(d.seal ? [['i', 'Lacre', 'versão 22 px (--card-seal-sm) no canto superior direito.']] : []),
    ] };
}

/* ------------------------------------------------ TAREFA · Ampliado (detalhe) ------------------------------------------------ */
function tarefaAmpliado(d, { W = 420 } = {}) {
  const x = 20, top = 22, bottom = 22, pad = 16, cw = W - 2 * x, iw = cw - 2 * pad, mediaH = Math.round(iw * 2 / 3);
  const cOut = id('o');
  const parts = []; let y = top + pad; const ix = x + pad;
  // cabeçalho dono
  parts.push(avatar(ix + 12, y + 12, 12, d.owner.ini) + text(ix + 30, y + 10, `@matheus.haliski · ${d.dept.acr}`, { fam: 'sans', size: 11, weight: 600 }) + text(ix + 30, y + 22, `recebido em 28/09/2026 · protocolo ${d.protocolo}`, { fam: 'sans', size: 10, fill: 'muted' }));
  if (d.ai) parts.push(spark(ix + iw - 10, y + 12, 16, { glow: true }) + text(ix + iw - 22, y + 16, 'gerado por IA em 01/10 · revisado por Maria H.', { fam: 'sans', size: 9, fill: 'spark-ink', anchor: 'end' }));
  const headY = y; y += 30 + 10;
  parts.push(thumbArt(ix, y, iw, mediaH, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), cid: id('m') }) + rect(ix, y, iw, mediaH, { fill: 'none', stroke: 'line-soft', sw: .8 })); const mediaY = y; y += mediaH + 14;
  const tl = wrap(d.title, 34, 2); parts.push(lines(ix, y + 16, tl, 24, { fam: 'serif', size: 20, weight: 600 })); const titleY = y; y += tl.length * 24 + 6;
  parts.push(rect(ix, y, 24, 24, { fill: `${TASK_TYPE_TOKEN(d.type)}-soft`, rx: 6 }) + iconAt(typeIcon(d), ix + 3, y + 3, 18, v(typeTok(d))) + text(ix + 30, y + 16, `${d.category} · ${d.type.replace('_', ' ')} · ${d.ext?.toUpperCase() ?? ''}`, { fam: 'mono', size: 10, weight: 600, fill: 'muted', upper: true, tracking: '.06em' }));
  const t1 = stateTag(ix + iw - 118, y + 2, d.state ?? 'disponivel'); parts.push(t1.svg); y += 32;
  const sl = wrap(d.summary, 70, 3); parts.push(lines(ix, y + 11, sl, 15, { fam: 'sans', size: 12, fill: 'ink' })); const sumY = y; y += sl.length * 15 + 10;
  // grade de metadados
  const meta = [['Prazo', d.due + ' · 2026', 'relogio'], ['Prazo legal', '20 OUT (Lei 14.133, art. 18)', 'balanca'], ['Acesso', d.access, 'cadeado'], ['Situação do documento', d.docSit, 'formulario'], ['Esforço', d.effort, 'cronograma'], ['Origem', 'Interna · vinculado (Drive)', 'link']];
  const colW = iw / 2; const metaY = y;
  meta.forEach(([k, val, ic], i) => { const cx = ix + (i % 2) * colW, cy = y + Math.floor(i / 2) * 34; parts.push(iconAt(ic, cx, cy + 2, 14, v('muted')) + text(cx + 20, cy + 9, k, { fam: 'mono', size: 8.5, weight: 600, fill: 'muted', upper: true, tracking: '.07em' }) + text(cx + 20, cy + 23, val, { fam: 'sans', size: 11.5, weight: 500 })); });
  y += 3 * 34 + 4;
  // ação principal + alternativa
  parts.push(rect(ix, y, 170, 36, { fill: 'primary', rx: 18 }) + iconAt('criar-projeto', ix + 14, y + 9, 18, v('on-primary')) + text(ix + 40, y + 22.5, 'Adicionar ao projeto', { fam: 'sans', size: 12.5, weight: 600, fill: 'on-primary' }));
  parts.push(text(ix + 182, y + 22, 'ou anexar numa sessão DECIA', { fam: 'sans', size: 11.5, weight: 600, fill: 'primary-ink', extra: 'text-decoration:underline' })); const actY = y; y += 36 + 14;
  // linha de interações
  parts.push(line(ix, y - 7, ix + iw, y - 7, { stroke: 'line-soft', sw: 1 }));
  const inter = [['curtir', 12], ['comentar', 3], ['compartilhar', 1], ['remixar', 1], null, ['util', 4], ['bem-fundamentado', 2], ['conforme', 1]]; let cx = ix;
  for (const it of inter) { if (!it) { parts.push(line(cx + 2, y + 2, cx + 2, y + 18, { stroke: 'line-soft', sw: 1 })); cx += 12; continue; } parts.push(iconAt(it[0], cx, y, 20, v(it[0] === 'curtir' ? 'class-risco' : 'ink')) + text(cx + 23, y + 14, String(it[1]), { fam: 'sans', size: 12, weight: 600 })); cx += 23 + tw(String(it[1]), 12) + 14; }
  parts.push(iconAt('salvar', ix + iw - 20, y, 20, v('ink'))); const intY = y; y += 20 + pad;
  const ch = y - top; const H = top + ch + bottom;
  let s = `<defs>${clipRect(cOut, 0, 0, W, H, 14)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: d.dept.tok, sw: 2, rx: 14 }) + familyArt('protocolo', W, H, { x, top, bottom, d, cid: cOut }) + rect(x, top, cw, ch, { fill: 'surface', rx: 10, extra: 'filter:drop-shadow(0 2px 6px rgba(0,0,0,.12))' }) + parts.join('');
  if (d.seal) s += seal(W - x - 2, top + 4, 18, { kind: 'gold', letter: 'S' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 2, x: W / 2, y: H - 2 }, { n: 3, x: x + cw - 2, y: top + ch - 2 }, { n: 4, x: ix + iw / 2, y: mediaY + mediaH / 2 }, { n: 'a', x: ix, y: headY }, { n: 'b', x: ix - 4, y: titleY + 10 }, { n: 'c', x: ix - 4, y: sumY + 8 }, { n: 'd', x: ix - 4, y: metaY + 12 }, { n: 'e', x: ix - 4, y: actY + 18 }, { n: 'f', x: ix - 4, y: intY + 10 }, { n: 'g', x: ix + iw - 118 + t1.w / 2, y: titleY + tl.length * 24 + 30 }, ...(d.ai ? [{ n: 'h', x: ix + iw - 10, y: headY + 30 }] : []), ...(d.seal ? [{ n: 'i', x: W - x - 2, y: top + 26 }] : [])],
    legend: [
      [1, 'Superfície externa', 'mesma família da grade (a arte acompanha a peça para o detalhe), --card-x-lg = 20 px, raio 14.'],
      [2, 'Área artística', 'faixas de 20/22 px: a mesma composição, maior; vidro fosco com desfoque só aqui (nunca na grade).'],
      [3, 'Container', 'padding --card-pad-lg (16 px); role="dialog" no modal, foco preso, Esc fecha, foco volta ao título do card.'],
      [4, 'Mídia', '3:2 na largura do container; toque amplia (lightbox); versões pendentes de thumbnail não aparecem para visitantes.'],
      ['a', 'Dono e origem', '@usuário · departamento; recebido em · protocolo (sourceRef/protocolNumber).'],
      ['b', 'Título', 'serif h1 (20/24), até 2 linhas.'],
      ['c', 'Resumo', 'summary de 3 linhas (IA, com ✦ quando aiGenerated).'],
      ['d', 'Metadados agrupados', 'prazo, prazo legal ⚖ com base legal, classificação de acesso, situação do documento, esforço, origem/vínculo.'],
      ['e', 'Ação principal única', 'dono: "Adicionar ao projeto" (ou "Transformar em tarefa" para artefatos); alternativa como texto-link. Visitante: "Guardar uma cópia" / "Remixar".'],
      ['f', 'Linha única de interações', 'curtir · comentar · compartilhar · remixar | Útil · Bem fundamentado · Conforme | salvar à direita (RF26); 20 px, contagem ao lado, ativo = preenchido.'],
      ['g', 'Etiqueta de estado', 'à direita da linha de categoria; muda com TaskStateLog em tempo real.'],
      ...(d.ai ? [['h', 'Transparência da IA', 'faísca + texto "gerado por IA em [data] · revisado por [pessoa]" sempre visível no detalhe (RF38.CA04).']] : []),
      ...(d.seal ? [['i', 'Lacre', '36 px, com tooltip: emissor, critério (SealBondBasis), data e validade.']] : []),
    ] };
}

/* ------------------------------------------------ TAREFA · Anexo de mensagem (inline no DECIA) ------------------------------------------------ */
function tarefaAnexo(d, { W = 360 } = {}) {
  const H = 150; let s = '';
  // bolha classificada ARGUMENTO
  s += rect(0, 0, W, H, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 12 }) + rect(0, 10, 4, H - 20, { fill: 'class-argumento', rx: 2 });
  s += avatar(26, 20, 11, 'MH') + text(44, 17, 'Maria Helena', { fam: 'sans', size: 11.5, weight: 700 }) + text(44, 29, '10:42 · chefe UTS', { fam: 'sans', size: 9.5, fill: 'muted' });
  const t = tag(W - 118, 10, 'Argumento · azul', { tok: 'class-argumento', h: 18 }); s += t.svg;
  s += text(16, 50, 'Proponho reutilizar o parecer do lote 1 como base. Anexo o', { fam: 'sans', size: 11.5 }) + text(16, 65, 'parecer já revisado:', { fam: 'sans', size: 11.5 });
  // chip da tarefa anexada
  const cy = 76, chH = 60; s += rect(16, cy, W - 32, chH, { fill: 'surface-2', stroke: 'line-soft', sw: 1, rx: 8 }) + rect(16, cy, 3, chH, { fill: d.dept.tok });
  s += thumbArt(26, cy + 8, 66, 44, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), cid: id('a') }) + rect(26, cy + 8, 66, 44, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 2 });
  s += iconAt(typeIcon(d), 100, cy + 9, 14, v(typeTok(d))) + text(118, cy + 20, wrap(d.title, 28, 1)[0], { fam: 'serif', size: 12.5, weight: 600 });
  s += text(100, cy + 36, `${d.category} · PDF · Disponível · ${d.dept.acr}`, { fam: 'sans', size: 9.5, fill: 'muted' });
  s += rect(100, cy + 42, 128, 14, { fill: 'spark-soft', rx: 7 }) + iconAt('ficha-dp', 104, cy + 43, 12, v('spark')) + text(119, cy + 52.5, 'usado na decisão · +6 DP', { fam: 'mono', size: 8, weight: 700, fill: 'spark-ink', upper: true, tracking: '.04em' });
  s += iconAt('chevron', W - 36, cy + 22, 16, v('muted'));
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 3, x: W - 16, y: cy + chH }, { n: 4, x: 59, y: cy + 30 }, { n: 'a', x: 4, y: H / 2 }, { n: 'b', x: W - 118 + t.w / 2, y: 34 }, { n: 'c', x: 100, y: cy + 9 }, { n: 'd', x: 164, y: cy + 56 }],
    legend: [
      [1, 'Bolha da mensagem', 'SessionMessage no DECIA; raio 12, fundo --surface; autor, hora e papel.'],
      [3, 'Chip da tarefa (container)', 'MessageAttachment targetType=TASK: card em miniatura de 60 px dentro da bolha; clique abre o Ampliado em modal, sem sair da sessão (RF29.CA03, até 5 anexos).'],
      [4, 'Miniatura', '66 × 44 (3:2), o mesmo thumbnail.'],
      ['a', 'Filete da classificação', 'MessageClassification: cor da classe (argumento azul) na borda esquerda da bolha (RF7/RF38.CA07) + etiqueta com o nome da cor (b).'],
      ['b', 'Etiqueta de classe', '"Argumento · azul": classe e cor em texto (daltonismo); confirmável pelo humano.'],
      ['c', 'Ícone do tipo + título', 'glifo 14 px + serif 12,5; segunda linha: categoria · formato · estado · departamento.'],
      ['d', 'Crédito de uso', 'usedInDecision → "usado na decisão · +6 DP" na ficha DP com faísca (RF42).'],
    ] };
}

/* ------------------------------------------------ TAREFA · Mini (SelectList / slot da PhaseBar) ------------------------------------------------ */
function tarefaMini(d, { W = 280 } = {}) {
  const rows = [
    { d: { ...d, state: 'disponivel' }, sel: false }, { d: { ...d, title: 'Planilha orçamentária — lote 2', type: 'PLANILHA', ext: null, state: 'disponivel' }, sel: true },
    { d: { ...d, title: 'Cronograma físico-financeiro', type: 'CRONOGRAMA', ext: null, state: 'em-uso' }, dis: 'em uso no projeto PR-445 (2026)' },
  ];
  const rh = 44, H = rows.length * rh + 16; let s = rect(0, 0, W, H, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 14, extra: 'filter:drop-shadow(0 8px 20px rgba(0,0,0,.14))' });
  rows.forEach((r, i) => {
    const y = 8 + i * rh; const dd = r.d;
    if (r.sel) s += rect(6, y, W - 12, rh, { fill: 'surface-2', rx: 10 });
    s += g({ style: r.dis ? 'opacity:.5' : '' }, thumbArt(14, y + 6, 32, 32, { type: dd.type, ext: dd.ext, tok: TASK_TYPE_TOKEN(dd.type), cid: id('mi') }) + rect(14, y + 6, 32, 32, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 4 }) + iconAt(TASK_TYPE_ICON[dd.type], 54, y + 14, 14, v(dd.ext ? `ext-${dd.ext}` : TASK_TYPE_TOKEN(dd.type))) + text(74, y + 19, wrap(dd.title, 26, 1)[0], { fam: 'serif', size: 12.5, weight: r.sel ? 700 : 600 }) + circle(78, y + 31, 3, { fill: dd.state === 'em-uso' ? 'class-argumento' : 'primary' }) + text(86, y + 34, r.dis ?? TASK_STATES[dd.state].nome + ' · ' + dd.category, { fam: 'sans', size: 9.5, fill: r.dis ? 'class-argumento-ink' : 'muted', italic: !!r.dis }));
    if (r.sel) s += iconAt('check', W - 30, y + 14, 16, v('primary-ink'));
    if (r.dis) s += iconAt('cadeado', W - 30, y + 14, 16, v('muted'));
  });
  return { svg: s, w: W, h: H, callouts: [{ n: 3, x: 2, y: 2 }, { n: 4, x: 30, y: 30 }, { n: 'a', x: 60, y: 8 + rh + 12 }, { n: 'b', x: 78, y: 8 + 44 - 4 }, { n: 'c', x: W - 30, y: 8 + rh + 36 }, { n: 'd', x: W - 30, y: 8 + 2 * rh + 36 }],
    legend: [
      [3, 'Lista flutuante (SelectList)', 'cartão raio 14 + --shadow-2, opções de 44 px (40 no desktop), ativa = --surface-2, escolhida = negrito + ✓; combobox APG com aria-activedescendant.'],
      [4, 'Miniatura mini', '32 × 32 (--card-thumb-mini), recorte 1:1 do thumbnail; para slot da PhaseBar o mesmo Mini vira ficha arrastável.'],
      ['a', 'Ícone do tipo', '14 px na cor do tipo/extensão, antes do título (RF38.CA01: aparece em listas e busca).'],
      ['b', 'Estado em texto', 'ponto na cor do estado + nome do estado · categoria; nunca só a cor.'],
      ['c', 'Selecionada', 'aria-selected="true", ✓ em --primary-ink.'],
      ['d', 'Desabilitada com motivo', 'aria-disabled + motivo legível ("em uso no projeto …", RF41) e cadeado; continua navegável pelo teclado, não escolhível.'],
    ] };
}

/* ------------------------------------------------ PROJETO · Mosaico 2×3 padrão ------------------------------------------------ */
function projetoMosaico(p, { W = 260, cover = 'mosaico' } = {}) {
  const x = 0, pad = 12, cw = W, iw = cw - 2 * pad, coverH = Math.round(iw * 2 / 3);
  const status = p.status ?? 'publicado'; const dashed = status === 'rascunho'; const faded = status === 'arquivado';
  const extra = ['em-decisao', 'devolvido'].includes(status) ? 18 : 0;
  const H = pad + coverH + 12 + 40 + 8 + 24 + 8 + 28 + 8 + 16 + extra + 8 + 20 + pad;
  const cOut = id('p');
  let s = `<defs>${clipRect(cOut, 0, 0, W, H, 12)}<filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>`;
  s += rect(0, 0, W, H, { fill: 'surface', stroke: dashed ? 'line-soft' : p.dept.tok, sw: dashed ? 1.5 : 2.5, dash: dashed ? '6 4' : undefined, rx: 12, extra: 'filter:drop-shadow(0 1px 3px rgba(0,0,0,.10))' });
  let y = pad; const ix = pad;
  // 4 capa
  if (cover === 'vazia') s += rect(ix, y, iw, coverH, { fill: 'surface-2', stroke: 'line-soft', sw: 1, dash: '4 3', rx: 6 }) + iconAt('pasta-vazia', ix + iw / 2 - 24, y + coverH / 2 - 30, 48, v('line-soft')) + text(ix + iw / 2, y + coverH / 2 + 32, 'pasta em branco · adicione a 1ª tarefa', { fam: 'sans', size: 10, fill: 'muted', anchor: 'middle', italic: true });
  else if (cover === 'ia') { const c = id('ia'); s += `<defs>${clipRect(c, ix, y, iw, coverH, 6)}<linearGradient id="${c}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED0FF"/><stop offset=".55" stop-color="#DCEBFA"/></linearGradient></defs>` + g({ 'clip-path': `url(#${c})` }, rect(ix, y, iw, coverH, { fill: `url(#${c}g)` }) + circle(ix + iw * .78, y + coverH * .22, 14, { fill: '#F5B942' }) + path(`M${ix} ${y + coverH * .62}h${iw}v${coverH * .38}h-${iw}z`, { fill: '#5A6069' }) + path(`M${ix + iw * .35} ${y + coverH}L${ix + iw * .46} ${y + coverH * .62}h${iw * .08}L${ix + iw * .65} ${y + coverH}z`, { fill: '#2B2F36' }) + line(ix + iw * .5, y + coverH * .66, ix + iw * .5, y + coverH, { stroke: '#F3F1EA', sw: 2, dash: '6 6' }) + path(`M${ix + iw * .12} ${y + coverH * .62}l${iw * .04}-${coverH * .22}h${iw * .05}l${iw * .04} ${coverH * .22}z`, { fill: '#E8761E' }) + rect(ix + iw * .75, y + coverH * .4, iw * .18, coverH * .22, { fill: '#1F7A4B', rx: 3 }) + rect(ix + iw * .78, y + coverH * .3, iw * .03, coverH * .12, { fill: '#8B5E34' }));
    s += rect(ix + 6, y + coverH - 22, 112, 16, { fill: 'surface', rx: 8, op: .92 }) + spark(ix + 15, y + coverH - 14, 11) + text(ix + 24, y + coverH - 10, 'capa gerada por IA', { fam: 'mono', size: 8, weight: 700, fill: 'spark-ink', upper: true, tracking: '.04em' }); }
  else s += mosaic(ix, y, iw, coverH, p.tiles);
  s += rect(ix, y, iw, coverH, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 6 });
  if (cover !== 'vazia') s += ring(ix + iw - 24, y + coverH - 24, 15, (p.phase + 1) / 7, { label: `${p.phase + 1}/7` });
  if (status === 'aprovado' || status === 'concluido') s += stamp(ix + 8, y + coverH - 56, 'Validado', { tok: 'class-consenso', sub: '02/10/2026 · Ana Costa (chefe UTS)', angle: -8, w: 150, h: 42 });
  if (status === 'devolvido') s += stamp(ix + 8, y + coverH - 56, 'Devolvido', { tok: 'class-risco', sub: '02/10/2026 · Ana Costa (chefe UTS)', angle: -8, w: 150, h: 42 });
  const coverY = y; y += coverH + 12;
  // título
  const tl = wrap(dashed ? 'Sem título (rascunho salvo automaticamente)' : p.title, 28, 2); s += lines(ix, y + 14, tl, 19, { fam: 'serif', size: 16, weight: 600, fill: dashed ? 'muted' : 'ink' }); const titleY = y; y += 40 + 8;
  // departamento + status
  s += monogram(ix, y, 22, p.dept.mono, p.dept.tok) + text(ix + 28, y + 15.5, p.dept.acr, { fam: 'sans', size: 11, weight: 600 });
  const stg = statusTag(ix + iw - 110, y + 1, status); s += stg.svg; const deptY = y; y += 24 + 8;
  // barra de 7 fases
  s += phaseBar(ix, y, iw, dashed ? 0 : p.phase, { done: !dashed }); const phaseY = y; y += 28 + 8;
  // marco + n tarefas · n pessoas
  s += iconAt('marco', ix, y, 13, v('muted')) + text(ix + 17, y + 10.5, dashed ? 'sem marco' : p.milestone, { fam: 'mono', size: 9.5, weight: 600, fill: 'ink' });
  s += text(ix + iw, y + 10.5, `${dashed ? 0 : p.tasks} tarefas · ${dashed ? 1 : p.people} pessoas`, { fam: 'sans', size: 10, fill: 'muted', anchor: 'end' }); const milY = y; y += 16;
  if (status === 'em-decisao') { s += node(ix + 6, y + 9, 'divergencia', 4.5) + `<circle cx="${ix + 6}" cy="${y + 9}" r="6" style="fill:none;stroke:${v('class-divergencia')};stroke-width:1"><animate attributeName="r" values="5;10" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` + text(ix + 17, y + 12.5, 'sessão DECIA ativa · divergência aberta há 3 h', { fam: 'sans', size: 9.5, fill: 'class-divergencia-ink' }); }
  if (status === 'devolvido') s += iconAt('devolver-decisao', ix, y + 1, 12, v('class-risco-ink')) + text(ix + 16, y + 12.5, 'motivo: falta o parecer jurídico do convênio', { fam: 'sans', size: 9.5, fill: 'class-risco-ink', italic: true });
  y += extra + 8;
  // último evento DECIA + contadores
  s += iconAt('abrir-decia', ix, y + 3, 13, v(dashed ? 'faint' : 'class-consenso'));
  s += text(ix + 17, y + 13.5, dashed ? 'nenhum evento DECIA' : p.lastEvent, { fam: 'sans', size: 10, fill: dashed ? 'faint' : 'class-consenso-ink' });
  const cnt = counters(0, 0, p.counters, { size: 12, gap: 8 }); if (!dashed) s += g({ transform: `translate(${ix + iw - cnt.w} ${y + 4})` }, cnt.svg); const evY = y;
  if (p.seal) s += seal(W - 8, 8, 16, { kind: 'gold', ribbon: p.seal === 'excelencia', letter: 'S' }) + (p.seal2 ? seal(W - 8, 46, 13, { kind: 'navy', letter: p.dept.mono[0] }) : '');
  if (p.ai) s += spark(ix + iw - 10, coverY + 10, 14, { glow: true });
  let svg = s; if (faded) svg = `<defs><filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>` + g({ style: `opacity:.62;filter:url(#${cOut}f)` }, s);
  const callouts = [{ n: 1, x: 2, y: 2 }, { n: 3, x: 2, y: H - 2 }, { n: 4, x: ix + 10, y: coverY + 10 }, { n: 5, x: ix + iw - 24, y: coverY + coverH - 24 - 24 }, { n: 'a', x: ix - 4, y: titleY + 10 }, { n: 'b', x: ix + 11, y: deptY + 26 }, { n: 'c', x: ix + iw - 110 + stg.w / 2, y: deptY + 24 }, { n: 'd', x: ix + iw / 2, y: phaseY - 2 }, { n: 'e', x: ix - 4, y: milY + 7 }, { n: 'f', x: ix + iw - 14, y: milY + 7 }, { n: 'g', x: ix - 4, y: evY + 8 }, { n: 'h', x: ix + iw - cnt.w / 2, y: evY + 22 }];
  if (p.seal) callouts.push({ n: 'i', x: W - 8, y: 30 }); if (p.ai) callouts.push({ n: 'j', x: ix + iw - 10, y: coverY + 30 });
  if (['aprovado', 'devolvido', 'concluido'].includes(status)) callouts.push({ n: 'k', x: ix + 86, y: coverY + coverH - 10 });
  if (status === 'em-decisao' || status === 'devolvido') callouts.push({ n: 'l', x: ix + iw / 2, y: milY + 27 });
  const legend = [
    [1, 'Superfície externa', `article.card-projeto: borda 2,5 px na cor do departamento (RF38.CA03/CA09), raio 12, overflow:hidden. ${dashed ? 'Rascunho: borda tracejada e borda neutra.' : ''}`],
    [3, 'Container', 'no card de projeto a arte é a própria capa; não há faixas: padding 12 px direto na superfície.'],
    [4, cover === 'ia' ? 'Capa gerada por IA' : cover === 'vazia' ? 'Pasta em branco' : 'Capa-mosaico 2×3', cover === 'ia' ? 'coverMode=IA: ilustração flat a partir do objetivo ("pavimentação urbana"); selo "capa gerada por IA" com ✦ (RF38.CA02/CA04).' : cover === 'vazia' ? 'projeto sem tarefas: ilustração de pasta vazia + convite para a 1ª tarefa (empty state, RF38 §12).' : 'thumbnails das 6 tarefas principais (mosaicJson), 3:2, gap 2 px; atualiza quando as tarefas mudam (RF38.CA03). Tile vazio = pasta em branco.'],
    [5, 'Anel de progresso por fase', '(fase atual + 1)/7 em --primary sobre --surface-3; rótulo "3/7" em mono. Decorativo: a fase legível está na barra (d).'],
    ['a', 'Título', 'serif 16/19, 2 linhas; link para a Mesa do projeto.'],
    ['b', 'Departamento', 'monograma (quadrado 22 px na cor do departamento) + sigla (RF38.CA09).'],
    ['c', 'Etiqueta de status', `ProjectStatus "${PROJECT_STATUS[status].nome}" em texto, estilo "${PROJECT_STATUS[status].estilo}".`],
    ['d', 'Barra de 7 fases', 'DEMANDA → ENCERRAMENTO; concluídas em --primary, atual em --primary-strong com aro, futuras vazadas; nome da fase atual em texto abaixo.'],
    ['e', 'Próximo marco', 'nextMilestoneAt + título da ProjectTask marco; ⚖ quando é prazo legal.'],
    ['f', 'Tamanho', '"n tarefas · n pessoas" (ProjectTask + SessionParticipant/responsáveis distintos).'],
    ['g', 'Último evento DECIA', 'lastDeciaEventLabel/At ("decisão validada há 2 dias"), ícone da sessão e cor da classe do evento.'],
    ['h', 'Contadores sociais', 'curtir · comentar · salvar · remixar.'],
  ];
  if (p.seal) legend.push(['i', 'Lacre(s)', `chancela dourada da empresa${p.seal === 'excelencia' ? ' com fita vermelha (Excelência)' : ''}${p.seal2 ? ' + lacre azul-marinho do chefe: vários emissores no mesmo item (RF39)' : ''}; item vira MODELO OFICIAL.`]);
  if (p.ai) legend.push(['j', 'Faísca ✦', 'creationMode=COM_IA / origin=AUTOPILOTO.']);
  if (['aprovado', 'concluido'].includes(status)) legend.push(['k', 'Carimbo VALIDADO', 'FinalDecision.stampJson {VALIDADO, data, revisor}: carimbo verde rotacionado −8° sobre a capa (RF38.CA06).']);
  if (status === 'devolvido') legend.push(['k', 'Carimbo DEVOLVIDO', 'carimbo vermelho com data e revisor; motivo (DecisionReview.reason) em linha própria (l).']);
  if (status === 'em-decisao') legend.push(['l', 'Pulso da sessão', 'nó com pulso na cor da última classificação (divergência laranja) + texto do evento; respeita prefers-reduced-motion.']);
  if (status === 'devolvido') legend.push(['l', 'Motivo', 'DecisionReview.reason obrigatório quando DEVOLVIDA.']);
  if (faded) legend.push(['—', 'Arquivado', 'card inteiro com opacity .62 e saturate(.35) (tokens --opacity-arquivado/--saturate-arquivado); no alto contraste, só a etiqueta muda.']);
  return { svg, w: W, h: H, callouts, legend };
}

/* ------------------------------------------------ PROJETO · Hero da Vitrine ------------------------------------------------ */
function projetoHero(p, { W = 600 } = {}) {
  const H = 250, pad = 16, mw = 300 - pad, mh = Math.round(mw * 2 / 3); const cid = id('h');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 16)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: p.dept.tok, sw: 2.5, rx: 16, extra: 'filter:drop-shadow(0 4px 12px rgba(0,0,0,.12))' });
  s += g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, H, { fill: 'primary-soft', op: .5 }) + rect(300, 0, W - 300, H, { fill: 'surface' }));
  s += mosaic(pad, (H - mh) / 2, mw, mh, p.tiles) + rect(pad, (H - mh) / 2, mw, mh, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 8 }) + ring(pad + mw - 26, (H - mh) / 2 + mh - 26, 17, (p.phase + 1) / 7, { label: `${p.phase + 1}/7` });
  const tx = 316; s += text(tx, 32, 'VITRINE · DESTAQUE DO MÊS · OUTUBRO 2026', { fam: 'mono', size: 9, weight: 600, fill: 'muted', tracking: '.08em' });
  const tl = wrap(p.title, 28, 2); s += lines(tx, 60, tl, 26, { fam: 'serif', size: 22, weight: 600 });
  s += lines(tx, 60 + tl.length * 26 + 4, wrap(p.objective, 52, 2), 15, { fam: 'sans', size: 11.5, fill: 'muted' });
  const ry = 150; s += monogram(tx, ry, 22, p.dept.mono, p.dept.tok) + text(tx + 28, ry + 15.5, `${p.dept.acr} · ${p.tasks} tarefas · ${p.people} pessoas`, { fam: 'sans', size: 11, weight: 600 });
  s += phaseBar(tx, ry + 36, 200, p.phase, { h: 6 });
  s += rect(tx, H - 50, 118, 32, { fill: 'primary', rx: 16 }) + text(tx + 59, H - 29.5, 'Ver projeto', { fam: 'sans', size: 12, weight: 600, fill: 'on-primary', anchor: 'middle' });
  const cnt = counters(0, 0, p.counters, { size: 13, gap: 10 }); s += g({ transform: `translate(${W - pad - cnt.w} ${H - 44})` }, cnt.svg);
  s += seal(W - 30, 30, 20, { kind: 'gold', ribbon: true, letter: 'S' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 2, x: 150, y: H - 2 }, { n: 3, x: 300, y: 2 }, { n: 4, x: pad + 12, y: (H - mh) / 2 + 12 }, { n: 5, x: pad + mw - 26, y: (H - mh) / 2 + mh - 54 }, { n: 'a', x: tx - 6, y: 52 }, { n: 'b', x: tx - 6, y: ry + 11 }, { n: 'd', x: tx + 100, y: ry + 30 }, { n: 'e', x: tx - 6, y: H - 34 }, { n: 'h', x: W - pad - cnt.w / 2, y: H - 20 }, { n: 'i', x: W - 30, y: 58 }],
    legend: [
      [1, 'Superfície externa', 'hero horizontal 600 × 250 (celular: empilha capa sobre texto), raio 16, borda do departamento, --shadow-2.'],
      [2, 'Área artística', 'lado da capa recebe tinta --primary-soft a 50 % (a "aura" da Vitrine); no alto contraste some.'],
      [3, 'Container', 'coluna de texto à direita (metade), padding 16.'],
      [4, 'Capa-mosaico', 'mesma capa 2×3, 284 px de largura, raio 8.'],
      [5, 'Anel', '34 px (--card-ring-size), rótulo da fase.'],
      ['a', 'Kicker + título + objetivo', 'kicker mono ("VITRINE · DESTAQUE DO MÊS"), título serif h2 (22/26), objective em 2 linhas.'],
      ['b', 'Departamento e tamanho', 'monograma + sigla · n tarefas · n pessoas.'],
      ['d', 'Barra de fases', 'largura 200, com rótulo.'],
      ['e', 'Ação', 'um botão primário ("Ver projeto"); o resto é link.'],
      ['h', 'Contadores', 'à direita, alinhados ao botão.'],
      ['i', 'Chancela de Excelência', 'lacre dourado 40 px com fita vermelha (Highlight + SealBond PREMIACAO).'],
    ] };
}

/* ------------------------------------------------ PROJETO · Linha do Mural ------------------------------------------------ */
function projetoMural(p, { W = 600 } = {}) {
  const H = 92; let s = rect(0, 0, W, H, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 12 });
  s += avatar(28, 30, 14, 'AC') + text(50, 26, 'Ana Costa', { fam: 'sans', size: 11.5, weight: 700 }) + text(50 + tw('Ana Costa', 11.5) + 6, 26, `validou a decisão do projeto`, { fam: 'sans', size: 11.5, fill: 'muted' }) + text(50, 42, `${p.title} · há 2 dias · ${p.dept.acr}`, { fam: 'sans', size: 10.5, fill: 'muted' });
  s += node(14, 60, 'consenso', 5) + line(14, 65, 14, 84, { stroke: 'class-consenso', sw: 2 }) + text(26, 66, 'decisão validada', { fam: 'mono', size: 9, weight: 600, fill: 'class-consenso-ink', upper: true, tracking: '.06em' });
  s += stamp(26, 70, 'Validado', { tok: 'class-consenso', angle: -4, w: 70, h: 18 });
  const mx = W - 16 - 96; s += mosaic(mx, 14, 96, 64, p.tiles) + rect(mx, 14, 96, 64, { fill: 'none', stroke: p.dept.tok, sw: 1.5, rx: 4 });
  s += phaseBar(mx - 160, 70, 140, p.phase, { h: 5, label: false }) + text(mx - 160, 60, `${['DEMANDA', 'PLANEJAMENTO', 'ELABORAÇÃO'][p.phase] ?? ''} · ${p.phase + 1}/7`, { fam: 'mono', size: 8.5, weight: 600, fill: 'primary-ink', tracking: '.06em' });
  const rx = 150; s += iconAt('curtir', rx, 62, 14, v('muted')) + text(rx + 17, 73, '24', { fam: 'sans', size: 10.5, weight: 600, fill: 'muted' }) + iconAt('conforme', rx + 40, 62, 14, v('muted')) + text(rx + 57, 73, '7', { fam: 'sans', size: 10.5, weight: 600, fill: 'muted' }) + iconAt('comentar', rx + 76, 62, 14, v('muted')) + text(rx + 93, 73, '9', { fam: 'sans', size: 10.5, weight: 600, fill: 'muted' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 3, x: W / 2, y: H - 2 }, { n: 4, x: mx + 48, y: 46 }, { n: 'a', x: 28, y: 50 }, { n: 'g', x: 14, y: 88 }, { n: 'k', x: 100, y: 80 }, { n: 'd', x: mx - 90, y: 84 }, { n: 'h', x: rx + 50, y: 84 }],
    legend: [
      [1, 'Linha do Mural', 'MuralEntry (kind DECISAO_VALIDADA): 92 px, raio 12, fundo --surface.'],
      [3, 'Container', 'texto à esquerda, mídia à direita; no celular a mídia vai para baixo do texto.'],
      [4, 'Mini-mosaico', '96 × 64, borda 1,5 px na cor do departamento.'],
      ['a', 'Ator + verbo + objeto', 'avatar 28 + "Ana Costa validou a decisão do projeto …" + tempo relativo + departamento.'],
      ['g', 'Nó do fio', 'ponto na cor da classe do evento (consenso verde) com o nome do evento em texto; o fio continua no detalhe.'],
      ['k', 'Carimbo em miniatura', 'VALIDADO 18 px de altura (−4°); DEVOLVIDO em vermelho.'],
      ['d', 'Barra de fases mini', '5 px sem rótulo abaixo da barra; nome da fase acima.'],
      ['h', 'Reações', 'curtir · conforme · comentar (ReactionType) com contagem.'],
    ] };
}

/* ------------------------------------------------ PROJETO · Post-it da Mesa ------------------------------------------------ */
function projetoPostit(p, { W = 260 } = {}) {
  const H = 250; const cid = id('pi');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 8)}</defs>` + g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, H, { fill: 'skin-cortica' }));
  // textura cortiça (pontos)
  for (let i = 0; i < 90; i++) { const px = (i * 37) % W, py = (i * 53) % H; s += circle(px, py, 1.1, { fill: '#000000', op: .14 }); }
  s += rect(0, 0, W, H, { fill: 'none', stroke: 'line-soft', sw: 1, rx: 8 });
  // post-it
  const px = 42, py = 40, pw = 176, ph = 160;
  s += g({ transform: `rotate(-2.5 ${px + pw / 2} ${py + ph / 2})` },
    path(`M${px} ${py}h${pw}v${ph - 14}l-${pw * .18} ${14}H${px}z`, { fill: '#000000', op: .18, extra: 'filter:blur(3px);transform:translate(3px,6px)' }) +
    path(`M${px} ${py}h${pw}v${ph - 14}l-${pw * .18} ${14}H${px}z`, { fill: '#FFE27A' }) + path(`M${px + pw - pw * .18} ${py + ph}l${pw * .18}-14h-${pw * .18}z`, { fill: '#E8C84A' }) +
    text(px + 14, py + 30, 'PR-445 · lote 2', { fam: 'mono', size: 9, weight: 700, fill: '#5A4A00', tracking: '.06em' }) +
    lines(px + 14, py + 54, wrap(p.title, 20, 3), 20, { fam: 'serif', size: 15, weight: 600, fill: '#2B2300', italic: true }) +
    text(px + 14, py + 128, 'ELABORAÇÃO · 3/7 · 7 tarefas', { fam: 'mono', size: 8.5, weight: 700, fill: '#5A4A00', tracking: '.05em' }) +
    g({ transform: `translate(${px + 14} ${py + 136})` }, phaseBar(0, 0, 120, p.phase, { h: 4, label: false })) +
    rect(px + pw - 36, py + 10, 24, 24, { fill: 'none' }) + monogram(px + pw - 36, py + 10, 22, p.dept.mono, p.dept.tok));
  // pino
  s += circle(px + pw / 2 - 2, py + 4, 7, { fill: 'class-risco', extra: 'filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))' }) + circle(px + pw / 2 - 4, py + 2, 2.5, { fill: '#FFFFFF', op: .55 });
  // linha de dependência saindo para outro post-it (parcial)
  s += path(`M${px + pw} ${py + 90}c30 0 30 50 50 50`, { fill: 'none', stroke: 'ink', sw: 1.5, dash: '4 3', op: .6 }) + rect(W - 34, py + 110, 60, 60, { fill: '#B6E0FF', op: .95 });
  return { svg: s, w: W, h: H, callouts: [{ n: 2, x: 14, y: 14 }, { n: 3, x: px + 4, y: py + ph - 4 }, { n: 'a', x: px + pw / 2 - 2, y: py + 22 }, { n: 'b', x: px + 10, y: py + 60 }, { n: 'd', x: px + 70, y: py + 150 }, { n: 'e', x: px + pw + 26, y: py + 112 }, { n: 'f', x: px + pw - 25, y: py + 44 }],
    legend: [
      [2, 'Fundo da Mesa (BackgroundArt)', 'skin "cortiça" (--skin-cortica; também papel e blueprint), salva em UserPreferences.deskSkin / ProjectScheme.deskSkin (RF22, RF38.CA08).'],
      [3, 'Post-it (container)', 'ProjectTask na Mesa: 176 × 160, cor stickyColor, canto dobrado, sombra --shadow-2, rotação canvasRotation (−2,5°). Arrastável (canvasX/Y), encaixe animado na fase (RF38.CA10).'],
      ['a', 'Pino', 'ponto vermelho = fixado na fase; cinza = solto.'],
      ['b', 'Texto', 'código do processo em mono; título serif itálico (até 3 linhas) em tinta escura fixa — o post-it não muda com o tema (é objeto, não superfície).'],
      ['d', 'Fase', 'nome da fase + barra de 4 px.'],
      ['e', 'Dependência', 'linha tracejada FS/SS/FF/SF entre post-its (ProjectTaskDependency); lag em rótulo ao meio.'],
      ['f', 'Monograma do departamento', 'identifica o dono da tarefa dentro de um projeto com várias unidades.'],
    ] };
}

/* ------------------------------------------------ catálogo de variações ------------------------------------------------ */
const T = (over) => ({ ...TAREFA, ...over });
const P = (over) => ({ ...PROJETO, ...over });
export const VARIACOES = [
  // ----- tarefa: layouts -----
  { id: 'tarefa-compacto', kind: 'tarefa', grupo: 'Layouts', nome: 'Compacto', uso: 'grade do Acervo, Balcão, resultados de busca', kicker: 'TAREFA · COMPACTO · FAMÍLIA PROTOCOLO', fn: () => tarefaCompacto(TAREFA, { family: 'protocolo' }) },
  { id: 'tarefa-lista', kind: 'tarefa', grupo: 'Layouts', nome: 'Lista', uso: 'listas densas, Meu trabalho, fila de revisão', kicker: 'TAREFA · LISTA (LINHA)', fn: () => tarefaLista(TAREFA) },
  { id: 'tarefa-ampliado', kind: 'tarefa', grupo: 'Layouts', nome: 'Ampliado', uso: 'detalhe em modal ou página /tarefas/[id]', kicker: 'TAREFA · AMPLIADO (DETALHE)', fn: () => tarefaAmpliado(TAREFA) },
  { id: 'tarefa-anexo', kind: 'tarefa', grupo: 'Layouts', nome: 'Anexo de mensagem', uso: 'inline no chat do DECIA (MessageAttachment)', kicker: 'TAREFA · ANEXO DE MENSAGEM (DECIA)', fn: () => tarefaAnexo(TAREFA) },
  { id: 'tarefa-mini', kind: 'tarefa', grupo: 'Layouts', nome: 'Mini', uso: 'SelectList, slot da PhaseBar, ficha na Mesa', kicker: 'TAREFA · MINI (SELECTLIST / SLOT)', fn: () => tarefaMini(TAREFA), layout: 'lado' },
  // ----- tarefa: famílias de arte -----
  { id: 'tarefa-familia-carimbo', kind: 'tarefa', grupo: 'Famílias de arte', nome: 'Carimbo', uso: 'atas, registros, decisões (ATA_REGISTRO)', kicker: 'TAREFA · FAMÍLIA CARIMBO', fn: () => tarefaCompacto(T({ title: 'Ata da 12ª reunião do Conselho de Obras — PR-445', type: 'ATA_REGISTRO', ext: null, category: 'Ata', seal: 'navy', ai: false, due: '05 OUT', dueKind: 'soon' }), { family: 'carimbo' }) },
  { id: 'tarefa-familia-pasta', kind: 'tarefa', grupo: 'Famílias de arte', nome: 'Pasta suspensa', uso: 'pastas .zip, dossiês, kits (PASTA)', kicker: 'TAREFA · FAMÍLIA PASTA SUSPENSA', fn: () => tarefaCompacto(T({ title: 'Dossiê de licenças ambientais — lote 2 (zip)', type: 'PASTA', ext: null, category: 'Licença / anuência', seal: null, ai: false, due: '30 NOV', dueKind: 'ok' }), { family: 'pasta' }) },
  { id: 'tarefa-familia-blueprint', kind: 'tarefa', grupo: 'Famílias de arte', nome: 'Blueprint', uso: 'desenhos técnicos, projetos básicos/executivos', kicker: 'TAREFA · FAMÍLIA BLUEPRINT', fn: () => tarefaCompacto(T({ title: 'Planta de drenagem — km 12 ao km 14 (DWG)', type: 'DESENHO_TECNICO', ext: null, category: 'Projeto básico / executivo', seal: null, ai: false, due: '20 OUT', dueKind: 'ok', legal: true }), { family: 'blueprint' }) },
  { id: 'tarefa-familia-monograma', kind: 'tarefa', grupo: 'Famílias de arte', nome: 'Monograma', uso: 'textos (TEXTO_MANUAL / TEXTO_IA), minutas, ofícios', kicker: 'TAREFA · FAMÍLIA MONOGRAMA', fn: () => tarefaCompacto(T({ title: 'Minuta de ofício ao DER-PR sobre a faixa de domínio', type: 'TEXTO_IA', ext: null, category: 'Ofício / memorando', initials: 'OF', seal: null, ai: true, due: '09 OUT', dueKind: 'ok' }), { family: 'monograma' }) },
  // ----- tarefa: estados -----
  { id: 'tarefa-estado-rascunho', kind: 'tarefa', grupo: 'Estados', nome: 'RASCUNHO', uso: 'borda tracejada, título esmaecido', kicker: 'TAREFA · ESTADO RASCUNHO', fn: () => tarefaCompacto(T({ state: 'rascunho', seal: null, ai: false, counters: { likes: 0, comments: 0, saves: 0, remixes: 0 }, due: '—' })) },
  { id: 'tarefa-estado-em-uso', kind: 'tarefa', grupo: 'Estados', nome: 'EM_USO', uso: 'pulso suave + projeto que a usa (RF41)', kicker: 'TAREFA · ESTADO EM USO', fn: () => tarefaCompacto(T({ state: 'em-uso', seal: null })) },
  { id: 'tarefa-estado-bloqueada', kind: 'tarefa', grupo: 'Estados', nome: 'BLOQUEADA', uso: 'cadeado + motivo/quem bloqueia', kicker: 'TAREFA · ESTADO BLOQUEADA', fn: () => tarefaCompacto(T({ state: 'bloqueada', seal: null, ai: false, due: '04 OUT', dueKind: 'soon' })) },
  { id: 'tarefa-estado-concluida', kind: 'tarefa', grupo: 'Estados', nome: 'CONCLUÍDA', uso: 'carimbo verde sobre a mídia', kicker: 'TAREFA · ESTADO CONCLUÍDA', fn: () => tarefaCompacto(T({ state: 'concluida', seal: 'gold' })) },
  { id: 'tarefa-estado-arquivada', kind: 'tarefa', grupo: 'Estados', nome: 'ARQUIVADA', uso: 'esmaecido (opacity + saturate)', kicker: 'TAREFA · ESTADO ARQUIVADA', fn: () => tarefaCompacto(T({ state: 'arquivada', seal: null, ai: false })) },
  { id: 'tarefa-estado-modelo-publico', kind: 'tarefa', grupo: 'Estados', nome: 'MODELO_PÚBLICO', uso: 'estrela + lacre (modelo oficial)', kicker: 'TAREFA · ESTADO MODELO PÚBLICO', fn: () => tarefaCompacto(T({ state: 'modelo-publico', seal: 'excelencia', counters: { likes: 48, comments: 12, saves: 31, remixes: 9 } })) },
  { id: 'tarefa-estado-oferecida', kind: 'tarefa', grupo: 'Estados', nome: 'OFERECIDA', uso: 'ficha DP com preço e licença (Balcão, RF40)', kicker: 'TAREFA · ESTADO OFERECIDA NO BALCÃO', fn: () => tarefaCompacto(T({ state: 'oferecida', seal: null, price: 40 })) },
  { id: 'tarefa-prazo-vencido', kind: 'tarefa', grupo: 'Estados', nome: 'Prazo legal vencido', uso: 'prazo vermelho + balança ⚖', kicker: 'TAREFA · PRAZO LEGAL VENCIDO', fn: () => tarefaCompacto(T({ due: 'vencido há 2 d', dueKind: 'over', legal: true, seal: null, ai: false })) },
  // ----- projeto: layouts -----
  { id: 'projeto-mosaico', kind: 'projeto', grupo: 'Layouts', nome: 'Mosaico 2×3 padrão', uso: 'grade de projetos, Criar projeto, Balcão', kicker: 'PROJETO · MOSAICO 2×3 PADRÃO', fn: () => projetoMosaico(PROJETO) },
  { id: 'projeto-hero-vitrine', kind: 'projeto', grupo: 'Layouts', nome: 'Hero da Vitrine', uso: 'destaque do mês, topo da Vitrine', kicker: 'PROJETO · HERO DA VITRINE', fn: () => projetoHero(PROJETO) },
  { id: 'projeto-linha-mural', kind: 'projeto', grupo: 'Layouts', nome: 'Linha do Mural', uso: 'feed social (MuralEntry)', kicker: 'PROJETO · LINHA DO MURAL', fn: () => projetoMural(PROJETO) },
  { id: 'projeto-postit-mesa', kind: 'projeto', grupo: 'Layouts', nome: 'Post-it da Mesa', uso: 'Mesa de Trabalho (RF22), skins papel/cortiça/blueprint', kicker: 'PROJETO · POST-IT DA MESA', fn: () => projetoPostit(PROJETO), layout: 'lado' },
  { id: 'projeto-capa-ia', kind: 'projeto', grupo: 'Layouts', nome: 'Capa IA', uso: 'coverMode=IA (ilustração flat do tema)', kicker: 'PROJETO · CAPA GERADA POR IA', fn: () => projetoMosaico(P({ ai: true, phase: 1 }), { cover: 'ia' }) },
  // ----- projeto: estados -----
  { id: 'projeto-estado-rascunho', kind: 'projeto', grupo: 'Estados', nome: 'RASCUNHO', uso: 'tracejado, pasta em branco', kicker: 'PROJETO · ESTADO RASCUNHO', fn: () => projetoMosaico(P({ status: 'rascunho', phase: 0, tiles: [] }), { cover: 'vazia' }) },
  { id: 'projeto-estado-em-decisao', kind: 'projeto', grupo: 'Estados', nome: 'EM_DECISAO', uso: 'sessão DECIA ativa, pulso', kicker: 'PROJETO · ESTADO EM DECISÃO', fn: () => projetoMosaico(P({ status: 'em-decisao', phase: 3, lastEvent: 'resumo analítico publicado há 1 h' })) },
  { id: 'projeto-estado-aprovado', kind: 'projeto', grupo: 'Estados', nome: 'APROVADO', uso: 'carimbo VALIDADO com data e revisor', kicker: 'PROJETO · ESTADO APROVADO (CARIMBO)', fn: () => projetoMosaico(P({ status: 'aprovado', phase: 4 })) },
  { id: 'projeto-estado-devolvido', kind: 'projeto', grupo: 'Estados', nome: 'DEVOLVIDO', uso: 'carimbo vermelho + motivo', kicker: 'PROJETO · ESTADO DEVOLVIDO', fn: () => projetoMosaico(P({ status: 'devolvido', phase: 4, lastEvent: 'decisão devolvida há 3 h' })) },
  { id: 'projeto-estado-arquivado', kind: 'projeto', grupo: 'Estados', nome: 'ARQUIVADO', uso: 'esmaecido', kicker: 'PROJETO · ESTADO ARQUIVADO', fn: () => projetoMosaico(P({ status: 'arquivado', phase: 6, lastEvent: 'encerrado em 12/2025' })) },
  { id: 'projeto-chancelado', kind: 'projeto', grupo: 'Estados', nome: 'Chancelado (lacre)', uso: 'lacre dourado + azul-marinho; modelo oficial', kicker: 'PROJETO · CHANCELADO (LACRES)', fn: () => projetoMosaico(P({ status: 'concluido', phase: 6, seal: 'gold', seal2: true, lastEvent: 'chancela "Boas práticas em ETP" emitida' })) },
];

export function render(varn, theme) {
  const card = varn.fn();
  return anatomy({ theme, kicker: varn.kicker, title: `${varn.kind === 'tarefa' ? 'Card de tarefa' : 'Card de projeto'} — ${varn.nome}`, card, layout: varn.layout, note: `Uso: ${varn.uso}. Diagrama gerado por anatomias/gerar.mjs (não é captura do produto).` });
}

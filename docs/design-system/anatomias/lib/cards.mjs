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
  const dueW = 8 + 14 + tw(d.due, 10, 'mono') + 8; const stW = stateTag(0, 0, state).w; const dueWrap = stW + 6 + dueW > (W - 2 * 12 - 2 * 10);
  // linhas extras do META: estado + variações (§2.2 do catálogo). Cada item = [ícone, texto, cor da tinta, mono?]
  const extras = [];
  if (state === 'em-uso') extras.push([null, `no projeto ${d.usedIn}`, 'class-argumento-ink']);
  if (state === 'bloqueada') extras.push(['cadeado', `aguarda ${d.blockedBy ?? 'parecer jurídico (Ana C.)'}`, 'class-divergencia-ink']);
  if (state === 'oferecida' || d.offer) extras.push(['ficha-dp', `${d.price ?? 40} DP · licença: ${d.license ?? 'atribuição'}${d.handover ? ' · repasse' : ''}`, 'type-link-ink', true]);
  if (d.remixFrom) extras.push(['remixar', `remixado de ${d.remixFrom} · ↻ ${d.reuse ?? 3} reutilizações`, 'muted']);
  if (d.imported) extras.push(['link', `${d.imported.provider} · vinculada · sincronizada há ${d.imported.ago ?? '2 h'} · v${d.imported.version ?? 3}`, 'type-email-ink', true]);
  if (d.session) extras.push(['abrir-decia', `na sessão "${d.session.tema}" · ${d.session.cls}`, `class-${d.session.tok}-ink`]);
  if (d.kit) extras.push(['acervo', `kit: ${d.kit}${d.kitOptional ? ' · opcional' : ''}`, 'muted']);
  if (d.evidence) extras.push(['imagem-editada', `${d.evidence.n} evidências · ${d.evidence.date} · ${d.evidence.place}`, 'muted']);
  if (d.duplicateOf) extras.push(['documento', `cópia de "${d.duplicateOf}"`, 'muted']);
  if (d.version && !d.imported) extras.push(['documento', `v${d.version} · ${d.versionNote ?? 'restaurada da v2'}`, 'muted', true]);
  if (d.assigned) extras.push(['pessoas', `atribuída por ${d.assigned.from} → ${d.owner.name} · até ${d.assigned.due} · ${d.assigned.status ?? 'proposta'}`, 'primary-ink']);
  const extraLine = extras.length * 16 + (dueWrap ? 22 : 0);
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
  // slots fixos do cabeçalho, da direita para a esquerda: faísca · favorito · provedor; deslocados 22 px quando há lacre na superfície (D-50)
  const slot = (n) => ix + iw - 8 - (d.seal ? 22 : 0) - n * 22;
  if (d.ai) s += spark(slot(0), y + 12, 14, { glow: true });
  y += 24 + 6;
  // 4 mídia
  s += thumbArt(ix, y, iw, mediaH, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), initials: d.initials, cid: id('m') });
  s += rect(ix, y, iw, mediaH, { fill: 'none', stroke: 'line-soft', sw: .8 });
  if (state === 'concluida') s += stamp(ix + iw - 86, y + mediaH - 32, 'Concluída', { tok: 'class-consenso', angle: -10, w: 80, h: 24 });
  const mediaY = y; y += mediaH + 8;
  // título
  const tl = wrap(d.title, 27, 2); s += lines(ix, y + 12, tl, 17, { fam: 'serif', size: 14, weight: 600, fill: state === 'rascunho' ? 'muted' : 'ink' }); y += 34 + 8;
  // etiqueta de estado + prazo
  const t1 = stateTag(ix, y, state); s += t1.svg; const d1 = due(dueWrap ? ix : ix + t1.w + 6, dueWrap ? y + 22 : y, d.due, { kind: d.dueKind, legal: d.legal }); s += d1.svg; const metaY = y; y += 20 + (dueWrap ? 22 : 0);
  const extrasY = y;
  extras.forEach(([ic, txt, fill, mono], i) => { const ey = y + i * 16; if (ic) s += iconAt(ic, ix, ey + 1, 12, v(ic === 'ficha-dp' ? 'spark' : fill)); s += text(ic ? ix + 15 : ix, ey + 11, wrap(txt, mono ? 30 : 36, 1)[0], mono ? { fam: 'mono', size: 9, weight: 600, fill } : { fam: 'sans', size: 9.5, fill, italic: true }); });
  y += extraLine + 10;
  // rodapé: responsável + contadores
  s += avatar(ix + 10, y + 10, 10, d.owner.ini) + text(ix + 25, y + 13.5, d.owner.name, { fam: 'sans', size: 10, fill: 'muted' });
  const cnt = counters(0, 0, d.counters, { size: 12, gap: 8 }); s += g({ transform: `translate(${ix + iw - cnt.w} ${y + 4})` }, cnt.svg);
  // variações sobrepostas: avatar do atribuidor encadeado ao do responsável; carimbo de decisão sobre a mídia; favorito
  if (d.assigned) s += avatar(ix + 2, y + 10, 8, d.assigned.ini ?? 'AC', { fill: 'class-argumento-soft', ink: 'class-argumento-ink' });
  if (d.stampDecision) s += stamp(ix + 4, mediaY + mediaH - 46, d.stampDecision.label, { tok: d.stampDecision.tok, sub: d.stampDecision.sub, angle: -8, w: iw - 8, h: 40 });
  const favX = slot(d.ai ? 1 : 0), provX = slot((d.ai ? 1 : 0) + (d.favorite ? 1 : 0));
  if (d.favorite) s += g({ role: 'img', 'aria-label': 'favorita (SavedItem.favorite)' }, circle(favX, top + pad + 12, 9, { fill: 'surface', stroke: 'line-soft', sw: .8 }) + iconAt('estrela', favX - 7, top + pad + 5, 14, v('spark')));
  if (d.provider) s += rect(provX - 9, top + pad + 3, 18, 18, { fill: 'type-email-soft', rx: 4 }) + iconAt(d.provider === 'drive' ? 'pasta' : d.provider === 'outlook' ? 'email' : 'link', provX - 7, top + pad + 5, 14, v('type-email'));
  // lacre (zona do selo: canto superior direito)
  if (d.seal) s += seal(W - x - 6, top + 6, 15, { kind: d.seal === 'navy' ? 'navy' : 'gold', ribbon: d.seal === 'excelencia', broken: d.seal === 'broken', letter: d.dept.mono[0] });
  if (d.seal2) s += seal(W - x - 6, top + 40, 12, { kind: 'navy', letter: d.dept.mono[0] });
  let svg = s;
  if (state === 'arquivada') svg = `<defs><filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>` + g({ style: `opacity:.62;filter:url(#${cOut}f)` }, s);
  const callouts = [{ n: 1, x: 2, y: 2 }, { n: 2, x: W / 2, y: H - 2 }, { n: 3, x: x + cw - 2, y: top + ch - 2 }, { n: 4, x: ix + iw / 2, y: mediaY + mediaH / 2 },
    { n: 'a', x: ix + 2, y: top + pad + 2 }, { n: 'b', x: ix + 34 + tw(d.category, 9, 'mono') + 10, y: top + pad + 7 }, { n: 'c', x: x - 1, y: mediaY + mediaH + 20 }, { n: 'd', x: x - 1, y: metaY + 10 }, { n: 'e', x: dueWrap ? ix + d1.w + 10 : ix + t1.w + 10 + d1.w + 4, y: dueWrap ? metaY + 32 : metaY + 10 },
    { n: 'f', x: x - 1, y: y + 10 }, { n: 'g', x: ix + iw - cnt.w / 2, y: y + 22 }];
  if (d.ai) callouts.push({ n: 'h', x: slot(0) - 18, y: top + pad + 12 });
  if (d.seal) callouts.push({ n: 'i', x: W - x - 6, y: top + 32 });
  if (extras.length) callouts.push({ n: 'v', x: ix + iw - 6, y: extrasY + 8 });
  if (d.favorite) callouts.push({ n: 'j', x: favX, y: top + pad - 6 });
  if (d.stampDecision) callouts.push({ n: 'k', x: ix + iw - 14, y: mediaY + mediaH - 26 });
  if (d.assigned) callouts.push({ n: 'l', x: ix - 6, y: y + 24 });
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
  if (d.seal) legend.push(['i', 'Lacre de chancela', `SealBond APROVADA: lacre ${d.seal === 'navy' ? 'azul-marinho (chefe)' : d.seal === 'excelencia' ? 'dourado com fita vermelha (Excelência)' : 'dourado (empresa)'} na zona do selo, com aria-label.${d.seal2 ? ' Segundo lacre azul-marinho: outro emissor no mesmo item (RF39.CA08).' : ''}`]);
  if (d.favorite) legend.push(['j', 'Favorita ⭐', 'SavedItem.favorite do viewer (RF26.CA04): marcador no cabeçalho, botão salvar com aria-pressed; sub-filtro Favoritas (RF41).']);
  if (d.stampDecision) legend.push(['k', `Carimbo ${d.stampDecision.label}`, 'decisão da sessão DECIA que referencia a tarefa (RF29.CA05, RF38.CA06): carimbo sobre a mídia com data e revisor.']);
  if (d.assigned) legend.push(['l', 'Atribuída', `Assignment ${d.assigned.status ?? 'PROPOSTA'}: avatar do atribuidor encadeado ao do responsável; aceitar / recusar / devolver com motivo (RF10, RF46; TAXONOMIA §12b).`]);
  if (extras.length) legend.push(['v', 'Linhas de variação', d.variantNote ?? 'uma linha por variação ativa (§2.2 do catálogo): remix, importada, sessão, kit, evidência, oferta, versão, cópia.']);
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
  const headY = y; y += 30 + 6;
  if (d.ai) { parts.push(spark(ix + 8, y + 7, 14, { glow: true }) + text(ix + 20, y + 11, 'gerado por IA em 01/10/2026 · revisado por Maria H. (RF38.CA04)', { fam: 'sans', size: 10, fill: 'spark-ink' })); y += 18; }
  y += 4;
  parts.push(thumbArt(ix, y, iw, mediaH, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), cid: id('m') }) + rect(ix, y, iw, mediaH, { fill: 'none', stroke: 'line-soft', sw: .8 })); const mediaY = y; y += mediaH + 14;
  const tl = wrap(d.title, 34, 2); parts.push(lines(ix, y + 16, tl, 24, { fam: 'serif', size: 20, weight: 600 })); const titleY = y; y += tl.length * 24 + 6;
  parts.push(rect(ix, y, 24, 24, { fill: `${TASK_TYPE_TOKEN(d.type)}-soft`, rx: 6 }) + iconAt(typeIcon(d), ix + 3, y + 3, 18, v(typeTok(d))) + text(ix + 30, y + 16, `${d.category} · ${d.type.replace('_', ' ')} · ${d.ext?.toUpperCase() ?? ''}`, { fam: 'mono', size: 10, weight: 600, fill: 'muted', upper: true, tracking: '.06em' }));
  const t1 = stateTag(ix + iw - 118, y + 2, d.state ?? 'disponivel'); parts.push(t1.svg); y += 32;
  const sl = wrap(d.summary, 56, 3); parts.push(lines(ix, y + 11, sl, 15, { fam: 'sans', size: 12, fill: 'ink' })); const sumY = y; y += sl.length * 15 + 10;
  // grade de metadados
  const meta = [['Prazo', d.due + ' · 2026', 'relogio'], ['Prazo legal', '20 OUT (Lei 14.133, art. 18)', 'balanca'], ['Acesso', d.access, 'cadeado'], ['Situação do documento', d.docSit, 'formulario'], ['Esforço', d.effort, 'cronograma'], ['Origem', 'Interna · vinculado (Drive)', 'link']];
  const colW = iw / 2; const metaY = y;
  meta.forEach(([k, val, ic], i) => { const cx = ix + (i % 2) * colW, cy = y + Math.floor(i / 2) * 34; parts.push(iconAt(ic, cx, cy + 2, 14, v('muted')) + text(cx + 20, cy + 9, k, { fam: 'mono', size: 8.5, weight: 600, fill: 'muted', upper: true, tracking: '.07em' }) + text(cx + 20, cy + 23, val, { fam: 'sans', size: 11.5, weight: 500 })); });
  y += 3 * 34 + 4;
  // ação principal + alternativa
  parts.push(rect(ix, y, 196, 36, { fill: 'primary', rx: 18 }) + iconAt('criar-projeto', ix + 14, y + 9, 18, v('on-primary')) + text(ix + 40, y + 22.5, 'Adicionar ao projeto', { fam: 'sans', size: 12.5, weight: 600, fill: 'on-primary' }));
  parts.push(text(ix + 208, y + 22, 'ou anexar numa sessão DECIA', { fam: 'sans', size: 11.5, weight: 600, fill: 'primary-ink', extra: 'text-decoration:underline' })); const actY = y; y += 36 + 14;
  // linha de interações
  parts.push(line(ix, y - 7, ix + iw, y - 7, { stroke: 'line-soft', sw: 1 }));
  const inter = [['curtir', 12], ['comentar', 3], ['compartilhar', 1], ['remixar', 1], null, ['util', 4], ['bem-fundamentado', 2], ['conforme', 1]]; let cx = ix;
  for (const it of inter) { if (!it) { parts.push(line(cx + 2, y + 2, cx + 2, y + 18, { stroke: 'line-soft', sw: 1 })); cx += 12; continue; } parts.push(iconAt(it[0], cx, y, 20, v(it[0] === 'curtir' ? 'class-risco' : 'ink')) + text(cx + 23, y + 14, String(it[1]), { fam: 'sans', size: 12, weight: 600 })); cx += 23 + tw(String(it[1]), 12) + 14; }
  parts.push(iconAt('salvar', ix + iw - 20, y, 20, v('ink'))); const intY = y; y += 20 + pad;
  const ch = y - top; const H = top + ch + bottom;
  let s = `<defs>${clipRect(cOut, 0, 0, W, H, 14)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: d.dept.tok, sw: 2, rx: 14 }) + familyArt('protocolo', W, H, { x, top, bottom, d, cid: cOut }) + rect(x, top, cw, ch, { fill: 'surface', rx: 10, extra: 'filter:drop-shadow(0 2px 6px rgba(0,0,0,.12))' }) + parts.join('');
  if (d.seal) s += seal(W - x - 2, top + 4, 18, { kind: 'gold', letter: 'S' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 2, x: W / 2, y: H - 2 }, { n: 3, x: x + cw - 2, y: top + ch - 2 }, { n: 4, x: ix + iw / 2, y: mediaY + mediaH / 2 }, { n: 'a', x: ix, y: headY }, { n: 'b', x: x - 1, y: titleY + 10 }, { n: 'c', x: x - 1, y: sumY + 8 }, { n: 'd', x: x - 1, y: metaY + 12 }, { n: 'e', x: x - 1, y: actY + 18 }, { n: 'f', x: x - 1, y: intY + 10 }, { n: 'g', x: ix + iw - 118 + t1.w / 2, y: titleY + tl.length * 24 + 30 }, ...(d.ai ? [{ n: 'h', x: ix + iw - 12, y: headY + 44 }] : []), ...(d.seal ? [{ n: 'i', x: W - x - 2, y: top + 26 }] : [])],
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
  s += rect(100, cy + 42, 160, 14, { fill: 'spark-soft', rx: 7 }) + iconAt('ficha-dp', 104, cy + 43, 12, v('spark')) + text(119, cy + 52.5, 'usado na decisão · +6 DP', { fam: 'mono', size: 8, weight: 700, fill: 'spark-ink', upper: true, tracking: '.04em' });
  s += iconAt('chevron', W - 36, cy + 22, 16, v('muted'));
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 3, x: W - 16, y: cy + chH }, { n: 4, x: 59, y: cy + 30 }, { n: 'a', x: 4, y: H / 2 }, { n: 'b', x: W - 118 + t.w / 2, y: 34 }, { n: 'c', x: 100, y: cy + 9 }, { n: 'd', x: 268, y: cy + 49 }],
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
  // linhas extras: status + variações (§4.2 do catálogo) — [ícone, texto, cor, mono?]
  const extras = [];
  if (p.offer) extras.push(['ficha-dp', `${p.offer.price} DP · ${p.offer.license} · prateleira ${p.offer.shelf}`, 'type-link-ink', true]);
  if (p.remixFrom) extras.push(['remixar', `remix de "${p.remixFrom}" · remixado por ${p.remixedBy ?? 4} pessoas`, 'muted']);
  if (p.assigned) extras.push(['pessoas', `atribuído por ${p.assigned.from} → ${p.assigned.to} · até ${p.assigned.due} · ${p.assigned.status ?? 'proposta'}`, 'primary-ink']);
  if (p.conformity) extras.push([p.conformity.blocking ? 'alerta' : 'check', `conformidade ${p.conformity.pct} %${p.conformity.blocking ? ` · ${p.conformity.blocking} obrigatório ausente` : ' · sem pendência'}`, p.conformity.pct >= 90 ? 'class-consenso-ink' : p.conformity.pct >= 60 ? 'due-soon-ink' : 'class-risco-ink', true]);
  if (p.scenario) extras.push(['faisca', `cenário "${p.scenario}" aplicado · v${p.version ?? 7}`, 'spark-ink']);
  if (p.axis) extras.push(['marco', `eixo do plano: ${p.axis}`, 'primary-ink']);
  if (p.grouping) extras.push(['gestao', `${p.grouping}`, 'muted']);
  if (p.visibilityLabel) extras.push(['cadeado', `visibilidade: ${p.visibilityLabel}${p.visibilityLabel === 'PRIVADA' ? ' · só o dono' : p.visibilityLabel === 'DEPARTAMENTO' ? ' · equipe do departamento' : ''}`, 'muted']);
  if (p.version && !p.scenario) extras.push(['documento', `v${p.version} · ${p.versionNote ?? 'restaurada da v5 por Ana C.'}`, 'muted', true]);
  if (p.originLabel) extras.push(['faisca', p.originLabel, 'spark-ink']);
  const extra = (['em-decisao', 'devolvido'].includes(status) ? 18 : 0) + extras.length * 16 + (p.highlight ? 0 : 0);
  const H = pad + coverH + 12 + 40 + 8 + 24 + 8 + 28 + 8 + 16 + 14 + extra + 8 + 16 + 22 + pad;
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
  if (status === 'aprovado' || status === 'concluido') s += stamp(ix + 4, y + coverH - 56, 'Validado', { tok: 'class-consenso', sub: '02/10/2026 · Ana Costa (chefe UTS)', angle: -8, w: 176, h: 42 });
  if (status === 'devolvido') s += stamp(ix + 4, y + coverH - 56, 'Devolvido', { tok: 'class-risco', sub: '02/10/2026 · Ana Costa (chefe UTS)', angle: -8, w: 176, h: 42 });
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
  const milY = y; y += 16; s += iconAt('pessoas', ix, y, 13, v('muted')) + text(ix + 17, y + 10.5, `${dashed ? 0 : p.tasks} tarefas · ${dashed ? 1 : p.people} pessoas`, { fam: 'sans', size: 10, fill: 'muted' }); y += 14;
  if (status === 'em-decisao') { s += node(ix + 6, y + 9, 'divergencia', 4.5) + `<circle cx="${ix + 6}" cy="${y + 9}" r="6" style="fill:none;stroke:${v('class-divergencia')};stroke-width:1"><animate attributeName="r" values="5;10" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` + text(ix + 17, y + 12.5, 'sessão DECIA ativa · divergência aberta há 3 h', { fam: 'sans', size: 9.5, fill: 'class-divergencia-ink' }); }
  if (status === 'devolvido') s += iconAt('devolver-decisao', ix, y + 1, 12, v('class-risco-ink')) + text(ix + 16, y + 12.5, 'motivo: falta o parecer jurídico do convênio', { fam: 'sans', size: 9.5, fill: 'class-risco-ink', italic: true });
  const exY = y + (['em-decisao', 'devolvido'].includes(status) ? 18 : 0);
  extras.forEach(([ic, txt, fill, mono], i) => { const ey = exY + i * 16; s += iconAt(ic, ix, ey + 1, 12, v(ic === 'ficha-dp' || ic === 'faisca' ? 'spark' : fill)) + text(ix + 16, ey + 11.5, wrap(txt, mono ? 34 : 40, 1)[0], mono ? { fam: 'mono', size: 9, weight: 600, fill } : { fam: 'sans', size: 9.5, fill, italic: true }); });
  y += extra + 8;
  // último evento DECIA + contadores
  s += iconAt('abrir-decia', ix, y + 3, 13, v(dashed ? 'faint' : 'class-consenso'));
  s += text(ix + 17, y + 13.5, dashed ? 'nenhum evento DECIA' : p.lastEvent, { fam: 'sans', size: 10, fill: dashed ? 'faint' : 'class-consenso-ink' });
  const cnt = counters(0, 0, p.counters, { size: 12, gap: 8 }); const evY = y; y += 18; if (!dashed) s += g({ transform: `translate(${ix} ${y + 2})` }, cnt.svg);
  if (p.seal) s += seal(W - 8, 8, 16, { kind: 'gold', ribbon: p.seal === 'excelencia', letter: 'S' }) + (p.seal2 ? seal(W - 8, 46, 13, { kind: 'navy', letter: p.dept.mono[0] }) : '');
  // variações sobrepostas à capa: faixa de destaque (antes da faísca: a faísca ✦ nunca é coberta, RF38.CA04), favorito, selo de conformidade
  if (p.highlight) s += g({ role: 'img', 'aria-label': `Destaque do mês · ${p.highlight}` }, rect(ix, coverY, iw, 18, { fill: 'spark', op: .92 }) + iconAt('medalha', ix + 6, coverY + 2, 14, v('on-spark')) + text(ix + 24, coverY + 12.5, `DESTAQUE DO MÊS · ${p.highlight}`, { fam: 'mono', size: 8.5, weight: 700, fill: 'on-spark', tracking: '.06em' }));
  if (p.favorite) s += g({ role: 'img', 'aria-label': 'favorito (SavedItem.favorite)' }, circle(ix + 14, coverY + (p.highlight ? 32 : 14), 10, { fill: 'surface', stroke: 'line-soft', sw: .8 }) + iconAt('estrela', ix + 7, coverY + (p.highlight ? 25 : 7), 14, v('spark')));
  if (p.ai) s += spark(ix + iw - 10, coverY + 10 + (p.highlight ? 20 : 0), 14, { glow: true });
  if (p.conformity) { const tokc = p.conformity.pct >= 90 ? 'class-consenso' : p.conformity.pct >= 60 ? 'due-soon' : 'class-risco'; s += g({ role: 'img', 'aria-label': `conformidade ${p.conformity.pct}%` }, rect(ix + 6, coverY + coverH - 24, 58, 18, { fill: `${tokc}-soft`, stroke: tokc, sw: 1, rx: 9 }) + text(ix + 35, coverY + coverH - 11.5, `${p.conformity.pct} %${p.conformity.blocking ? ' ⛔' : ''}`, { fam: 'mono', size: 9, weight: 700, fill: `${tokc}-ink`, anchor: 'middle' })); }
  let svg = s; if (faded) svg = `<defs><filter id="${cOut}f"><feColorMatrix type="saturate" values=".35"/></filter></defs>` + g({ style: `opacity:.62;filter:url(#${cOut}f)` }, s);
  const callouts = [{ n: 1, x: 2, y: 2 }, { n: 3, x: 2, y: H - 2 }, { n: 4, x: ix + 10, y: coverY + 10 }, { n: 5, x: ix + iw - 24, y: coverY + coverH - 24 - 24 }, { n: 'a', x: -1, y: titleY + 10 }, { n: 'b', x: -1, y: deptY + 11 }, { n: 'c', x: ix + iw - 110 + stg.w / 2, y: deptY + 24 }, { n: 'd', x: ix + iw / 2, y: phaseY - 2 }, { n: 'e', x: -1, y: milY + 7 }, { n: 'f', x: -1, y: milY + 23 }, { n: 'g', x: -1, y: evY + 8 }, { n: 'h', x: -1, y: evY + 28 }];
  if (p.seal) callouts.push({ n: 'i', x: W - 8, y: 30 }); if (p.ai) callouts.push({ n: 'j', x: ix + iw - 10, y: coverY + 30 + (p.highlight ? 20 : 0) });
  if (['aprovado', 'devolvido', 'concluido'].includes(status)) callouts.push({ n: 'k', x: ix + 86, y: coverY + coverH - 10 });
  if (status === 'em-decisao' || status === 'devolvido') callouts.push({ n: 'l', x: ix + iw / 2, y: milY + 27 });
  if (extras.length) callouts.push({ n: 'v', x: ix + iw - 4, y: exY + 8 });
  if (p.highlight) callouts.push({ n: 'm', x: ix + iw - 10, y: coverY + 9 });
  if (p.favorite) callouts.push({ n: 'n', x: ix + 14, y: coverY + (p.highlight ? 54 : 36) });
  if (p.conformity) callouts.push({ n: 'o', x: ix + 72, y: coverY + coverH - 15 });
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
  if (p.highlight) legend.push(['m', 'Faixa de destaque', 'Highlight(targetType PROJECT, monthKey) publicado (RF35.CA03): faixa âmbar com medalha; critérios visíveis no tooltip (reações, reutilizações, rastro, conformidade). Na Vitrine vira o hero.']);
  if (p.favorite) legend.push(['n', 'Favorito ⭐', 'SavedItem.favorite do viewer (RF26.CA04); sub-aba Projetos salvos (RF26 §7).']);
  if (p.conformity) legend.push(['o', 'Selo de conformidade', `ComplianceResult.percent ${p.conformity.pct} % com semáforo (≥ 90 verde · 60–89 âmbar · < 60 vermelho, Q-148) e ⛔ quando hasBlockingPending (RF32.CA04); número sempre em texto.`]);
  if (extras.length) legend.push(['v', 'Linhas de variação', p.variantNote ?? 'uma linha por variação ativa (§4.2 do catálogo): oferta no Balcão, remix, atribuição, conformidade, cenário, eixo do plano, agrupamento, visibilidade (linha mostrada só ao dono quando ≠ PÚBLICA: PRIVADA = só o dono; DEPARTAMENTO = equipe do departamento; EMPRESA = toda a empresa), versão, origem.']);
  return { svg, w: W, h: H, callouts, legend };
}

/* ------------------------------------------------ PROJETO · Hero da Vitrine ------------------------------------------------ */
function projetoHero(p, { W = 600 } = {}) {
  const H = 250, pad = 16, mw = 300 - pad, mh = Math.round(mw * 2 / 3); const cid = id('h');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 16)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: p.dept.tok, sw: 2.5, rx: 16, extra: 'filter:drop-shadow(0 4px 12px rgba(0,0,0,.12))' });
  s += g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, H, { fill: 'primary-soft', op: .5 }) + rect(300, 0, W - 300, H, { fill: 'surface' }));
  s += mosaic(pad, (H - mh) / 2, mw, mh, p.tiles) + rect(pad, (H - mh) / 2, mw, mh, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 8 }) + ring(pad + mw - 26, (H - mh) / 2 + mh - 26, 17, (p.phase + 1) / 7, { label: `${p.phase + 1}/7` });
  const tx = 316; s += text(tx, 32, 'VITRINE · DESTAQUE DO MÊS', { fam: 'mono', size: 9, weight: 600, fill: 'muted', tracking: '.08em' });
  const tl = wrap(p.title, 24, 2); s += lines(tx, 58, tl, 24, { fam: 'serif', size: 20, weight: 600 });
  s += lines(tx, 58 + tl.length * 24 + 4, wrap(p.objective, 46, 2), 15, { fam: 'sans', size: 11.5, fill: 'muted' });
  const ry = 150; s += monogram(tx, ry, 22, p.dept.mono, p.dept.tok) + text(tx + 28, ry + 15.5, `${p.dept.acr} · ${p.tasks} tarefas · ${p.people} pessoas`, { fam: 'sans', size: 11, weight: 600 });
  s += phaseBar(tx, ry + 32, 160, p.phase, { h: 6, label: false }) + text(tx + 168, ry + 38, `${['DEMANDA','PLANEJAMENTO','ELABORAÇÃO','ANÁLISE','APROVAÇÃO','EXECUÇÃO','ENCERRAMENTO'][p.phase]} ${p.phase + 1}/7`, { fam: 'mono', size: 8.5, weight: 600, fill: 'primary-ink', tracking: '.04em' });
  s += rect(tx, H - 46, 118, 32, { fill: 'primary', rx: 16 }) + text(tx + 59, H - 25.5, 'Ver projeto', { fam: 'sans', size: 12, weight: 600, fill: 'on-primary', anchor: 'middle' });
  const cnt = counters(0, 0, p.counters, { size: 13, gap: 10 }); s += g({ transform: `translate(${W - pad - cnt.w} ${H - 44})` }, cnt.svg);
  s += seal(W - 28, 28, 18, { kind: 'gold', ribbon: true, letter: 'S' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 2, x: 150, y: H - 2 }, { n: 3, x: 300, y: 2 }, { n: 4, x: pad + 12, y: (H - mh) / 2 + 12 }, { n: 5, x: pad + mw - 26, y: (H - mh) / 2 + mh - 54 }, { n: 'a', x: tx - 6, y: 50 }, { n: 'b', x: tx - 6, y: ry + 11 }, { n: 'd', x: tx - 6, y: ry + 35 }, { n: 'e', x: tx - 6, y: H - 30 }, { n: 'h', x: W - pad - cnt.w / 2, y: H - 14 }, { n: 'i', x: W - 28, y: 56 }],
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

/* ------------------------------------------------ TAREFA · Ficha da Tarefa do Dia (RF44) ------------------------------------------------ */
function tarefaDia(d, { W = 380 } = {}) {
  const H = 262, pad = 14; const cid = id('td');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 10)}</defs>`;
  // ficha de protocolo: papel pautado + picote no topo
  s += rect(0, 0, W, H, { fill: 'surface-2', stroke: d.dept.tok, sw: 2, rx: 10 });
  s += g({ 'clip-path': `url(#${cid})`, 'aria-hidden': 'true' }, (() => { let a = ''; for (let yy = 10; yy < H; yy += 8) a += line(0, yy, W, yy, { stroke: 'ink', sw: .5, op: .05 }); for (let xx = 8; xx < W; xx += 8) a += circle(xx, 4, 1.4, { fill: 'ground' }); return a; })());
  s += text(pad, 24, 'TAREFA DO DIA · 05 OUT 2026', { fam: 'mono', size: 9, weight: 700, fill: 'muted', tracking: '.1em' }) + spark(W - pad - 8, 19, 13, { glow: true });
  // card mini da tarefa
  const cy = 34; s += rect(pad, cy, W - 2 * pad, 56, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 8 });
  s += thumbArt(pad + 8, cy + 8, 60, 40, { type: d.type, ext: d.ext, tok: TASK_TYPE_TOKEN(d.type), cid: id('tdm') }) + rect(pad + 8, cy + 8, 60, 40, { fill: 'none', stroke: 'line-soft', sw: .8, rx: 2 });
  s += iconAt(typeIcon(d), pad + 76, cy + 9, 14, v(typeTok(d))) + text(pad + 94, cy + 20, wrap(d.title, 30, 1)[0], { fam: 'serif', size: 13, weight: 600 });
  const t1 = stateTag(pad + 76, cy + 29, d.state ?? 'em-uso', { h: 18 }); s += t1.svg; const dd = due(pad + 76 + t1.w + 6, cy + 28, d.due, { kind: d.dueKind, legal: d.legal }); s += dd.svg;
  // índice de prioridade decomposto
  const iy = cy + 56 + 12; s += text(pad, iy + 9, 'ÍNDICE DE PRIORIDADE', { fam: 'mono', size: 8.5, weight: 700, fill: 'muted', tracking: '.08em' });
  const comps = [['Eisenhower', 'urg. · import.'], ['WSJF', '4,2'], ['Folga CPM', '0 d · crítico'], ['MoSCoW', 'Must']];
  const cw = (W - 2 * pad - 3 * 6) / 4; comps.forEach(([k, val], i) => { const cx = pad + i * (cw + 6); s += rect(cx, iy + 14, cw, 30, { fill: 'surface', stroke: 'line-soft', sw: .8, rx: 6 }) + text(cx + 6, iy + 25, k, { fam: 'mono', size: 7.5, weight: 600, fill: 'muted', upper: true, tracking: '.05em' }) + text(cx + 6, iy + 38, val, { fam: 'sans', size: 10, weight: 600 }); });
  // HSE previsto
  const hy = iy + 56; s += text(pad, hy + 9, 'HSE PREVISTO', { fam: 'mono', size: 8.5, weight: 700, fill: 'muted', tracking: '.08em' }) + text(pad + 92, hy + 10, '78', { fam: 'serif', size: 16, weight: 700, fill: 'primary-ink' }) + text(pad + 112, hy + 9, '/ 100 · previsto × realizado após o feedback', { fam: 'sans', size: 9, fill: 'muted' });
  const parts = [['eficiência', 20, 20], ['eficácia', 20, 20], ['valor', 15, 12], ['pontualidade', 15, 15], ['qualidade', 15, 11], ['equipe', 10, 0], ['foco', 5, 0]];
  let bx = pad; const bw = W - 2 * pad; parts.forEach(([k, max, val], i) => { const w = bw * max / 100; s += rect(bx, hy + 16, w - 2, 8, { fill: 'surface-3', rx: 2 }) + rect(bx, hy + 16, (w - 2) * (val / max), 8, { fill: i % 2 ? 'primary' : 'primary-strong', rx: 2 }); bx += w; });
  s += text(pad, hy + 36, 'efic. 20 · eficácia 20 · valor 12 · pontual. 15 · qualid. 11 · equipe 0 · foco 0', { fam: 'sans', size: 8.5, fill: 'muted' });
  // feedback
  const fy = hy + 46; const labels = ['CONCLUÍ', 'ADIEI', 'BLOQUEADA', 'DELEGUEI']; const fw = (W - 2 * pad - 3 * 6) / 4;
  labels.forEach((l, i) => { const fx = pad + i * (fw + 6); s += rect(fx, fy, fw, 26, { fill: i === 0 ? 'primary' : 'surface', stroke: i === 0 ? 'primary' : 'line', sw: 1, rx: 13 }) + text(fx + fw / 2, fy + 17, l, { fam: 'sans', size: 10, weight: 600, fill: i === 0 ? 'on-primary' : 'ink', anchor: 'middle' }); });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 4, x: pad + 38, y: cy + 28 }, { n: 'a', x: pad - 4, y: 20 }, { n: 'b', x: pad - 4, y: iy + 28 }, { n: 'c', x: pad - 4, y: hy + 20 }, { n: 'd', x: pad - 4, y: fy + 13 }, { n: 'h', x: W - pad - 8, y: 36 }],
    legend: [
      [1, 'Ficha de protocolo', 'DailyTask (1 por dia, único usuário+data): o card da tarefa vira ficha no topo do Acervo, da Mesa e do perfil (RF44.CA01; Identidade §12); borda na cor do departamento.'],
      [4, 'Card mini da tarefa', 'miniatura 60×40 + glifo + título + estado + prazo; a tarefa continua com o seu estado de trabalho (EM_USO/DISPONÍVEL).'],
      ['a', 'Cabeçalho', 'data em mono; a ficha é a Prioridade do Dia (RF41.CA04 alimenta a sugestão).'],
      ['b', 'Índice de prioridade decomposto', 'priorityIndexJson: Eisenhower, WSJF, folga no CPM, MoSCoW (board RF44 §1); nunca só o número.'],
      ['c', 'HSE previsto', 'hsePredictedJson: 7 componentes com pesos versionados (hse_weights, RF44.CA08); barra proporcional por componente; realizado comparado ▲▼ após o feedback.'],
      ['d', 'Feedback do dia', 'CONCLUÍ (esforço real) · ADIEI (motivo) · BLOQUEADA (cria dependência) · DELEGUEI (transfere responsável) — RF44.CA03/CA04.'],
      ['h', 'Faísca ✦', 'escolha e explicação geradas pela IA com log (RF44.CA09); motor local determinístico sem IA externa.'],
    ] };
}

/* ------------------------------------------------ PROJETO · visão Linha do tempo (Gantt, RF22) ------------------------------------------------ */
const GANTT_ROWS = [
  { t: 'Ofício de demanda — PR-445', type: 'DOCUMENTO', ext: 'pdf', ph: 0, s: 0, e: 6, crit: true },
  { t: 'ETP — pavimentação lote 2', type: 'ESTUDO_TECNICO_PRELIMINAR', ph: 1, s: 6, e: 16, crit: true, ai: true },
  { t: 'Termo de referência', type: 'DOCUMENTO', ext: 'docx', ph: 1, s: 12, e: 22, crit: false, slack: 4 },
  { t: 'Cronograma físico-financeiro', type: 'CRONOGRAMA', ph: 1, s: 16, e: 24, crit: true },
  { t: 'Planilha orçamentária v2', type: 'PLANILHA', ph: 2, s: 24, e: 34, crit: true, legal: true },
  { t: 'Parecer técnico — drenagem', type: 'DOCUMENTO', ext: 'pdf', ph: 3, s: 30, e: 40, crit: false, slack: 6 },
  { t: 'Ata — aprovação do Conselho', type: 'ATA_REGISTRO', ph: 4, s: 40, e: 44, crit: true, milestone: true },
];
const PHASE_TOK = ['primary', 'class-argumento', 'type-planilha', 'class-pergunta', 'class-consenso', 'type-desenho-tecnico', 'muted'];
function projetoLinhaTempo(p, { W = 640 } = {}) {
  const labelW = 196, pad = 12, rowH = 26, headH = 46, days = 48, dayW = (W - labelW - 2 * pad) / days, rows = GANTT_ROWS;
  const H = headH + rows.length * rowH + 44; const x0 = labelW + pad; const today = 27;
  let s = rect(0, 0, W, H, { fill: 'surface', stroke: p.dept.tok, sw: 2, rx: 12 });
  // cabeçalho: abas de visão + régua
  const tabs = [['Quadro', false], ['Linha do tempo', true], ['Mesa', false]]; let tx = pad;
  tabs.forEach(([l, on]) => { const w = tw(l, 10) + 18; s += rect(tx, 8, w, 20, { fill: on ? 'ink' : 'surface-2', rx: 10 }) + text(tx + w / 2, 21.5, l, { fam: 'sans', size: 10, weight: 600, fill: on ? 'surface' : 'muted', anchor: 'middle' }); tx += w + 4; });
  s += text(W - pad, 21, 'SET → NOV 2026 · zoom semana', { fam: 'mono', size: 8.5, weight: 600, fill: 'muted', anchor: 'end', tracking: '.06em' });
  for (let w = 0; w <= days; w += 6) { const x = x0 + w * dayW; s += line(x, headH - 10, x, H - 30, { stroke: 'line-soft', sw: .6 }) + text(x + 2, headH - 14, `S${w / 6 + 36}`, { fam: 'mono', size: 7.5, fill: 'faint' }); }
  // hoje
  const hx = x0 + today * dayW; s += line(hx, headH - 10, hx, H - 30, { stroke: 'due-over', sw: 1.2, dash: '3 3' }) + rect(hx - 16, headH - 24, 32, 12, { fill: 'due-over', rx: 6 }) + text(hx, headH - 15, 'HOJE', { fam: 'mono', size: 7, weight: 700, fill: 'on-due-over', anchor: 'middle' });
  // linhas
  const bars = [];
  rows.forEach((r, i) => {
    const y = headH + i * rowH; const bx = x0 + r.s * dayW, bw = (r.e - r.s) * dayW; const tok = PHASE_TOK[r.ph];
    if (i % 2) s += rect(pad, y, W - 2 * pad, rowH, { fill: 'surface-2', op: .5 });
    s += iconAt(TASK_TYPE_ICON[r.type], pad + 2, y + 6, 13, v(r.ext ? `ext-${r.ext}` : TASK_TYPE_TOKEN(r.type))) + text(pad + 19, y + 16.5, wrap(r.t, 26, 1)[0], { fam: 'sans', size: 10, weight: r.crit ? 700 : 500 });
    if (r.ai) s += spark(labelW - 12, y + 13, 10);
    if (r.slack) s += rect(bx + bw, y + 8, r.slack * dayW, 10, { fill: 'none', stroke: tok, sw: .8, dash: '2 2', rx: 2 });
    s += rect(bx, y + 6, bw, 14, { fill: `${tok}-soft`, stroke: tok, sw: r.crit ? 2 : 1, rx: 4 }) + rect(bx, y + 6, bw * (i < 4 ? 1 : i === 4 ? .4 : 0), 14, { fill: tok, op: .55, rx: 4 });
    s += avatar(bx + bw - 8, y + 13, 6, ['MH', 'AC', 'CP', 'MH', 'JS', 'AC', 'AC'][i]);
    if (r.legal) s += iconAt('balanca', bx + 3, y + 7, 11, v(`${tok}-ink`));
    if (r.milestone) s += path(`M${bx + bw + 8} ${y + 7}l6 6-6 6-6-6z`, { fill: 'class-consenso', stroke: 'surface', sw: 1 });
    bars.push({ x1: bx, x2: bx + bw, y: y + 13 });
  });
  // dependências FS (predecessora → sucessora) + lag
  const deps = [[0, 1, 0], [1, 3, 0], [1, 2, 2], [3, 4, 0], [4, 5, 0], [4, 6, 0]];
  deps.forEach(([a, b, lag]) => { const A = bars[a], B = bars[b]; const crit = rows[a].crit && rows[b].crit; s += path(`M${A.x2} ${A.y}h6v${B.y - A.y - 7}h${B.x1 - A.x2 - 12}v7`, { fill: 'none', stroke: crit ? 'primary-strong' : 'muted', sw: crit ? 1.6 : 1, dash: crit ? undefined : '3 2' }) + path(`M${B.x1 - 1} ${B.y}l-5-3v6z`, { fill: crit ? 'primary-strong' : 'muted' }); if (lag) s += text(A.x2 + 10, B.y - 4, `+${lag} d`, { fam: 'mono', size: 7, fill: 'muted' }); });
  // rodapé: legenda do caminho crítico
  const ly = H - 22; s += rect(pad, ly, 26, 10, { fill: 'primary-soft', stroke: 'primary-strong', sw: 2, rx: 3 }) + text(pad + 32, ly + 8.5, 'caminho crítico (isCritical)', { fam: 'sans', size: 9, fill: 'muted' }) + rect(pad + 170, ly, 26, 10, { fill: 'none', stroke: 'muted', sw: .8, dash: '2 2', rx: 2 }) + text(pad + 202, ly + 8.5, 'folga (slackDays)', { fam: 'sans', size: 9, fill: 'muted' }) + path(`M${pad + 306} ${ly - 1}l6 6-6 6-6-6z`, { fill: 'class-consenso' }) + text(pad + 318, ly + 8.5, 'marco (nextMilestoneAt)', { fam: 'sans', size: 9, fill: 'muted' }) + line(pad + 450, ly, pad + 450, ly + 10, { stroke: 'due-over', sw: 1.2, dash: '3 3' }) + text(pad + 456, ly + 8.5, 'hoje', { fam: 'sans', size: 9, fill: 'muted' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 'a', x: pad + 60, y: 34 }, { n: 'b', x: x0 + 2, y: headH - 24 }, { n: 'c', x: pad - 2, y: headH + 2 * rowH + 13 }, { n: 'd', x: bars[1].x1 + 10, y: bars[1].y - 12 }, { n: 'e', x: bars[1].x2 + 6, y: bars[2].y - 2 }, { n: 'f', x: bars[6].x2 + 8, y: bars[6].y - 14 }, { n: 'g', x: hx, y: H - 36 }, { n: 'i', x: bars[4].x1 + 8, y: bars[4].y + 12 }],
    legend: [
      [1, 'Visão TIMELINE', 'SchemeView.TIMELINE (RF22): mesmo ProjectScheme das visões Quadro e Mesa; trocar de visão não perde dados (RF22.CA03); só dono, responsáveis e chefe editam (RF22.CA01).'],
      ['a', 'Abas de visão', 'Quadro · Linha do tempo · Mesa — segmented control; a escolhida fica em --ink.'],
      ['b', 'Régua', 'semanas (zoom dia/semana/mês); S36… do exercício 2026.'],
      ['c', 'Linha por ProjectTask', 'glifo do tipo + título (negrito quando crítica) + ✦ quando aiGenerated; ordenadas por fase e sortOrder.'],
      ['d', 'Barra', 'startAt → dueAt na cor da fase (PhaseBar); preenchimento = percentComplete; borda grossa = isCritical; avatar do responsável na ponta.'],
      ['e', 'Dependência', 'ProjectTaskDependency FS/SS/FF/SF: conector com seta; contínuo no caminho crítico, tracejado fora dele; lag em rótulo (+2 d). Sem ciclos (422); prazo anterior à predecessora recusado (RF21.CA08).'],
      ['f', 'Marco', 'losango verde no dueAt da tarefa-marco (ATA de aprovação) = nextMilestoneAt do card.'],
      ['g', 'Hoje', 'linha tracejada vermelha (--due-over); barras à esquerda sem conclusão ficam em atraso (SPI < 1, RF43.CA09).'],
      ['i', 'Prazo legal ⚖', 'legalDueAt na barra (RF41.CA04); vencido = barra com borda --due-over.'],
    ] };
}

/* ------------------------------------------------ PROJETO · visão Quadro por fase (kanban, RF22) ------------------------------------------------ */
function projetoQuadroFase(p, { W = 640 } = {}) {
  const pad = 12, headH = 40, colGap = 6, colW = (W - 2 * pad - 6 * colGap) / 7, cardH = 46, H = headH + 30 + 3 * (cardH + 6) + 24;
  let s = rect(0, 0, W, H, { fill: 'surface', stroke: p.dept.tok, sw: 2, rx: 12 });
  const tabs = [['Quadro', true], ['Linha do tempo', false], ['Mesa', false]]; let tx = pad;
  tabs.forEach(([l, on]) => { const w = tw(l, 10) + 18; s += rect(tx, 8, w, 20, { fill: on ? 'ink' : 'surface-2', rx: 10 }) + text(tx + w / 2, 21.5, l, { fam: 'sans', size: 10, weight: 600, fill: on ? 'surface' : 'muted', anchor: 'middle' }); tx += w + 4; });
  s += text(W - pad, 21, 'WIP 3 · 7 tarefas · 4 pessoas', { fam: 'mono', size: 8.5, weight: 600, fill: 'muted', anchor: 'end', tracking: '.06em' });
  const cols = [[GANTT_ROWS[0]], [GANTT_ROWS[1], GANTT_ROWS[2], GANTT_ROWS[3]], [GANTT_ROWS[4]], [GANTT_ROWS[5]], [GANTT_ROWS[6]], [], []];
  const PH = ['DEMANDA', 'PLANEJ.', 'ELABOR.', 'ANÁLISE', 'APROV.', 'EXEC.', 'ENCERR.'];
  cols.forEach((items, i) => {
    const cx = pad + i * (colW + colGap), cur = i === p.phase;
    s += rect(cx, headH, colW, H - headH - 12, { fill: 'surface-2', stroke: cur ? 'primary-strong' : 'line-soft', sw: cur ? 1.5 : .8, rx: 8 });
    s += rect(cx, headH, colW, 20, { fill: cur ? 'primary-strong' : 'surface-3', rx: 8 }) + rect(cx, headH + 12, colW, 8, { fill: cur ? 'primary-strong' : 'surface-3' });
    s += text(cx + 6, headH + 14, PH[i], { fam: 'mono', size: 8, weight: 700, fill: cur ? 'on-primary' : 'muted', tracking: '.05em' }) + text(cx + colW - 6, headH + 14, String(items.length), { fam: 'mono', size: 8, weight: 700, fill: cur ? 'on-primary' : 'muted', anchor: 'end' });
    items.forEach((r, j) => {
      const y = headH + 26 + j * (cardH + 6); const removed = i === 3; const dis = i === 3;
      s += g({ style: removed ? 'opacity:.55' : '' }, rect(cx + 4, y, colW - 8, cardH, { fill: 'surface', stroke: 'line-soft', sw: .8, rx: 6, dash: removed ? '3 2' : undefined }) + rect(cx + 4, y + 6, 3, cardH - 12, { fill: PHASE_TOK[r.ph], rx: 1.5 }) + iconAt(TASK_TYPE_ICON[r.type], cx + 10, y + 5, 12, v(r.ext ? `ext-${r.ext}` : TASK_TYPE_TOKEN(r.type))) + text(cx + 10, y + 29, wrap(r.t, 13, 1)[0], { fam: 'serif', size: 9.5, weight: 600 }) + text(cx + 10, y + 40, removed ? 'removida pelo autor' : r.legal ? '⚖ 20 OUT' : `${['12', '18', '22', '24', '30', '04', '08'][(i + j) % 7]} OUT`, { fam: 'mono', size: 7.5, weight: 600, fill: removed ? 'muted' : r.legal ? 'due-soon-ink' : 'muted', italic: removed }) + avatar(cx + colW - 14, y + 11, 6, ['MH', 'AC', 'CP', 'MH', 'JS', 'AC', 'AC'][(i + j) % 7]));
      if (r.ai) s += spark(cx + colW - 26, y + 11, 9);
      if (i === 4) s += seal(cx + colW - 12, y + cardH - 10, 7, { kind: 'navy', letter: 'U' });
      if (i === 2) s += iconAt('cadeado', cx + colW - 22, y + 30, 10, v('class-divergencia-ink'));
    });
    if (!items.length) s += rect(cx + 4, headH + 26, colW - 8, cardH, { fill: 'none', stroke: 'line-soft', sw: .8, dash: '3 3', rx: 6 }) + text(cx + colW / 2, headH + 26 + cardH / 2 + 3, 'solte aqui', { fam: 'sans', size: 8.5, fill: 'faint', anchor: 'middle', italic: true });
    s += text(cx + colW / 2, H - 20, '+ nova tarefa', { fam: 'sans', size: 8.5, weight: 600, fill: 'primary-ink', anchor: 'middle' });
  });
  // card "em arrasto" (fantasma) com encaixe na fase ELABORAÇÃO
  const gx = pad + 2 * (colW + colGap) + colW - 18, gy = headH + 26 + cardH + 14; s += g({ transform: `rotate(3 ${gx} ${gy})`, style: 'opacity:.9' }, rect(gx, gy, colW - 8, cardH, { fill: 'surface', stroke: 'primary', sw: 1.5, rx: 6, extra: 'filter:drop-shadow(0 6px 12px rgba(0,0,0,.25))' }) + iconAt('desenho-tecnico', gx + 6, gy + 5, 12, v('type-desenho-tecnico')) + text(gx + 6, gy + 29, 'Planta drenagem', { fam: 'serif', size: 9.5, weight: 600 }) + text(gx + 6, gy + 40, 'arrastando → encaixe', { fam: 'sans', size: 7.5, fill: 'primary-ink', italic: true }));
  const c2 = pad + 2 * (colW + colGap);
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 'a', x: pad + 30, y: 34 }, { n: 'b', x: c2 + colW / 2, y: headH + 10 }, { n: 'c', x: pad + colW + colGap + colW - 4, y: headH + 26 + 2 }, { n: 'd', x: pad + 3 * (colW + colGap) + 6, y: headH + 26 + cardH - 4 }, { n: 'e', x: gx + colW - 14, y: gy - 2 }, { n: 'f', x: pad + 5 * (colW + colGap) + colW / 2, y: headH + 26 + cardH + 8 }, { n: 'g', x: pad + 4 * (colW + colGap) + colW - 12, y: headH + 26 + cardH + 6 }],
    legend: [
      [1, 'Visão BOARD', 'SchemeView.BOARD (RF22): 7 colunas ProjectPhase DEMANDA → ENCERRAMENTO com contagem; coluna da fase atual (currentPhase) com cabeçalho em --primary-strong e aro.'],
      ['a', 'Abas de visão', 'Quadro · Linha do tempo · Mesa; WIP e contagens no canto (RF44 §1 Little’s Law informa o WIP).'],
      ['b', 'Coluna da fase atual', 'ELABORAÇÃO 3/7: aro e cabeçalho sólidos; nome da fase em texto (RF38.CA05).'],
      ['c', 'Card mini por ProjectTask', 'filete na cor da fase, glifo do tipo, título, prazo (⚖ legal, âmbar/vermelho), avatar do responsável, ✦ se IA, cadeado se BLOQUEADA, lacre 14 px se chancelada; ordem = sortOrder.'],
      ['d', 'Removida pelo autor', 'ProjectTask.taskId nulo + snapshotJson: card tracejado e esmaecido que mantém a fase e as dependências (RF23.CA03, RF41.CA05).'],
      ['e', 'Arrastar e encaixar', 'mover entre colunas muda ProjectTask.phase (gera ProjectVersion, RF22.CA02); "encaixe" animado com --ease-snap (RF38.CA10), desligado em reduced-motion.'],
      ['f', 'Coluna vazia', 'alvo tracejado "solte aqui"; "+ nova tarefa" abre o RF20 em modal já na fase (RF21.CA07).'],
      ['g', 'Lacre herdado', 'chancela da tarefa aparece no card mini e sobe para "Chancelas do projeto" (RF21.CA09).'],
    ] };
}

/* ------------------------------------------------ PROJETO · Kit de Processo (esquema composto) ------------------------------------------------ */
function projetoKit(p, { W = 300 } = {}) {
  const pad = 12, iw = W - 2 * pad; const items = [[GANTT_ROWS[0], 'DEMANDA'], [GANTT_ROWS[1], 'PLANEJAMENTO'], [GANTT_ROWS[2], 'PLANEJAMENTO'], [GANTT_ROWS[4], 'ELABORAÇÃO'], [GANTT_ROWS[6], 'APROVAÇÃO']];
  const H = pad + 44 + 10 + 22 + 10 + items.length * 24 + 10 + 20 + 22 + pad;
  let s = rect(0, 0, W, H, { fill: 'surface', stroke: p.dept.tok, sw: 2.5, rx: 12 });
  let y = pad; s += rect(pad, y, 44, 44, { fill: 'type-pasta-soft', rx: 10 }) + iconAt('pasta', pad + 10, y + 10, 24, v('type-pasta'));
  s += text(pad + 54, y + 12, 'KIT DE PROCESSO · LICITAÇÃO', { fam: 'mono', size: 8.5, weight: 700, fill: 'muted', tracking: '.08em' }) + lines(pad + 54, y + 30, wrap('Licitação de obra — pacote mínimo (Lei 14.133)', 26, 2), 15, { fam: 'serif', size: 13.5, weight: 600 });
  y += 44 + 10; s += monogram(pad, y, 22, p.dept.mono, p.dept.tok) + text(pad + 28, y + 15.5, `${p.dept.acr} · 5 tarefas-base → 12 projetos`, { fam: 'sans', size: 10.5, weight: 600 });
  y += 22 + 10;
  items.forEach(([r, ph], i) => { const ry = y + i * 24; s += line(pad, ry + 23, W - pad, ry + 23, { stroke: 'line-soft', sw: .6, dash: '1 3' }) + rect(pad, ry + 2, 28, 19, { fill: 'surface-2', stroke: 'line-soft', sw: .6, rx: 2 }) + iconAt(TASK_TYPE_ICON[r.type], pad + 36, ry + 5, 13, v(r.ext ? `ext-${r.ext}` : TASK_TYPE_TOKEN(r.type))) + text(pad + 54, ry + 15, wrap(r.t, 24, 1)[0], { fam: 'sans', size: 10, weight: 600 }) + text(W - pad, ry + 15, i === 2 ? 'opcional' : ph.slice(0, 6), { fam: 'mono', size: 7.5, weight: 600, fill: i === 2 ? 'faint' : 'primary-ink', anchor: 'end', italic: i === 2 }); });
  y += items.length * 24 + 10;
  s += iconAt('ficha-dp', pad, y + 2, 13, v('spark')) + text(pad + 17, y + 12.5, '0 DP · cópia livre · prateleira chancelados', { fam: 'mono', size: 9, weight: 600, fill: 'type-link-ink' });
  y += 20; const cnt = counters(0, 0, { likes: 31, comments: 4, saves: 19, remixes: 12 }, { size: 12, gap: 8 }); s += g({ transform: `translate(${pad} ${y + 2})` }, cnt.svg);
  s += seal(W - 10, 10, 15, { kind: 'gold', letter: 'S' });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 'a', x: pad + 22, y: pad + 48 }, { n: 'b', x: pad - 2, y: pad + 44 + 10 + 11 }, { n: 'c', x: pad - 2, y: pad + 44 + 10 + 22 + 10 + 12 }, { n: 'd', x: W - pad - 10, y: pad + 44 + 10 + 22 + 10 + 2 * 24 + 12 }, { n: 'e', x: pad - 2, y: y - 8 }, { n: 'i', x: W - 10, y: 32 }],
    legend: [
      [1, 'Card do Kit (esquema composto)', 'ProcessKit + KitItem[] (TAXONOMIA §3.10–3.11; = Cápsula): borda do departamento, raio 12; em grade usa a largura do mosaic (260–300).'],
      ['a', 'Emoji/ícone do kit', 'ProcessKit.emoji escolhido pelo dono (Identidade §13) sobre a cor da família PASTA; kicker com processTag.'],
      ['b', 'Fator de reutilização', '"N tarefas-base → M projetos gerados" (KitItem count × ProcessKit.remixCount).'],
      ['c', 'Tarefas-base por fase', 'KitItem.phase e sortOrder; glifo do tipo + título + fase em mono.'],
      ['d', 'Opcional', 'KitItem.optional em itálico: "Criar a partir de modelo" (RF21.CA13) deixa desmarcada.'],
      ['e', 'Oferta e contadores', 'ModelOffer(targetType KIT): preço em DP (0 = grátis), licença, prateleira (RF40.CA01/CA02); contadores sociais (TargetType KIT).'],
      ['i', 'Lacre', 'kit chancelado (sealIdsJson) entra na prateleira "chancelados" e na Loja como KIT_CHANCELADO (RF42).'],
    ] };
}

/* ------------------------------------------------ PROJETO · Agrupamento (Programa · Exercício · Gestão · Frente) ------------------------------------------------ */
function projetoAgrupamento(p, { W = 420 } = {}) {
  const pad = 12, H = 232; const cid = id('ag');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 12)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: 'line-soft', sw: 1, rx: 12 });
  // capa com filete na accentColor
  s += g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, 64, { fill: 'primary-soft' }) + rect(0, 0, W, 5, { fill: 'secondary' }));
  for (let i = 0; i < 12; i++) s += circle(30 + i * 34, 40 + (i % 3) * 8, 3, { fill: 'secondary', op: .35 });
  const t = tag(pad, 14, 'Programa', { tok: 'secondary', h: 18 }); s += t.svg; s += text(pad + t.w + 8, 27, 'JAN 2026 → DEZ 2027 · ativo', { fam: 'mono', size: 8.5, weight: 600, fill: 'secondary-ink', tracking: '.05em' });
  s += text(pad, 52, 'Programa Cidade Acessível 2026', { fam: 'serif', size: 17, weight: 600 });
  // linha institucional
  let y = 76; s += monogram(pad, y, 22, 'SEC', 'primary') + text(pad + 28, y + 15.5, 'Secretaria das Cidades · 14 projetos · 6 deptos · 62 % concluído', { fam: 'sans', size: 10.5, weight: 600 });
  s += rect(pad, y + 28, W - 2 * pad, 6, { fill: 'surface-3', rx: 3 }) + rect(pad, y + 28, (W - 2 * pad) * .62, 6, { fill: 'secondary', rx: 3 });
  // grade de projetos compactos
  y += 44; const gw = (W - 2 * pad - 3 * 8) / 4, gh = 54;
  ['Pavimentação PR-445', 'Calçadas acessíveis — centro', 'Rampas em escolas', 'Semáforos sonoros'].forEach((tt, i) => { const gx = pad + i * (gw + 8); s += rect(gx, y, gw, gh, { fill: 'surface', stroke: ['dept-gralha-azul', 'secondary', 'type-desenho-tecnico', 'class-pergunta'][i], sw: 1.5, rx: 6 }) + mosaic(gx + 4, y + 4, gw - 8, 24, TILES.slice(i, i + 3)) + text(gx + 4, y + 42, wrap(tt, 15, 1)[0], { fam: 'serif', size: 9, weight: 600 }) + text(gx + 4, y + 51, `${['Elaboração 3/7', 'Execução 6/7', 'Concluído', 'Planejamento 2/7'][i]}`, { fam: 'mono', size: 6.5, weight: 600, fill: 'primary-ink' }); if (i === 2) s += seal(gx + gw - 6, y + 6, 7, { kind: 'gold', letter: 'S' }); });
  // linha do tempo de decisões
  y += gh + 12; s += text(pad, y + 8, 'LINHA DO TEMPO DE DECISÕES (RF29)', { fam: 'mono', size: 8, weight: 700, fill: 'muted', tracking: '.08em' });
  s += line(pad + 6, y + 22, W - pad - 6, y + 22, { stroke: 'line-soft', sw: 1.5 });
  [['consenso', 'TR aprovado', .08], ['divergencia', 'orçamento', .32], ['consenso', 'decisão validada', .55], ['pergunta', 'sessão aberta', .8]].forEach(([c, l, px]) => { const nx = pad + (W - 2 * pad) * px; s += node(nx, y + 22, c, 5) + text(nx, y + 36, l, { fam: 'sans', size: 8, fill: 'muted', anchor: 'middle' }); });
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 'a', x: pad + t.w / 2, y: 36 }, { n: 'b', x: W - 20, y: 8 }, { n: 'c', x: pad - 2, y: 76 + 11 }, { n: 'd', x: pad + 20, y: 76 + 44 + 2 }, { n: 'e', x: W - pad - 10, y: y + 2 }],
    legend: [
      [1, 'Card do Agrupamento (esquema composto)', 'Grouping (TAXONOMIA §4.4): PROGRAMA · EXERCÍCIO · GESTÃO · FRENTE; capa (coverUrl) ou tinta --primary-soft; raio 12.'],
      ['a', 'Tipo e período', 'GroupingType em etiqueta + periodFrom → periodTo + status ATIVO/ENCERRADO (RF25.CA01); GESTÃO encerrada mostra o Dossiê de Transição (RF25.CA05).'],
      ['b', 'Filete accentColor', 'Grouping.accentColor como filete de 5 px no topo; o mesmo filete aparece no chip do card de projeto (variação em agrupamento).'],
      ['c', 'Progresso agregado', 'empresa/departamento + nº de projetos + % concluído (RF25.CA03).'],
      ['d', 'Projetos em grade', 'cards mosaic em miniatura (borda do departamento de cada um, lacre quando chancelado).'],
      ['e', 'Linha do tempo de decisões', 'nós do fio de decisão (classe RF7) dos projetos do agrupamento (RF25.CA03).'],
    ] };
}

/* ------------------------------------------------ PROJETO · Plano Anual / Trilha (6 eixos) ------------------------------------------------ */
function projetoPlano(p, { W = 420 } = {}) {
  const pad = 12, H = 250; const cid = id('pl');
  let s = `<defs>${clipRect(cid, 0, 0, W, H, 12)}</defs>` + rect(0, 0, W, H, { fill: 'surface', stroke: 'primary', sw: 2, rx: 12 });
  s += g({ 'clip-path': `url(#${cid})` }, rect(0, 0, W, 58, { fill: 'primary' }));
  s += text(pad, 20, 'PLANO ANUAL · EMPRESA · 2026', { fam: 'mono', size: 8.5, weight: 700, fill: 'on-primary', tracking: '.08em' }) + text(pad, 42, 'Cidades para as pessoas — Plano 2026', { fam: 'serif', size: 17, weight: 600, fill: 'on-primary' });
  s += rect(W - pad - 96, 10, 96, 18, { fill: 'surface', rx: 9, op: .95 }) + text(W - pad - 48, 22.5, 'oficial · publicado', { fam: 'mono', size: 8, weight: 700, fill: 'primary-ink', anchor: 'middle' });
  s += seal(W - 24, 50, 14, { kind: 'gold', letter: 'S' });
  // 6 eixos (2 × 3)
  const axes = [['Mobilidade', 'primary', 5, 40, 'ALTO'], ['Habitação', 'secondary', 3, 66, 'MÉDIO'], ['Saneamento', 'type-link', 4, 25, 'ALTO'], ['Reg. fundiária', 'type-desenho-tecnico', 2, 50, 'BAIXO'], ['Equip. públicos', 'class-pergunta', 6, 83, 'BAIXO'], ['Gestão interna', 'type-pasta', 1, 100, 'BAIXO']];
  const gw = (W - 2 * pad - 2 * 8) / 3, gh = 64; let y = 70;
  axes.forEach(([name, tok, n, pct, risk], i) => { const gx = pad + (i % 3) * (gw + 8), gy = y + Math.floor(i / 3) * (gh + 8); s += rect(gx, gy, gw, gh, { fill: 'surface-2', stroke: 'line-soft', sw: .8, rx: 8 }) + rect(gx, gy, 4, gh, { fill: tok, rx: 2 }) + text(gx + 10, gy + 14, `${i + 1}. ${name}`, { fam: 'sans', size: 10, weight: 700 }) + text(gx + 10, gy + 28, `${n} projetos · ${pct} % concluídos`, { fam: 'sans', size: 8.5, fill: 'muted' }) + rect(gx + 10, gy + 34, gw - 20, 5, { fill: 'surface-3', rx: 2.5 }) + rect(gx + 10, gy + 34, (gw - 20) * pct / 100, 5, { fill: tok, rx: 2.5 }) + text(gx + 10, gy + 54, `próx. ${['18 OUT', '02 NOV', '20 OUT', '15 DEZ', '30 NOV', '—'][i]} · risco ${risk}`, { fam: 'mono', size: 7.5, weight: 600, fill: risk === 'ALTO' ? 'class-risco-ink' : risk === 'MÉDIO' ? 'due-soon-ink' : 'muted' }); });
  y += 2 * gh + 8 + 12;
  s += iconAt('remixar', pad, y + 1, 12, v('muted')) + text(pad + 16, y + 11, 'trilha SECID-UTS derivada deste plano · 21 projetos · comparar 2025 × 2026', { fam: 'sans', size: 9, fill: 'muted', italic: true });
  const cnt = counters(0, 0, { likes: 58, comments: 12, saves: 23, remixes: 6 }, { size: 12, gap: 8 }); s += g({ transform: `translate(${W - pad - cnt.w} ${y + 18})` }, cnt.svg);
  return { svg: s, w: W, h: H, callouts: [{ n: 1, x: 2, y: 2 }, { n: 'a', x: pad - 2, y: 36 }, { n: 'b', x: W - pad - 96 - 6, y: 19 }, { n: 'c', x: pad + 20, y: 70 + 2 }, { n: 'd', x: pad + gw + 8 + gw - 10, y: 70 + gh + 8 + 44 }, { n: 'e', x: pad - 2, y: y + 6 }, { n: 'i', x: W - 24, y: 72 }],
    legend: [
      [1, 'Card do Plano Anual (esquema composto)', 'AnnualPlan + 6 PlanAxis (TAXONOMIA §4.1–4.2; = DNA de 6 células): capa (coverUrl ou tinta primária), borda primária, raio 12.'],
      ['a', 'Escopo, exercício e título', 'PlanScope EMPRESA (oficial) · DEPARTAMENTO · PESSOAL; exerciseYear; identityPhrase como título (RF24.CA01).'],
      ['b', 'Status', 'RASCUNHO · PUBLICADO · ENCERRADO; "oficial" só no plano da EMPRESA (RF24.CA04).'],
      ['c', 'Eixo (célula)', 'PlanAxis: posição 1..6, nome, cor (filete), nº de projetos, % concluídos, prazo mais próximo e risco agregado da IA (RF24.CA03); cada célula abre os projetos do eixo (1 eixo por plano, RF24.CA02).'],
      ['d', 'Risco agregado', 'aggregatedRisk BAIXO · MÉDIO · ALTO em texto e cor (RF31/RF32).'],
      ['e', 'Derivação e comparação', 'derivedFromPlanId: trilhas de departamento/pessoais derivadas do oficial (RF24.CA04); comparação 2025 × 2026 (RF24.CA05); interações sociais (RF24.CA06).'],
      ['i', 'Lacre tier PLANO', 'SealBond(targetType PLAN) aprovado (RF39; RF24.CA06).'],
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
  // ----- tarefa: variações (ANATOMIAS_E_ESTUDIO.md §2.2) -----
  { id: 'tarefa-var-favorita', kind: 'tarefa', grupo: 'Variações', nome: 'Favorita / salva', uso: 'SavedItem.favorite (RF26.CA04); sub-filtro Favoritas', kicker: 'TAREFA · VARIAÇÃO FAVORITA', fn: () => tarefaCompacto(T({ favorite: true, seal: null, ai: false })) },
  { id: 'tarefa-var-atribuida', kind: 'tarefa', grupo: 'Variações', nome: 'Atribuída', uso: 'Assignment PROPOSTA (RF10/RF46): avatar do atribuidor + prazo', kicker: 'TAREFA · VARIAÇÃO ATRIBUÍDA', fn: () => tarefaCompacto(T({ assigned: { from: 'Ana C. (chefe)', ini: 'AC', due: '15 OUT', status: 'proposta' }, seal: null, ai: false, due: '15 OUT', dueKind: 'ok' })) },
  { id: 'tarefa-var-tarefa-do-dia', kind: 'tarefa', grupo: 'Variações', nome: 'Tarefa do Dia (ficha)', uso: 'DailyTask: ficha de protocolo com índice e HSE (RF44)', kicker: 'TAREFA · VARIAÇÃO TAREFA DO DIA', fn: () => tarefaDia(T({ state: 'em-uso', due: '12 OUT', dueKind: 'soon' })), layout: 'lado' },
  { id: 'tarefa-var-chancelada', kind: 'tarefa', grupo: 'Variações', nome: 'Chancelada (2 emissores · Excelência) · favorita · IA', uso: 'SealBond APROVADA: lacre dourado com fita + azul-marinho (RF39); slots do cabeçalho ✦ · ⭐ deslocados pelo lacre', kicker: 'TAREFA · VARIAÇÃO CHANCELADA + FAVORITA + IA', fn: () => tarefaCompacto(T({ seal: 'excelencia', seal2: true, ai: true, favorite: true, state: 'modelo-publico', counters: { likes: 48, comments: 12, saves: 31, remixes: 9 } })) },
  { id: 'tarefa-var-modelo-balcao', kind: 'tarefa', grupo: 'Variações', nome: 'Modelo oferecido · repasse', uso: 'ModelOffer isHandover (RF40.CA05): etiqueta repasse, preço 0', kicker: 'TAREFA · VARIAÇÃO OFERECIDA NO BALCÃO (REPASSE)', fn: () => tarefaCompacto(T({ state: 'oferecida', price: 0, license: 'cópia livre', handover: true, seal: null, ai: false, variantNote: 'ModelOffer: preço em DP (0 = grátis), licença, "repasse" quando isHandover (RF40.CA01/CA05); contadores viewsCount · remixCount · pointsEarned no perfil (RF40.CA06).' })) },
  { id: 'tarefa-var-remix', kind: 'tarefa', grupo: 'Variações', nome: 'Remix / extraída de projeto', uso: 'originalTaskId + Remix (RF26.CA06, RF23): crédito e reutilizações', kicker: 'TAREFA · VARIAÇÃO REMIX', fn: () => tarefaCompacto(T({ remixFrom: 'Carlos P. (CPOE)', reuse: 7, seal: null, ai: false, variantNote: 'remix: "remixado de <autor>" com crédito imutável na licença ATRIBUIÇÃO (RF40.CA4); no original, "↻ N reutilizações" (RF23.CA04) e "remixado por N pessoas" (RF26.CA06).' })) },
  { id: 'tarefa-var-importada', kind: 'tarefa', grupo: 'Variações', nome: 'Importada / vinculada (Drive)', uso: 'sourceKind GOOGLE, linkMode VINCULADO, TaskVersion (RF20.CA07)', kicker: 'TAREFA · VARIAÇÃO IMPORTADA · VINCULADA', fn: () => tarefaCompacto(T({ type: 'PLANILHA', ext: null, title: 'Planilha orçamentária — lote 2 (Google Sheets)', category: 'Planilha orçamentária', provider: 'drive', imported: { provider: 'Google Drive', ago: '2 h', version: 3 }, seal: null, ai: false, variantNote: 'importada/vinculada: glifo próprio do provedor no cabeçalho (Q-144), "vinculada · sincronizada há N · vN" (TaskVersion); revogar o acesso converte em snapshot (RF20.CA07).' })) },
  { id: 'tarefa-var-prazo-legal', kind: 'tarefa', grupo: 'Variações', nome: 'Com prazo legal (a vencer)', uso: 'legalDueAt: ⚖ âmbar a 3 dias (RF41.CA04)', kicker: 'TAREFA · VARIAÇÃO PRAZO LEGAL (⚖ ÂMBAR)', fn: () => tarefaCompacto(T({ type: 'PROTOCOLO', ext: null, title: 'e-Protocolo 18.223.441-0 — resposta ao DER-PR', category: 'Ofício / memorando', due: 'vence em 2 d', dueKind: 'soon', legal: true, seal: null, ai: false }), { family: 'protocolo' }) },
  { id: 'tarefa-var-em-decisao', kind: 'tarefa', grupo: 'Variações', nome: 'Na sessão DECIA · carimbo VALIDADO', uso: 'Share SESSAO_DECIA + decisão validada (RF29.CA05)', kicker: 'TAREFA · VARIAÇÃO EM DECISÃO (CARIMBO)', fn: () => tarefaCompacto(T({ type: 'ATA_REGISTRO', ext: null, title: 'Ata — decisão sobre a drenagem do km 12', category: 'Ata', session: { tema: 'Drenagem km 12', cls: 'consenso · verde', tok: 'consenso' }, stampDecision: { label: 'Validado', sub: '02/10/2026 · Ana Costa (chefe UTS)', tok: 'class-consenso' }, seal: null, ai: false, state: 'em-uso', variantNote: 'na sessão: chip "na sessão <tema>" com a classe da última mensagem (RF29.CA03, RF38.CA07); decisão validada cria a ATA com carimbo (RF29.CA05).' }), { family: 'carimbo' }) },
  { id: 'tarefa-var-em-kit-evidencia', kind: 'tarefa', grupo: 'Variações', nome: 'Em kit · com evidência · versão', uso: 'KitItem, Evidence.linkedTaskId, TaskVersion — várias variações coexistem', kicker: 'TAREFA · VARIAÇÕES COMBINADAS (KIT · EVIDÊNCIA · VERSÃO)', fn: () => tarefaCompacto(T({ type: 'IMAGEM_EDITADA', ext: null, title: 'Vistoria — relatório fotográfico km 12', category: 'Vistoria / relatório fotográfico', kit: 'Licitação de obra', kitOptional: true, evidence: { n: 14, date: '28 SET', place: 'Londrina' }, version: 2, versionNote: 'recorte e OCR pelo Estúdio', seal: null, ai: false, variantNote: 'três variações no mesmo card: kit (KitItem.optional), evidências (Evidence: data, local, studioStatus) e versão; cada uma é uma linha com glifo próprio — as linhas empilham, a altura cresce, a mídia não muda.' })) },
  { id: 'tarefa-var-duplicada-ia', kind: 'tarefa', grupo: 'Variações', nome: 'Duplicada · gerada por IA', uso: 'cópia do mesmo dono (Q-145) + aiGenerated (RF38.CA04)', kicker: 'TAREFA · VARIAÇÕES DUPLICADA + GERADA POR IA', fn: () => tarefaCompacto(T({ type: 'TEXTO_IA', ext: null, title: 'Minuta de ofício ao DER-PR — v2 (cópia)', category: 'Ofício / memorando', initials: 'OF', duplicateOf: 'Minuta de ofício ao DER-PR', seal: null, ai: true, state: 'rascunho', counters: { likes: 0, comments: 0, saves: 0, remixes: 0 }, due: '—', variantNote: 'duplicada: "cópia de <título>" (sem crédito nem reuseCount — proposta Q-145); gerada por IA: ✦ obrigatória com tooltip de transparência.' }), { family: 'monograma' }) },
  // ----- projeto: variações (ANATOMIAS_E_ESTUDIO.md §4.2) e visões (§3.5) -----
  { id: 'projeto-var-destaque', kind: 'projeto', grupo: 'Variações', nome: 'Destaque do mês · gerado com IA', uso: 'Highlight PROJECT (RF35.CA03): faixa com critérios visíveis; a faísca ✦ desce abaixo da faixa', kicker: 'PROJETO · VARIAÇÃO DESTAQUE DO MÊS + IA', fn: () => projetoMosaico(P({ highlight: 'SECID-UTS · OUT', ai: true, status: 'em-execucao', phase: 5, seal: 'excelencia', counters: { likes: 240, comments: 31, saves: 88, remixes: 12 } })) },
  { id: 'projeto-var-favorito', kind: 'projeto', grupo: 'Variações', nome: 'Favorito / salvo', uso: 'SavedItem.favorite (RF26.CA04); sub-aba Projetos salvos', kicker: 'PROJETO · VARIAÇÃO FAVORITO', fn: () => projetoMosaico(P({ favorite: true })) },
  { id: 'projeto-var-modelo-balcao', kind: 'projeto', grupo: 'Variações', nome: 'Modelo no Balcão · remix', uso: 'ModelOffer PROJECT + originalProjectId (RF40, RF26.CA06)', kicker: 'PROJETO · VARIAÇÕES MODELO NO BALCÃO + REMIX', fn: () => projetoMosaico(P({ offer: { price: 60, license: 'cópia livre', shelf: 'comunidade' }, remixFrom: 'Pavimentação PR-323 (CPOE)', remixedBy: 4, status: 'publicado', variantNote: 'oferta: ModelOffer.pricePoints · license · shelf (RF40.CA01/CA02); remix: originalProjectId com crédito (RF26.CA06); "Criar a partir de modelo" pré-preenche os selects (RF21.CA13).' })) },
  { id: 'projeto-var-atribuido-conformidade', kind: 'projeto', grupo: 'Variações', nome: 'Atribuído · conformidade 72 % ⛔', uso: 'Assignment PROJECT + ComplianceResult (RF10, RF32.CA04)', kicker: 'PROJETO · VARIAÇÕES ATRIBUÍDO + CONFORMIDADE', fn: () => projetoMosaico(P({ assigned: { from: 'Ana C.', to: 'Matheus H.', due: '30 OUT', status: 'aceita' }, conformity: { pct: 72, blocking: 1 }, status: 'publicado', phase: 3, variantNote: 'atribuído: Assignment (quem → para quem · prazo · status) com aceitar/recusar/devolver; conformidade: selo % na capa (semáforo Q-148) + linha com o obrigatório ausente e "Criar tarefa faltante" (RF32.CA03).' })) },
  { id: 'projeto-var-cenario-eixo', kind: 'projeto', grupo: 'Variações', nome: 'Cenário aplicado · eixo · agrupamento · versão', uso: 'ProjectScenario, planAxisId, GroupingItem, ProjectVersion (RF31, RF24, RF25, RF22.CA02)', kicker: 'PROJETO · VARIAÇÕES CENÁRIO + EIXO + AGRUPAMENTO', fn: () => projetoMosaico(P({ scenario: 'corte 20 % orçamento', version: 7, axis: 'Mobilidade (2026)', grouping: 'Programa Cidade Acessível 2026 · Exercício 2026', ai: true, status: 'em-execucao', phase: 5, variantNote: 'cenário aplicado gera ProjectVersion (RF31.CA03) e carrega ✦ (RF31.CA05); eixo do plano em chip na cor do eixo (RF24.CA02); agrupamentos (1 programa + 1 exercício + 1 gestão, RF25.CA02).' })) },
  { id: 'projeto-var-autopilot-privado', kind: 'projeto', grupo: 'Variações', nome: 'Autopilot · visibilidade PRIVADA', uso: 'origin AUTOPILOTO + ✦ (RF30.CA04); PRIVADA = só o dono (DEPARTAMENTO entra no quadro da equipe)', kicker: 'PROJETO · VARIAÇÕES AUTOPILOT + VISIBILIDADE', fn: () => projetoMosaico(P({ ai: true, originLabel: 'criado pelo Autopilot · remixa 3 modelos chancelados', visibilityLabel: 'PRIVADA', status: 'rascunho', phase: 1, title: 'Recapeamento — Rua das Araucárias (proposta)' }), { cover: 'ia' }) },
  { id: 'projeto-visao-linha-do-tempo', kind: 'projeto', grupo: 'Visões de edição (RF22)', nome: 'Linha do tempo (Gantt)', uso: 'SchemeView TIMELINE: barras, dependências, caminho crítico, marcos', kicker: 'PROJETO · VISÃO LINHA DO TEMPO', fn: () => projetoLinhaTempo(PROJETO) },
  { id: 'projeto-visao-quadro-por-fase', kind: 'projeto', grupo: 'Visões de edição (RF22)', nome: 'Quadro por fase (kanban)', uso: 'SchemeView BOARD: 7 colunas, arrastar e encaixar', kicker: 'PROJETO · VISÃO QUADRO POR FASE', fn: () => projetoQuadroFase(PROJETO) },
  { id: 'projeto-composto-kit', kind: 'projeto', grupo: 'Esquemas compostos', nome: 'Kit de Processo', uso: 'ProcessKit + KitItem (= Cápsula); Balcão e Loja', kicker: 'ESQUEMA COMPOSTO · KIT DE PROCESSO', fn: () => projetoKit(PROJETO) },
  { id: 'projeto-composto-agrupamento', kind: 'projeto', grupo: 'Esquemas compostos', nome: 'Agrupamento (Programa)', uso: 'Grouping PROGRAMA · EXERCÍCIO · GESTÃO · FRENTE (RF25)', kicker: 'ESQUEMA COMPOSTO · AGRUPAMENTO', fn: () => projetoAgrupamento(PROJETO) },
  { id: 'projeto-composto-plano', kind: 'projeto', grupo: 'Esquemas compostos', nome: 'Plano Anual / Trilha (6 eixos)', uso: 'AnnualPlan + PlanAxis (RF24)', kicker: 'ESQUEMA COMPOSTO · PLANO ANUAL', fn: () => projetoPlano(PROJETO) },
];

export function render(varn, theme) {
  const card = varn.fn();
  const kindLabel = varn.grupo === 'Esquemas compostos' ? 'Esquema composto' : varn.grupo === 'Visões de edição (RF22)' ? 'Esquema de projeto · visão' : varn.kind === 'tarefa' ? 'Card de tarefa' : 'Card de projeto';
  return anatomy({ theme, kicker: varn.kicker, title: `${kindLabel} — ${varn.nome}`, card, layout: varn.layout, note: `Uso: ${varn.uso}. Diagrama gerado por anatomias/gerar.mjs (não é captura do produto).` });
}

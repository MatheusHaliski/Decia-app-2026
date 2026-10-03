// Galeria estática (index.html): tokens (swatches lidos ao vivo do CSS), ícones, componentes e anatomias nos 4 temas.
import { resolveTheme, THEMES, THEME_IDS, STATIC, SEMANTIC, TASK_STATES, PROJECT_STATUS, PHASES } from './tokens.mjs';
import { ICONS, ICON_GROUPS, iconSprite } from './icons.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ic = (n, cls = '') => `<svg class="ws-icon ${cls}" aria-hidden="true"><use href="#ws-${n}"/></svg>`;

function tokenGroups() {
  const r = resolveTheme('claro'); const keys = Object.keys(r);
  const pick = (re) => keys.filter((k) => re.test(k) && !/-nome$/.test(k));
  return [
    ['Superfícies e tinta', pick(/^(ground|surface|surface-2|surface-3|ink|muted|faint|line|line-soft|focus|scrim)$/)],
    ['Primária institucional (+ gradiente) e secundária', pick(/^(primary|primary-strong|primary-soft|primary-ink|on-primary|primary-gradient|secondary|secondary-strong|secondary-soft|secondary-ink|on-secondary)$/)],
    ['Faísca ✦ da IA', pick(/^(spark|spark-ink|spark-soft|spark-glow|on-spark)$/)],
    ['Classificação de mensagem (RF7)', pick(/^(on-)?class-/)],
    ['Tipo de tarefa (RF38.CA01)', pick(/^(on-)?type-/)],
    ['Documento: cor por extensão', pick(/^(on-)?ext-/)],
    ['Prazo', pick(/^(on-)?due-/)],
    ['Departamentos (sugeridas)', pick(/^(on-)?dept-/)],
    ['Lacres', pick(/^seal-/)],
    ['Estados de tarefa (aliases)', pick(/^state-/)],
    ['Status de projeto (aliases)', pick(/^status-/)],
    ['Sombras e skins da Mesa', pick(/^(shadow|skin)-/)],
  ];
}

function swatches() {
  return tokenGroups().map(([title, keys]) => `<h3>${esc(title)}</h3><div class="sw-grid">` + keys.map((k) => {
    const nomeKey = k.replace(/^on-/, '').replace(/-(ink|soft|glow|strong|hi|lo|edge)$/, '') + '-nome';
    return `<div class="sw" data-token="${k}"><i class="sw__chip" style="background:var(--${k})"></i><code>--${k}</code><span class="sw__hex" data-hex></span><span class="sw__nome" data-nome="${nomeKey}"></span></div>`;
  }).join('') + '</div>').join('');
}

function typeScale() {
  return `<table class="tbl"><tr><th>Token</th><th>Família</th><th>Tamanho / entrelinha / tracking</th><th>Uso</th><th>Amostra</th></tr>` + STATIC.type.map(([t, size, lh, tr, fam, w, uso]) => `<tr><td><code>--text-${t}</code></td><td>${fam}</td><td class="type-data">${size} / ${lh} / ${tr}</td><td>${esc(uso)}</td><td><span class="type-${t}" style="font-weight:${w}">${t === 'label' ? 'Nº 2026/0931' : 'Repartição do futuro'}</span></td></tr>`).join('') + '</table>';
}

function iconGrid() {
  return Object.entries(ICON_GROUPS).map(([g, title]) => `<h3>${title}</h3><div class="ic-grid">` + Object.entries(ICONS).filter(([, v]) => v.grupo === g).map(([n, v]) => `<div class="ic"><svg class="ws-icon ws-icon--lg" role="img" aria-label="${esc(v.nome)}"><use href="#ws-${n}"/></svg><code>${n}</code><small>${esc(v.nome)}</small></div>`).join('') + '</div>').join('');
}

function componentDemos() {
  const tagsTask = Object.entries(TASK_STATES).map(([k, s]) => `<span class="ws-tag ${s.estilo === 'pulso' ? 'ws-tag--pulse' : ''}" data-state="${k}">${s.estilo === 'cadeado' ? ic('cadeado') : s.estilo === 'ficha' ? ic('ficha-dp') : ''}${esc(s.nome)}${s.estilo === 'estrela' ? ic('estrela') : ''}</span>`).join(' ');
  const tagsProj = Object.entries(PROJECT_STATUS).map(([k, s]) => `<span class="ws-tag ${s.estilo === 'pulso' ? 'ws-tag--pulse' : ''}" data-status="${k}">${esc(s.nome)}</span>`).join(' ');
  const tagsClass = Object.entries(SEMANTIC.class).map(([k, [, nome]]) => `<span class="ws-tag" data-class="${k}">${k} · ${nome}</span>`).join(' ');
  const phase = (cur) => `<div class="ws-phasebar" role="img" aria-label="fase ${cur + 1} de 7: ${PHASES[cur]}"><div class="ws-phasebar__track">${PHASES.map((p, i) => `<div class="ws-phasebar__seg" ${i < cur ? 'data-done' : ''} ${i === cur ? 'aria-current="step"' : ''} title="${p}"></div>`).join('')}</div><div class="ws-phasebar__label">${PHASES[cur]} · ${cur + 1}/7</div></div>`;
  const typeChips = Object.entries(SEMANTIC.type).map(([k, [, nome]]) => `<span class="ws-card__typechip" style="--tt:var(--type-${k});--tt-soft:var(--type-${k}-soft)" title="${k} · ${nome}">${ic(k === 'desenho-tecnico' ? 'desenho-tecnico' : k)}</span>`).join(' ');
  return `
<h3>Button — ícones SVG próprios por ação</h3>
<div class="row">
  <button class="ws-btn ws-btn--primary">${ic('criar-tarefa')}Criar tarefa</button>
  <button class="ws-btn ws-btn--primary">${ic('criar-projeto')}Criar projeto</button>
  <button class="ws-btn ws-btn--gradient">${ic('abrir-decia')}Abrir sessão DECIA</button>
  <button class="ws-btn">${ic('chancelar')}Chancelar</button>
  <button class="ws-btn">${ic('oferecer-balcao')}Oferecer no Balcão</button>
  <button class="ws-btn">${ic('transformar-tarefa')}Transformar em tarefa</button>
  <button class="ws-btn ws-btn--secondary">${ic('validar-decisao')}Validar decisão</button>
  <button class="ws-btn ws-btn--danger">${ic('devolver-decisao')}Devolver</button>
  <button class="ws-btn ws-btn--spark">${ic('faisca')}Pedir capa à IA</button>
  <button class="ws-btn ws-btn--ghost">${ic('salvar')}Salvar</button>
  <button class="ws-btn ws-btn--icon" aria-label="Notificações">${ic('sino')}</button>
  <button class="ws-btn ws-btn--sm">Pequeno</button><button class="ws-btn ws-btn--lg">Grande</button>
  <button class="ws-btn" disabled>Desabilitado</button>
  <button class="ws-btn ws-btn--primary" aria-busy="true">${ic('faisca')}Gerando…</button>
</div>
<h3>Etiquetas de estado (TaskState · ProjectStatus · MessageClass) — nome e cor em texto</h3>
<div class="row">${tagsTask}</div><div class="row">${tagsProj}</div><div class="row">${tagsClass}</div>
<div class="row"><span class="ws-due">${ic('relogio')}12 OUT</span><span class="ws-due" data-due="soon">${ic('relogio')}vence em 2 dias</span><span class="ws-due" data-due="over">${ic('balanca')}vencido há 2 d · prazo legal</span></div>
<h3>Ícones por tipo de tarefa em chip</h3><div class="row">${typeChips}</div>
<h3>Stamp (carimbo) · Lacre (Seal) · Faísca ✦ · Ficha DP</h3>
<div class="row" style="gap:1.5rem;align-items:center">
  <span class="ws-stamp">Validado<small>02/10/2026 · Ana Costa (chefe UTS)</small></span>
  <span class="ws-stamp ws-stamp--devolvido">Devolvido<small>02/10/2026 · falta parecer jurídico</small></span>
  <span class="ws-stamp ws-stamp--mini">Concluída</span>
  <span class="ws-seal" role="img" aria-label="chancela da empresa (lacre dourado)">S</span>
  <span class="ws-seal ws-seal--navy" role="img" aria-label="chancela do chefe (lacre azul-marinho)">U</span>
  <span class="ws-seal ws-seal--ribbon" role="img" aria-label="chancela de Excelência">S</span>
  <span class="ws-seal ws-seal--broken" role="img" aria-label="chancela recusada">S</span>
  <span class="ws-seal ws-seal--sm" role="img" aria-label="lacre pequeno">S</span>
  <span class="ws-spark" role="img" aria-label="gerado por IA">${ic('faisca')}</span>
  <span class="ws-spark ws-spark--busy" role="img" aria-label="IA gerando">${ic('faisca')}</span>
  <span class="ws-spark-note"><span class="ws-spark">${ic('faisca')}</span>gerado por IA em 01/10/2026 · revisado por Maria H.</span>
  <span class="ws-dp">${ic('ficha-dp')}+6 DP</span>
</div>
<h3>PhaseBar (7 fases)</h3>
<div class="grid3">${phase(0)}${phase(2)}${phase(6)}</div>
<h3>DecisionThread (fio de decisão, RF29)</h3>
<ol class="ws-thread" style="max-width:520px">
  <li class="ws-thread__node" data-class="argumento"><div class="ws-thread__meta"><b>argumento · azul</b> · Maria H. · 10:42</div>Reutilizar o parecer do lote 1 como base.</li>
  <li class="ws-thread__node" data-kind="tarefa"><div class="ws-thread__meta"><b>tarefa anexada</b></div>Parecer técnico — lote 1 (PDF)</li>
  <li class="ws-thread__node" data-class="divergencia"><div class="ws-thread__meta"><b>divergência · laranja</b> · Carlos P. · 10:50</div>O lote 2 tem solo diferente; o parecer não se aplica à drenagem.</li>
  <li class="ws-thread__node" data-class="pergunta"><div class="ws-thread__meta"><b>pergunta · roxo</b> · IA ${ic('faisca')} · 10:51</div>Existe sondagem do km 12 ao 14 anexada ao projeto?</li>
  <li class="ws-thread__node" data-class="risco"><div class="ws-thread__meta"><b>risco · vermelho</b> · IA · 11:02</div>Sem sondagem, o prazo legal do TR (20 OUT) fica em risco.</li>
  <li class="ws-thread__node" data-class="consenso"><div class="ws-thread__meta"><b>consenso · verde</b> · 11:30</div>Contratar sondagem antes de fechar o TR.</li>
  <li class="ws-thread__node" data-kind="decisao" data-class="consenso"><div class="ws-thread__meta"><b>decisão</b></div><span class="ws-stamp ws-stamp--mini">Validado · 02/10 · Ana Costa</span></li>
</ol>
<h3>Card de tarefa (HTML/CSS ao vivo) · Card de projeto · Lista</h3>
<div class="grid3" style="align-items:start">
  <article class="ws-card" data-state="disponivel" aria-labelledby="t1">
    <div class="ws-card__art" data-family="protocolo" aria-hidden="true"></div>
    <div class="ws-card__frame"><div class="ws-card__content">
      <div class="ws-card__head"><span class="ws-card__typechip" style="--tt:var(--ext-pdf);--tt-soft:var(--type-documento-soft)">${ic('documento')}</span><div><div class="ws-card__cat">Parecer técnico</div><div class="ws-card__sub">SECID-UTS · PDF</div></div><span class="ws-spark" style="margin-left:auto" role="img" aria-label="gerado por IA">${ic('faisca')}</span></div>
      <div class="ws-card__media">${ic('documento', 'ws-icon--lg')}</div>
      <h4 class="ws-card__title" id="t1"><a href="#">Parecer técnico — pavimentação da PR-445, lote 2 (Londrina)</a></h4>
      <div class="ws-card__meta"><span class="ws-tag" data-state="disponivel">Disponível</span><span class="ws-due">${ic('relogio')}12 OUT</span></div>
      <div class="ws-card__foot"><span><span class="ws-avatar">MH</span> Matheus H.</span><span class="ws-card__counters"><button aria-pressed="true" aria-label="curtir, 12">${ic('curtir')}12</button><button aria-label="comentar, 3">${ic('comentar')}3</button><button aria-label="salvar, 5">${ic('salvar')}5</button><button aria-label="remixar, 1">${ic('remixar')}1</button></span></div>
    </div></div>
    <span class="ws-card__seal ws-seal ws-seal--sm" role="img" aria-label="chancela da empresa">S</span>
  </article>
  <article class="ws-project" data-status="aprovado" aria-labelledby="p1">
    <div class="ws-project__cover"><div class="ws-mosaic"><span>${ic('documento')}</span><span>${ic('planilha')}</span><span>${ic('desenho-tecnico')}</span><span>${ic('texto-ia')}</span><span>${ic('cronograma')}</span><span>${ic('ata-registro')}</span></div><span class="ws-ring" style="--p:71" data-label="5/7" role="img" aria-label="progresso 71%"></span><span class="ws-stamp">Validado<small>02/10/2026 · Ana Costa</small></span></div>
    <h4 class="ws-project__title" id="p1">Pavimentação urbana — PR-445, lote 2</h4>
    <div class="ws-project__row"><span><span class="ws-monogram">UTS</span> <b>SECID-UTS</b></span><span class="ws-tag" data-status="aprovado">Aprovado</span></div>
    ${phase(4)}
    <div class="ws-project__row"><span>${ic('marco')} <b class="type-data">18 OUT</b> · Entrega do TR</span><span class="type-caption">7 tarefas · 4 pessoas</span></div>
    <div class="ws-project__row"><span class="ws-project__event">${ic('abrir-decia')}decisão validada há 2 dias</span><span class="ws-card__counters"><button aria-label="curtir, 24">${ic('curtir')}24</button><button aria-label="comentar, 9">${ic('comentar')}9</button></span></div>
    <span class="ws-project__seal ws-seal" role="img" aria-label="chancela da empresa">S</span>
  </article>
  <div style="display:grid;gap:.5rem">
    <article class="ws-card ws-card--list" data-state="em-uso"><div class="ws-card__frame"><div class="ws-card__content"><div class="ws-card__media">${ic('planilha')}</div><div><h4 class="ws-card__title"><a href="#">Planilha orçamentária — lote 2</a></h4><div class="ws-card__sub">Planilha orçamentária · SECID-UTS · XLSX</div></div><span class="ws-tag ws-tag--pulse" data-state="em-uso">Em uso</span><span class="ws-due" data-due="soon">${ic('relogio')}04 OUT</span><span class="ws-avatar">MH</span></div></div></article>
    <article class="ws-card ws-card--list" data-state="bloqueada"><div class="ws-card__frame"><div class="ws-card__content"><div class="ws-card__media">${ic('ata-registro')}</div><div><h4 class="ws-card__title"><a href="#">Ata da 12ª reunião do Conselho</a></h4><div class="ws-card__sub">Ata · SECID-UTS</div></div><span class="ws-tag" data-state="bloqueada">${ic('cadeado')}Bloqueada</span><span class="ws-due" data-due="over">${ic('balanca')}vencido</span><span class="ws-avatar">AC</span></div></div></article>
    <article class="ws-card ws-card--list" data-state="rascunho"><div class="ws-card__frame"><div class="ws-card__content"><div class="ws-card__media"></div><div><h4 class="ws-card__title"><a href="#">Sem título</a></h4><div class="ws-card__sub">rascunho salvo há 1 min</div></div><span class="ws-tag" data-state="rascunho">Rascunho</span><span class="ws-due">—</span><span class="ws-avatar">MH</span></div></div></article>
    <div class="ws-card" style="--x:0;--top:0;--bottom:0;border-color:var(--line-soft);border-width:1px"><div class="ws-card__frame"><div class="ws-card__content"><div class="ws-skeleton ws-skeleton--media"></div><div class="ws-skeleton ws-skeleton--text"></div><div class="ws-skeleton ws-skeleton--text short"></div></div></div></div>
  </div>
</div>
<h3>SelectList (pesquisável, múltiplo, miniatura/ícone/estado, desabilitado com motivo)</h3>
<div class="ws-select" data-open="true" style="max-width:360px;margin-bottom:200px">
  <button class="ws-select__trigger" aria-haspopup="listbox" aria-expanded="true">${ic('acervo')}Tarefas do projeto (2)${ic('chevron', 'ws-select__chevron')}</button>
  <div class="ws-select__pop" role="listbox" aria-multiselectable="true">
    <input class="ws-input ws-select__search" placeholder="Buscar no acervo…" aria-label="Buscar">
    <div class="ws-select__opt" role="option" aria-selected="false"><span class="ws-card__media">${ic('documento')}</span>${ic('documento')}<div><b>Parecer técnico — lote 2</b><small><i></i>Disponível · Parecer técnico</small></div><span></span></div>
    <div class="ws-select__opt" role="option" aria-selected="true" data-active="true"><span class="ws-card__media">${ic('planilha')}</span>${ic('planilha')}<div><b>Planilha orçamentária — lote 2</b><small><i></i>Disponível · Planilha</small></div>${ic('check')}</div>
    <div class="ws-select__opt" role="option" aria-selected="false" aria-disabled="true"><span class="ws-card__media">${ic('cronograma')}</span>${ic('cronograma')}<div><b>Cronograma físico-financeiro</b><small class="reason"><i style="background:var(--class-argumento)"></i>em uso no projeto PR-445 (2026)</small></div>${ic('cadeado')}</div>
  </div>
</div>
<h3>TopBar · SidebarNav (grupos Descobrir / Meu trabalho / Criar / Jogar e ganhar / Gestão)</h3>
<div class="shell">
  <div class="ws-topbar"><button class="ws-btn ws-btn--ghost ws-btn--icon" aria-label="Recolher menu">${ic('recolher')}</button><span class="ws-topbar__brand"><i></i>Work Station</span><div class="ws-topbar__search">${ic('busca')}Buscar tarefas, projetos, decisões… <kbd class="type-label" style="margin-left:auto">⌘K</kbd></div><div class="ws-topbar__right"><span class="ws-dp">${ic('ficha-dp')}128 DP</span><button class="ws-btn ws-btn--ghost ws-btn--icon" aria-label="Notificações (3)">${ic('sino')}</button><span class="ws-avatar" style="width:32px;height:32px;font-size:11px">MH</span></div></div>
  <div class="shell__body">
    <nav class="ws-sidebar" aria-label="Principal">
      <div><div class="ws-nav__group">Descobrir</div><a class="ws-nav__link" href="#">${ic('vitrine')}<span class="ws-nav__label">Vitrine</span></a><a class="ws-nav__link" href="#">${ic('mural')}<span class="ws-nav__label">Mural</span></a><a class="ws-nav__link" href="#">${ic('balcao')}<span class="ws-nav__label">Balcão de modelos</span></a></div>
      <div><div class="ws-nav__group">Meu trabalho</div><a class="ws-nav__link" href="#" aria-current="page">${ic('acervo')}<span class="ws-nav__label">Acervo de tarefas</span><span class="ws-nav__badge">3</span></a><a class="ws-nav__link" href="#">${ic('mesa')}<span class="ws-nav__label">Projetos e Mesa</span></a><a class="ws-nav__link" href="#">${ic('abrir-decia')}<span class="ws-nav__label">Sessões DECIA</span></a></div>
      <div><div class="ws-nav__group">Criar</div><a class="ws-nav__link" href="#">${ic('criar-tarefa')}<span class="ws-nav__label">Nova tarefa</span></a><a class="ws-nav__link" href="#">${ic('criar-projeto')}<span class="ws-nav__label">Novo projeto</span></a></div>
      <div><div class="ws-nav__group">Jogar e ganhar</div><a class="ws-nav__link" href="#">${ic('jogar-ganhar')}<span class="ws-nav__label">Metas e Loja</span></a><a class="ws-nav__link" href="#">${ic('medalha')}<span class="ws-nav__label">Chancelas</span></a></div>
      <div><div class="ws-nav__group">Gestão</div><a class="ws-nav__link" href="#">${ic('gestao')}<span class="ws-nav__label">Painel</span></a></div>
    </nav>
    <div class="shell__main"><div class="ws-empty">${ic('pasta-vazia')}<h3>Mesa vazia</h3><span>Arraste uma tarefa do Acervo ou peça à IA um projeto a partir de uma demanda.</span><button class="ws-btn ws-btn--primary">${ic('criar-tarefa')}Criar a primeira tarefa</button></div></div>
  </div>
</div>
<h3>BackgroundArt — skins da Mesa (papel · cortiça · blueprint · papel timbrado) + Post-it</h3>
<div class="grid4">${['papel', 'cortica', 'blueprint', 'papel-timbrado'].map((k) => `<div class="ws-desk" data-skin="${k}"><div class="ws-postit">Pavimentação PR-445 — lote 2<small>Elaboração · 3/7 · 7 tarefas</small></div><code class="desk-label">--skin-${k}</code></div>`).join('')}</div>
<h3>Toast · EmptyState · ErrorState</h3>
<div class="row" style="align-items:flex-start">
  <div class="ws-toast" data-tone="sucesso" role="status">${ic('validar-decisao')}<span><b>Decisão validada.</b> O grupo foi notificado e a ata foi criada em APROVAÇÃO.</span></div>
  <div class="ws-toast" data-tone="erro" role="alert">${ic('alerta')}<span><b>Não foi possível salvar.</b> Outra janela aplicou antes (409). Recarregue para comparar.</span></div>
  <div class="ws-toast" data-tone="ia" role="status"><span class="ws-spark">${ic('faisca')}</span><span><b>Capa gerada.</b> Revise antes de publicar.</span></div>
  <div class="ws-error" role="alert"><b>${ic('alerta')} Tarefa com classificação SIGILOSO</b><span>Não pode ser enviada à IA externa. Use o modo local ou remova o anexo.</span><code>403 ACESSO_NEGADO · RF20</code></div>
</div>`;
}

export function renderIndex(variacoes) {
  const themeBtns = THEME_IDS.map((t) => `<button type="button" data-set-theme="${t}" aria-pressed="${t === 'claro'}">${THEMES[t].label}</button>`).join('');
  const groups = (kind) => [...new Set(variacoes.filter((v) => v.kind === kind).map((v) => v.grupo))];
  const anat = (kind) => groups(kind).map((gname) => `<h3>${gname}</h3><div class="an-grid">` + variacoes.filter((v) => v.kind === kind && v.grupo === gname).map((v) => `<figure class="an"><img data-svg="${v.id}" src="svg/${v.id}--claro.svg" alt="Anatomia: ${esc(v.nome)}" loading="lazy"><figcaption><b>${esc(v.nome)}</b> — ${esc(v.uso)} · <a href="svg/${v.id}--claro.svg" data-href="${v.id}">SVG</a></figcaption></figure>`).join('') + '</div>').join('');
  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Design system Work Station / DECIA — galeria</title>
<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../components.css">
<style>
main{max-width:1200px;margin:0 auto;padding:24px 16px 96px}
h1{font-family:var(--font-editorial);font-size:30px;font-weight:600;margin:0 0 4px}
h2{font-family:var(--font-editorial);font-size:22px;font-weight:600;margin:48px 0 8px;padding-top:16px;border-top:1.5px solid var(--line-soft)}
h3{font-size:14px;font-weight:600;margin:22px 0 8px}
p.lead{color:var(--muted);max-width:76ch;margin:0 0 12px}
code{font-family:var(--font-data);font-size:11px;background:var(--surface-2);padding:1px 5px;border-radius:4px}
.bar{position:sticky;top:0;z-index:var(--z-sticky);display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 0;background:color-mix(in srgb,var(--ground) 92%,transparent);backdrop-filter:blur(6px)}
.bar .seg{display:inline-flex;border:1.5px solid var(--line);border-radius:999px;overflow:hidden}
.bar .seg button{all:unset;cursor:pointer;padding:6px 12px;font-size:13px;font-weight:600}
.bar .seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.bar label{font-size:12px;display:inline-flex;gap:4px;align-items:center}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.sw{display:grid;grid-template-columns:36px 1fr;grid-template-rows:auto auto auto;column-gap:8px;align-items:center;padding:6px;border:1px solid var(--line-soft);border-radius:8px;background:var(--surface)}
.sw__chip{grid-row:1/4;width:36px;height:36px;border-radius:6px;border:1px solid var(--line-soft)}
.sw code{background:none;padding:0;font-size:10px}.sw__hex{font-family:var(--font-data);font-size:10px;color:var(--muted)}.sw__nome{font-size:10px;color:var(--muted);font-style:italic}
.ic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}
.ic{display:grid;justify-items:center;gap:3px;padding:8px 4px;border:1px solid var(--line-soft);border-radius:8px;background:var(--surface);text-align:center}
.ic small{font-size:9.5px;color:var(--muted)}.ic code{font-size:9.5px}
.tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th,.tbl td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line-soft);vertical-align:top}.tbl th{font-family:var(--font-data);font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
.desk-label{position:absolute;right:8px;bottom:8px}
.shell{border:1px solid var(--line-soft);border-radius:var(--radius-lg);overflow:hidden;background:var(--ground)}
.shell__body{display:grid;grid-template-columns:auto 1fr;min-height:360px}.shell__main{padding:16px}
@media (max-width:1023px){.shell__body{grid-template-columns:1fr}.shell .ws-sidebar{display:grid}}
.an-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px}
.an{margin:0}.an img{width:100%;height:auto;border:1px solid var(--line-soft);border-radius:8px;background:var(--surface)}
.an figcaption{font-size:11px;color:var(--muted);margin-top:4px}
.toc{columns:2;column-gap:32px;padding-left:18px;font-size:13px}
</style>
</head>
<body>
${iconSprite()}
<main>
<p class="type-label" style="color:var(--muted)">Work Station / DECIA · design system v1 · RF38 · ${new Date().toISOString().slice(0, 10)}</p>
<h1>A repartição do futuro — tokens, ícones, componentes e anatomias</h1>
<p class="lead">Galeria estática gerada por <code>anatomias/gerar.mjs</code> (sem build). Troque o tema: tudo responde a <code>data-theme</code> no <code>&lt;html&gt;</code>, inclusive os valores dos swatches, lidos ao vivo do CSS. Especificação em <code>DESIGN_SYSTEM.md</code> e <code>ANATOMIA_CARDS.md</code>.</p>
<div class="bar"><span class="seg" role="group" aria-label="Tema">${themeBtns}</span>
<span class="seg" role="group" aria-label="Densidade"><button type="button" data-set-density="confortavel" aria-pressed="true">Confortável</button><button type="button" data-set-density="compacta" aria-pressed="false">Compacta</button></span>
<label><input type="checkbox" id="rm"> reduzir movimento</label></div>
<ol class="toc"><li><a href="#tokens">Tokens</a></li><li><a href="#tipografia">Tipografia</a></li><li><a href="#icones">Ícones</a></li><li><a href="#componentes">Componentes</a></li><li><a href="#anat-tarefa">Anatomias · card de tarefa</a></li><li><a href="#anat-projeto">Anatomias · card de projeto</a></li></ol>

<h2 id="tokens">1. Tokens de cor (<code>tokens.css</code>)</h2>
<p class="lead">Cada família traz <code>fill</code> (glifo/borda, ≥ 3:1), <code>-ink</code> (texto, ≥ 4,5:1 sobre surface, surface-2 e o <code>-soft</code>), <code>-soft</code> (fundo de etiqueta) e <code>-nome</code> (nome da cor em texto). Os hex abaixo são lidos do tema ativo.</p>
${swatches()}
<h2 id="tipografia">2. Tipografia</h2>
<p class="lead">Editorial (serif) para nomes e títulos · UI (sans) para interface · Data (mono) para números, códigos, etiquetas e carimbos. Fontes: Source Serif 4 · Public Sans · IBM Plex Mono (next/font; aqui, fallbacks do sistema).</p>
${typeScale()}
<h2 id="icones">3. Ícones (glifos próprios, 24 px, traço 1,8, currentColor)</h2>
${iconGrid()}
<h2 id="componentes">4. Componentes (<code>components.css</code>)</h2>
${componentDemos()}
<h2 id="anat-tarefa">5. Anatomias · card de tarefa (${variacoes.filter((v) => v.kind === 'tarefa').length} variações × 4 temas)</h2>
${anat('tarefa')}
<h2 id="anat-projeto">6. Anatomias · card de projeto (${variacoes.filter((v) => v.kind === 'projeto').length} variações × 4 temas)</h2>
${anat('projeto')}
</main>
<script>
(function(){
  const root=document.documentElement;
  function hexify(v){v=v.trim();if(/^#/.test(v))return v.toUpperCase();const m=v.match(/^rgba?\\(([^)]+)\\)/);if(m){const p=m[1].split(/[\\s,\\/]+/).map(Number);return '#'+p.slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase()+(p[3]!==undefined&&p[3]<1?' α'+p[3]:'');}return v;}
  function refresh(){const cs=getComputedStyle(root);document.querySelectorAll('.sw').forEach(el=>{const v=cs.getPropertyValue('--'+el.dataset.token).trim();el.querySelector('[data-hex]').textContent=v.length>40?v.slice(0,38)+'…':hexify(v);const n=el.querySelector('[data-nome]');const nome=cs.getPropertyValue('--'+n.dataset.nome).trim().replace(/^"|"$/g,'');n.textContent=nome||'';});
    const t=root.dataset.theme;document.querySelectorAll('img[data-svg]').forEach(i=>{i.src='svg/'+i.dataset.svg+'--'+t+'.svg';});document.querySelectorAll('a[data-href]').forEach(a=>{a.href='svg/'+a.dataset.href+'--'+t+'.svg';});
    document.querySelectorAll('[data-set-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.setTheme===t)));}
  document.querySelectorAll('[data-set-theme]').forEach(b=>b.addEventListener('click',()=>{root.dataset.theme=b.dataset.setTheme;try{localStorage.setItem('ws.theme',b.dataset.setTheme)}catch(e){}refresh();}));
  document.querySelectorAll('[data-set-density]').forEach(b=>b.addEventListener('click',()=>{root.dataset.density=b.dataset.setDensity;document.querySelectorAll('[data-set-density]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
  document.getElementById('rm').addEventListener('change',e=>{root.dataset.reduceMotion=e.target.checked?'true':'false';});
  try{const s=localStorage.getItem('ws.theme');if(s&&${JSON.stringify(THEME_IDS)}.includes(s))root.dataset.theme=s;}catch(e){}
  new MutationObserver(refresh).observe(root,{attributes:true,attributeFilter:['data-theme']});
  refresh();
})();
</script>
</body></html>
`;
}

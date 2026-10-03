// Work Station / DECIA — fonte de verdade dos tokens de design (v1).
// Daqui saem: docs/design-system/tokens.css, a tabela de contraste do DESIGN_SYSTEM.md e os <style> dos SVGs.
// Regra: toda cor "-ink" é derivada matematicamente até cumprir ≥ 4,5:1 (texto) contra surface, surface-2 e o próprio
// "-soft" (fundo da etiqueta). Toda cor "fill" (glifo, borda, nó) cumpre ≥ 3:1 contra surface (WCAG 1.4.11).
import { contrast, ensure, lighten, mix } from './cor.mjs';

/* ------------------------------------------------------------------------------------------------
 * 1. Temas: neutros e cores de marca (escolhidos à mão). Nome em português = valor de ThemeMode/UserPreferences.
 * ------------------------------------------------------------------------------------------------ */
export const THEMES = {
  claro: {
    label: 'Claro', scheme: 'light', dir: 'darker', textMin: 4.5, softMix: 0.14,
    n: { ground: '#F3F1EA', surface: '#FFFFFF', 'surface-2': '#F4F2EC', 'surface-3': '#E8E5DB', ink: '#1B1F26', muted: '#5A6069', faint: '#666D76', line: '#1B1F26', 'line-soft': '#D9D5CA', focus: '#1B4F8A', scrim: 'rgba(27,31,38,.48)' },
    primary: { fill: '#1B4F8A', strong: '#123A66', soft: '#E3ECF7', on: '#FFFFFF', gradient: 'linear-gradient(135deg,#123A66 0%,#1B4F8A 55%,#2F7BC4 100%)', nome: 'azul-protocolo' },
    secondary: { fill: '#1F7A4B', strong: '#165C38', soft: '#DFF2E7', on: '#FFFFFF', nome: 'verde-araucária' },
    seal: { gold: '#C9A227', 'gold-hi': '#EAD27A', 'gold-lo': '#8F6E12', 'gold-edge': '#8F6E12', navy: '#1F3A68', 'navy-hi': '#4F6FA3', 'navy-lo': '#0F1F3C', 'navy-edge': '#0F1F3C', ribbon: '#B3202E', broken: '#9A948A' },
    shadow: { 1: '0 1px 2px rgba(27,31,38,.08), 0 2px 6px -2px rgba(27,31,38,.10)', 2: '0 1px 2px rgba(27,31,38,.08), 0 10px 28px -14px rgba(27,31,38,.22)', 3: '0 2px 4px rgba(27,31,38,.10), 0 24px 56px -24px rgba(27,31,38,.32)', aura: '0 0 0 2px #FFFFFF, 0 0 18px 2px rgba(27,79,138,.28)' },
    skin: {
      papel: 'repeating-linear-gradient(0deg, rgba(27,31,38,.035) 0 1px, transparent 1px 28px), #F3F1EA',
      cortica: 'radial-gradient(rgba(70,45,20,.18) 1px, transparent 1.6px) 0 0/9px 9px, radial-gradient(rgba(255,235,200,.35) 1px, transparent 1.4px) 4px 5px/11px 11px, #B98B5A',
      blueprint: 'linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0/6px 6px, linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0/6px 6px, #16437A',
      'papel-timbrado': 'linear-gradient(180deg, #1B4F8A 0 10px, transparent 10px), repeating-linear-gradient(0deg, rgba(27,31,38,.03) 0 1px, transparent 1px 28px), #F7F5EF',
    },
  },
  escuro: {
    label: 'Escuro', scheme: 'dark', dir: 'lighter', textMin: 4.5, softMix: 0.24,
    n: { ground: '#121417', surface: '#1C1F24', 'surface-2': '#23272E', 'surface-3': '#2C313A', ink: '#ECEAE4', muted: '#AEB3BB', faint: '#9CA2AB', line: '#C8CCD3', 'line-soft': '#394049', focus: '#8DBFF2', scrim: 'rgba(0,0,0,.6)' },
    primary: { fill: '#5E9FE6', strong: '#3F7FC7', soft: '#1E3350', on: '#0B1A2C', gradient: 'linear-gradient(135deg,#2C5A95 0%,#3F7FC7 55%,#7FB6F0 100%)', nome: 'azul-protocolo' },
    secondary: { fill: '#4CB87E', strong: '#2E9560', soft: '#163828', on: '#06301A', nome: 'verde-araucária' },
    seal: { gold: '#D4AF37', 'gold-hi': '#F2DC8A', 'gold-lo': '#8F6E12', 'gold-edge': '#F2DC8A', navy: '#2E4F86', 'navy-hi': '#8DB0E0', 'navy-lo': '#15284D', 'navy-edge': '#8DB0E0', ribbon: '#D23B4A', broken: '#6E6A62' },
    shadow: { 1: '0 1px 2px rgba(0,0,0,.4), 0 2px 6px -2px rgba(0,0,0,.5)', 2: '0 1px 2px rgba(0,0,0,.45), 0 10px 28px -14px rgba(0,0,0,.7)', 3: '0 2px 4px rgba(0,0,0,.5), 0 24px 56px -24px rgba(0,0,0,.8)', aura: '0 0 0 2px #1C1F24, 0 0 18px 2px rgba(94,159,230,.35)' },
    skin: {
      papel: 'repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 28px), #15181C',
      cortica: 'radial-gradient(rgba(0,0,0,.35) 1px, transparent 1.6px) 0 0/9px 9px, radial-gradient(rgba(255,220,170,.12) 1px, transparent 1.4px) 4px 5px/11px 11px, #4E3A26',
      blueprint: 'linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px) 0 0/24px 24px, #0E2E56',
      'papel-timbrado': 'linear-gradient(180deg, #5E9FE6 0 10px, transparent 10px), repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 28px), #15181C',
    },
  },
  contraste: {
    label: 'Alto contraste', scheme: 'dark', dir: 'lighter', textMin: 7, softMix: 0,
    n: { ground: '#000000', surface: '#000000', 'surface-2': '#0F0F0F', 'surface-3': '#1A1A1A', ink: '#FFFFFF', muted: '#FFFFFF', faint: '#E6E6E6', line: '#FFFFFF', 'line-soft': '#FFFFFF', focus: '#FFFF00', scrim: 'rgba(0,0,0,.85)' },
    primary: { fill: '#FFD400', strong: '#FFD400', soft: '#000000', on: '#000000', gradient: 'linear-gradient(135deg,#FFD400,#FFD400)', nome: 'amarelo' },
    secondary: { fill: '#7CF2B2', strong: '#7CF2B2', soft: '#000000', on: '#000000', nome: 'verde' },
    seal: { gold: '#FFD400', 'gold-hi': '#FFD400', 'gold-lo': '#000000', 'gold-edge': '#FFFFFF', navy: '#8EC5FF', 'navy-hi': '#8EC5FF', 'navy-lo': '#000000', 'navy-edge': '#FFFFFF', ribbon: '#FF8080', broken: '#BFBFBF' },
    shadow: { 1: 'none', 2: 'none', 3: 'none', aura: 'none' },
    skin: { papel: '#000000', cortica: '#000000', blueprint: '#000000', 'papel-timbrado': '#000000' },
  },
  blueprint: {
    label: 'Blueprint', scheme: 'dark', dir: 'lighter', textMin: 4.5, softMix: 0.28,
    n: { ground: '#0A2748', surface: '#0F3260', 'surface-2': '#143A6C', 'surface-3': '#1A4479', ink: '#EAF2FF', muted: '#B5CBEA', faint: '#A1BBDF', line: '#DCE9FB', 'line-soft': '#2C5C94', focus: '#FFD166', scrim: 'rgba(5,20,40,.7)' },
    primary: { fill: '#8EC5FF', strong: '#5EA8F5', soft: '#1E4B82', on: '#07203F', gradient: 'linear-gradient(135deg,#5EA8F5 0%,#8EC5FF 60%,#CFE6FF 100%)', nome: 'ciano-traço' },
    secondary: { fill: '#7FE3A6', strong: '#4FC986', soft: '#174B3A', on: '#06301A', nome: 'verde-giz' },
    seal: { gold: '#E0BC45', 'gold-hi': '#F6E39A', 'gold-lo': '#9C7A14', 'gold-edge': '#F6E39A', navy: '#2E5A94', 'navy-hi': '#9CC4F2', 'navy-lo': '#143A6C', 'navy-edge': '#DCE9FB', ribbon: '#FF8A8A', broken: '#7E95B5' },
    shadow: { 1: '0 1px 2px rgba(0,10,30,.5)', 2: '0 1px 2px rgba(0,10,30,.5), 0 10px 28px -14px rgba(0,10,30,.8)', 3: '0 2px 4px rgba(0,10,30,.6), 0 24px 56px -24px rgba(0,10,30,.9)', aura: '0 0 0 2px #0F3260, 0 0 18px 2px rgba(142,197,255,.4)' },
    skin: {
      papel: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px) 0 0/24px 24px, #0A2748',
      cortica: 'radial-gradient(rgba(0,0,0,.3) 1px, transparent 1.6px) 0 0/9px 9px, #3F3A2E',
      blueprint: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0/6px 6px, linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0/6px 6px, #0A2748',
      'papel-timbrado': 'linear-gradient(180deg, #8EC5FF 0 10px, transparent 10px), #0A2748',
    },
  },
};
export const THEME_IDS = Object.keys(THEMES);

/* ------------------------------------------------------------------------------------------------
 * 2. Cores semânticas: base (tema claro) + nome em texto (daltonismo, RF38.CA05/§11). Os tons por tema são derivados.
 * ------------------------------------------------------------------------------------------------ */
export const SEMANTIC = {
  // Faísca ✦ da IA (RF38.CA04) — tudo que a IA gerou
  spark: { spark: ['#E39B12', 'âmbar'] },
  // Classificação de mensagem (RF7 / RF38.CA07)
  class: {
    argumento: ['#2F7BC4', 'azul'], divergencia: ['#E8761E', 'laranja'], risco: ['#D1343A', 'vermelho'],
    consenso: ['#2E9D5B', 'verde'], pergunta: ['#7B4FC6', 'roxo'], ruido: ['#8C939B', 'cinza'],
  },
  // Tipo de tarefa (tabela do card "Identidade visual" + 4 tipos da taxonomia sem linha na tabela)
  type: {
    'texto-manual': ['#4F5560', 'grafite'], 'texto-ia': ['#E39B12', 'âmbar'], 'imagem-web': ['#2F7BC4', 'azul'],
    'imagem-editada': ['#8A5CD6', 'violeta'], planilha: ['#2E9D5B', 'verde'], documento: ['#6B7280', 'ardósia (cor final por extensão)'],
    pasta: ['#8B5E34', 'marrom'], link: ['#0E8FA6', 'ciano'], 'desenho-tecnico': ['#E06A1B', 'laranja'],
    formulario: ['#0F8077', 'teal'], 'ata-registro': ['#A6192E', 'vermelho institucional'],
    email: ['#4F6D9A', 'azul-ardósia'], protocolo: ['#6E7F2E', 'oliva'], cronograma: ['#3F51B5', 'índigo'],
    'estudo-tecnico-preliminar': ['#8E3B6B', 'ameixa'],
  },
  // DOCUMENTO: cor por extensão
  ext: { docx: ['#2B5797', 'azul (docx)'], pdf: ['#C8352B', 'vermelho (pdf)'], xlsx: ['#1D6F42', 'verde (xlsx)'], pptx: ['#C4441B', 'laranja (pptx)'], md: ['#7A7F87', 'cinza (md/txt)'] },
  // Prazo (RF38.CA05)
  due: { soon: ['#D98E0B', 'âmbar (vence em ≤ 3 dias)'], over: ['#C62828', 'vermelho (vencido)'] },
  // Cores de departamento sugeridas (RF38.CA09) — o departamento escolhe uma; a cor vira borda dos seus itens
  dept: { 'gralha-azul': ['#1B4F8A', 'azul gralha-azul'], araucaria: ['#1F7A4B', 'verde araucária'], 'ipe-roxo': ['#7B4FC6', 'roxo ipê'], 'ipe-amarelo': ['#D98E0B', 'amarelo ipê'], terracota: ['#B4553A', 'terracota'], ardosia: ['#4F6D9A', 'azul-ardósia'], 'pinhao': ['#8B5E34', 'marrom pinhão'], 'cinza-pedra': ['#5A6069', 'cinza pedra'] },
};

/* Aliases de estado → cor semântica (etiquetas de protocolo, RF38.CA05 e card "Identidade visual" §6) */
export const TASK_STATES = {
  rascunho: { nome: 'Rascunho', cor: 'neutral', estilo: 'tracejado' },
  disponivel: { nome: 'Disponível', cor: 'primary', estilo: 'sólido' },
  'em-uso': { nome: 'Em uso', cor: 'class-argumento', estilo: 'pulso' },
  bloqueada: { nome: 'Bloqueada', cor: 'class-divergencia', estilo: 'cadeado' },
  concluida: { nome: 'Concluída', cor: 'class-consenso', estilo: 'carimbo' },
  arquivada: { nome: 'Arquivada', cor: 'neutral', estilo: 'esmaecido' },
  'modelo-publico': { nome: 'Modelo público', cor: 'spark', estilo: 'estrela' },
  oferecida: { nome: 'Oferecida no Balcão', cor: 'type-link', estilo: 'ficha' },
};
export const PROJECT_STATUS = {
  rascunho: { nome: 'Rascunho', cor: 'neutral', estilo: 'tracejado' },
  publicado: { nome: 'Publicado', cor: 'primary', estilo: 'sólido' },
  'em-decisao': { nome: 'Em decisão', cor: 'class-pergunta', estilo: 'pulso' },
  aprovado: { nome: 'Aprovado', cor: 'class-consenso', estilo: 'carimbo' },
  'em-execucao': { nome: 'Em execução', cor: 'class-argumento', estilo: 'sólido' },
  concluido: { nome: 'Concluído', cor: 'class-consenso', estilo: 'carimbo' },
  arquivado: { nome: 'Arquivado', cor: 'neutral', estilo: 'esmaecido' },
  devolvido: { nome: 'Devolvido', cor: 'class-risco', estilo: 'carimbo' },
};
export const PHASES = ['DEMANDA', 'PLANEJAMENTO', 'ELABORAÇÃO', 'ANÁLISE', 'APROVAÇÃO', 'EXECUÇÃO', 'ENCERRAMENTO'];

/* ------------------------------------------------------------------------------------------------
 * 3. Tokens estáticos (iguais em todos os temas)
 * ------------------------------------------------------------------------------------------------ */
export const STATIC = {
  font: {
    editorial: '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif',
    ui: '"Public Sans", Inter, system-ui, "Segoe UI", Roboto, sans-serif',
    data: '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace',
  },
  // escala tipográfica (mesma mecânica do FAI: token = tamanho + entrelinha + tracking; família por papel)
  type: [
    ['display-xl', '2.5rem', 1.1, '-0.02em', 'editorial', 600, 'número-herói (DECIA Points, Hype Score, HSE)'],
    ['display', '2rem', 1.15, '-0.015em', 'editorial', 600, 'título de página no desktop'],
    ['h1', '1.5rem', 1.2, '-0.01em', 'editorial', 600, 'título de página no celular, título do card ampliado'],
    ['h2', '1.25rem', 1.25, '-0.005em', 'editorial', 500, 'seção, título de modal, título do Hero da Vitrine'],
    ['h3', '1.0625rem', 1.3, '0', 'ui', 600, 'subtítulo, título de painel'],
    ['title', '0.9375rem', 1.25, '-0.005em', 'editorial', 600, 'título do card compacto (2 linhas)'],
    ['body-lg', '1rem', 1.5, '0', 'ui', 400, 'texto de destaque, onboarding'],
    ['body', '0.875rem', 1.5, '0', 'ui', 400, 'texto padrão, descrições, mensagens do DECIA'],
    ['body-sm', '0.8125rem', 1.45, '0', 'ui', 400, 'texto secundário, itens de lista'],
    ['caption', '0.75rem', 1.4, '0.005em', 'ui', 500, 'legendas, autor e data, dicas de campo'],
    ['label', '0.6875rem', 1.3, '0.08em', 'data', 500, 'rótulos técnicos em maiúsculas, etiqueta de estado, nº de protocolo, carimbo'],
  ],
  space: { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 7: '32px', 8: '40px', 9: '48px', 10: '64px' },
  radius: { xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '18px', pill: '999px' },
  z: { sticky: 20, header: 40, popover: 50, dialog: 60, toast: 70, skip: 100 },
  control: { sm: '34px', md: '40px', lg: '48px', touch: '44px', header: '56px', sidebar: '264px', 'sidebar-rail': '72px' },
  motion: {
    'dur-fast': '80ms', 'dur': '160ms', 'dur-slow': '320ms', 'dur-pulse': '1800ms', 'dur-spark': '1200ms',
    'ease-out': 'cubic-bezier(.2,.8,.2,1)', 'ease-in-out': 'cubic-bezier(.4,0,.2,1)', 'ease-snap': 'cubic-bezier(.34,1.56,.64,1)',
  },
  // dimensões dos cards (ANATOMIA_CARDS.md §2) — cqi resolve no próprio card (container-type: inline-size)
  card: {
    'x': 'clamp(10px, 5cqi, 16px)', 'x-lg': 'clamp(16px, 3cqi, 28px)', 'k-sum': '2.6',
    'top': 'calc(var(--card-x) * 1.3)', 'bottom': 'calc(var(--card-x) * 1.3)',
    'r-out': 'var(--radius-md)', 'r-in': 'max(4px, calc(var(--card-r-out) * .7))', 'pad': '10px', 'pad-lg': '16px',
    'media-ratio': '3 / 2', 'mosaic-gap': '2px', 'ring-w': '4px', 'ring-size': '36px',
    'thumb-mini': '32px', 'thumb-list': '64px', 'avatar': '20px', 'avatar-lg': '24px',
    'seal': '36px', 'seal-sm': '22px', 'spark': '14px', 'phasebar-h': '6px', 'phasebar-gap': '2px',
    'thread-w': '2px', 'thread-node': '10px', 'thread-node-lg': '14px', 'stamp-border': '2.5px', 'tag-h': '22px', 'dept-border': '2px',
  },
};

/* ------------------------------------------------------------------------------------------------
 * 4. Derivação por tema
 * ------------------------------------------------------------------------------------------------ */
const ON_DARK = '#0B0D10';
/** Empurra a cor cheia (no sentido do tema) até que branco ou quase-preto tenha ≥ 4,5:1 sobre ela. */
function ensureOnFill(hex, dir) {
  let out = hex, i = 0;
  while (i < 400 && Math.max(contrast(out, '#FFFFFF'), contrast(out, ON_DARK)) < 4.5) { out = lighten(out, dir === 'darker' ? -0.005 : 0.005); i++; }
  return out;
}
function deriveTriplet(theme, base) {
  const t = THEMES[theme], S = t.n.surface, S2 = t.n['surface-2'];
  if (theme === 'contraste') {
    const ink = ensure(base, [S, S2, t.n['surface-3']], 7, 'lighter');
    return { fill: ink, ink, soft: '#000000' };
  }
  let fill = ensure(base, [S], 3, t.dir);                         // glifo / borda / nó ≥ 3:1
  fill = ensureOnFill(fill, t.dir);                                // e aceita texto branco OU quase-preto a ≥ 4,5:1
  const soft = mix(S, base, t.softMix);                            // fundo da etiqueta
  const ink = ensure(fill, [S, S2, soft], t.textMin, t.dir);       // texto ≥ 4,5:1 sobre surface, surface-2 e soft
  return { fill, ink, soft };
}

/** Resolve todos os tokens de cor de um tema → { nome: valor } (sem o prefixo "--"). */
export function resolveTheme(theme) {
  const t = THEMES[theme];
  const out = { 'theme-nome': `"${t.label}"` };
  for (const [k, v] of Object.entries(t.n)) out[k] = v;
  out['primary'] = t.primary.fill; out['primary-strong'] = t.primary.strong; out['primary-soft'] = t.primary.soft; out['on-primary'] = t.primary.on;
  out['primary-ink'] = theme === 'contraste' ? t.primary.fill : ensure(t.primary.fill, [t.n.surface, t.n['surface-2'], t.primary.soft], t.textMin, t.dir);
  out['primary-gradient'] = t.primary.gradient; out['primary-nome'] = `"${t.primary.nome}"`;
  out['secondary'] = t.secondary.fill; out['secondary-strong'] = t.secondary.strong; out['secondary-soft'] = t.secondary.soft; out['on-secondary'] = t.secondary.on;
  out['secondary-ink'] = theme === 'contraste' ? t.secondary.fill : ensure(t.secondary.fill, [t.n.surface, t.n['surface-2'], t.secondary.soft], t.textMin, t.dir);
  out['secondary-nome'] = `"${t.secondary.nome}"`;
  for (const [group, entries] of Object.entries(SEMANTIC)) {
    for (const [key, [base, nome]] of Object.entries(entries)) {
      const prefix = group === 'spark' ? 'spark' : `${group}-${key}`;
      const { fill, ink, soft } = deriveTriplet(theme, base);
      out[prefix] = fill; out[`${prefix}-ink`] = ink; out[`${prefix}-soft`] = soft; out[`${prefix}-nome`] = `"${nome}"`;
      if (group === 'spark') out['spark-glow'] = theme === 'claro' ? '#F5B942' : theme === 'contraste' ? '#FFE680' : '#FFD27A';
    }
  }
  // "on-fill": texto sobre a cor cheia (botão primário, nó do fio, ficha DP) — preto ou branco, o que contrastar mais
  for (const k of Object.keys(out)) {
    if (/^(class|type|ext|due|dept)-[a-z0-9-]+$/.test(k) && !k.includes('-ink') && !k.includes('-soft') && !k.includes('-nome')) {
      out[`on-${k}`] = contrast(out[k], '#FFFFFF') >= contrast(out[k], ON_DARK) ? '#FFFFFF' : ON_DARK;
    }
  }
  out['on-spark'] = contrast(out.spark, '#FFFFFF') >= contrast(out.spark, ON_DARK) ? '#FFFFFF' : ON_DARK;
  for (const [k, v] of Object.entries(t.seal)) out[`seal-${k}`] = v;
  for (const [k, v] of Object.entries(t.shadow)) out[`shadow-${k}`] = v;
  for (const [k, v] of Object.entries(t.skin)) out[`skin-${k}`] = v;
  // estados → aliases
  const alias = (cor) => cor === 'neutral' ? { ink: 'var(--muted)', soft: 'var(--surface-2)', fill: 'var(--line-soft)' }
    : cor === 'primary' ? { ink: 'var(--primary-ink)', soft: 'var(--primary-soft)', fill: 'var(--primary)' }
      : cor === 'spark' ? { ink: 'var(--spark-ink)', soft: 'var(--spark-soft)', fill: 'var(--spark)' }
        : { ink: `var(--${cor}-ink)`, soft: `var(--${cor}-soft)`, fill: `var(--${cor})` };
  for (const [k, s] of Object.entries(TASK_STATES)) { const a = alias(s.cor); out[`state-${k}`] = a.fill; out[`state-${k}-ink`] = a.ink; out[`state-${k}-soft`] = a.soft; out[`state-${k}-nome`] = `"${s.nome}"`; }
  for (const [k, s] of Object.entries(PROJECT_STATUS)) { const a = alias(s.cor); out[`status-${k}`] = a.fill; out[`status-${k}-ink`] = a.ink; out[`status-${k}-soft`] = a.soft; out[`status-${k}-nome`] = `"${s.nome}"`; }
  out['opacity-arquivado'] = theme === 'contraste' ? '1' : '.62';
  out['saturate-arquivado'] = theme === 'contraste' ? '1' : '.35';
  return out;
}

/** Resolve os valores literais (sem var()) de um tema — para o <style> dos SVGs e para o relatório de contraste. */
export function resolveLiteral(theme) {
  const r = resolveTheme(theme);
  const lit = {};
  const deref = (v, depth = 0) => {
    if (typeof v !== 'string' || depth > 5) return v;
    return v.replace(/var\(--([a-z0-9-]+)\)/g, (_, name) => deref(r[name], depth + 1));
  };
  for (const [k, v] of Object.entries(r)) lit[k] = deref(v);
  return lit;
}

/* ------------------------------------------------------------------------------------------------
 * 5. Emissão do tokens.css
 * ------------------------------------------------------------------------------------------------ */
const block = (sel, vars, extra = '') => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n')}${extra}\n}\n`;

export function emitTokensCss() {
  const staticVars = {};
  for (const [k, v] of Object.entries(STATIC.font)) staticVars[`font-${k}`] = v;
  for (const [tok, size, lh, track, fam, weight] of STATIC.type) {
    staticVars[`text-${tok}`] = size; staticVars[`text-${tok}--lh`] = lh; staticVars[`text-${tok}--tracking`] = track;
    staticVars[`text-${tok}--font`] = `var(--font-${fam})`; staticVars[`text-${tok}--weight`] = weight;
  }
  for (const [k, v] of Object.entries(STATIC.space)) staticVars[`space-${k}`] = v;
  for (const [k, v] of Object.entries(STATIC.radius)) staticVars[`radius-${k}`] = v;
  for (const [k, v] of Object.entries(STATIC.z)) staticVars[`z-${k}`] = v;
  for (const [k, v] of Object.entries(STATIC.control)) staticVars[`control-${k}`] = v;
  for (const [k, v] of Object.entries(STATIC.motion)) staticVars[k] = v;
  for (const [k, v] of Object.entries(STATIC.card)) staticVars[`card-${k}`] = v;

  const themeBlock = (theme, sel) => block(sel, resolveTheme(theme), `\n  color-scheme: ${THEMES[theme].scheme};`);
  let css = `/* ============================================================================================
   Work Station / DECIA — tokens de design v1 (RF38). GERADO por docs/design-system/anatomias/gerar.mjs a partir de
   anatomias/lib/tokens.mjs — não editar à mão. Temas via <html data-theme="claro|escuro|contraste|blueprint">;
   sem data-theme (ou "auto") segue prefers-color-scheme. Toda cor "-ink" tem ≥ 4,5:1 (≥ 7:1 no alto contraste) sobre
   surface, surface-2 e o "-soft" correspondente; toda cor cheia tem ≥ 3:1 sobre surface. Tabela em DESIGN_SYSTEM.md §2.9.
   Cada família semântica traz "-nome" (string) para a etiqueta falar a cor em texto (daltonismo, RF38.CA05).
   ============================================================================================ */\n\n`;
  css += `/* ---- 1. Tokens estáticos: tipografia, espaço, raio, camadas, controles, movimento, dimensões de card ---- */\n`;
  css += block(':root', staticVars);
  css += `\n/* ---- 2. Tema claro (padrão) ---- */\n` + themeBlock('claro', ':root, :root[data-theme="claro"]');
  css += `\n/* ---- 3. Tema escuro: automático pelo sistema ou forçado ---- */\n@media (prefers-color-scheme: dark) {\n` + themeBlock('escuro', ':root:not([data-theme]), :root[data-theme="auto"]').replace(/^/gm, '  ') + `}\n` + themeBlock('escuro', ':root[data-theme="escuro"]');
  css += `\n/* ---- 4. Alto contraste (ThemeMode.ALTO_CONTRASTE): fundo preto, tinta branca, foco amarelo, sem sombras nem tons ---- */\n` + themeBlock('contraste', ':root[data-theme="contraste"]');
  css += `\n/* ---- 5. Blueprint (ThemeMode.BLUEPRINT): papel azul-engenharia, traço claro, grade ao fundo ---- */\n` + themeBlock('blueprint', ':root[data-theme="blueprint"]');
  css += `
/* ---- 6. Preferências do usuário (UserPreferences: density, fontScale, reduceMotion) ---- */
:root[data-density="compacta"] { --radius-md: 6px; --card-pad: 8px; --control-md: 36px; --control-lg: 44px; --space-4: 12px; }
:root[data-reduce-motion="true"] *, :root[data-reduce-motion="true"] *::before, :root[data-reduce-motion="true"] *::after {
  animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important;
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; } }
@media (pointer: coarse) { :root { --control-sm: 40px; --control-md: var(--control-touch); } }
@media (min-width: 1024px) { :root { --text-h1: 1.875rem; --text-h2: 1.375rem; } }
@media (max-width: 639px) { :root { --text-body: 0.9375rem; --text-body-sm: 0.875rem; } }

/* ---- 7. Modo de janela do sistema (forced-colors) e seleção ---- */
@media (forced-colors: active) { :root { --line: CanvasText; --line-soft: CanvasText; --focus: Highlight; } }
::selection { background: var(--primary-soft); color: var(--ink); }
`;
  return css;
}

/* ------------------------------------------------------------------------------------------------
 * 6. Relatório de contraste (pares verificados) — DESIGN_SYSTEM.md §2.9
 * ------------------------------------------------------------------------------------------------ */
export function contrastReport() {
  const rows = []; let failures = 0;
  for (const theme of THEME_IDS) {
    const r = resolveLiteral(theme), t = THEMES[theme], min = t.textMin;
    const pairs = [];
    const push = (uso, fg, bg, lim = min) => { const c = contrast(r[fg], r[bg]); if (c < lim) failures++; pairs.push({ theme, uso, fg, bg, fgHex: r[fg], bgHex: r[bg], c, lim, ok: c >= lim }); };
    for (const bg of ['surface', 'surface-2', 'surface-3', 'ground']) { push('texto principal', 'ink', bg); push('texto secundário', 'muted', bg); }
    push('texto terciário (placeholder)', 'faint', 'surface');
    push('texto sobre botão primário', 'on-primary', 'primary'); push('link / texto primário', 'primary-ink', 'surface'); push('texto primário na etiqueta', 'primary-ink', 'primary-soft');
    push('texto sobre botão secundário', 'on-secondary', 'secondary'); push('texto secundário (verde)', 'secondary-ink', 'surface');
    push('texto da faísca ("gerado por IA")', 'spark-ink', 'surface'); push('texto da faísca na etiqueta', 'spark-ink', 'spark-soft'); push('glifo ✦ (não-texto ≥ 3:1)', 'spark', 'surface', 3);
    for (const group of ['class', 'type', 'ext', 'due', 'dept']) {
      for (const key of Object.keys(SEMANTIC[group])) {
        const p = `${group}-${key}`;
        push(`${group}·${key} texto`, `${p}-ink`, 'surface'); push(`${group}·${key} texto na etiqueta`, `${p}-ink`, `${p}-soft`); push(`${group}·${key} texto (surface-2)`, `${p}-ink`, 'surface-2');
        push(`${group}·${key} glifo/borda (não-texto ≥ 3:1)`, p, 'surface', 3);
        if (group === 'class' || group === 'dept') push(`${group}·${key} texto sobre a cor cheia`, `on-${p}`, p);
      }
    }
    push('foco (anel) sobre surface (≥ 3:1)', 'focus', 'surface', 3); push('foco sobre ground (≥ 3:1)', 'focus', 'ground', 3);
    push('linha forte (≥ 3:1)', 'line', 'surface', 3);
    push('carimbo VALIDADO (tinta verde) sobre surface', 'class-consenso-ink', 'surface'); push('carimbo DEVOLVIDO (tinta vermelha)', 'class-risco-ink', 'surface');
    push('lacre dourado: aro contra o card (≥ 3:1)', 'seal-gold-edge', 'surface', 3); push('lacre azul-marinho: aro contra o card (≥ 3:1)', 'seal-navy-edge', 'surface', 3);
    push('fita vermelha da Excelência (≥ 3:1)', 'seal-ribbon', 'surface', 3);
    rows.push(...pairs);
  }
  return { rows, failures };
}

export function contrastMarkdown() {
  const { rows, failures } = contrastReport();
  let md = `Pares verificados: **${rows.length}** · falhas: **${failures}** · limite: 4,5:1 para texto (7:1 no alto contraste), 3:1 para glifos, bordas e foco (WCAG 1.4.3 / 1.4.6 / 1.4.11). Gerado por \`anatomias/gerar.mjs\` (função \`contrastReport\` em \`lib/tokens.mjs\`).\n\n`;
  for (const theme of THEME_IDS) {
    const tr = rows.filter((r) => r.theme === theme);
    const minC = Math.min(...tr.map((r) => r.c));
    md += `### ${THEMES[theme].label} (\`data-theme="${theme}"\`) — ${tr.length} pares, mínimo ${fmt2(minC)}:1\n\n| Uso | Frente | Fundo | Razão | Limite | OK |\n|---|---|---|---|---|---|\n`;
    for (const r of tr) md += `| ${r.uso} | \`--${r.fg}\` ${r.fgHex} | \`--${r.bg}\` ${r.bgHex} | ${fmt2(r.c)}:1 | ${r.lim}:1 | ${r.ok ? '✓' : '✗'} |\n`;
    md += '\n';
  }
  return md;
}
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

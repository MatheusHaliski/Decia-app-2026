// WS Glyphs — catálogo. GERADO por docs/design-system/glyphs/gerar.mjs; não editar à mão.
// Destino na etapa (b): packages/ui/src/glyphs/catalog.ts (os SVGs viram componentes React via SVGR ou sprite).
// Regra de forma: todo glyph nasce do monitor do logo (moldura arredondada + base) ou da malha de nós.
// labelKey = chave i18n (pt-BR/en/es) em src/i18n/glyphs.*.json — o ícone nunca aparece sem rótulo (RF38.CA01).

export type WsNode = 'red' | 'yellow' | 'green' | 'blue' | 'brown' | 'orange';

export interface WsGlyph {
  /** id em kebab-case; também é o nome do arquivo e o sufixo da classe .ws-glyph--<name> */
  name: string;
  /** chave i18n do rótulo acessível (aria-label) */
  labelKey: string;
  /** SVG da variante outline — traço 1,75, currentColor */
  outline: string;
  /** SVG da variante clay — carcaça --ws-ink, brilho superior, detalhes --ws-cream */
  clay: string;
  /** nós categóricos usados como detalhe (tokens --ws-node-<n>) */
  nodes?: WsNode[];
}

export interface WsMoji {
  name: string;
  labelKey: string;
  /** rosto em sintaxe de terminal, também é o texto alternativo */
  face: string;
  file: string;
  /** usa animação CSS (desligada com prefers-reduced-motion) */
  animated?: boolean;
}

export const WS_GLYPHS: readonly WsGlyph[] = [
  { name: 'criar-tarefa', labelKey: 'glyph.criar-tarefa', outline: 'svg/criar-tarefa--outline.svg', clay: 'svg/criar-tarefa--clay.svg', nodes: ['green'] },
  { name: 'criar-projeto', labelKey: 'glyph.criar-projeto', outline: 'svg/criar-projeto--outline.svg', clay: 'svg/criar-projeto--clay.svg', nodes: ['red', 'blue', 'green'] },
  { name: 'sessao-decia', labelKey: 'glyph.sessao-decia', outline: 'svg/sessao-decia--outline.svg', clay: 'svg/sessao-decia--clay.svg', nodes: ['orange'] },
  { name: 'notificacoes', labelKey: 'glyph.notificacoes', outline: 'svg/notificacoes--outline.svg', clay: 'svg/notificacoes--clay.svg', nodes: ['orange'] },
  { name: 'perfil', labelKey: 'glyph.perfil', outline: 'svg/perfil--outline.svg', clay: 'svg/perfil--clay.svg' },
  { name: 'configuracoes', labelKey: 'glyph.configuracoes', outline: 'svg/configuracoes--outline.svg', clay: 'svg/configuracoes--clay.svg' },
  { name: 'acervo', labelKey: 'glyph.acervo', outline: 'svg/acervo--outline.svg', clay: 'svg/acervo--clay.svg', nodes: ['blue'] },
  { name: 'mesa', labelKey: 'glyph.mesa', outline: 'svg/mesa--outline.svg', clay: 'svg/mesa--clay.svg', nodes: ['red', 'yellow', 'green'] },
  { name: 'tarefa-do-dia', labelKey: 'glyph.tarefa-do-dia', outline: 'svg/tarefa-do-dia--outline.svg', clay: 'svg/tarefa-do-dia--clay.svg', nodes: ['yellow'] },
  { name: 'hype', labelKey: 'glyph.hype', outline: 'svg/hype--outline.svg', clay: 'svg/hype--clay.svg', nodes: ['red', 'yellow', 'green'] },
  { name: 'decia-points', labelKey: 'glyph.decia-points', outline: 'svg/decia-points--outline.svg', clay: 'svg/decia-points--clay.svg', nodes: ['yellow', 'orange', 'red'] },
  { name: 'chancela', labelKey: 'glyph.chancela', outline: 'svg/chancela--outline.svg', clay: 'svg/chancela--clay.svg', nodes: ['orange', 'red'] },
  { name: 'balcao', labelKey: 'glyph.balcao', outline: 'svg/balcao--outline.svg', clay: 'svg/balcao--clay.svg', nodes: ['yellow'] },
  { name: 'insights-ia', labelKey: 'glyph.insights-ia', outline: 'svg/insights-ia--outline.svg', clay: 'svg/insights-ia--clay.svg' },
  { name: 'buscar', labelKey: 'glyph.buscar', outline: 'svg/buscar--outline.svg', clay: 'svg/buscar--clay.svg' },
  { name: 'mural', labelKey: 'glyph.mural', outline: 'svg/mural--outline.svg', clay: 'svg/mural--clay.svg', nodes: ['red'] },
  { name: 'sair', labelKey: 'glyph.sair', outline: 'svg/sair--outline.svg', clay: 'svg/sair--clay.svg' },
] as const;

export const WS_MOJI: readonly WsMoji[] = [
  { name: 'util', labelKey: 'moji.util', face: '>✓', file: 'svg/moji-util.svg' },
  { name: 'bem-fundamentado', labelKey: 'moji.bem-fundamentado', face: '>§', file: 'svg/moji-bem-fundamentado.svg' },
  { name: 'inovador', labelKey: 'moji.inovador', face: '>✦', file: 'svg/moji-inovador.svg' },
  { name: 'conforme', labelKey: 'moji.conforme', face: '>⚖', file: 'svg/moji-conforme.svg' },
  { name: 'curtir', labelKey: 'moji.curtir', face: '>♥', file: 'svg/moji-curtir.svg' },
  { name: 'ok', labelKey: 'moji.ok', face: '^_^', file: 'svg/moji-ok.svg' },
  { name: 'erro', labelKey: 'moji.erro', face: 'x_x', file: 'svg/moji-erro.svg' },
  { name: 'carregando', labelKey: 'moji.carregando', face: '>_▌', file: 'svg/moji-carregando.svg', animated: true },
  { name: 'vazio', labelKey: 'moji.vazio', face: '>_ ?', file: 'svg/moji-vazio.svg' },
] as const;

export type WsGlyphName = (typeof WS_GLYPHS)[number]['name'];
export type WsMojiName = (typeof WS_MOJI)[number]['name'];

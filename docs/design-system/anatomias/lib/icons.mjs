// Glifos próprios do Work AI / DECIA — 24×24, traço 1.8, pontas e junções arredondadas, cor = currentColor.
// Nunca emoji do sistema (RF38.CA01). Cada entrada: { nome, grupo, paths: [ 'd' | { d, fill?:true, sw?:n } ] }.
// Os mesmos dados alimentam: icones/*.svg (um por glifo), o sprite inline do index.html e as anatomias em SVG.

const F = (d) => ({ d, fill: true });   // forma preenchida (faísca, ponto)
const W = (d, sw) => ({ d, sw });       // traço com espessura própria

export const ICONS = {
  /* ---------------- Tipos de tarefa (TaskType) — tabela do card "Identidade visual" §1 ---------------- */
  'texto-manual': { grupo: 'tipo', nome: 'Texto manual · folha com caneta', paths: ['M6 2.5h8.5L20 8v13.5H6z', 'M14.5 2.5V8H20', 'M9 12h6', 'M9 15.5h2.5', 'M13 21.5l5-5 2 2-5 5h-2z'] },
  'texto-ia': { grupo: 'tipo', nome: 'Texto gerado por IA · folha com faísca', paths: ['M6 2.5h8.5L20 8v13.5H6z', 'M14.5 2.5V8H20', 'M9 12h3', F('M15.5 11.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z')] },
  'imagem-web': { grupo: 'tipo', nome: 'Imagem da web · moldura com globo', paths: ['M3 5h18v14H3z', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M8.5 12h7', 'M12 8.5c-1.7 1.9-1.7 5.1 0 7c1.7-1.9 1.7-5.1 0-7'] },
  'imagem-editada': { grupo: 'tipo', nome: 'Imagem editada · moldura com pincel', paths: ['M3 5h18v14H3z', 'M9.5 14.5l6-6 2 2-6 6', 'M9 14c-2 0-3 1.5-3 3.5 2 0 3.5-1 3.5-3z'] },
  planilha: { grupo: 'tipo', nome: 'Planilha · grade', paths: ['M3.5 4.5h17v15h-17z', 'M3.5 9.5h17', 'M3.5 14.5h17', 'M9.2 4.5v15', 'M14.8 4.5v15'] },
  documento: { grupo: 'tipo', nome: 'Documento · pasta com aba (cor por extensão)', paths: ['M3 7.5A1.5 1.5 0 0 1 4.5 6h5l2 2.5h8A1.5 1.5 0 0 1 21 10v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z', 'M3 11.5h18'] },
  pasta: { grupo: 'tipo', nome: 'Pasta (zip) · pasta suspensa com zíper', paths: ['M2.5 5.5h19', 'M5 5.5V8', 'M19 5.5V8', 'M4 8h16v11.5H4z', 'M12 8v11.5', 'M10.5 10.5h3', 'M10.5 13h3', 'M10.5 15.5h3', 'M10.5 18h3'] },
  link: { grupo: 'tipo', nome: 'Link · clipe', paths: ['M15.5 7.5l-6.3 6.3a2.2 2.2 0 0 0 3.1 3.1l7-7a4.4 4.4 0 0 0-6.2-6.2L5.5 11.3a6 6 0 0 0 8.5 8.5l4.5-4.5'] },
  'desenho-tecnico': { grupo: 'tipo', nome: 'Desenho técnico 2D · esquadro e compasso', paths: ['M3 20.5L14.5 9v11.5z', 'M7 20.5l4-4v4', 'M17.5 3v1.5', 'M17.5 4.5L14.5 14', 'M17.5 4.5L20.5 14', 'M15.3 11.5h4.4'] },
  'desenho-3d': { grupo: 'tipo', nome: 'Desenho técnico 3D (.glb) · cubo', paths: ['M12 2.5l8 4.5v10l-8 4.5-8-4.5v-10z', 'M4 7l8 4.5 8-4.5', 'M12 11.5v10'] },
  formulario: { grupo: 'tipo', nome: 'Formulário · prancheta com check', paths: ['M8 4.5H6A1.5 1.5 0 0 0 4.5 6v14A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5h-2', 'M9 2.5h6a1 1 0 0 1 1 1V6H8V3.5a1 1 0 0 1 1-1z', 'M8.5 13.5l2.5 2.5 5-5.5'] },
  'ata-registro': { grupo: 'tipo', nome: 'Ata / registro · carimbo', paths: ['M10 11.5V6a2 2 0 0 1 4 0v5.5', 'M3.5 13A1.5 1.5 0 0 1 5 11.5h14a1.5 1.5 0 0 1 1.5 1.5v3.5h-17z', 'M6 19.5h12'] },
  email: { grupo: 'tipo', nome: 'E-mail · envelope', paths: ['M3 6.5h18v12H3z', 'M3 7l9 6.5L21 7'] },
  protocolo: { grupo: 'tipo', nome: 'Protocolo · comprovante picotado', paths: ['M5 3h14v18l-2.3-1.6-2.3 1.6-2.4-1.6L9.6 21l-2.3-1.6L5 21z', 'M8.5 8h7', 'M8.5 11.5h7', 'M8.5 15h4'] },
  cronograma: { grupo: 'tipo', nome: 'Cronograma · barras de Gantt', paths: ['M4 3.5v17h16', W('M7.5 8h6', 3), W('M10.5 12h8', 3), W('M13.5 16h4.5', 3)] },
  'estudo-tecnico-preliminar': { grupo: 'tipo', nome: 'Estudo técnico preliminar · folha com lupa', paths: ['M20 12.5V8l-5.5-5.5H6v19h5', 'M14.5 2.5V8H20', 'M9 8.5h2.5', 'M9 12h5', 'M17 21.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M14.2 20.3L11 23.5'] },

  /* ---------------- Ações (Button com ícone próprio) ---------------- */
  'criar-tarefa': { grupo: 'acao', nome: 'Criar tarefa', paths: ['M6 2.5h8.5L20 8v13.5H6z', 'M14.5 2.5V8H20', 'M13 11v6', 'M10 14h6'] },
  'criar-projeto': { grupo: 'acao', nome: 'Criar projeto', paths: ['M3 7.5A1.5 1.5 0 0 1 4.5 6h5l2 2.5h8A1.5 1.5 0 0 1 21 10v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z', 'M12 11.5v6', 'M9 14.5h6'] },
  'abrir-decia': { grupo: 'acao', nome: 'Abrir sessão DECIA', paths: ['M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z', F('M13.5 7.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z')] },
  chancelar: { grupo: 'acao', nome: 'Chancelar (lacre)', paths: ['M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M9.5 14.2L7.5 21l2.5-1.5L12 21', 'M14.5 14.2L16.5 21 14 19.5 12 21'] },
  'oferecer-balcao': { grupo: 'acao', nome: 'Oferecer no Balcão', paths: ['M3 10.5h18', 'M5 10.5v10', 'M19 10.5v10', 'M5 16h14', 'M4 10.5l2-5h12l2 5', 'M9.5 5.5v5', 'M14.5 5.5v5'] },
  'transformar-tarefa': { grupo: 'acao', nome: 'Transformar em tarefa', paths: ['M9 2.5h7.5L21 7v14.5H9z', 'M16.5 2.5V7H21', 'M2.5 12h9', 'M8.5 9l3 3-3 3'] },
  'validar-decisao': { grupo: 'acao', nome: 'Validar decisão (carimbo)', paths: ['M10 11.5V6a2 2 0 0 1 4 0v5.5', 'M3.5 13A1.5 1.5 0 0 1 5 11.5h14a1.5 1.5 0 0 1 1.5 1.5v3.5h-17z', 'M6 19.5h12', 'M16.5 4.5l1.5 1.5 3-3'] },
  'devolver-decisao': { grupo: 'acao', nome: 'Devolver decisão', paths: ['M10 11.5V6a2 2 0 0 1 4 0v5.5', 'M3.5 13A1.5 1.5 0 0 1 5 11.5h14a1.5 1.5 0 0 1 1.5 1.5v3.5h-17z', 'M6 19.5h12', 'M17 2.5l4 4', 'M21 2.5l-4 4'] },

  /* ---------------- Navegação (SidebarNav) ---------------- */
  descobrir: { grupo: 'nav', nome: 'Descobrir', paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M15.5 8.5l-2 5-5 2 2-5z'] },
  'meu-trabalho': { grupo: 'nav', nome: 'Meu trabalho', paths: ['M8 4.5H6A1.5 1.5 0 0 0 4.5 6v14A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5h-2', 'M9 2.5h6a1 1 0 0 1 1 1V6H8V3.5a1 1 0 0 1 1-1z', 'M8.5 11h7', 'M8.5 14.5h7', 'M8.5 18h4'] },
  criar: { grupo: 'nav', nome: 'Criar', paths: ['M4.5 4.5h15v15h-15z', 'M12 8.5v7', 'M8.5 12h7'] },
  'jogar-ganhar': { grupo: 'nav', nome: 'Jogar e ganhar', paths: ['M7 4.5h10v4a5 5 0 0 1-10 0z', 'M7 6H4.5a2.5 2.5 0 0 0 2.5 3.5', 'M17 6h2.5A2.5 2.5 0 0 1 17 9.5', 'M12 13.5v3', 'M8.5 20.5h7', 'M12 16.5c-2 0-3.5 1.6-3.5 4h7c0-2.4-1.5-4-3.5-4'] },
  gestao: { grupo: 'nav', nome: 'Gestão', paths: ['M4 20.5h16', 'M7 17v-5', 'M12 17V7', 'M17 17v-8'] },
  acervo: { grupo: 'nav', nome: 'Acervo de tarefas', paths: ['M3.5 5h17v4h-17z', 'M4.5 9v10.5h15V9', 'M10 13h4'] },
  mesa: { grupo: 'nav', nome: 'Mesa de trabalho', paths: ['M3 8.5h18', 'M5 8.5v11', 'M19 8.5v11', 'M7 5h4v3.5H7z', 'M13 4h5v4.5h-5z'] },
  balcao: { grupo: 'nav', nome: 'Balcão de modelos', paths: ['M3 10.5h18', 'M5 10.5v10', 'M19 10.5v10', 'M5 16h14', 'M4 10.5l2-5h12l2 5'] },
  vitrine: { grupo: 'nav', nome: 'Vitrine', paths: ['M3.5 4.5h17v15h-17z', 'M3.5 9h17', 'M12 9v10.5', 'M7 6.5h2', 'M14.5 6.5h2'] },
  mural: { grupo: 'nav', nome: 'Mural', paths: ['M4 4.5h16v12H4z', 'M8 16.5v4', 'M16 16.5v4', 'M7 8h5', 'M7 11.5h8'] },
  perfil: { grupo: 'nav', nome: 'Perfil', paths: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'] },

  /* ---------------- Estado, prazo, IA, chancela ---------------- */
  faisca: { grupo: 'estado', nome: 'Faísca ✦ (gerado por IA)', paths: [F('M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3-6.3-2.2 6.3-2.2z')] },
  cadeado: { grupo: 'estado', nome: 'Bloqueada', paths: ['M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z', 'M8 11V8a4 4 0 0 1 8 0v3', 'M12 15v2.5'] },
  estrela: { grupo: 'estado', nome: 'Modelo público', paths: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z'] },
  balanca: { grupo: 'estado', nome: 'Prazo legal', paths: ['M12 3.5v17', 'M8 20.5h8', 'M5 7.5h14', 'M5 7.5l-3 7h6z', 'M19 7.5l-3 7h6z'] },
  relogio: { grupo: 'estado', nome: 'Prazo', paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7.5V12l3 2'] },
  'ficha-dp': { grupo: 'estado', nome: 'DECIA Points (ficha DP)', paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', F('M12 9l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z')] },
  lacre: { grupo: 'estado', nome: 'Chancela (lacre)', paths: ['M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M9.5 14.2L7.5 21l2.5-1.5L12 21', 'M14.5 14.2L16.5 21 14 19.5 12 21'] },
  medalha: { grupo: 'estado', nome: 'Reconhecimento (medalha)', paths: ['M12 21.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M8 2.5l4 7.5 4-7.5', 'M6.5 2.5h3', 'M14.5 2.5h3'] },
  marco: { grupo: 'estado', nome: 'Próximo marco', paths: ['M5 21.5v-18', 'M5 4.5h12l-2 4 2 4H5'] },
  pessoas: { grupo: 'estado', nome: 'Pessoas', paths: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20.5a6.5 6.5 0 0 1 13 0', 'M16 4.5a3.5 3.5 0 0 1 0 6.5', 'M18 14.5a6.5 6.5 0 0 1 3.5 6'] },
  dependencia: { grupo: 'estado', nome: 'Dependência', paths: ['M4 6.5h5v5H4z', 'M15 12.5h5v5h-5z', 'M9 9h3.5v6H15'] },
  pino: { grupo: 'estado', nome: 'Pino (Mesa)', paths: ['M12 21.5v-6', 'M8 15.5h8l-1.5-4V5.5h1v-2h-7v2h1v6z'] },

  /* ---------------- Social (ReactionType + ações) ---------------- */
  curtir: { grupo: 'social', nome: 'Curtir', paths: ['M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z'] },
  comentar: { grupo: 'social', nome: 'Comentar', paths: ['M4 5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 16h-8l-4.5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 5z'] },
  salvar: { grupo: 'social', nome: 'Salvar', paths: ['M6.5 3.5h11v17L12 16.5 6.5 20.5z'] },
  compartilhar: { grupo: 'social', nome: 'Compartilhar', paths: ['M12 3.5v12', 'M8 7.5l4-4 4 4', 'M5 12.5v6a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6'] },
  remixar: { grupo: 'social', nome: 'Remixar', paths: ['M4 7.5h11.5l-3-3', 'M20 16.5H8.5l3 3', 'M4 7.5v3', 'M20 16.5v-3'] },
  util: { grupo: 'social', nome: 'Útil', paths: ['M4 11h3v9.5H4z', 'M7 11l4-7.5c1.5 0 2.5 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7a2.5 2.5 0 0 1-2.5 2.2H7'] },
  'bem-fundamentado': { grupo: 'social', nome: 'Bem fundamentado', paths: ['M4.5 4.5h6a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 0-1.5-1.5h-6z', 'M19.5 4.5h-6A1.5 1.5 0 0 0 12 6v14a1.5 1.5 0 0 1 1.5-1.5h6z', 'M7 9h3', 'M14 9h3'] },
  inovador: { grupo: 'social', nome: 'Inovador', paths: ['M9 18.5h6', 'M10 21.5h4', 'M12 3a6 6 0 0 1 3.5 10.8c-.8.7-1 1.4-1 2.2h-5c0-.8-.2-1.5-1-2.2A6 6 0 0 1 12 3z'] },
  conforme: { grupo: 'social', nome: 'Conforme', paths: ['M12 2.5l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z', 'M8.5 12l2.5 2.5 4.5-5'] },

  /* ---------------- Chrome (TopBar, SelectList, Toast) ---------------- */
  busca: { grupo: 'chrome', nome: 'Buscar', paths: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M15.5 15.5l5 5'] },
  menu: { grupo: 'chrome', nome: 'Menu', paths: ['M4 7h16', 'M4 12h16', 'M4 17h16'] },
  sino: { grupo: 'chrome', nome: 'Notificações', paths: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'] },
  check: { grupo: 'chrome', nome: 'Selecionado', paths: ['M5 12.5l4.5 4.5L19 7.5'] },
  fechar: { grupo: 'chrome', nome: 'Fechar', paths: ['M6 6l12 12', 'M18 6L6 18'] },
  chevron: { grupo: 'chrome', nome: 'Abrir', paths: ['M9 6l6 6-6 6'] },
  recolher: { grupo: 'chrome', nome: 'Recolher menu', paths: ['M3.5 4.5h17v15h-17z', 'M9 4.5v15', 'M16 9.5l-2.5 2.5 2.5 2.5'] },
  alerta: { grupo: 'chrome', nome: 'Alerta', paths: ['M12 3.5l9.5 16.5H2.5z', 'M12 10v4.5', F('M12 17.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z')] },
  info: { grupo: 'chrome', nome: 'Informação', paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5.5', F('M12 7.1a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z')] },
  'pasta-vazia': { grupo: 'chrome', nome: 'Pasta em branco (projeto vazio)', paths: [{ d: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h5l2 2.5h8A1.5 1.5 0 0 1 21 10v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z', dash: '2.5 2.5' }] },
};

export const ICON_GROUPS = { tipo: 'Tipos de tarefa', acao: 'Ações', nav: 'Navegação', estado: 'Estado, prazo, IA e chancela', social: 'Social e reações', chrome: 'Chrome' };

/** Tipo de tarefa (enum TaskType) → glifo e token de cor. */
export const TASK_TYPE_ICON = {
  TEXTO_MANUAL: 'texto-manual', TEXTO_IA: 'texto-ia', IMAGEM_WEB: 'imagem-web', IMAGEM_EDITADA: 'imagem-editada', PLANILHA: 'planilha',
  DOCUMENTO: 'documento', PASTA: 'pasta', LINK: 'link', DESENHO_TECNICO: 'desenho-tecnico', DESENHO_TECNICO_3D: 'desenho-3d',
  FORMULARIO: 'formulario', ATA_REGISTRO: 'ata-registro', EMAIL: 'email', PROTOCOLO: 'protocolo', CRONOGRAMA: 'cronograma', ESTUDO_TECNICO_PRELIMINAR: 'estudo-tecnico-preliminar',
};
export const TASK_TYPE_TOKEN = (type) => `type-${TASK_TYPE_ICON[type] === 'desenho-3d' ? 'desenho-tecnico' : TASK_TYPE_ICON[type]}`;

/** Conteúdo SVG (sem <svg>) de um glifo. */
export function iconInner(name, { color = 'currentColor', sw = 1.8 } = {}) {
  const ic = ICONS[name];
  if (!ic) throw new Error(`glifo desconhecido: ${name}`);
  return ic.paths.map((p) => {
    const o = typeof p === 'string' ? { d: p } : p;
    if (o.fill) return `<path d="${o.d}" fill="${color}" stroke="none"/>`;
    return `<path d="${o.d}" fill="none" stroke="${color}" stroke-width="${o.sw ?? sw}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  }).join('');
}

/** Glifo posicionado dentro de um SVG maior. */
export function iconAt(name, x, y, size, color = 'currentColor') {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" aria-hidden="true">${iconInner(name, { color })}</g>`;
}

/** Arquivo SVG independente do glifo. */
export function iconSvg(name) {
  const ic = ICONS[name];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="${ic.nome}"><title>${ic.nome}</title>${iconInner(name)}</svg>\n`;
}

/** Sprite <symbol> para o index.html (use="#wai-<nome>"). */
export function iconSprite() {
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">` +
    Object.keys(ICONS).map((n) => `<symbol id="wai-${n}" viewBox="0 0 24 24">${iconInner(n)}</symbol>`).join('') + `</svg>`;
}

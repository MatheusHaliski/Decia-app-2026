/**
 * Receitas do Autopiloto (RF30.CA02): como cada tipo de entrega vira atividade (fase, estimativa de três pontos PERT, ordem na
 * fase, papel sugerido) e quais atividades cada tipo de demanda pede, REAPROVEITANDO os modelos de área do Acervo
 * (`lib/tasks/areaTemplates.ts`) com crédito a cada modelo. As durações são heurísticas fixas do sistema (dias corridos),
 * transparentes e editáveis — a "IA" só as propõe (✦), não inventa número fora desta tabela (D-12).
 * Títulos e papéis são conteúdo de trabalho em pt-BR, como os modelos de área e o projeto de exemplo.
 */
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import type { ThreePoint } from "../engine/pert";
import type { Approach, ProjectArea, ProjectPhase } from "../types";
import type { DeliverableType, DemandKind } from "./extract";
import { fold } from "./text";

export interface DeliverableProfile { phase: ProjectPhase; pert: ThreePoint; rank: number; role: string }

/** Entrega extraída da demanda → fase, PERT (otimista/mais provável/pessimista, em dias) e ordem dentro da fase. */
export const DELIVERABLE_PROFILE: Record<DeliverableType, DeliverableProfile> = {
  ESTUDO: { phase: "ELABORACAO", pert: { o: 5, m: 10, p: 15 }, rank: 1, role: "Equipe técnica" },
  DOCUMENTO: { phase: "ELABORACAO", pert: { o: 3, m: 5, p: 10 }, rank: 2, role: "Equipe técnica" },
  REVISAO: { phase: "ANALISE", pert: { o: 2, m: 4, p: 7 }, rank: 1, role: "Revisão técnica e jurídica" },
  APROVACAO: { phase: "APROVACAO", pert: { o: 1, m: 3, p: 5 }, rank: 1, role: "Patrocinador" },
  CONTRATACAO: { phase: "EXECUCAO", pert: { o: 30, m: 45, p: 75 }, rank: 1, role: "Setor de compras e contratos" },
  DESENVOLVIMENTO: { phase: "EXECUCAO", pert: { o: 15, m: 25, p: 45 }, rank: 2, role: "Equipe de desenvolvimento" },
  OBRA: { phase: "EXECUCAO", pert: { o: 30, m: 60, p: 120 }, rank: 2, role: "Fiscal da obra" },
  SERVICO: { phase: "EXECUCAO", pert: { o: 10, m: 20, p: 30 }, rank: 2, role: "Equipe executora" },
  IMPLANTACAO: { phase: "EXECUCAO", pert: { o: 5, m: 10, p: 20 }, rank: 3, role: "Equipe técnica" },
  MIGRACAO: { phase: "EXECUCAO", pert: { o: 5, m: 10, p: 20 }, rank: 4, role: "Equipe técnica" },
  CAPACITACAO: { phase: "EXECUCAO", pert: { o: 3, m: 5, p: 10 }, rank: 5, role: "Instrutoria" },
  COMUNICACAO: { phase: "EXECUCAO", pert: { o: 1, m: 2, p: 4 }, rank: 6, role: "Comunicação" },
  OUTRO: { phase: "EXECUCAO", pert: { o: 3, m: 5, p: 10 }, rank: 2, role: "Equipe do projeto" },
};

export interface RecipeTask {
  key: string;
  title: string;
  phase: ProjectPhase;
  pert: ThreePoint;
  /** ordem dentro da fase: mesma ordem = em paralelo; ordem maior = depois */
  rank: number;
  role: string;
  type: DeliverableType | "CICLO";
  /** modelo de área reaproveitado (crédito) */
  templateId?: string;
  /** entra mesmo quando a demanda já trouxe entregas naquela fase */
  essential?: boolean;
  milestone?: boolean;
  /** entrega da EAP (substantivo) */
  wbs?: string;
}

const P = (o: number, m: number, p: number): ThreePoint => ({ o, m, p });

/** O ciclo de vida que todo projeto percorre (as 7 fases canônicas, `lifecycle.ts`): termo de abertura, plano, análise, portão, encerramento. */
export const LIFECYCLE: readonly RecipeTask[] = [
  { key: "tap", title: "Termo de abertura do projeto (TAP)", phase: "DEMANDA", pert: P(2, 3, 5), rank: 1, role: "Gerente do projeto", type: "CICLO", essential: true, wbs: "Termo de abertura" },
  { key: "stk", title: "Mapa das partes interessadas", phase: "DEMANDA", pert: P(1, 1, 2), rank: 1, role: "Gerente do projeto", type: "CICLO", essential: true, wbs: "Registro das partes interessadas" },
  { key: "plano", title: "Plano do projeto: EAP, cronograma, orçamento e riscos", phase: "PLANEJAMENTO", pert: P(3, 5, 8), rank: 1, role: "Gerente do projeto", type: "CICLO", essential: true, wbs: "Plano do projeto" },
  { key: "analise", title: "Análise de riscos e conformidade", phase: "ANALISE", pert: P(2, 3, 5), rank: 1, role: "Gerente do projeto", type: "CICLO", essential: true, wbs: "Análise de riscos e conformidade" },
  { key: "portao", title: "Aprovação do comitê (portão)", phase: "APROVACAO", pert: P(0, 0, 0), rank: 9, role: "Patrocinador", type: "CICLO", essential: true, milestone: true },
  { key: "aceite", title: "Aceite formal, lições aprendidas e encerramento", phase: "ENCERRAMENTO", pert: P(1, 2, 4), rank: 1, role: "Gerente do projeto", type: "CICLO", essential: true, wbs: "Encerramento do projeto" },
  { key: "entrega", title: "Entrega final da demanda", phase: "ENCERRAMENTO", pert: P(0, 0, 0), rank: 2, role: "Patrocinador", type: "CICLO", essential: true, milestone: true },
];

/** Atividades que cada tipo de demanda pede, com o modelo de área de origem. */
export const KIND_RECIPES: Record<DemandKind, readonly RecipeTask[]> = {
  TI: [
    { key: "ti-historias", title: "Histórias de usuário com critérios de aceite", phase: "ELABORACAO", pert: P(3, 5, 8), rank: 2, role: "Equipe de desenvolvimento", type: "DOCUMENTO", templateId: "area.software.historia-de-usuario-com-criterios" },
    { key: "ti-adr", title: "Registro de decisão de arquitetura (ADR)", phase: "ELABORACAO", pert: P(1, 2, 4), rank: 2, role: "Equipe de desenvolvimento", type: "DOCUMENTO", templateId: "area.software.registro-de-decisao-de-arquitetura" },
    { key: "ti-dev", title: "Desenvolvimento e integração da solução", phase: "EXECUCAO", pert: P(15, 25, 45), rank: 2, role: "Equipe de desenvolvimento", type: "DESENVOLVIMENTO" },
    { key: "ti-testes", title: "Plano de testes e homologação", phase: "EXECUCAO", pert: P(3, 5, 10), rank: 2.5, role: "Equipe de testes", type: "REVISAO", templateId: "area.software.plano-de-testes", essential: true },
    { key: "ti-seguranca", title: "Revisão de segurança (OWASP Top 10)", phase: "EXECUCAO", pert: P(2, 3, 5), rank: 2.5, role: "Segurança da informação", type: "REVISAO", templateId: "area.software.revisao-de-seguranca-owasp" },
    { key: "ti-implantacao", title: "Implantação com plano de reversão", phase: "EXECUCAO", pert: P(2, 3, 6), rank: 3, role: "Equipe técnica", type: "IMPLANTACAO", templateId: "area.software.runbook-de-implantacao-e-reversao", essential: true },
  ],
  AQUISICAO: [
    { key: "aq-etp", title: "Estudo técnico preliminar (ETP)", phase: "ELABORACAO", pert: P(5, 10, 15), rank: 1, role: "Equipe técnica", type: "ESTUDO", templateId: "area.administracao.estudo-tecnico-preliminar", essential: true },
    { key: "aq-tr", title: "Termo de referência (TR)", phase: "ELABORACAO", pert: P(3, 5, 10), rank: 2, role: "Equipe técnica", type: "DOCUMENTO", templateId: "area.administracao.termo-de-referencia", essential: true },
    { key: "aq-parecer", title: "Parecer jurídico sobre a contratação", phase: "ANALISE", pert: P(3, 5, 10), rank: 1, role: "Assessoria jurídica", type: "REVISAO", templateId: "area.juridico.parecer-juridico", essential: true },
    { key: "aq-licitacao", title: "Licitação e assinatura do contrato", phase: "EXECUCAO", pert: P(30, 45, 75), rank: 1, role: "Setor de compras e contratos", type: "CONTRATACAO", essential: true },
    { key: "aq-contrato", title: "Controle do contrato e do recebimento", phase: "EXECUCAO", pert: P(2, 3, 5), rank: 3, role: "Fiscal do contrato", type: "SERVICO", templateId: "area.administracao.controle-de-contratos" },
  ],
  OBRA: [
    { key: "ob-memorial", title: "Memorial descritivo", phase: "ELABORACAO", pert: P(3, 5, 10), rank: 1, role: "Engenharia", type: "DOCUMENTO", templateId: "area.engenharia.memorial-descritivo", essential: true },
    { key: "ob-orcamento", title: "Orçamento de referência (SINAPI)", phase: "ELABORACAO", pert: P(3, 5, 10), rank: 1, role: "Engenharia", type: "DOCUMENTO", templateId: "area.engenharia.orcamento-de-referencia-sinapi", essential: true },
    { key: "ob-cronograma", title: "Cronograma físico-financeiro", phase: "ELABORACAO", pert: P(2, 3, 5), rank: 2, role: "Engenharia", type: "DOCUMENTO", templateId: "area.engenharia.cronograma-fisico-financeiro", essential: true },
    { key: "ob-licitacao", title: "Licitação da obra", phase: "EXECUCAO", pert: P(30, 45, 75), rank: 1, role: "Setor de compras e contratos", type: "CONTRATACAO", essential: true },
    { key: "ob-execucao", title: "Execução da obra", phase: "EXECUCAO", pert: P(30, 60, 120), rank: 2, role: "Fiscal da obra", type: "OBRA", essential: true },
    { key: "ob-vistoria", title: "Vistoria técnica e recebimento da obra", phase: "EXECUCAO", pert: P(1, 2, 4), rank: 3, role: "Fiscal da obra", type: "REVISAO", templateId: "area.engenharia.relatorio-de-vistoria-tecnica", essential: true },
  ],
  SERVICO: [
    { key: "sv-bpmn", title: "Mapeamento do processo (BPMN)", phase: "ELABORACAO", pert: P(3, 5, 8), rank: 1, role: "Equipe técnica", type: "ESTUDO", templateId: "area.administracao.mapeamento-de-processo-bpmn", essential: true },
    { key: "sv-pop", title: "Procedimento operacional padrão (POP)", phase: "ELABORACAO", pert: P(2, 3, 5), rank: 2, role: "Equipe técnica", type: "DOCUMENTO", templateId: "area.administracao.procedimento-operacional-padrao" },
    { key: "sv-implantacao", title: "Implantação do novo processo", phase: "EXECUCAO", pert: P(5, 10, 20), rank: 3, role: "Equipe executora", type: "IMPLANTACAO" },
    { key: "sv-indicadores", title: "Relatório gerencial com indicadores", phase: "EXECUCAO", pert: P(2, 3, 5), rank: 6, role: "Gerente do projeto", type: "DOCUMENTO", templateId: "area.administracao.relatorio-gerencial-com-indicadores" },
  ],
  NORMATIVO: [
    { key: "nm-estudo", title: "Estudo de jurisprudência e normas correlatas", phase: "ELABORACAO", pert: P(3, 5, 8), rank: 1, role: "Assessoria jurídica", type: "ESTUDO", templateId: "area.juridico.estudo-de-jurisprudencia" },
    { key: "nm-minuta", title: "Minuta do ato normativo", phase: "ELABORACAO", pert: P(3, 5, 10), rank: 2, role: "Assessoria jurídica", type: "DOCUMENTO", essential: true },
    { key: "nm-parecer", title: "Parecer jurídico", phase: "ANALISE", pert: P(3, 5, 10), rank: 1, role: "Assessoria jurídica", type: "REVISAO", templateId: "area.juridico.parecer-juridico", essential: true },
    { key: "nm-publicacao", title: "Publicação no diário oficial", phase: "EXECUCAO", pert: P(1, 2, 4), rank: 6, role: "Comunicação", type: "COMUNICACAO", essential: true },
    { key: "nm-comunicado", title: "Comunicado oficial às áreas afetadas", phase: "EXECUCAO", pert: P(1, 2, 3), rank: 6, role: "Comunicação", type: "COMUNICACAO", templateId: "area.marketing.comunicado-oficial" },
  ],
  CAPACITACAO: [
    { key: "cp-plano", title: "Plano de capacitação", phase: "ELABORACAO", pert: P(3, 5, 8), rank: 1, role: "Instrutoria", type: "DOCUMENTO", templateId: "area.planejamento.plano-de-capacitacao", essential: true },
    { key: "cp-turmas", title: "Turmas de capacitação", phase: "EXECUCAO", pert: P(5, 10, 15), rank: 5, role: "Instrutoria", type: "CAPACITACAO", essential: true },
    { key: "cp-relatorio", title: "Relatório de acompanhamento da capacitação", phase: "EXECUCAO", pert: P(1, 2, 3), rank: 6, role: "Gerente do projeto", type: "DOCUMENTO", templateId: "area.planejamento.relatorio-de-acompanhamento" },
  ],
  OUTRA: [
    { key: "ou-5w2h", title: "Plano de ação (5W2H)", phase: "ELABORACAO", pert: P(2, 3, 5), rank: 1, role: "Gerente do projeto", type: "DOCUMENTO", templateId: "area.planejamento.plano-de-acao-5w2h", essential: true },
    { key: "ou-execucao", title: "Execução das entregas", phase: "EXECUCAO", pert: P(5, 10, 20), rank: 2, role: "Equipe do projeto", type: "OUTRO" },
    { key: "ou-checklist", title: "Checklist de entrega", phase: "EXECUCAO", pert: P(1, 1, 2), rank: 6, role: "Gerente do projeto", type: "REVISAO", templateId: "area.outra.checklist-de-entrega" },
  ],
};

/** Área do projeto (a governança específica de TI só vale para SOFTWARE) e abordagem de ciclo de vida sugeridas. */
export const KIND_AREA: Record<DemandKind, ProjectArea> = {
  TI: "SOFTWARE", OBRA: "ENGENHARIA", SERVICO: "ADMINISTRACAO", AQUISICAO: "ADMINISTRACAO", NORMATIVO: "JURIDICO", CAPACITACAO: "PLANEJAMENTO", OUTRA: "OUTRA",
};
export const KIND_APPROACH: Record<DemandKind, Approach> = {
  TI: "HIBRIDO", OBRA: "PREDITIVO", SERVICO: "ITERATIVO", AQUISICAO: "PREDITIVO", NORMATIVO: "PREDITIVO", CAPACITACAO: "ITERATIVO", OUTRA: "HIBRIDO",
};

/** Entrega da demanda → modelo de área parecido (para creditar). */
const TEMPLATE_HINTS: [RegExp, string, DemandKind?][] = [
  [/\b(estudo tecnico preliminar|etp)\b/, "area.administracao.estudo-tecnico-preliminar"],
  [/\btermo de referencia\b/, "area.administracao.termo-de-referencia"],
  [/\bparecer\b/, "area.juridico.parecer-juridico"],
  [/\b(lgpd|dados pessoais)\b/, "area.juridico.analise-de-conformidade-lgpd"],
  [/\b(plano de testes|testes? de aceit|homologa)/, "area.software.plano-de-testes"],
  [/\b(historias? de usuario|requisitos)\b/, "area.software.historia-de-usuario-com-criterios"],
  [/\b(seguranca da informacao|owasp|vulnerabilidade)/, "area.software.revisao-de-seguranca-owasp"],
  [/\bimplant/, "area.software.runbook-de-implantacao-e-reversao", "TI"],
  [/\b(capacita|treina)/, "area.planejamento.plano-de-capacitacao"],
  [/\bmemorial descritivo\b/, "area.engenharia.memorial-descritivo"],
  [/\b(sinapi|orcamento de referencia)\b/, "area.engenharia.orcamento-de-referencia-sinapi"],
  [/\bcronograma fisico/, "area.engenharia.cronograma-fisico-financeiro"],
  [/\bvistoria\b/, "area.engenharia.relatorio-de-vistoria-tecnica"],
  [/\bespecificac(?:ao|oes) tecnica/, "area.engenharia.especificacao-tecnica"],
  [/\b(bpmn|mapeamento do processo|mapear o processo|fluxo do processo)\b/, "area.administracao.mapeamento-de-processo-bpmn"],
  [/\b(procedimento operacional|pop)\b/, "area.administracao.procedimento-operacional-padrao"],
  [/\b(indicadores|relatorio gerencial)\b/, "area.administracao.relatorio-gerencial-com-indicadores"],
  [/\bcontratos?\b/, "area.administracao.controle-de-contratos", "SERVICO"],
  [/\b(comunicado|divulga)/, "area.marketing.comunicado-oficial"],
  [/\b(5w2h|plano de acao)\b/, "area.planejamento.plano-de-acao-5w2h"],
];

export function templateFor(text: string, kind: DemandKind): string | undefined {
  const f = fold(text);
  return TEMPLATE_HINTS.find(([re, , only]) => (!only || only === kind) && re.test(f))?.[1];
}

const TEMPLATE_TITLES = new Map(AREA_TEMPLATES.map((t) => [t.id, t.title]));
export const templateTitle = (id: string): string | undefined => TEMPLATE_TITLES.get(id);

/** Verbo de entrega → substantivo da EAP ("Contratar a solução" → "Contratação da solução"): EAP decompõe ENTREGAS. */
const NOMINAL: Record<string, string> = {
  elaborar: "Elaboração", redigir: "Redação", minutar: "Minuta", documentar: "Documentação", produzir: "Produção", preparar: "Preparação",
  emitir: "Emissão", apresentar: "Apresentação", definir: "Definição", planejar: "Planejamento", estruturar: "Estruturação", levantar: "Levantamento",
  mapear: "Mapeamento", diagnosticar: "Diagnóstico", estudar: "Estudo", analisar: "Análise", avaliar: "Avaliação", revisar: "Revisão", validar: "Validação",
  aprovar: "Aprovação", homologar: "Homologação", contratar: "Contratação", adquirir: "Aquisição", licitar: "Licitação", comprar: "Compra",
  desenvolver: "Desenvolvimento", criar: "Criação", integrar: "Integração", modernizar: "Modernização", digitalizar: "Digitalização", testar: "Testes",
  construir: "Construção", reformar: "Reforma", ampliar: "Ampliação", pavimentar: "Pavimentação", implantar: "Implantação", implementar: "Implementação",
  instalar: "Instalação", disponibilizar: "Disponibilização", substituir: "Substituição", atualizar: "Atualização", adequar: "Adequação", migrar: "Migração",
  capacitar: "Capacitação", treinar: "Treinamento", publicar: "Publicação", divulgar: "Divulgação", comunicar: "Comunicação", encaminhar: "Encaminhamento",
  executar: "Execução", realizar: "Realização", prestar: "Prestação", fornecer: "Fornecimento", manter: "Manutenção", fiscalizar: "Fiscalização",
  monitorar: "Monitoramento", organizar: "Organização", promover: "Promoção", regulamentar: "Regulamentação", providenciar: "Providência",
};

export function toNoun(title: string): string {
  const m = /^\s*(\p{L}+)\s+(.+)$/u.exec(title);
  if (!m) return title.trim();
  const noun = NOMINAL[fold(m[1]!)];
  if (!noun) return title.trim();
  let rest = m[2]!.trim();
  const article = /^(o|a|os|as)\s+/i.exec(rest);
  if (article) rest = `d${article[1]!.toLowerCase()} ${rest.slice(article[0].length)}`;
  else if (!/^(de|do|da|dos|das)\s/i.test(rest)) rest = `de ${rest}`;
  return `${noun} ${rest}`;
}

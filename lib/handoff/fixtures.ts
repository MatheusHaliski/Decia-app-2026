/**
 * Exemplo do laboratório para o Dossiê de Transição: tarefas do Acervo das pessoas do diretório DEMO (as mesmas da Mesa e do DECIA,
 * `lib/decia/fixtures.ts`), com datas relativas a hoje para sempre haver vencida, prazo legal e bloqueada. Nomes e números fictícios.
 * Com sessão real, as tarefas da própria pessoa vêm da API (`/api/tasks`) e este exemplo não é usado.
 */
import type { HandoffTaskInput } from "./collect";

const DAY = 86_400_000;
const day = (now: Date, n: number) => new Date(now.getTime() + n * DAY).toISOString().slice(0, 10);

export function buildDemoHandoffTasks(now: Date): HandoffTaskInput[] {
  return [
    // Pessoa Exemplo (u-pessoa)
    {
      id: "t-dossie-relatorio-eva", title: "Relatório mensal de valor agregado", state: "DISPONIVEL", dueAt: day(now, 5), priority: "MEDIA", area: "PLANEJAMENTO",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
      references: [{ label: "Guia de gestão de projetos (exemplo)", url: "https://www.gov.br/governodigital/pt-br" }],
    },
    {
      id: "t-dossie-parecer-aditivo", title: "Parecer sobre o aditivo do contrato de nuvem", state: "EM_USO", dueAt: day(now, 6), priority: "ALTA", area: "JURIDICO",
      category: "PARECER_TECNICO", visibility: "DEPARTAMENTO", accessClass: "RESTRITO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
      extensions: { caseNumber: "0001234-56.2026.8.16.0001", legalBasis: "Lei 14.133/2021, art. 125" },
      references: [{ label: "Lei 14.133/2021 (licitações e contratos)", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" }],
    },
    {
      id: "t-dossie-termo-referencia", title: "Termo de referência da contratação de nuvem", state: "BLOQUEADA", dueAt: day(now, 12), priority: "ALTA", area: "ADMINISTRACAO",
      category: "TERMO_REFERENCIA", visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
      blockReason: "Aguardando a pesquisa de preços do setor de compras",
    },
    {
      id: "t-dossie-ata-comite", title: "Ata da reunião do comitê de TI", state: "DISPONIVEL", dueAt: day(now, -3), priority: "MEDIA", area: "ADMINISTRACAO",
      category: "ATA", visibility: "EMPRESA", accessClass: "INTERNO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
    },
    {
      id: "t-dossie-checklist-lgpd", title: "Checklist de LGPD do projeto", state: "DISPONIVEL", dueAt: day(now, 9), priority: "MEDIA", area: "PESQUISA",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-diego", responsibleId: "u-pessoa",
      references: [{ label: "Lei 13.709/2018 (LGPD)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" }],
    },
    {
      id: "t-dossie-avaliacao-equipe", title: "Avaliação de desempenho da equipe", state: "EM_USO", dueAt: day(now, 20), priority: "MEDIA", area: "ADMINISTRACAO",
      visibility: "DEPARTAMENTO", accessClass: "SIGILOSO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
    },
    {
      id: "t-dossie-anotacoes", title: "Anotações pessoais de estudo", state: "DISPONIVEL", priority: "BAIXA", area: "OUTRA",
      visibility: "PRIVADA", accessClass: "INTERNO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
    },
    {
      id: "t-dossie-capacitacao", title: "Plano de capacitação dos servidores", state: "CONCLUIDA", dueAt: day(now, -20), priority: "MEDIA", area: "PLANEJAMENTO",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-pessoa", responsibleId: "u-pessoa",
      references: [{ label: "Escola Virtual de Governo", url: "https://www.escolavirtual.gov.br/" }],
    },
    // Carla Exemplo
    {
      id: "t-dossie-prototipo", title: "Protótipo navegável da matriz de critérios", state: "EM_USO", dueAt: day(now, 2), priority: "ALTA", area: "DESIGN",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-carla", responsibleId: "u-carla",
      references: [{ label: "WCAG 2.2", url: "https://www.w3.org/TR/WCAG22/" }],
    },
    {
      id: "t-dossie-api-decisoes", title: "Especificação da API de decisões", state: "DISPONIVEL", dueAt: day(now, -1), priority: "MEDIA", area: "SOFTWARE",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-carla", responsibleId: "u-carla",
      references: [{ label: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" }],
    },
    // Diego Exemplo
    {
      id: "t-dossie-relatorio-riscos", title: "Relatório de riscos e LGPD", state: "EM_USO", dueAt: day(now, 4), priority: "ALTA", area: "PESQUISA",
      visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-diego", responsibleId: "u-diego",
    },
    {
      id: "t-dossie-licenca", title: "Renovação da licença do software de modelagem", state: "DISPONIVEL", dueAt: day(now, 10), priority: "MEDIA", area: "ADMINISTRACAO",
      category: "LICENCA_ANUENCIA", visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-diego", responsibleId: "u-diego",
    },
    // Elisa, Bruno e Ana Exemplo
    { id: "t-dossie-treinamento", title: "Roteiro do treinamento de implantação", state: "DISPONIVEL", dueAt: day(now, 15), priority: "MEDIA", area: "PLANEJAMENTO", visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-elisa", responsibleId: "u-elisa" },
    { id: "t-dossie-backlog", title: "Backlog priorizado da Sprint 2", state: "EM_USO", dueAt: day(now, 7), priority: "ALTA", area: "SOFTWARE", visibility: "DEPARTAMENTO", accessClass: "INTERNO", ownerId: "u-bruno", responsibleId: "u-bruno" },
    {
      id: "t-dossie-contrato-suporte", title: "Gestão do contrato de suporte técnico", state: "EM_USO", dueAt: day(now, 25), priority: "MEDIA", area: "ADMINISTRACAO",
      category: "CONTRATO_CONVENIO", visibility: "DEPARTAMENTO", accessClass: "RESTRITO", ownerId: "u-ana", responsibleId: "u-ana",
    },
  ];
}

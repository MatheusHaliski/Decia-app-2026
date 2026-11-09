/**
 * Projeto de demonstração (DEMO) — "Plataforma DECIA v1.0", o mesmo exemplo de projeto da aula (TEMA 1: "Desenvolver o app
 * DECIA até a entrega v1.0"). Os números reproduzem os exemplos das aulas para que cada área seja conferível em sala:
 *  - rede A3 · B4 · C2 · D5 · E2 (+ plano P3 e marco do comitê) ⇒ caminho crítico A→B→marco→D→E = 14 dias, folga de C = 2;
 *  - D com PERT 3/5/7 ⇒ TE 5; risco de 30 % × R$ 50.000 ⇒ VME R$ 15.000; mudança "novo módulo de relatórios" do simulado;
 *  - erros DE PROPÓSITO para o feedback encontrar: dois "A" na RACI de D e nenhum em C, entrega com nome de atividade
 *    ("Testar integração"), atividade criada depois da linha de base sem mudança (scope creep), reserva de contingência menor que
 *    o VME, OLA tão frouxo quanto o SLA, portão aprovado sem decisão registrada no DECIA, RF-02 sem teste e RF-03 sem entrega.
 * Pessoas = o diretório DEMO do DECIA (`lib/decia/fixtures.ts`).
 */
import { baselineFrom } from "./commands";
import type { ProjectModel } from "./types";

export const DEMO_PROJECT_ID = "decia-v1";

export function buildDemoProject(): ProjectModel {
  const start = "2026-11-02";
  const base: ProjectModel = {
    id: DEMO_PROJECT_ID,
    title: "Plataforma DECIA v1.0",
    startDate: start,
    statusDate: "2026-11-10",
    approach: "HIBRIDO",
    boardModel: "INSTITUCIONAL",
    currentPhase: "ELABORACAO",
    currentSprint: 1,
    sprints: [
      { number: 1, start: "2026-11-05", end: "2026-11-18", goal: "Protótipo navegável da matriz de critérios validado com o comitê" },
      { number: 2, start: "2026-11-19", end: "2026-12-02", goal: "Registro de decisão com snapshot verificável em produção" },
    ],
    team: [
      { userId: "u-ana", role: "PATROCINADOR" },
      { userId: "u-pessoa", role: "GERENTE" },
      { userId: "u-bruno", role: "PRODUCT_OWNER" },
      { userId: "u-elisa", role: "SCRUM_MASTER" },
      { userId: "u-carla", role: "EQUIPE" },
      { userId: "u-diego", role: "EQUIPE" },
    ],
    charter: {
      justification: ["Decisões do comitê de TI ficam em atas soltas, sem rastro do porquê"],
      objectives: [
        { id: "o1", text: "Registrar 100% das decisões do comitê de TI no DECIA até jun/2027", smart: true, goalId: "g1" },
        { id: "o2", text: "Melhorar a comunicação com as áreas", smart: false },
      ],
      product: "Plataforma DECIA v1.0 (decisão estruturada com snapshot imutável)",
      highLevelRequirements: ["Registrar decisões com critérios e alternativas", "Exportar ata com snapshot"],
      premises: ["Equipe dedicada de 4 pessoas", "Nuvem contratada até a execução"],
      constraints: ["Orçamento máximo de R$ 60 mil", "Conformidade com a LGPD"],
      highLevelRisks: ["Atraso na contratação de nuvem"],
      teamRoles: ["Analista de requisitos", "Desenvolvedor full stack"],
      milestones: [{ id: "m1", title: "Aprovação do comitê", date: "2026-11-11" }, { id: "m2", title: "Entrega v1.0", date: "2026-11-16" }],
      summaryBudget: 60_000,
      managerId: "u-pessoa",
      sponsorId: "u-ana",
      approvedBySponsorAt: "2026-11-02T14:00:00Z",
      approvedBy: "u-ana",
    },
    businessCase: { rate: 0.1, cashflows: [-50_000, 15_000, 25_000, 30_000], benefits: ["Menos retrabalho na redação de atas", "Rastro auditável para o controle interno"] },
    stakeholders: [
      { id: "s1", name: "Secretário das Cidades", role: "Alta direção", power: 5, interest: 2 },
      { id: "s2", name: "Diretoria de TI", role: "Comitê de TI", power: 5, interest: 5 },
      { id: "s3", name: "Servidores usuários", role: "Usuários", power: 2, interest: 5 },
      { id: "s4", name: "Controle interno", role: "Auditoria", power: 4, interest: 2 },
      { id: "s5", name: "Fornecedor de nuvem", role: "Fornecedor", power: 2, interest: 2 },
    ],
    requirements: [
      { id: "r1", code: "RF-01", text: "Registrar decisão com critérios e alternativas", origin: "Transparência das decisões", originStakeholderId: "s2", deliverableIds: ["w11"], test: "CT-01" },
      { id: "r2", code: "RF-02", text: "Exportar ata com snapshot imutável", origin: "Prestação de contas (IBGC)", deliverableIds: ["w12"] },
      { id: "r3", code: "RF-03", text: "Entrar com o login institucional", origin: "Segurança de acesso", deliverableIds: [] },
    ],
    wbs: [
      { id: "w0", title: "Plataforma DECIA v1.0" },
      { id: "w1", parentId: "w0", title: "Módulo de decisões", budget: 32_000 },
      { id: "w11", parentId: "w1", title: "Matriz de critérios e protótipo", acceptance: "Protótipo validado com o comitê", ownerId: "u-carla" },
      { id: "w12", parentId: "w1", title: "Registro e snapshot", acceptance: "Snapshot com SHA-256 verificável", ownerId: "u-carla" },
      { id: "w2", parentId: "w0", title: "Documentação de gerenciamento" },
      { id: "w21", parentId: "w2", title: "Termo de abertura" },
      { id: "w22", parentId: "w2", title: "Plano do projeto" },
      { id: "w3", parentId: "w0", title: "Implantação" },
      { id: "w31", parentId: "w3", title: "Treinamento dos servidores" },
      { id: "w32", parentId: "w3", title: "Testar integração" },
    ],
    tasks: [
      { id: "tA", code: "T01", title: "Termo de abertura e requisitos", phase: "DEMANDA", status: "CONCLUIDA", wbsId: "w21", responsibleId: "u-pessoa", reviewerId: "u-ana", durationDays: 3, percentComplete: 100, budget: 6_000, actualCost: 6_500, moscow: "MUST", createdBy: "u-pessoa", createdAt: "2026-11-02T12:00:00Z", startedAt: "2026-11-02T13:00:00Z", doneAt: "2026-11-05T18:00:00Z" },
      { id: "tP", code: "T02", title: "Plano do projeto (EAP, cronograma, orçamento)", phase: "PLANEJAMENTO", status: "CONCLUIDA", wbsId: "w22", responsibleId: "u-pessoa", reviewerId: "u-pessoa", durationDays: 3, percentComplete: 100, budget: 4_000, actualCost: 3_800, moscow: "MUST", createdBy: "u-pessoa", createdAt: "2026-11-02T12:00:00Z", startedAt: "2026-11-05T09:00:00Z", doneAt: "2026-11-08T18:00:00Z" },
      { id: "tB", code: "T03", title: "Arquitetura e protótipo", phase: "ELABORACAO", status: "EM_ANDAMENTO", wbsId: "w11", responsibleId: "u-carla", durationDays: 4, percentComplete: 50, budget: 12_000, actualCost: 7_000, moscow: "MUST", sprint: 1, createdBy: "u-carla", createdAt: "2026-11-03T12:00:00Z", startedAt: "2026-11-06T09:00:00Z" },
      { id: "tC", code: "T04", title: "Análise de riscos e LGPD", phase: "ANALISE", status: "A_FAZER", responsibleId: "u-diego", durationDays: 2, percentComplete: 0, budget: 3_000, actualCost: 0, moscow: "SHOULD", createdBy: "u-diego", createdAt: "2026-11-03T12:00:00Z" },
      { id: "tM", code: "T05", title: "Aprovação do comitê (portão)", phase: "APROVACAO", status: "A_FAZER", durationDays: 0, milestone: true, percentComplete: 0, budget: 0, actualCost: 0, createdBy: "u-pessoa", createdAt: "2026-11-02T12:00:00Z" },
      { id: "tD", code: "T06", title: "Desenvolvimento do módulo de decisões", phase: "EXECUCAO", status: "A_FAZER", wbsId: "w12", responsibleId: "u-carla", durationDays: 5, pert: { o: 3, m: 5, p: 7 }, percentComplete: 0, budget: 20_000, actualCost: 0, moscow: "MUST", sprint: 2, createdBy: "u-carla", createdAt: "2026-11-04T12:00:00Z" },
      { id: "tE", code: "T07", title: "Implantação, aceite e treinamento", phase: "ENCERRAMENTO", status: "A_FAZER", wbsId: "w31", responsibleId: "u-elisa", durationDays: 2, percentComplete: 0, budget: 5_000, actualCost: 0, moscow: "MUST", createdBy: "u-elisa", createdAt: "2026-11-04T12:00:00Z" },
    ],
    dependencies: [
      { id: "d1", from: "tA", to: "tB", type: "FS", lagDays: 0 },
      { id: "d2", from: "tA", to: "tC", type: "FS", lagDays: 0 },
      { id: "d3", from: "tA", to: "tP", type: "FS", lagDays: 0 },
      { id: "d4", from: "tB", to: "tM", type: "FS", lagDays: 0 },
      { id: "d5", from: "tC", to: "tM", type: "FS", lagDays: 0 },
      { id: "d6", from: "tP", to: "tM", type: "FS", lagDays: 0 },
      { id: "d7", from: "tM", to: "tD", type: "FS", lagDays: 0 },
      { id: "d8", from: "tD", to: "tE", type: "FS", lagDays: 0 },
    ],
    raci: [
      { taskId: "tA", userId: "u-pessoa", letters: ["R"] }, { taskId: "tA", userId: "u-ana", letters: ["A"] }, { taskId: "tA", userId: "u-bruno", letters: ["C"] },
      { taskId: "tP", userId: "u-pessoa", letters: ["R", "A"] }, { taskId: "tP", userId: "u-elisa", letters: ["C"] },
      { taskId: "tB", userId: "u-carla", letters: ["R"] }, { taskId: "tB", userId: "u-pessoa", letters: ["A"] }, { taskId: "tB", userId: "u-bruno", letters: ["C"] },
      { taskId: "tC", userId: "u-diego", letters: ["R"] }, { taskId: "tC", userId: "u-ana", letters: ["I"] },
      { taskId: "tD", userId: "u-carla", letters: ["R"] }, { taskId: "tD", userId: "u-diego", letters: ["R"] }, { taskId: "tD", userId: "u-pessoa", letters: ["A"] }, { taskId: "tD", userId: "u-bruno", letters: ["A"] },
      { taskId: "tE", userId: "u-elisa", letters: ["R"] }, { taskId: "tE", userId: "u-pessoa", letters: ["A"] }, { taskId: "tE", userId: "u-ana", letters: ["I"] },
    ],
    risks: [
      { id: "k1", title: "Atraso na contratação de nuvem", kind: "AMEACA", probability: 0.3, impact: 50_000, impactLevel: 4, response: "TRANSFERIR", ownerId: "u-pessoa", taskIds: ["tD"], status: "ABERTO" },
      { id: "k2", title: "Rotatividade da equipe", kind: "AMEACA", probability: 0.5, impact: 20_000, impactLevel: 3, ownerId: "u-elisa", taskIds: [], status: "ABERTO" },
      { id: "k3", title: "Reuso de componentes do Work Station", kind: "OPORTUNIDADE", probability: 0.4, impact: 10_000, impactLevel: 2, response: "EXPLORAR", ownerId: "u-carla", taskIds: ["tB"], status: "ABERTO" },
    ],
    changes: [
      {
        id: "c1", code: "MUD-01", title: "Novo módulo de relatórios", requesterId: "u-bruno", type: "NORMAL", status: "SOLICITADA",
        impact: { scope: 1, scheduleDays: 5, cost: 8_000, quality: 0, resources: 1, risk: 1 },
        sevenRs: { raised: "Product Owner", reason: "Pedido do comitê para relatórios gerenciais", returnExpected: "Relatórios sem planilha paralela" },
        createdAt: "2026-11-09T10:00:00Z",
      },
    ],
    lessons: [{ id: "l1", phase: "DEMANDA", text: "Envolver o controle interno já no termo de abertura evitou retrabalho", kind: "POSITIVA", authorId: "u-ana", at: "2026-11-05T17:00:00Z" }],
    gates: [
      { phase: "DEMANDA", outcome: "APROVADO", decidedAt: "2026-11-05T18:00:00Z", notes: "Aprovado em reunião, sem registro no DECIA" },
      { phase: "PLANEJAMENTO", outcome: "APROVADO", decidedAt: "2026-11-08T18:00:00Z" },
    ],
    budgetLines: [
      { id: "b1", title: "Desenvolvimento", amount: 37_000, spend: "GROW" },
      { id: "b2", title: "Nuvem (1º ano)", amount: 8_000, spend: "RUN" },
      { id: "b3", title: "Capacitação para o novo processo decisório", amount: 5_000, spend: "TRANSFORM" },
    ],
    reserves: { contingency: 15_000, management: 5_000 },
    governance: {
      goals: [
        { id: "g1", code: "OE-03", text: "Ampliar a transparência e a rastreabilidade das decisões", source: "PEI" },
        { id: "g2", code: "ND-07", text: "Sistema de apoio à decisão colegiada", source: "PDTIC" },
      ],
      gut: { g: 4, u: 4, t: 3 },
      need: "SERVICO",
      spend: "GROW",
      orgStructure: "MATRICIAL_BALANCEADA",
      iso38500: { RESPONSABILIDADE: true, ESTRATEGIA: true, CONFORMIDADE: true },
    },
    closure: {
      acceptance: false, contractsClosed: false, resourcesReleased: false, finalReport: false, archived: false,
      service: { slaHours: 4, olaHours: 4, ucHours: 2, catalogEntry: false, knowledgeBase: false, cmdbUpdated: false },
    },
    canvas: { positions: {}, notes: [{ id: "n1", text: "Integração com o e-Protocolo?", color: "AMARELO" }] },
    decisionIds: [],
    versions: [
      { number: 1, at: "2026-11-02T14:00:00Z", actorId: "u-ana", key: "charterUpdated" },
      { number: 2, at: "2026-11-05T18:00:00Z", actorId: "u-pessoa", key: "gateSet", vars: { phase: "DEMANDA", outcome: "APROVADO" } },
      { number: 3, at: "2026-11-08T18:00:00Z", actorId: "u-pessoa", key: "baselineSet", vars: { finish: 14 } },
      { number: 4, at: "2026-11-09T09:00:00Z", actorId: "u-carla", key: "taskUpdated", vars: { code: "T03" } },
    ],
    version: 4,
  };
  // linha de base aprovada no fim do planejamento; DEPOIS dela entrou uma atividade sem mudança aprovada (scope creep)
  const baseline = baselineFrom(base, "2026-11-08T18:00:00Z")!;
  return {
    ...base,
    baseline,
    tasks: [
      ...base.tasks,
      { id: "tX", code: "T08", title: "Ajuste visual pedido por mensagem", phase: "EXECUCAO", status: "EM_ANDAMENTO", responsibleId: "u-carla", durationDays: 1, percentComplete: 30, budget: 0, actualCost: 600, addedAfterBaseline: true, createdBy: "u-carla", createdAt: "2026-11-09T11:00:00Z", startedAt: "2026-11-09T14:00:00Z" },
    ],
  };
}

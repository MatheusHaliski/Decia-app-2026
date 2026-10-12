/**
 * DECIA — dados DEMO (fictícios) para as 5 jornadas de ponta a ponta e os casos de borda dos testes do card.
 * Nenhuma pessoa, empresa ou órgão real: nomes genéricos ("Ana Exemplo", "Fornecedor Alfa (demo)"). As datas são
 * relativas a `now` (como lib/notifications/mock.ts usa `minutesAgo`), para os exemplos ficarem sempre "frescos".
 * A API de decisões ainda não existe (03 §8: nenhuma API é exposta antes do Bloco 4/5 de segurança) — estes dados
 * alimentam só o repositório em memória (repository.ts).
 */
import { buildSnapshotContent, canonicalJson, MODEL_VERSION, sha256Hex } from "./rules";
import type {
  ContentOrigin, CriterionAssessment, Decision, DecisionAggregate, DecisionAlternative, DecisionCriterion, DecisionEvent,
  DecisionLifecycle, DecisionSnapshot, PeopleDirectory,
} from "./types";

export const DEMO_LABEL = "DEMO";
/** Identidade de demonstração do perfil de visualização (o "Pessoa Exemplo" do shell). */
export const DEMO_CURRENT_USER_ID = "u-pessoa";

export const DEMO_PEOPLE: PeopleDirectory = {
  "u-pessoa": { name: "Pessoa Exemplo" },
  "u-ana": { name: "Ana Exemplo" },
  "u-bruno": { name: "Bruno Exemplo" },
  "u-carla": { name: "Carla Exemplo" },
  "u-diego": { name: "Diego Exemplo" },
  "u-elisa": { name: "Elisa Exemplo" },
};

export const DEMO_PROJECTS: Record<string, { name: string }> = {
  "p-plataforma": { name: "Plataforma Exemplo" },
  "p-atendimento": { name: "App de Atendimento (demo)" },
  "p-suporte": { name: "Central de Suporte (demo)" },
};

export const DEMO_DECISION_IDS = {
  arquitetura: "d-arquitetura",
  sprint: "d-sprint-5",
  fornecedor: "d-fornecedor-suporte",
  lancamento: "d-lancamento",
  navegacao: "d-navegacao",
} as const;

/** Prefixo das decisões criadas pelo fluxo "Nova decisão" (só existem na memória do navegador). */
export const NEW_DECISION_PREFIX = "d-nova-";
/** Ids que o workspace aceita: os exemplos e os criados nesta aba; o resto é 404. */
export const isKnownDecisionId = (id: string) =>
  (Object.values(DEMO_DECISION_IDS) as string[]).includes(id) || (id.startsWith(NEW_DECISION_PREFIX) && /^[a-z0-9-]{8,80}$/.test(id));

const DAY = 86_400_000;
const at = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString();
const H: ContentOrigin = "HUMANO";

function decision(now: Date, p: Partial<Decision> & Pick<Decision, "id" | "title" | "question" | "status">): Decision {
  return {
    version: 1, stakeholders: [], ownerUserId: DEMO_CURRENT_USER_ID, createdByUserId: DEMO_CURRENT_USER_ID, companyId: "c-exemplo",
    complexity: "PADRAO", kind: "OPERACIONAL", impact: "MEDIO", urgency: "MEDIO", visibility: "PRIVADA", accessClass: "INTERNO",
    weightingEnabled: false, independentScoring: false, createdAt: at(now, -30), updatedAt: at(now, -1), ...p,
  };
}

const empty = (d: Decision): DecisionAggregate => ({
  decision: d, participants: [], alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], assumptions: [], risks: [],
  scenarios: [], forecasts: [], recommendations: [], triggers: [], snapshots: [], checkpoints: [], workLinks: [], events: [],
});

const alt = (id: string, label: string, title: string, position: number, p: Partial<DecisionAlternative> = {}): DecisionAlternative =>
  ({ id, label, title, position, doNothing: false, pros: [], cons: [], status: "ATIVA", origin: H, ...p });
const crit = (id: string, name: string, position: number, weightPct: number | null = null, p: Partial<DecisionCriterion> = {}): DecisionCriterion =>
  ({ id, name, position, weightPct, direction: "MAIOR_MELHOR", origin: H, ...p });
const scores = (now: Date, prefix: string, by: string, altId: string, entries: [string, number][]): CriterionAssessment[] =>
  entries.map(([critId, score]) => ({ id: `${prefix}-${altId}-${critId}-${by}`, alternativeId: altId, criterionId: critId, assessorUserId: by, score, submittedAt: at(now, -6), origin: H }));
const statusTrail = (now: Date, prefix: string, trail: [DecisionLifecycle, number][]): DecisionEvent[] => [
  { id: `${prefix}-ev-0`, actorUserId: DEMO_CURRENT_USER_ID, type: "DECISAO_CRIADA", payload: {}, at: at(now, trail[0]?.[1] ?? -30) },
  ...trail.map(([status, days], i) => ({ id: `${prefix}-ev-${i + 1}`, actorUserId: DEMO_CURRENT_USER_ID, type: "ESTADO_ALTERADO" as const, payload: { to: status }, at: at(now, days) })),
];

function snapshot(agg: DecisionAggregate, takenAt: string, by: string): DecisionSnapshot {
  const d = agg.decision;
  const content = buildSnapshotContent(agg, { selectedAlternativeId: d.selectedAlternativeId, rationale: d.rationale ?? "", confidencePct: d.decisionConfidencePct, decidedByUserId: by });
  const contentJson = canonicalJson(content);
  return {
    id: `${d.id}-snap-1`, kind: "DECISAO", versionNumber: 1, takenAt, takenByUserId: by, contentJson, contentSha256: sha256Hex(contentJson),
    rationale: d.rationale ?? "", confidencePct: d.decisionConfidencePct, modelVersion: MODEL_VERSION,
    selectedAlternativeLabel: agg.alternatives.find((a) => a.id === d.selectedAlternativeId)?.label ?? "—",
  };
}

/* ------------------------------------------------------------------------------------------------
 * 1. Arquitetura técnica — mesmos dados do vetor `arquitetura-ponderada` (A 3,80 · B 3,75 · C 3,55; sensível)
 * ------------------------------------------------------------------------------------------------ */
function arquitetura(now: Date): DecisionAggregate {
  const id = DEMO_DECISION_IDS.arquitetura;
  const agg = empty(decision(now, {
    id, title: "Infraestrutura para os próximos 12 meses",
    question: "Qual infraestrutura devemos usar para suportar o crescimento previsto do produto pelos próximos 12 meses?",
    status: "COMPARACAO", complexity: "PADRAO", kind: "TECNICA", impact: "ALTO", urgency: "MEDIO", weightingEnabled: true,
    targetDate: at(now, 24), projectId: "p-plataforma", decisionConfidencePct: 60, independentScoring: true,
    objective: "Suportar o dobro de acessos sem queda de disponibilidade, mantendo o custo mensal previsível.",
    scope: "Hospedagem da API, banco de dados e filas. Fora do escopo: front-end estático e e-mail.",
    constraintsMd: "Orçamento mensal de até R$ 12 mil · dados devem ficar no Brasil · equipe de 3 pessoas para operar.",
    stakeholders: ["Equipe de produto", "Segurança da informação", "Financeiro"],
    contextMd: "O plano atual atinge o limite de conexões em horários de pico. O crescimento previsto é de 2× em 12 meses.",
  }));
  agg.participants = [
    { userId: "u-pessoa", role: "CONDUTOR", joinedAt: at(now, -30), assessmentsSubmittedAt: at(now, -6) },
    { userId: "u-bruno", role: "CONTRIBUIDOR", joinedAt: at(now, -28), assessmentsSubmittedAt: at(now, -5) },
    { userId: "u-carla", role: "CONTRIBUIDOR", joinedAt: at(now, -28), assessmentsSubmittedAt: at(now, -5) },
    { userId: "u-diego", role: "APROVADOR", joinedAt: at(now, -27) },
  ];
  agg.alternatives = [
    alt("arq-a", "A", "Railway", 0, { pros: ["Mais barato", "Deploy em minutos"], cons: ["Menos escalável", "Limite de região"], estimatedCost: "R$ 4 mil/mês", estimatedDurationDays: 10 }),
    alt("arq-b", "B", "AWS", 1, { pros: ["Escala comprovada", "Controles de segurança maduros"], cons: ["Custo mais alto", "Curva de aprendizado"], estimatedCost: "R$ 9 mil/mês", estimatedDurationDays: 45 }),
    alt("arq-c", "C", "Azure híbrido", 2, { pros: ["Integra o diretório corporativo"], cons: ["Operação híbrida mais complexa"], estimatedCost: "R$ 7 mil/mês", estimatedDurationDays: 35 }),
    alt("arq-d", "D", "Adiar a migração", 3, { doNothing: true, status: "DESCARTADA", discardReason: "O plano atual esgota a capacidade em cerca de 4 meses.", pros: ["Sem custo agora"], cons: ["Risco de indisponibilidade no pico"] }),
  ];
  agg.criteria = [
    crit("arq-seguranca", "Segurança", 0, 30), crit("arq-custo", "Custo", 1, 20, { direction: "MENOR_MELHOR", description: "5 = mais barato" }),
    crit("arq-escalabilidade", "Escalabilidade", 2, 25), crit("arq-tempo", "Tempo de implantação", 3, 15, { direction: "MENOR_MELHOR" }),
    crit("arq-manutencao", "Manutenção", 4, 10),
  ];
  const c = (k: string) => `arq-${k}`;
  agg.assessments = [
    ...scores(now, id, "u-pessoa", "arq-a", [[c("seguranca"), 3], [c("custo"), 5], [c("escalabilidade"), 3], [c("tempo"), 5], [c("manutencao"), 4]]),
    ...scores(now, id, "u-pessoa", "arq-b", [[c("seguranca"), 5], [c("custo"), 2], [c("escalabilidade"), 5], [c("tempo"), 2], [c("manutencao"), 3]]),
    ...scores(now, id, "u-pessoa", "arq-c", [[c("seguranca"), 4], [c("custo"), 3], [c("escalabilidade"), 4], [c("tempo"), 3], [c("manutencao"), 3]]),
    ...scores(now, id, "u-bruno", "arq-b", [[c("seguranca"), 2]]),
    ...scores(now, id, "u-carla", "arq-b", [[c("seguranca"), 5]]),
  ];
  agg.evidence = [
    { id: "arq-e1", nature: "EVIDENCIA", kind: "TESTE_TECNICO", title: "Teste de carga no ambiente de homologação", summary: "Com 2× o pico atual, A e B mantiveram latência abaixo de 300 ms.", sourceLabel: "teste-carga", observedAt: at(now, -9), retrievedAt: at(now, -9), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-bruno", addedAt: at(now, -9) },
    { id: "arq-e2", nature: "FATO", kind: "DOCUMENTO", title: "Limite de região documentado pelo provedor A", summary: "O plano contratável de A não oferece região no Brasil.", sourceLabel: "documentacao-provedor-a", retrievedAt: at(now, -8), sourceQuality: "SECUNDARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-carla", addedAt: at(now, -8) },
    { id: "arq-e3", nature: "FATO", kind: "DOCUMENTO", title: "Relatório de conformidade de segurança do provedor B", summary: "Certificações e SLA de 99,95 % verificados.", sourceLabel: "sla-fornecedor", retrievedAt: at(now, -7), sourceQuality: "SECUNDARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-carla", addedAt: at(now, -7) },
    { id: "arq-e4", nature: "OPINIAO", kind: "OPINIAO_ESPECIALISTA", title: "Especialista: operar B exige pessoa dedicada", summary: "Sem automação, a operação de B consome meio período de uma pessoa.", sourceLabel: "especialista", authorLabel: "Consultoria (demo)", sourceQuality: "ESPECIALISTA", relevance: "MEDIA", reliability: "MEDIA", origin: H, addedByUserId: "u-pessoa", addedAt: at(now, -6) },
    { id: "arq-e5", nature: "FATO", kind: "CONJUNTO_DADOS", title: "Planilha de custos estimados (12 meses)", summary: "A: R$ 48 mil · B: R$ 108 mil · C: R$ 84 mil por ano.", sourceLabel: "financeiro", retrievedAt: at(now, -5), sourceQuality: "INTERNA", relevance: "ALTA", reliability: "MEDIA", origin: H, addedByUserId: "u-pessoa", addedAt: at(now, -5) },
  ];
  agg.evidenceLinks = [
    { id: "arq-l1", evidenceId: "arq-e1", targetType: "ALTERNATIVA", targetId: "arq-a", stance: "SUSTENTA" },
    { id: "arq-l2", evidenceId: "arq-e1", targetType: "ALTERNATIVA", targetId: "arq-b", stance: "SUSTENTA" },
    { id: "arq-l3", evidenceId: "arq-e2", targetType: "ALTERNATIVA", targetId: "arq-a", stance: "CONTRADIZ", note: "Exigência de dados no Brasil" },
    { id: "arq-l4", evidenceId: "arq-e3", targetType: "ALTERNATIVA", targetId: "arq-b", stance: "SUSTENTA" },
    { id: "arq-l5", evidenceId: "arq-e4", targetType: "ALTERNATIVA", targetId: "arq-b", stance: "CONTRADIZ" },
    { id: "arq-l6", evidenceId: "arq-e1", targetType: "CRITERIO", targetId: "arq-escalabilidade", stance: "CONTEXTO" },
    { id: "arq-l7", evidenceId: "arq-e3", targetType: "CRITERIO", targetId: "arq-seguranca", stance: "CONTEXTO" },
    { id: "arq-l8", evidenceId: "arq-e5", targetType: "CRITERIO", targetId: "arq-custo", stance: "CONTEXTO" },
  ];
  agg.assumptions = [
    { id: "arq-p1", statement: "O volume de acessos dobra em 12 meses", importance: "CRITICO", confidencePct: 70, validationStatus: "NAO_VALIDADA", ownerUserId: "u-pessoa", origin: H },
    { id: "arq-p2", statement: "A equipe consegue operar Kubernetes gerenciado", importance: "ALTO", confidencePct: 50, validationStatus: "EM_VALIDACAO", alternativeId: "arq-b", ownerUserId: "u-bruno", origin: H },
  ];
  agg.risks = [
    { id: "arq-r1", title: "Limite de região do provedor", alternativeId: "arq-a", likelihood: "PROVAVEL", impact: "ALTO", mitigation: "Confirmar oferta de região nacional antes de contratar", source: "MANUAL", status: "ABERTO", origin: H, ownerUserId: "u-carla" },
    { id: "arq-r2", title: "Custo de tráfego de saída acima do previsto", alternativeId: "arq-b", likelihood: "POSSIVEL", impact: "MEDIO", source: "PRE_MORTEM", status: "ABERTO", origin: H },
    { id: "arq-r3", title: "Migração atrasa o roadmap do trimestre", likelihood: "RARA", impact: "MEDIO", source: "MANUAL", status: "ABERTO", origin: H },
  ];
  agg.scenarios = [
    { id: "arq-s1", alternativeId: "arq-a", case: "MELHOR", description: "Região nacional liberada em 2 meses", likelihood: "POSSIVEL", assumptionIds: ["arq-p1"], expectedResult: "Custo 55 % menor que B com a mesma latência" },
    { id: "arq-s2", alternativeId: "arq-a", case: "BASE", description: "Crescimento de 2× e sem região nacional", likelihood: "PROVAVEL", assumptionIds: ["arq-p1"], expectedResult: "Exige proxy de dados — custo extra de R$ 1 mil/mês" },
    { id: "arq-s3", alternativeId: "arq-a", case: "PIOR", description: "Crescimento de 3× antes de março", likelihood: "RARA", assumptionIds: ["arq-p1"], expectedResult: "Nova migração em 6 meses" },
  ];
  agg.forecasts = [{ id: "arq-f1", alternativeId: "arq-a", statement: "O custo mensal fica abaixo de R$ 8 mil em março", probabilityPct: 70, resolveBy: at(now, 160), forecasterUserId: "u-pessoa", resolution: "PENDENTE" }];
  agg.recommendations = [
    { id: "arq-rec-1", alternativeId: "arq-a", source: "MODELO", reasoningMd: "A lidera a soma ponderada (3,80 × 3,75 de B).", supporting: ["Maior contribuição em Custo e Tempo de implantação", "Teste de carga sustenta A"], contradicting: ["Segurança 3 de 5", "Limite de região documentado"], criticalAssumptionIds: ["arq-p1"], limitationsMd: "Vantagem de 0,05 ponto: a ordem depende dos pesos.", whatWouldChangeMd: "Custo de 20 % para 17 % faz B liderar.", modelVersion: MODEL_VERSION, status: "SUGERIDA", createdAt: at(now, -4) },
    { id: "arq-rec-2", source: "IA", reasoningMd: "Há forte divergência no critério Segurança para B (notas 2 e 5). Vale ouvir quem deu 2 antes de decidir.", supporting: ["Divergência registrada na rodada independente"], contradicting: ["A mediana de B em Segurança é 5"], criticalAssumptionIds: [], limitationsMd: "Sugestão de estrutura, não de escolha.", whatWouldChangeMd: "Uma justificativa técnica para a nota 2.", modelVersion: "demo", aiInferenceId: "ai-demo-1", status: "SUGERIDA", createdAt: at(now, -2) },
  ];
  agg.triggers = [{ id: "arq-t1", conditionText: "O volume de acessos cresce mais de 3× antes de março", metricKey: "acessos_mensais", comparator: ">", threshold: 3, status: "ATIVO" }];
  agg.events = statusTrail(now, id, [["RASCUNHO", -30], ["ENQUADRAMENTO", -28], ["PESQUISA", -20], ["COMPARACAO", -10]]);
  return agg;
}

/* ------------------------------------------------------------------------------------------------
 * 2. Priorização de produto — AGUARDANDO_DECISAO, pesos iguais
 * ------------------------------------------------------------------------------------------------ */
function sprint(now: Date): DecisionAggregate {
  const id = DEMO_DECISION_IDS.sprint;
  const agg = empty(decision(now, {
    id, title: "Escopo da Sprint 5", question: "Qual funcionalidade entra na Sprint 5?", status: "AGUARDANDO_DECISAO", complexity: "PADRAO",
    kind: "PRODUTO", impact: "MEDIO", urgency: "ALTO", targetDate: at(now, 3), projectId: "p-atendimento", decisionConfidencePct: 75,
    objective: "Entregar a funcionalidade com maior valor para quem atende o público, sem estourar a capacidade da sprint.",
    stakeholders: ["Atendimento", "Produto"], createdAt: at(now, -12),
  }));
  agg.participants = [
    { userId: "u-pessoa", role: "CONDUTOR", joinedAt: at(now, -12), assessmentsSubmittedAt: at(now, -4) },
    { userId: "u-ana", role: "CONTRIBUIDOR", joinedAt: at(now, -11), assessmentsSubmittedAt: at(now, -4) },
  ];
  agg.alternatives = [
    alt("spr-a", "A", "Exportar relatórios em PDF", 0, { pros: ["Pedido nº 1 da pesquisa"], cons: ["Biblioteca de PDF a avaliar"] }),
    alt("spr-b", "B", "Notificações por e-mail", 1, { pros: ["Reduz retrabalho"], cons: ["Depende de provedor de e-mail"] }),
    alt("spr-c", "C", "Filtro avançado na busca", 2, { pros: ["Baixo risco"], cons: ["Valor percebido menor"] }),
    alt("spr-d", "D", "Não incluir nada novo (estabilizar)", 3, { doNothing: true, pros: ["Reduz dívida técnica"], cons: ["Nenhum valor novo visível"] }),
  ];
  agg.criteria = [crit("spr-valor", "Valor para o usuário", 0), crit("spr-esforco", "Esforço (5 = menor)", 1), crit("spr-risco", "Risco técnico (5 = menor)", 2), crit("spr-meta", "Alinhamento com a meta", 3)];
  const v = (alt: string, entries: [string, number][], by = "u-pessoa") => scores(now, id, by, alt, entries.map(([k, s]) => [`spr-${k}`, s] as [string, number]));
  agg.assessments = [
    ...v("spr-a", [["valor", 5], ["esforco", 3], ["risco", 3], ["meta", 4]]), ...v("spr-a", [["valor", 4]], "u-ana"),
    ...v("spr-b", [["valor", 3], ["esforco", 3], ["risco", 4], ["meta", 3]]),
    ...v("spr-c", [["valor", 3], ["esforco", 4], ["risco", 4], ["meta", 2]]),
    ...v("spr-d", [["valor", 1], ["esforco", 5], ["risco", 5], ["meta", 2]]),
  ];
  agg.evidence = [
    { id: "spr-e1", nature: "FATO", kind: "PESQUISA", title: "Pesquisa com 40 pessoas usuárias", summary: "62 % pedem exportação em PDF.", sourceLabel: "pesquisa", retrievedAt: at(now, -8), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-ana", addedAt: at(now, -8) },
    { id: "spr-e2", nature: "EVIDENCIA", kind: "DOCUMENTO", title: "Chamados de suporte do último mês", summary: "18 chamados pedem uma forma de compartilhar relatórios.", sourceLabel: "suporte", retrievedAt: at(now, -7), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "MEDIA", origin: H, addedByUserId: "u-pessoa", addedAt: at(now, -7) },
    { id: "spr-e3", nature: "OPINIAO", kind: "FEEDBACK_USUARIO", title: "Time comercial prefere notificações", summary: "Ajudaria a reter clientes institucionais.", sourceLabel: "comercial", sourceQuality: "NAO_VERIFICADA", relevance: "MEDIA", reliability: "MEDIA", origin: H, addedByUserId: "u-ana", addedAt: at(now, -6) },
  ];
  agg.evidenceLinks = [
    { id: "spr-l1", evidenceId: "spr-e1", targetType: "ALTERNATIVA", targetId: "spr-a", stance: "SUSTENTA" },
    { id: "spr-l2", evidenceId: "spr-e2", targetType: "ALTERNATIVA", targetId: "spr-a", stance: "SUSTENTA" },
    { id: "spr-l3", evidenceId: "spr-e3", targetType: "ALTERNATIVA", targetId: "spr-b", stance: "SUSTENTA" },
    { id: "spr-l4", evidenceId: "spr-e1", targetType: "CRITERIO", targetId: "spr-valor", stance: "CONTEXTO" },
    { id: "spr-l5", evidenceId: "spr-e2", targetType: "CRITERIO", targetId: "spr-meta", stance: "CONTEXTO" },
  ];
  agg.assumptions = [{ id: "spr-p1", statement: "A exportação reduz chamados ao suporte", importance: "MEDIO", confidencePct: 60, validationStatus: "NAO_VALIDADA", origin: H }];
  agg.risks = [{ id: "spr-r1", title: "Biblioteca de PDF sem manutenção ativa", alternativeId: "spr-a", likelihood: "POSSIVEL", impact: "MEDIO", mitigation: "Usar a geração de PDF do navegador", source: "MANUAL", status: "ABERTO", origin: H }];
  agg.recommendations = [{ id: "spr-rec-1", alternativeId: "spr-a", source: "MODELO", reasoningMd: "A lidera com 3,63 (B, C e D empatam em 3,25).", supporting: ["Maior valor para o usuário", "Pesquisa e chamados sustentam A"], contradicting: ["Esforço médio", "Risco da biblioteca de PDF"], criticalAssumptionIds: [], limitationsMd: "Pesos iguais: todos os critérios valem o mesmo.", whatWouldChangeMd: "Se o esforço de A passar de 1 sprint.", modelVersion: MODEL_VERSION, status: "SUGERIDA", createdAt: at(now, -3) }];
  agg.events = statusTrail(now, id, [["RASCUNHO", -12], ["ENQUADRAMENTO", -12], ["COMPARACAO", -8], ["AGUARDANDO_DECISAO", -2]]);
  return agg;
}

/* ------------------------------------------------------------------------------------------------
 * 3. Seleção de fornecedor — DECIDIDA, com snapshot e checkpoint
 * ------------------------------------------------------------------------------------------------ */
function fornecedor(now: Date): DecisionAggregate {
  const id = DEMO_DECISION_IDS.fornecedor;
  const agg = empty(decision(now, {
    id, title: "Fornecedor de suporte técnico", question: "Qual fornecedor de suporte devemos contratar?", status: "DECIDIDA", complexity: "PADRAO",
    kind: "CONTRATACAO", impact: "ALTO", urgency: "MEDIO", ownerUserId: "u-ana", createdByUserId: "u-ana", targetDate: at(now, -10), projectId: "p-suporte",
    selectedAlternativeId: "for-b", decidedAt: at(now, -12), decisionConfidencePct: 70, reviewEveryDays: 30,
    rationale: "B cobre o horário estendido e tem SLA verificado; o custo maior foi aceito pelo financeiro.",
    objective: "Atendimento de segundo nível com SLA de 4 horas em horário estendido.",
    stakeholders: ["Atendimento", "Financeiro", "Jurídico"],
    contextNoteKey: "decia.note.procurement",
  }));
  agg.participants = [
    { userId: "u-ana", role: "CONDUTOR", joinedAt: at(now, -40) },
    { userId: "u-pessoa", role: "CONTRIBUIDOR", joinedAt: at(now, -38) },
    { userId: "u-elisa", role: "APROVADOR", joinedAt: at(now, -38) },
  ];
  agg.alternatives = [
    alt("for-a", "A", "Fornecedor Alfa (demo)", 0, { pros: ["Menor preço"], cons: ["Atende só em horário comercial"] }),
    alt("for-b", "B", "Fornecedor Beta (demo)", 1, { pros: ["Horário estendido", "SLA de 4 h verificado"], cons: ["Custo 20 % maior"] }),
    alt("for-c", "C", "Manter equipe interna", 2, { doNothing: true, pros: ["Sem transição"], cons: ["Fila acima de 3 dias"] }),
  ];
  agg.criteria = [crit("for-sla", "SLA", 0), crit("for-custo", "Custo (5 = mais barato)", 1, null, { direction: "MENOR_MELHOR" }), crit("for-horario", "Cobertura de horário", 2)];
  const v = (alt: string, entries: [string, number][]) => scores(now, id, "u-ana", alt, entries.map(([k, s]) => [`for-${k}`, s] as [string, number]));
  agg.assessments = [
    ...v("for-a", [["sla", 3], ["custo", 5], ["horario", 2]]), ...v("for-b", [["sla", 5], ["custo", 3], ["horario", 5]]), ...v("for-c", [["sla", 2], ["custo", 4], ["horario", 2]]),
  ];
  agg.evidence = [
    { id: "for-e1", nature: "FATO", kind: "DOCUMENTO", title: "Proposta técnica do Fornecedor Beta", summary: "SLA de 4 h, atendimento das 7 h às 22 h.", sourceLabel: "proposta-beta", retrievedAt: at(now, -20), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-ana", addedAt: at(now, -20) },
    { id: "for-e2", nature: "EVIDENCIA", kind: "FONTE_EXTERNA", title: "Referência de outra instituição (demo)", summary: "SLA cumprido em 96 % dos chamados em 2025.", sourceLabel: "referencia", retrievedAt: at(now, -18), sourceQuality: "SECUNDARIA", relevance: "ALTA", reliability: "MEDIA", origin: H, addedByUserId: "u-pessoa", addedAt: at(now, -18) },
    { id: "for-e3", nature: "FATO", kind: "DOCUMENTO", title: "Atestado de capacidade técnica", summary: "Atendimento de volume equivalente comprovado.", sourceLabel: "atestado", retrievedAt: at(now, -16), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-ana", addedAt: at(now, -16) },
  ];
  agg.evidenceLinks = [
    { id: "for-l1", evidenceId: "for-e1", targetType: "ALTERNATIVA", targetId: "for-b", stance: "SUSTENTA" },
    { id: "for-l2", evidenceId: "for-e2", targetType: "ALTERNATIVA", targetId: "for-b", stance: "SUSTENTA" },
    { id: "for-l3", evidenceId: "for-e3", targetType: "ALTERNATIVA", targetId: "for-b", stance: "SUSTENTA" },
    { id: "for-l4", evidenceId: "for-e1", targetType: "CRITERIO", targetId: "for-sla", stance: "CONTEXTO" },
    { id: "for-l5", evidenceId: "for-e1", targetType: "CRITERIO", targetId: "for-horario", stance: "CONTEXTO" },
    { id: "for-l6", evidenceId: "for-e2", targetType: "CRITERIO", targetId: "for-custo", stance: "CONTEXTO" },
  ];
  agg.assumptions = [{ id: "for-p1", statement: "O volume de chamados fica abaixo de 600 por mês", importance: "ALTO", confidencePct: 75, validationStatus: "VALIDADA", validatedAt: at(now, -14), origin: H }];
  agg.risks = [{ id: "for-r1", title: "Transição dos chamados abertos", alternativeId: "for-b", likelihood: "POSSIVEL", impact: "ALTO", mitigation: "Período de operação assistida de 2 semanas", source: "PRE_MORTEM", status: "ABERTO", origin: H, ownerUserId: "u-ana" }];
  agg.forecasts = [{ id: "for-f1", alternativeId: "for-b", statement: "SLA de 4 h cumprido em pelo menos 95 % dos chamados no 1º trimestre", probabilityPct: 75, resolveBy: at(now, 80), forecasterUserId: "u-ana", resolution: "PENDENTE" }];
  agg.recommendations = [{ id: "for-rec-1", alternativeId: "for-b", source: "MODELO", reasoningMd: "B lidera com 4,33.", supporting: ["SLA e horário"], contradicting: ["Custo"], criticalAssumptionIds: [], limitationsMd: "Pesos iguais.", whatWouldChangeMd: "Se o custo passar a ser eliminatório.", modelVersion: MODEL_VERSION, status: "ACEITA", createdAt: at(now, -13) }];
  agg.triggers = [{ id: "for-t1", conditionText: "SLA abaixo de 90 % por dois meses seguidos", metricKey: "sla_pct", comparator: "<", threshold: 90, status: "ATIVO" }];
  agg.workLinks = [
    { id: "for-w1", targetType: "TAREFA", targetId: "t-termo", label: "Preparar o termo de referência", done: true, createdByUserId: "u-ana", createdAt: at(now, -11) },
    { id: "for-w2", targetType: "MARCO", targetId: "m-transicao", label: "Início da operação assistida", createdByUserId: "u-ana", createdAt: at(now, -11) },
  ];
  agg.events = statusTrail(now, id, [["RASCUNHO", -40], ["ENQUADRAMENTO", -39], ["PESQUISA", -30], ["COMPARACAO", -20], ["AGUARDANDO_DECISAO", -14], ["DECIDIDA", -12]]);
  agg.snapshots = [snapshot(agg, at(now, -12), "u-ana")];
  agg.checkpoints = [{ id: "for-k1", dueAt: at(now, 5), kind: "PROGRAMADO", status: "AGENDADO", note: "Revisão de 30 dias" }];
  return agg;
}

/* ------------------------------------------------------------------------------------------------
 * 4. Go/No-Go de projeto — RESOLVIDA → REVISADA, resultado PARCIAL, processo ADEQUADO
 * ------------------------------------------------------------------------------------------------ */
function lancamento(now: Date): DecisionAggregate {
  const id = DEMO_DECISION_IDS.lancamento;
  const agg = empty(decision(now, {
    id, title: "Lançamento da versão 2", question: "Adiar o lançamento ou reduzir o escopo?", status: "REVISADA", complexity: "PADRAO",
    kind: "TATICA", impact: "ALTO", urgency: "CRITICO", ownerUserId: "u-bruno", createdByUserId: "u-bruno", targetDate: at(now, -80),
    projectId: "p-atendimento", selectedAlternativeId: "lan-b", decidedAt: at(now, -78), decisionConfidencePct: 65,
    rationale: "Reduzir o escopo preserva a data acordada; o módulo de relatórios entra na versão seguinte.",
    stakeholders: ["Diretoria (demo)", "Atendimento", "Equipe de desenvolvimento"], createdAt: at(now, -90),
  }));
  agg.participants = [
    { userId: "u-bruno", role: "CONDUTOR", joinedAt: at(now, -90) },
    { userId: "u-pessoa", role: "CONTRIBUIDOR", joinedAt: at(now, -90) },
    { userId: "u-diego", role: "APROVADOR", joinedAt: at(now, -89) },
  ];
  agg.alternatives = [
    alt("lan-a", "A", "Adiar o lançamento em 6 semanas", 0, { pros: ["Escopo completo"], cons: ["Perde a janela acordada"] }),
    alt("lan-b", "B", "Lançar na data com escopo reduzido", 1, { pros: ["Mantém a data"], cons: ["Sem módulo de relatórios"] }),
    alt("lan-c", "C", "Manter data e escopo (não agir)", 2, { doNothing: true, status: "DESCARTADA", discardReason: "Testes de carga reprovados com o escopo completo." }),
  ];
  agg.criteria = [crit("lan-prazo", "Cumprir a data", 0), crit("lan-valor", "Valor entregue", 1), crit("lan-risco", "Risco operacional (5 = menor)", 2)];
  const v = (alt: string, entries: [string, number][]) => scores(now, id, "u-bruno", alt, entries.map(([k, s]) => [`lan-${k}`, s] as [string, number]));
  agg.assessments = [...v("lan-a", [["prazo", 1], ["valor", 5], ["risco", 4]]), ...v("lan-b", [["prazo", 5], ["valor", 3], ["risco", 4]])];
  agg.evidence = [
    { id: "lan-e1", nature: "EVIDENCIA", kind: "TESTE_TECNICO", title: "Testes de carga da versão 2", summary: "Escopo completo falhou; escopo reduzido passou.", sourceLabel: "teste-carga", retrievedAt: at(now, -82), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-bruno", addedAt: at(now, -82) },
    { id: "lan-e2", nature: "FATO", kind: "DOCUMENTO", title: "Compromisso de data com a diretoria", summary: "Data pública anunciada.", sourceLabel: "ata", retrievedAt: at(now, -85), sourceQuality: "PRIMARIA", relevance: "ALTA", reliability: "ALTA", origin: H, addedByUserId: "u-bruno", addedAt: at(now, -85) },
  ];
  agg.evidenceLinks = [
    { id: "lan-l1", evidenceId: "lan-e1", targetType: "ALTERNATIVA", targetId: "lan-b", stance: "SUSTENTA" },
    { id: "lan-l2", evidenceId: "lan-e2", targetType: "ALTERNATIVA", targetId: "lan-b", stance: "SUSTENTA" },
    { id: "lan-l3", evidenceId: "lan-e1", targetType: "CRITERIO", targetId: "lan-risco", stance: "CONTEXTO" },
    { id: "lan-l4", evidenceId: "lan-e2", targetType: "CRITERIO", targetId: "lan-prazo", stance: "CONTEXTO" },
  ];
  agg.assumptions = [
    { id: "lan-p1", statement: "Os usuários aceitam a versão sem relatórios por 45 dias", importance: "ALTO", confidencePct: 65, validationStatus: "INVALIDADA", validatedAt: at(now, -20), validationNote: "Adoção ficou abaixo do esperado sem relatórios.", origin: H },
    { id: "lan-p2", statement: "A equipe entrega o módulo de relatórios em 45 dias", importance: "MEDIO", confidencePct: 60, validationStatus: "INVALIDADA", validatedAt: at(now, -30), origin: H },
  ];
  agg.risks = [{ id: "lan-r1", title: "Adoção menor sem relatórios", alternativeId: "lan-b", likelihood: "POSSIVEL", impact: "MEDIO", source: "PRE_MORTEM", status: "OCORREU", origin: H }];
  agg.forecasts = [
    { id: "lan-f1", alternativeId: "lan-b", statement: "O lançamento ocorre na data anunciada", probabilityPct: 80, resolveBy: at(now, -60), forecasterUserId: "u-bruno", resolution: "OCORREU", resolvedAt: at(now, -60) },
    { id: "lan-f2", alternativeId: "lan-b", statement: "Adoção de pelo menos 60 % em 30 dias", probabilityPct: 70, resolveBy: at(now, -30), forecasterUserId: "u-bruno", resolution: "NAO_OCORREU", resolvedAt: at(now, -30) },
    { id: "lan-f3", alternativeId: "lan-b", statement: "Nenhum incidente crítico na primeira semana", probabilityPct: 85, resolveBy: at(now, -53), forecasterUserId: "u-pessoa", resolution: "OCORREU", resolvedAt: at(now, -53) },
    { id: "lan-f4", alternativeId: "lan-b", statement: "Módulo de relatórios entregue em 45 dias", probabilityPct: 60, resolveBy: at(now, -15), forecasterUserId: "u-bruno", resolution: "NAO_OCORREU", resolvedAt: at(now, -15) },
  ];
  agg.checkpoints = [
    { id: "lan-k1", dueAt: at(now, -45), kind: "PROGRAMADO", status: "CONCLUIDO", completedAt: at(now, -45), completedByUserId: "u-bruno", stillValid: true, assumptionsChanged: false, confidencePctAfter: 65, action: "MANTER", note: "Lançamento estável." },
    { id: "lan-k2", dueAt: at(now, -15), kind: "PROGRAMADO", status: "CONCLUIDO", completedAt: at(now, -15), completedByUserId: "u-bruno", stillValid: true, assumptionsChanged: true, confidencePctAfter: 55, action: "AJUSTAR", note: "Relatórios atrasaram; prioridade aumentada." },
  ];
  agg.outcome = { id: "lan-o1", result: "PARCIAL", observedAt: at(now, -10), summary: "Lançamento na data, sem incidentes críticos; adoção de 48 % em 30 dias e relatórios entregues com 3 semanas de atraso.", recordedByUserId: "u-bruno" };
  agg.retrospective = {
    id: "lan-rt1", outcomeId: "lan-o1", processQuality: "ADEQUADA", reviewedByUserId: "u-bruno", reviewedAt: at(now, -3), shareAsLesson: true,
    whatHappened: "A data foi cumprida; a adoção ficou abaixo da meta enquanto faltavam relatórios.",
    whatExpected: "Adoção de 60 % em 30 dias e relatórios em 45 dias.",
    whatWasRight: "O teste de carga evitou um lançamento instável; a decisão usou a evidência disponível.",
    whatWasWrong: "A premissa de que os usuários aceitariam ficar sem relatórios não foi testada.",
    failedAssumptionIds: ["lan-p1", "lan-p2"],
    lessonsMd: "Boa decisão, resultado parcial: o processo foi adequado; testar com usuários as premissas de escopo antes de cortar.",
  };
  agg.workLinks = [
    { id: "lan-w1", targetType: "PROJETO", targetId: "p-atendimento", label: "App de Atendimento (demo) — versão 2", done: true, createdByUserId: "u-bruno", createdAt: at(now, -77) },
    { id: "lan-w2", targetType: "TAREFA", targetId: "t-relatorios", label: "Módulo de relatórios", done: true, createdByUserId: "u-bruno", createdAt: at(now, -77) },
  ];
  agg.events = statusTrail(now, id, [["RASCUNHO", -90], ["ENQUADRAMENTO", -89], ["COMPARACAO", -84], ["AGUARDANDO_DECISAO", -80], ["DECIDIDA", -78], ["EM_EXECUCAO", -77], ["RESOLVIDA", -10], ["REVISADA", -3]]);
  agg.snapshots = [snapshot(agg, at(now, -78), "u-bruno")];
  return agg;
}

/* ------------------------------------------------------------------------------------------------
 * 5. Experiência (UX) — ENQUADRAMENTO, seções vazias
 * ------------------------------------------------------------------------------------------------ */
function navegacao(now: Date): DecisionAggregate {
  const id = DEMO_DECISION_IDS.navegacao;
  const agg = empty(decision(now, {
    id, title: "Arquitetura de navegação", question: "Qual arquitetura de navegação devemos usar?", status: "ENQUADRAMENTO", complexity: "PADRAO",
    kind: "PRODUTO", impact: "MEDIO", urgency: "BAIXO", ownerUserId: "u-carla", createdByUserId: "u-carla", targetDate: at(now, 40), createdAt: at(now, -2), updatedAt: at(now, -1),
  }));
  agg.participants = [{ userId: "u-carla", role: "CONDUTOR", joinedAt: at(now, -2) }];
  agg.events = statusTrail(now, id, [["RASCUNHO", -2], ["ENQUADRAMENTO", -1]]);
  return agg;
}

/** As 5 decisões de demonstração, na ordem das jornadas. */
export function buildDemoDecisions(now: Date): DecisionAggregate[] {
  return [arquitetura(now), sprint(now), fornecedor(now), lancamento(now), navegacao(now)];
}

/* ------------------------------------------------------------------------------------------------
 * Casos de borda para os testes do card (04 §10) — não entram no repositório padrão
 * ------------------------------------------------------------------------------------------------ */
function base(now: Date, id: string, p: Partial<Decision> = {}): DecisionAggregate {
  const agg = empty(decision(now, { id, title: "Caso de borda", question: "Qual opção devemos escolher para o caso de borda?", status: "COMPARACAO", targetDate: at(now, 10), ...p }));
  agg.alternatives = [alt(`${id}-a`, "A", "Opção A", 0), alt(`${id}-b`, "B", "Opção B", 1)];
  agg.criteria = [crit(`${id}-x`, "Critério X", 0), crit(`${id}-y`, "Critério Y", 1)];
  agg.assessments = [
    ...scores(now, id, "u-pessoa", `${id}-a`, [[`${id}-x`, 4], [`${id}-y`, 4]]),
    ...scores(now, id, "u-pessoa", `${id}-b`, [[`${id}-x`, 3], [`${id}-y`, 3]]),
  ];
  agg.events = statusTrail(now, id, [["COMPARACAO", -5]]);
  return agg;
}

export function buildEdgeCases(now: Date) {
  const longTitle = base(now, "e-longo", {
    title: "Título muito longo para verificar quebra de linha e truncamento em três linhas no card",
    question: "Considerando as restrições orçamentárias do próximo exercício, a necessidade de manter a continuidade do atendimento presencial e digital, e as diferentes expectativas das áreas envolvidas, qual combinação de canais de atendimento devemos priorizar para os próximos dezoito meses?",
  });
  const noOption = base(now, "e-sem-opcao", { status: "PESQUISA" });
  noOption.assessments = [];
  const riskHigh = base(now, "e-risco-alto");
  riskHigh.risks = [{ id: "e-r1", title: "Dependência de um único fornecedor", likelihood: "PROVAVEL", impact: "ALTO", source: "MANUAL", status: "ABERTO", origin: H }];
  const riskCritical = base(now, "e-risco-critico");
  riskCritical.risks = [{ id: "e-r2", title: "Perda de dados durante a migração", likelihood: "QUASE_CERTA", impact: "CRITICO", source: "RED_TEAM", status: "ABERTO", origin: H }];
  const lowConfidence = base(now, "e-confianca-baixa", { decisionConfidencePct: 25 });
  const noEvidence = base(now, "e-sem-evidencia");
  const highConfWeakEvidence = base(now, "e-confianca-alta", { decisionConfidencePct: 85 });
  const many = base(now, "e-muitas");
  many.alternatives = Array.from({ length: 8 }, (_, i) => alt(`e-muitas-${i}`, String.fromCharCode(65 + i), `Opção ${String.fromCharCode(65 + i)}`, i));
  many.assessments = many.alternatives.flatMap((a, i) => scores(now, "e-muitas", "u-pessoa", a.id, [["e-muitas-x", 5 - (i % 5)], ["e-muitas-y", 5 - (i % 3)]]));
  const overdue = base(now, "e-atrasada", { status: "AGUARDANDO_DECISAO", targetDate: at(now, -3) });
  const resolved = base(now, "e-resolvida", { status: "RESOLVIDA", selectedAlternativeId: "e-resolvida-a", decidedAt: at(now, -40), decisionConfidencePct: 70, rationale: "A tinha a melhor nota." });
  resolved.outcome = { id: "e-o1", result: "SUCESSO", observedAt: at(now, -2), summary: "Meta atingida.", recordedByUserId: "u-pessoa" };
  const archived = base(now, "e-arquivada", { status: "ARQUIVADA" });
  return { longTitle, noOption, riskHigh, riskCritical, lowConfidence, noEvidence, highConfWeakEvidence, many, overdue, resolved, archived };
}

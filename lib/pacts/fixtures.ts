/**
 * Pactos de Desbloqueio — dados DEMO (fictícios). Em vez de escrever os pactos "prontos", o exemplo é construído EXECUTANDO os
 * comandos de `rules.ts` com relógios no passado (pedido, proposta, contraproposta, aceites, entrega, devolução, validação,
 * check-in, escalonamento, renegociação…): os dados de demonstração passam pelas mesmas regras que a tela usa. Impedimentos vêm
 * do Acervo DEMO (tarefa BLOQUEADA), da Mesa do projeto DEMO (atividade esperando outra pessoa) e de registros manuais.
 * Datas relativas ao agora, como nos outros módulos DEMO.
 */
import { buildDemoProject } from "@/lib/projects/fixtures";
import { buildDemoSocial } from "@/lib/social/fixtures";
import { impedimentsFromAcervo, impedimentsFromProject } from "./impediments";
import { demoOrg, type OrgDirectory } from "./org";
import { applyPactCommand, localDay, type PactCommand } from "./rules";
import type { PactsState } from "./types";

/** Limite de compromissos simultâneos por unidade destinatária: GOF e CPOE já estão no limite no exemplo (RF49.CA04). */
export const DEMO_PACT_LIMITS: Readonly<Record<string, number>> = { "d-gof": 1, "d-ajur": 2, "d-cpoe": 1, "d-uts": 3 };

export const DEMO_PACT_IDS = {
  parecer: "pacto-parecer-protocolo",
  planta: "pacto-planta-sede",
  dotacao: "pacto-dotacao-sede",
  rotas: "pacto-dados-rotas",
  planilha: "pacto-planilha-recapeamento",
  login: "pacto-login-orcamento",
  vistoria: "pacto-vistoria-escola",
  painel: "pacto-painel-obras",
  cronograma: "pacto-cronograma-calcadas",
  rampas: "pacto-parecer-rampas",
} as const;

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function buildDemoPacts(now: Date, org: OrgDirectory = demoOrg()): PactsState {
  const social = buildDemoSocial(now);
  const projectsOf = (taskId: string) => social.projects.filter((p) => p.taskIds.includes(taskId)).map((p) => p.title);
  const impediments = [...impedimentsFromAcervo(social.tasks, org, projectsOf), ...impedimentsFromProject(buildDemoProject(), org, "d-uts")];
  let s: PactsState = { pacts: [], impediments, notifications: [], limits: { ...DEMO_PACT_LIMITS }, seq: 0 };
  const t = (days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * HOUR);
  const day = (days: number) => localDay(t(days));
  const run = (actorId: string, when: Date, cmd: PactCommand, newId?: string) => {
    const r = applyPactCommand(s, cmd, { actorId, now: when, org, newId });
    if (!r.ok) throw new Error(`DEMO de pactos: ${cmd.type} recusado (${r.error} ${JSON.stringify(r.fields ?? r.info ?? {})})`);
    s = r.state;
    return r.id;
  };
  const P = DEMO_PACT_IDS;
  const latest = (id: string) => s.pacts.find((p) => p.id === id)!.proposals.at(-1)!.id;

  /* impedimentos registrados à mão */
  run("u-pessoa", t(-10), { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "Cronograma de obras do segundo semestre", blockedBy: "Faltam as cotas revisadas da planta da sede regional (CPOE)", since: day(-10), dependents: ["Programa de vistorias escolares 2026"], taskId: "t-pessoa-cronograma" } }, "imp-manual-cronograma");
  run("u-pessoa", t(-15), { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "Plano de obras do programa de vistorias", blockedBy: "Validação da planilha orçamentária de recapeamento pela GOF", since: day(-15), dependents: ["Programa de vistorias escolares 2026", "Equipe de vistoria da SECID-UTS"] } }, "imp-manual-planilha");
  run("u-chefe", t(-2), { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "Assinatura do aditivo de prazo da reforma da sede", blockedBy: "Confirmação de dotação orçamentária pela GOF", since: day(-2), dependents: ["Reforma da sede regional", "Fiscalização do contrato da obra"] } }, "imp-manual-aditivo");
  run("u-bruno", t(-31), { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "Mapa do Plano de Mobilidade Ativa", blockedBy: "Dados de rotas acessíveis da SECID-UTS em formato aberto", since: day(-31), dependents: ["Plano de mobilidade ativa do centro"] } }, "imp-manual-rotas");

  /* 1. Parecer jurídico (pessoa → departamento) — EM_NEGOCIACAO: contraproposta da AJUR aguardando aceite e o executor */
  run("u-pessoa", t(-3), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" }, target: { kind: "DEPARTAMENTO", departmentId: "d-ajur", userId: null },
    expectedDelivery: "Parecer jurídico sobre o pedido de informação do protocolo 2026/1234",
    justification: "A resposta ao cidadão depende do parecer e o prazo legal vence em breve.",
    acceptanceCriterion: "Parecer assinado que diga se a informação pode ser fornecida e com qual fundamento legal.",
    requestedDueDate: day(1), impedimentId: "imp-t-pessoa-protocolo",
  } }, P.parecer);
  run("u-pessoa", t(-3, 1), { type: "PROPOR", pactId: P.parecer, side: "SOLICITANTE", executorId: null, note: "Proposta inicial com o prazo pedido.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Entregar o parecer jurídico assinado", dueDate: day(1) },
    { kind: "SUPORTE", side: "SOLICITANTE", description: "Enviar cópia integral do processo e responder dúvidas no mesmo dia", dueDate: null },
  ] });
  run("u-juridico", t(-2), { type: "PROPOR", pactId: P.parecer, side: "DESTINATARIO", executorId: "u-rita", note: "A equipe tem dois pareceres urgentes; propomos entregar em quatro dias, com uma reunião antes.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Entregar o parecer jurídico assinado", dueDate: day(4) },
    { kind: "SUPORTE", side: "DESTINATARIO", description: "Reunião de 30 minutos para alinhar o pedido", dueDate: day(1) },
    { kind: "RECURSO", side: "SOLICITANTE", description: "Indicar uma pessoa de referência na SECID-UTS para dúvidas do processo", dueDate: null },
  ] });
  run("u-juridico", t(-2, 1), { type: "PEDIR_ESCLARECIMENTO", pactId: P.parecer, question: "O pedido do cidadão inclui documentos com dados pessoais de terceiros?" });
  run("u-pessoa", t(-1), { type: "ESCLARECER", pactId: P.parecer, clarificationId: `${P.parecer}-q1`, answer: "Sim, há nomes de servidores em duas planilhas; essa parte pode ser tarjada." });

  /* 2. Planta revisada (pessoa → equipe da CPOE) — COMPROMETIDO, com marcos e check-in */
  run("u-pessoa", t(-9), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" }, target: { kind: "EQUIPE", departmentId: "d-cpoe", userId: null },
    expectedDelivery: "Planta baixa da sede regional com as cotas revisadas (DWG e PDF)",
    justification: "O cronograma de obras do segundo semestre depende das medidas finais da sede.",
    acceptanceCriterion: "Cotas conferidas com as medições de campo e planta publicada no Acervo.",
    requestedDueDate: day(-2), impedimentId: "imp-manual-cronograma", deliverableTaskId: "t-chefe-planta",
  } }, P.planta);
  run("u-bruno", t(-8), { type: "PROPOR", pactId: P.planta, side: "DESTINATARIO", executorId: "u-bruno", note: "Com as medições em mãos, conseguimos até a data abaixo.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Entregar a planta revisada (DWG e PDF)", dueDate: day(3) },
    { kind: "SUPORTE", side: "SOLICITANTE", description: "Enviar as medições de campo da vistoria", dueDate: day(-6) },
    { kind: "RECURSO", side: "DESTINATARIO", description: "Reservar dois dias do Bruno para a revisão", dueDate: null },
  ] });
  run("u-pessoa", t(-8, 2), { type: "ACEITAR", pactId: P.planta, proposalId: latest(P.planta), as: "SOLICITANTE" });
  run("u-bruno", t(-6), { type: "MARCO", pactId: P.planta, title: "Medições de campo recebidas", dueDate: day(-6) });
  run("u-bruno", t(-6, 1), { type: "MARCO_CONCLUIDO", pactId: P.planta, milestoneId: `${P.planta}-m1` });
  run("u-pessoa", t(-6, 2), { type: "CHECKIN", pactId: P.planta, note: "Medições enviadas por e-mail e anexadas à pasta da sede.", updates: [{ commitmentId: `${P.planta}-r1-c2`, status: "CUMPRIDO" }] });
  run("u-bruno", t(-5), { type: "MARCO", pactId: P.planta, title: "Revisão das cotas concluída", dueDate: day(2) });

  /* 3. Dotação para o aditivo (chefia CPOE → departamento GOF) — SOLICITADO; a GOF está no limite de compromissos */
  run("u-chefe", t(-1), { type: "ABRIR", draft: {
    requester: { kind: "CHEFIA", departmentId: "d-cpoe", userId: null }, target: { kind: "DEPARTAMENTO", departmentId: "d-gof", userId: null },
    expectedDelivery: "Confirmação de dotação orçamentária para o aditivo de prazo da reforma da sede",
    justification: "Sem a confirmação, o aditivo não pode ser assinado antes do fim da vigência do contrato.",
    acceptanceCriterion: "Nota de reserva de dotação emitida com o valor do aditivo.",
    requestedDueDate: day(6), impedimentId: "imp-manual-aditivo",
  } }, P.dotacao);

  /* 4. Dados de rotas (equipe CPOE → pessoa da SECID-UTS) — VALIDADO após uma devolução; desbloqueio confirmado e reconhecimento */
  run("u-bruno", t(-30), { type: "ABRIR", draft: {
    requester: { kind: "EQUIPE", departmentId: "d-cpoe", userId: null }, target: { kind: "PESSOA", departmentId: "d-uts", userId: "u-ana" },
    expectedDelivery: "Dados das rotas acessíveis em formato aberto (CSV) para o mapa de mobilidade",
    justification: "O mapa do Plano de Mobilidade Ativa está parado sem os dados de rotas.",
    acceptanceCriterion: "Arquivo CSV com rotas, quadras e tipo de piso, acompanhado de dicionário de dados.",
    requestedDueDate: day(-20), impedimentId: "imp-manual-rotas",
  } }, P.rotas);
  run("u-ana", t(-28), { type: "PROPOR", pactId: P.rotas, side: "DESTINATARIO", executorId: "u-ana", note: "", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Publicar o CSV de rotas acessíveis com dicionário de dados", dueDate: day(-18) },
    { kind: "SUPORTE", side: "SOLICITANTE", description: "Validar uma amostra de três quadras em até dois dias", dueDate: day(-22) },
  ] });
  run("u-bruno", t(-27), { type: "ACEITAR", pactId: P.rotas, proposalId: latest(P.rotas), as: "SOLICITANTE" });
  run("u-bruno", t(-22), { type: "CHECKIN", pactId: P.rotas, note: "Amostra das três quadras validada.", updates: [{ commitmentId: `${P.rotas}-r1-c2`, status: "CUMPRIDO" }] });
  run("u-ana", t(-21), { type: "ENTREGAR", pactId: P.rotas, evidence: "Planilha rotas-acessiveis.csv no Acervo", evidenceClass: "INTERNO", resourceVersion: "v1" });
  run("u-bruno", t(-20), { type: "DEVOLVER", pactId: P.rotas, unmetCriterion: "Dicionário de dados", reason: "O arquivo veio sem a descrição das colunas de tipo de piso." });
  run("u-ana", t(-19), { type: "ENTREGAR", pactId: P.rotas, evidence: "Planilha rotas-acessiveis.csv com dicionário de dados no Acervo", evidenceClass: "INTERNO", resourceVersion: "v2" });
  run("u-bruno", t(-18), { type: "VALIDAR", pactId: P.rotas });
  run("u-bruno", t(-17), { type: "CONFIRMAR_DESBLOQUEIO", pactId: P.rotas });
  run("u-bruno", t(-17, 1), { type: "RECONHECER", pactId: P.rotas, text: "Os dados destravaram o mapa de rotas e a priorização das quadras com mais quedas." });

  /* 5. Planilha de recapeamento (pessoa → GOF) — prazo DESCUMPRIDO, escalonado às chefias e renegociação aberta */
  run("u-pessoa", t(-14), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" }, target: { kind: "DEPARTAMENTO", departmentId: "d-gof", userId: null },
    expectedDelivery: "Validação da planilha orçamentária de recapeamento 2026 pela Gerência de Orçamento",
    justification: "O programa de vistorias só publica o plano de obras depois da validação dos custos.",
    acceptanceCriterion: "Planilha com parecer de conformidade dos preços de referência.",
    requestedDueDate: day(-5), impedimentId: "imp-manual-planilha",
  } }, P.planilha);
  run("u-orcamento", t(-13), { type: "PROPOR", pactId: P.planilha, side: "DESTINATARIO", executorId: "u-rui", note: "O Rui faz a análise dos preços.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Devolver a planilha validada com parecer", dueDate: day(-2) },
    { kind: "SUPORTE", side: "SOLICITANTE", description: "Enviar as composições de custo unitário", dueDate: day(-11) },
  ] });
  run("u-pessoa", t(-12), { type: "ACEITAR", pactId: P.planilha, proposalId: latest(P.planilha), as: "SOLICITANTE" });
  run("u-rui", t(-12, 3), { type: "ACEITAR", pactId: P.planilha, proposalId: latest(P.planilha), as: "EXECUTOR" });
  run("u-pessoa", t(-11), { type: "CHECKIN", pactId: P.planilha, note: "Composições de custo enviadas.", updates: [{ commitmentId: `${P.planilha}-r1-c2`, status: "CUMPRIDO" }] });
  run("u-pessoa", t(-1), { type: "CHECKIN", pactId: P.planilha, note: "O prazo combinado venceu sem a planilha validada.", updates: [{ commitmentId: `${P.planilha}-r1-c1`, status: "DESCUMPRIDO" }] });
  run("u-pessoa", t(-1, 1), { type: "ESCALAR", pactId: P.planilha, reason: "Prazo acordado vencido; o plano de obras está parado esperando a validação." });
  run("u-orcamento", t(0, -2), { type: "RENEGOCIAR", pactId: P.planilha, side: "DESTINATARIO", executorId: "u-rui", note: "", reason: "O fechamento do balanço mensal ocupou a equipe; pedimos nova data.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Devolver a planilha validada com parecer", dueDate: day(5) },
    { kind: "SUPORTE", side: "DESTINATARIO", description: "Informar o andamento da análise a cada dois dias", dueDate: null },
  ] });

  /* 6. Login institucional (departamento GOF → equipe SECID-UTS) — CANCELADO depois de um esclarecimento */
  run("u-orcamento", t(-40), { type: "ABRIR", draft: {
    requester: { kind: "DEPARTAMENTO", departmentId: "d-gof", userId: null }, target: { kind: "EQUIPE", departmentId: "d-uts", userId: null },
    expectedDelivery: "Integração do sistema orçamentário ao login institucional",
    justification: "As pessoas da GOF usam senha própria no sistema de orçamento.",
    acceptanceCriterion: "Login único funcionando no ambiente de homologação.",
    requestedDueDate: day(-10),
  } }, P.login);
  run("u-diego", t(-39), { type: "PEDIR_ESCLARECIMENTO", pactId: P.login, question: "Qual versão do sistema orçamentário está em produção?" });
  run("u-orcamento", t(-38), { type: "ESCLARECER", pactId: P.login, clarificationId: `${P.login}-q1`, answer: "Versão 4.2, com suporte a SAML." });
  run("u-orcamento", t(-35), { type: "CANCELAR", pactId: P.login, reason: "Projeto adiado para 2027 pela Gerência; retomaremos o pedido no próximo exercício." });

  /* 7. Vistoria da escola (pessoa → chefia da CPOE) — RECUSADO com motivo */
  run("u-pessoa", t(-25), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" }, target: { kind: "CHEFIA", departmentId: "d-cpoe", userId: null },
    expectedDelivery: "Liberação de um engenheiro da CPOE para a vistoria da escola",
    justification: "O relatório fotográfico da escola precisa de laudo de engenharia.",
    acceptanceCriterion: "Engenheiro designado e vistoria agendada.",
    requestedDueDate: day(-15),
  } }, P.vistoria);
  run("u-chefe", t(-24), { type: "RECUSAR", pactId: P.vistoria, reason: "A equipe de vistoria está na obra da sede até o fim do mês; sugerimos pedir de novo em dezembro." });

  /* 8. Painel de obras (chefia CPOE → equipe SECID-UTS) — VALIDADO, desbloqueio ainda não confirmado */
  run("u-chefe", t(-45), { type: "ABRIR", draft: {
    requester: { kind: "CHEFIA", departmentId: "d-cpoe", userId: null }, target: { kind: "EQUIPE", departmentId: "d-uts", userId: null },
    expectedDelivery: "Painel de indicadores de obras publicado com os dados da CPOE",
    justification: "A coordenação precisa acompanhar as obras sem planilhas paralelas.",
    acceptanceCriterion: "Painel publicado com atualização semanal automática.",
    requestedDueDate: day(-30),
  } }, P.painel);
  run("u-diego", t(-44), { type: "PROPOR", pactId: P.painel, side: "DESTINATARIO", executorId: "u-pessoa", note: "", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Publicar o painel de indicadores de obras", dueDate: day(-31) },
    { kind: "RECURSO", side: "SOLICITANTE", description: "Dar acesso de leitura à planilha mestre de obras", dueDate: null },
  ] });
  run("u-chefe", t(-43), { type: "ACEITAR", pactId: P.painel, proposalId: latest(P.painel), as: "SOLICITANTE" });
  run("u-pessoa", t(-42), { type: "ACEITAR", pactId: P.painel, proposalId: latest(P.painel), as: "EXECUTOR" });
  run("u-pessoa", t(-32), { type: "ENTREGAR", pactId: P.painel, evidence: "Painel de indicadores de obras (link no Acervo)", evidenceClass: "INTERNO", resourceVersion: "v1.0" });
  run("u-chefe", t(-30), { type: "VALIDAR", pactId: P.painel });

  /* 9. Cronograma para o estudo de calçadas (pessoa → pessoa da mesma unidade) — SOLICITADO: a Pessoa Exemplo pode destravar */
  run("u-ana", t(-2), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-ana" }, target: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" },
    expectedDelivery: "Cronograma de obras atualizado para o estudo técnico de calçadas",
    justification: "O estudo técnico preliminar precisa das datas das obras para estimar a interferência nas calçadas.",
    acceptanceCriterion: "Cronograma com datas de início e fim por quadra.",
    requestedDueDate: day(5), dependentTaskId: "t-ana-etp", deliverableTaskId: "t-pessoa-cronograma",
  } }, P.cronograma);

  /* 10. Parecer de acessibilidade (pessoa → chefia da CPOE) — proposta aguardando a chefia, que já está no limite */
  run("u-ana", t(-1), { type: "ABRIR", draft: {
    requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-ana" }, target: { kind: "CHEFIA", departmentId: "d-cpoe", userId: null },
    expectedDelivery: "Parecer de acessibilidade sobre o projeto de rampas da escola",
    justification: "O estudo de calçadas precisa confirmar se as rampas da escola seguem a norma de acessibilidade.",
    acceptanceCriterion: "Parecer com a inclinação medida de cada rampa e a conformidade com a norma.",
    requestedDueDate: day(8),
  } }, P.rampas);
  run("u-ana", t(-1, 1), { type: "PROPOR", pactId: P.rampas, side: "SOLICITANTE", executorId: null, note: "Se ajudar, envio as fotos já organizadas por rampa.", commitments: [
    { kind: "PRAZO", side: "DESTINATARIO", description: "Entregar o parecer de acessibilidade das rampas", dueDate: day(8) },
    { kind: "SUPORTE", side: "SOLICITANTE", description: "Enviar o projeto das rampas e as fotos da vistoria", dueDate: day(1) },
  ] });

  return s;
}

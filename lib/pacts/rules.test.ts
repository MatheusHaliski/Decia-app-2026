import { describe, expect, it } from "vitest";
import { canSeePact, escalationTargets, negotiatorsOf } from "./access";
import { DEMO_PACT_IDS, DEMO_PACT_LIMITS, buildDemoPacts } from "./fixtures";
import { mediationHref, pactHref } from "./links";
import { demoOrg, type OrgDirectory } from "./org";
import { applyPactCommand, localDay, type CommandContext, type PactCommand, type PactDraft } from "./rules";
import type { CommitmentDraft, CooperationPact, PactsState } from "./types";

const NOW = new Date("2026-11-12T15:00:00Z");
const DAY = 86_400_000;
const org = demoOrg();
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const day = (days: number) => localDay(at(days));
const empty = (limits: Record<string, number> = {}): PactsState => ({ pacts: [], impediments: [], notifications: [], limits, seq: 0 });

/** Executa comandos em sequência; erro inesperado falha o teste com o motivo. */
function runner(initial: PactsState, o: OrgDirectory = org) {
  let state = initial;
  const run = (actorId: string | null, cmd: PactCommand, extra: Partial<CommandContext> = {}) => {
    const r = applyPactCommand(state, cmd, { actorId, now: NOW, org: o, ...extra });
    if (r.ok) state = r.state;
    return r;
  };
  const must = (actorId: string, cmd: PactCommand, extra: Partial<CommandContext> = {}) => {
    const r = run(actorId, cmd, extra);
    if (!r.ok) throw new Error(`${cmd.type}: ${r.error} ${JSON.stringify(r.fields ?? r.info ?? {})}`);
    return r.id;
  };
  return { run, must, get state() { return state; }, pact: (id: string) => state.pacts.find((p) => p.id === id)! };
}

const DRAFT: PactDraft = {
  requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-pessoa" },
  target: { kind: "DEPARTAMENTO", departmentId: "d-gof", userId: null },
  expectedDelivery: "Planilha de custos validada pela GOF",
  justification: "O plano de obras depende da validação dos custos.",
  acceptanceCriterion: "Planilha com parecer de conformidade.",
  requestedDueDate: day(5),
};
const PACKAGE = (due = day(4)): CommitmentDraft[] => [
  { kind: "PRAZO", side: "DESTINATARIO", description: "Devolver a planilha validada", dueDate: due },
  { kind: "SUPORTE", side: "SOLICITANTE", description: "Enviar as composições de custo", dueDate: null },
  { kind: "RECURSO", side: "DESTINATARIO", description: "Reservar um analista por dois dias", dueDate: null },
];

/** Pacto pessoa → GOF já comprometido (Otávio aceita e o Rui executa). */
function committed(limits: Record<string, number> = {}) {
  const r = runner(empty(limits));
  const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
  r.must("u-orcamento", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-rui", note: "" });
  const prop = r.pact(id).proposals.at(-1)!.id;
  r.must("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: prop, as: "SOLICITANTE" });
  r.must("u-rui", { type: "ACEITAR", pactId: id, proposalId: prop, as: "EXECUTOR" });
  return { r, id };
}

describe("abrir pedido (RF49.CA01)", () => {
  it("registra SOLICITADO com entrega, justificativa, critério e prazo; identidade vem do ator", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, requester: { kind: "PESSOA", departmentId: "d-uts", userId: "u-outro" } } });
    const p = r.pact(id);
    expect(p).toMatchObject({ status: "SOLICITADO", version: 1, requesterId: "u-pessoa", companyId: "c-secretaria", accessClass: "INTERNO" });
    expect(p.requester.userId).toBe("u-pessoa");
    expect(p.events.map((e) => e.kind)).toEqual(["SOLICITAR"]);
  });

  it("campos obrigatórios e prazo no passado → VALIDACAO com os campos", () => {
    const r = runner(empty());
    const res = r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, expectedDelivery: " ", justification: "", acceptanceCriterion: "x", requestedDueDate: day(-1) } });
    expect(res).toMatchObject({ ok: false, error: "VALIDACAO", fields: { expectedDelivery: "OBRIGATORIO", justification: "OBRIGATORIO", acceptanceCriterion: "OBRIGATORIO", requestedDueDate: "DATA" } });
    expect(r.state.pacts).toEqual([]);
  });

  it("destino de outra empresa, inativo ou inexistente não revela existência (NAO_ENCONTRADO)", () => {
    const r = runner(empty());
    expect(r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, target: { kind: "EQUIPE", departmentId: "d-obras", userId: null } } })).toMatchObject({ ok: false, error: "NAO_ENCONTRADO" });
    expect(r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, target: { kind: "EQUIPE", departmentId: "d-nao-existe", userId: null } } })).toMatchObject({ ok: false, error: "NAO_ENCONTRADO" });
    const inactive: OrgDirectory = { ...org, departments: org.departments.map((d) => (d.id === "d-gof" ? { ...d, active: false } : d)) };
    expect(runner(empty(), inactive).run("u-pessoa", { type: "ABRIR", draft: DRAFT })).toMatchObject({ ok: false, error: "NAO_ENCONTRADO" });
    // só quem representa a parte solicitante abre em nome dela
    expect(r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, requester: { kind: "CHEFIA", departmentId: "d-uts", userId: null } } })).toMatchObject({ ok: false, error: "ACESSO_NEGADO" });
    expect(r.run(null, { type: "ABRIR", draft: DRAFT })).toMatchObject({ ok: false, error: "ACESSO_NEGADO" });
  });
});

describe("mediação em rodadas e aceite bilateral (CA02, CA03)", () => {
  it("propor data não é compromisso; contraproposta substitui a anterior; acordo só com os dois lados e o executor", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    r.must("u-pessoa", { type: "PROPOR", pactId: id, side: "SOLICITANTE", commitments: PACKAGE(day(3)), executorId: null, note: "" });
    expect(r.pact(id).status).toBe("EM_NEGOCIACAO");
    expect(r.pact(id).agreements).toEqual([]);
    const first = r.pact(id).proposals[0]!.id;
    // contraproposta da GOF: nova data, executor nomeado
    r.must("u-orcamento", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(day(6)), executorId: "u-rui", note: "Dá para entregar em seis dias." });
    const p = r.pact(id);
    expect(p.proposals.map((x) => [x.round, x.kind, x.status])).toEqual([[1, "PROPOSTA", "SUBSTITUIDA"], [2, "CONTRAPROPOSTA", "ABERTA"]]);
    expect(r.run("u-orcamento", { type: "ACEITAR", pactId: id, proposalId: first, as: "DESTINATARIO" })).toMatchObject({ ok: false, error: "PROPOSTA_SUPERADA" });
    const second = p.proposals[1]!.id;
    // a chefia que propôs não aceita também pelo outro lado
    expect(r.run("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: second, as: "DESTINATARIO" })).toMatchObject({ ok: false, error: "ACESSO_NEGADO" });
    r.must("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: second, as: "SOLICITANTE" });
    // os dois lados aceitaram, mas o executor nomeado ainda não: continua em negociação
    expect(r.pact(id).status).toBe("EM_NEGOCIACAO");
    expect(r.run("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: second, as: "EXECUTOR" })).toMatchObject({ ok: false, error: "ACESSO_NEGADO" });
    r.must("u-rui", { type: "ACEITAR", pactId: id, proposalId: second, as: "EXECUTOR" });
    const done = r.pact(id);
    expect(done.status).toBe("COMPROMETIDO");
    expect(done.agreements).toHaveLength(1);
    expect(done.agreements[0]).toMatchObject({ version: 1, executorId: "u-rui", agreedDueDate: day(6), proposalId: second });
    expect(done.events.slice(-2).map((e) => e.kind)).toEqual(["ACEITAR", "COMPROMETER"]);
  });

  it("a mesma pessoa não aceita pelos dois lados (chefia que negocia pelos dois)", () => {
    const r = runner(empty());
    // pessoa → chefia da própria unidade: o chefe Diego negocia pelos dois lados
    const id = r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, target: { kind: "CHEFIA", departmentId: "d-uts", userId: null } } });
    expect(negotiatorsOf(org, r.pact(id), "SOLICITANTE")).toContain("u-diego");
    r.must("u-diego", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-diego", note: "" });
    const prop = r.pact(id).proposals.at(-1)!.id;
    expect(r.run("u-diego", { type: "ACEITAR", pactId: id, proposalId: prop, as: "SOLICITANTE" })).toMatchObject({ ok: false, error: "ACEITE_DUPLO" });
    r.must("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: prop, as: "SOLICITANTE" });
    expect(r.pact(id).status).toBe("COMPROMETIDO");
  });

  it("pacote precisa de um PRAZO do destinatário; datas no passado e descrições vazias são recusadas", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    const bad = (commitments: CommitmentDraft[]) => r.run("u-orcamento", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments, executorId: null, note: "" });
    expect(bad([{ kind: "SUPORTE", side: "DESTINATARIO", description: "Ajudar", dueDate: null }])).toMatchObject({ error: "VALIDACAO", fields: { commitments: "SEM_PRAZO_DESTINATARIO" } });
    expect(bad([{ kind: "PRAZO", side: "DESTINATARIO", description: "Entregar", dueDate: day(-1) }])).toMatchObject({ fields: { commitments: "DATA" } });
    expect(bad([{ kind: "PRAZO", side: "DESTINATARIO", description: "  ", dueDate: day(2) }])).toMatchObject({ fields: { commitments: "DESCRICAO" } });
    expect(bad([])).toMatchObject({ fields: { commitments: "QUANTIDADE" } });
    expect(r.run("u-orcamento", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-pessoa", note: "" })).toMatchObject({ fields: { executorId: "INVALIDO" } });
  });

  it("quem entrega e propõe sem nomear executor executa; a chefia de uma PESSOA destinatária precisa nomear a pessoa", () => {
    const r = runner(empty());
    const a = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    r.must("u-orcamento", { type: "PROPOR", pactId: a, side: "DESTINATARIO", commitments: PACKAGE(), executorId: null, note: "" });
    expect(r.pact(a).proposals[0]).toMatchObject({ executorId: "u-orcamento", acceptances: { DESTINATARIO: { userId: "u-orcamento" }, EXECUTOR: { userId: "u-orcamento" } } });
    // pedido a uma pessoa da GOF: a chefia dela negocia, mas só a própria pessoa executa
    const b = r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, target: { kind: "PESSOA", departmentId: "d-gof", userId: "u-rui" } } });
    expect(r.run("u-orcamento", { type: "PROPOR", pactId: b, side: "DESTINATARIO", commitments: PACKAGE(), executorId: null, note: "" })).toMatchObject({ error: "VALIDACAO", fields: { executorId: "OBRIGATORIO" } });
    r.must("u-orcamento", { type: "PROPOR", pactId: b, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-rui", note: "" });
    expect(r.pact(b).proposals[0]!.acceptances.EXECUTOR).toBeNull();
  });

  it("esclarecimento: só o destinatário pergunta e só o solicitante responde", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    expect(r.run("u-pessoa", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Qual versão da planilha?" })).toMatchObject({ error: "ACESSO_NEGADO" });
    r.must("u-orcamento", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Qual versão da planilha?" });
    expect(r.pact(id).status).toBe("EM_NEGOCIACAO");
    r.must("u-pessoa", { type: "ESCLARECER", pactId: id, clarificationId: `${id}-q1`, answer: "A versão 3, de outubro." });
    expect(r.pact(id).clarifications[0]!.answer?.text).toBe("A versão 3, de outubro.");
  });

  it("recusa e cancelamento exigem motivo e encerram (CA14)", () => {
    const r = runner(empty());
    const a = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    expect(r.run("u-orcamento", { type: "RECUSAR", pactId: a, reason: "" })).toMatchObject({ error: "VALIDACAO", fields: { reason: "OBRIGATORIO" } });
    expect(r.run("u-pessoa", { type: "RECUSAR", pactId: a, reason: "Sem capacidade neste mês." })).toMatchObject({ error: "ACESSO_NEGADO" });
    r.must("u-orcamento", { type: "RECUSAR", pactId: a, reason: "Sem capacidade neste mês." });
    expect(r.pact(a)).toMatchObject({ status: "RECUSADO", closure: { by: "u-orcamento", reason: "Sem capacidade neste mês." } });
    expect(r.run("u-pessoa", { type: "CANCELAR", pactId: a, reason: "Não precisa mais." })).toMatchObject({ error: "TRANSICAO_INVALIDA" });
    const b = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    expect(r.run("u-orcamento", { type: "CANCELAR", pactId: b, reason: "Não dá." })).toMatchObject({ error: "ACESSO_NEGADO" });
    r.must("u-pessoa", { type: "CANCELAR", pactId: b, reason: "A demanda foi absorvida pela própria equipe." });
    expect(r.pact(b).status).toBe("CANCELADO");
  });
});

describe("entrega, devolução, validação e desbloqueio (CA05, CA06, CA13)", () => {
  it("executor entrega com evidência; devolução volta a COMPROMETIDO e preserva a tentativa; validação e confirmação separadas", () => {
    const { r, id } = committed();
    expect(r.run("u-orcamento", { type: "ENTREGAR", pactId: id, evidence: "planilha.xlsx", evidenceClass: "INTERNO", resourceVersion: "v1" })).toMatchObject({ error: "ACESSO_NEGADO" });
    expect(r.run("u-rui", { type: "ENTREGAR", pactId: id, evidence: "parecer", evidenceClass: "SIGILOSO", resourceVersion: "v1" })).toMatchObject({ error: "EVIDENCIA_INACESSIVEL" });
    r.must("u-rui", { type: "ENTREGAR", pactId: id, evidence: "Planilha validada no Acervo", evidenceClass: "INTERNO", resourceVersion: "v1" });
    expect(r.pact(id).status).toBe("ENTREGUE");
    r.must("u-pessoa", { type: "DEVOLVER", pactId: id, unmetCriterion: "Parecer de conformidade", reason: "Faltou o parecer assinado." });
    expect(r.pact(id).status).toBe("COMPROMETIDO");
    r.must("u-rui", { type: "ENTREGAR", pactId: id, evidence: "Planilha com parecer", evidenceClass: "INTERNO", resourceVersion: "v2" });
    const p = r.pact(id);
    expect(p.deliveries.map((d) => [d.attempt, d.resourceVersion, d.returned?.unmetCriterion ?? null])).toEqual([[1, "v1", "Parecer de conformidade"], [2, "v2", null]]);
    expect(r.run("u-pessoa", { type: "CONFIRMAR_DESBLOQUEIO", pactId: id })).toMatchObject({ error: "TRANSICAO_INVALIDA" });
    r.must("u-pessoa", { type: "VALIDAR", pactId: id });
    expect(r.pact(id).status).toBe("VALIDADO");
    expect(r.pact(id).unblock).toBeNull();
    r.must("u-pessoa", { type: "CONFIRMAR_DESBLOQUEIO", pactId: id });
    r.must("u-pessoa", { type: "RECONHECER", pactId: id, text: "A validação destravou o plano de obras." });
    expect(r.pact(id)).toMatchObject({ unblock: { by: "u-pessoa" }, recognition: { text: "A validação destravou o plano de obras." } });
  });

  it("prazo cumprido ou DESCUMPRIDO é fato verificável na validação (data da entrega × data acordada)", () => {
    const onTime = committed();
    onTime.r.must("u-rui", { type: "ENTREGAR", pactId: onTime.id, evidence: "Planilha", evidenceClass: "INTERNO", resourceVersion: "v1" });
    onTime.r.must("u-pessoa", { type: "VALIDAR", pactId: onTime.id });
    expect(onTime.r.pact(onTime.id).agreements[0]!.commitments.find((c) => c.kind === "PRAZO")!.status).toBe("CUMPRIDO");
    const late = committed();
    late.r.must("u-rui", { type: "ENTREGAR", pactId: late.id, evidence: "Planilha", evidenceClass: "INTERNO", resourceVersion: "v1" }, { now: at(9) });
    late.r.must("u-pessoa", { type: "VALIDAR", pactId: late.id }, { now: at(9) });
    const prazo = late.r.pact(late.id).agreements[0]!.commitments.find((c) => c.kind === "PRAZO")!;
    expect(prazo).toMatchObject({ status: "DESCUMPRIDO", resolvedBy: "u-pessoa" });
  });
});

describe("acompanhamento, renegociação e escalonamento (CA07, CA08)", () => {
  it("check-in marca compromisso cumprido/descumprido; marcos com data", () => {
    const { r, id } = committed();
    const ids = r.pact(id).agreements[0]!.commitments.map((c) => c.id);
    r.must("u-pessoa", { type: "CHECKIN", pactId: id, note: "Composições enviadas.", updates: [{ commitmentId: ids[1]!, status: "CUMPRIDO" }] });
    r.must("u-pessoa", { type: "CHECKIN", pactId: id, note: "O analista não foi reservado.", updates: [{ commitmentId: ids[2]!, status: "DESCUMPRIDO" }] });
    expect(r.pact(id).agreements[0]!.commitments.map((c) => c.status)).toEqual(["PENDENTE", "CUMPRIDO", "DESCUMPRIDO"]);
    expect(r.run("u-pessoa", { type: "CHECKIN", pactId: id, note: "x", updates: [] })).toMatchObject({ error: "VALIDACAO" });
    r.must("u-rui", { type: "MARCO", pactId: id, title: "Preços de referência conferidos", dueDate: day(2) });
    r.must("u-pessoa", { type: "MARCO_CONCLUIDO", pactId: id, milestoneId: `${id}-m1` });
    expect(r.pact(id).milestones[0]).toMatchObject({ doneBy: "u-pessoa" });
  });

  it("renegociação: acordo vigente continua até o novo aceite bilateral; anterior preservado com motivo e autoria; idade intacta", () => {
    const { r, id } = committed();
    const createdAt = r.pact(id).createdAt;
    expect(r.run("u-orcamento", { type: "RENEGOCIAR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(day(10)), executorId: null, reason: "", note: "" })).toMatchObject({ error: "VALIDACAO", fields: { reason: "OBRIGATORIO" } });
    r.must("u-orcamento", { type: "RENEGOCIAR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(day(10)), executorId: null, reason: "Fechamento do balanço ocupou a equipe.", note: "" }, { now: at(1) });
    let p = r.pact(id);
    expect(p.status).toBe("COMPROMETIDO");
    expect(p.agreements).toHaveLength(1);
    expect(p.agreements[0]!.agreedDueDate).toBe(day(4));
    const reneg = p.proposals.at(-1)!;
    expect(reneg).toMatchObject({ kind: "RENEGOCIACAO", executorId: "u-rui", reason: "Fechamento do balanço ocupou a equipe." });
    r.must("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: reneg.id, as: "SOLICITANTE" }, { now: at(1) });
    expect(r.pact(id).agreements).toHaveLength(1);
    r.must("u-rui", { type: "ACEITAR", pactId: id, proposalId: reneg.id, as: "EXECUTOR" }, { now: at(1) });
    p = r.pact(id);
    expect(p.agreements.map((a) => [a.version, a.agreedDueDate, a.supersededBy, a.supersedeReason])).toEqual([
      [1, day(4), "u-orcamento", "Fechamento do balanço ocupou a equipe."],
      [2, day(10), null, null],
    ]);
    expect(p.createdAt).toBe(createdAt);
  });

  it("escalonamento vai às chefias acima, sem decidir nada; só elas resolvem; um aberto por vez", () => {
    const { r, id } = committed();
    const pact = r.pact(id);
    // pessoa da SECID-UTS × departamento GOF: chefia da SECID-UTS e, como a GOF já é a chefia, a conta da empresa
    expect(escalationTargets(org, pact, "u-pessoa")).toEqual(["u-diego", "u-secretaria"]);
    r.must("u-pessoa", { type: "ESCALAR", pactId: id, reason: "Prioridade em conflito com o fechamento do balanço." });
    expect(r.pact(id).status).toBe("COMPROMETIDO");
    expect(r.run("u-rui", { type: "ESCALAR", pactId: id, reason: "Outro conflito qualquer." })).toMatchObject({ error: "ESCALONAMENTO_ABERTO" });
    const esc = r.pact(id).escalations[0]!;
    expect(canSeePact(org, r.pact(id), "u-secretaria")).toBe(true);
    expect(r.run("u-pessoa", { type: "RESOLVER_ESCALONAMENTO", pactId: id, escalationId: esc.id, text: "Mantém a data." })).toMatchObject({ error: "ACESSO_NEGADO" });
    r.must("u-secretaria", { type: "RESOLVER_ESCALONAMENTO", pactId: id, escalationId: esc.id, text: "A planilha tem prioridade nesta semana." });
    expect(r.pact(id).escalations[0]).toMatchObject({ status: "RESOLVIDA", resolution: { by: "u-secretaria" } });
  });
});

describe("limite de compromissos e dependência circular (CA04, CA08)", () => {
  it("aceite que excede o limite da equipe é bloqueado com conflito explicável; exceção justificada da chefia libera; encerrados não contam", () => {
    const first = committed({ "d-gof": 1 });
    const r = first.r;
    const id = r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, expectedDelivery: "Segunda planilha validada" } });
    r.must("u-orcamento", { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-orcamento", note: "" });
    const prop = r.pact(id).proposals.at(-1)!.id;
    const blocked = r.run("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: prop, as: "SOLICITANTE" });
    expect(blocked).toMatchObject({ ok: false, error: "LIMITE_COMPROMISSOS", info: { count: 1, limit: 1 } });
    expect(r.pact(id).status).toBe("EM_NEGOCIACAO");
    expect(r.run("u-rui", { type: "EXCECAO_LIMITE", pactId: id, reason: "Demanda urgente do gabinete." })).toMatchObject({ error: "NAO_ENCONTRADO" });
    r.must("u-orcamento", { type: "EXCECAO_LIMITE", pactId: id, reason: "Demanda urgente do gabinete." });
    r.must("u-pessoa", { type: "ACEITAR", pactId: id, proposalId: prop, as: "SOLICITANTE" });
    expect(r.pact(id).status).toBe("COMPROMETIDO");
    // pacto encerrado não ocupa vaga
    const fresh = committed({ "d-gof": 1 });
    fresh.r.must("u-pessoa", { type: "CANCELAR", pactId: fresh.id, reason: "Resolvido por outro caminho." });
    const again = fresh.r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    fresh.r.must("u-orcamento", { type: "PROPOR", pactId: again, side: "DESTINATARIO", commitments: PACKAGE(), executorId: "u-orcamento", note: "" });
    expect(fresh.r.run("u-pessoa", { type: "ACEITAR", pactId: again, proposalId: fresh.r.pact(again).proposals.at(-1)!.id, as: "SOLICITANTE" }).ok).toBe(true);
  });

  it("dependência circular é recusada antes de gravar, com a causa", () => {
    const r = runner(empty());
    r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, dependentTaskId: "t-a", deliverableTaskId: "t-b" } });
    r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, dependentTaskId: "t-b", deliverableTaskId: "t-c" } });
    const before = r.state;
    const res = r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, dependentTaskId: "t-c", deliverableTaskId: "t-a" } });
    expect(res).toMatchObject({ ok: false, error: "DEPENDENCIA_CIRCULAR", info: { path: "t-a → t-b → t-c" } });
    expect(r.state).toBe(before);
    // dependências da Mesa também contam
    const mesa = r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, dependentTaskId: "tA", deliverableTaskId: "tE" } }, { extraEdges: [{ from: "tE", to: "tD", via: "mesa:d8" }, { from: "tD", to: "tA", via: "mesa:x" }] });
    expect(mesa).toMatchObject({ ok: false, error: "DEPENDENCIA_CIRCULAR" });
  });
});

describe("permissões relidas, SIGILOSO, versão e idempotência (CA09, CA10)", () => {
  it("quem perde a chefia deixa de negociar na hora (sem cache de permissão)", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT });
    const changed: OrgDirectory = { ...org, departments: org.departments.map((d) => (d.id === "d-gof" ? { ...d, headUserId: "u-rui" } : d)) };
    const res = applyPactCommand(r.state, { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: null, note: "" }, { actorId: "u-orcamento", now: NOW, org: changed });
    expect(res).toMatchObject({ ok: false, error: "NAO_ENCONTRADO" });
    expect(applyPactCommand(r.state, { type: "PROPOR", pactId: id, side: "DESTINATARIO", commitments: PACKAGE(), executorId: null, note: "" }, { actorId: "u-rui", now: NOW, org: changed }).ok).toBe(true);
  });

  it("SIGILOSO exige concessão explícita, inclusive para chefias e para a empresa", () => {
    const r = runner(empty());
    expect(r.run("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, accessClass: "SIGILOSO" } })).toMatchObject({ error: "VALIDACAO", fields: { grants: "OBRIGATORIO" } });
    const id = r.must("u-pessoa", { type: "ABRIR", draft: { ...DRAFT, accessClass: "SIGILOSO", grants: ["u-rui"] } });
    const p = r.pact(id);
    expect(canSeePact(org, p, "u-rui")).toBe(true);
    expect(canSeePact(org, p, "u-orcamento")).toBe(false);
    expect(canSeePact(org, p, "u-diego")).toBe(false);
    expect(canSeePact(org, p, "u-secretaria")).toBe(false);
    expect(r.run("u-orcamento", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Pode detalhar o pedido?" })).toMatchObject({ error: "NAO_ENCONTRADO" });
  });

  it("versão desatualizada → EDICAO_CONCORRENTE; repetir a mesma requisição não duplica evento nem aviso", () => {
    const r = runner(empty());
    const id = r.must("u-pessoa", { type: "ABRIR", draft: DRAFT }, { idempotencyKey: "abrir-1" });
    expect(r.run("u-pessoa", { type: "ABRIR", draft: DRAFT }, { idempotencyKey: "abrir-1" })).toMatchObject({ ok: true, id, duplicate: true });
    expect(r.state.pacts).toHaveLength(1);
    const v = r.pact(id).version;
    expect(r.run("u-orcamento", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Qual versão?" }, { expectedVersion: v - 1 })).toMatchObject({ error: "EDICAO_CONCORRENTE" });
    r.must("u-orcamento", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Qual versão?" }, { expectedVersion: v, idempotencyKey: "q-1" });
    const snapshot = r.state;
    expect(r.run("u-orcamento", { type: "PEDIR_ESCLARECIMENTO", pactId: id, question: "Qual versão?" }, { idempotencyKey: "q-1" })).toMatchObject({ ok: true, duplicate: true });
    expect(r.state).toBe(snapshot);
  });
});

describe("avisos genéricos e agrupados; lembrete com limite (CA14)", () => {
  it("um aviso não lido por pessoa e pacto, sem conteúdo; quem agiu não é avisado", () => {
    const { r, id } = committed();
    const forPessoa = r.state.notifications.filter((n) => n.recipientId === "u-pessoa" && n.pactId === id);
    expect(forPessoa).toHaveLength(1);
    expect(forPessoa[0]).toMatchObject({ groupKey: `pacto:${id}`, read: false });
    expect(forPessoa[0]!.count).toBeGreaterThan(1);
    expect(Object.keys(forPessoa[0]!).sort()).toEqual(["count", "firstAt", "groupKey", "id", "kinds", "lastAt", "pactId", "read", "recipientId"]);
    expect(r.state.notifications.some((n) => n.recipientId === "u-rui" && n.kinds.includes("COMPROMETER"))).toBe(false);
  });

  it("lembrete: no máximo um por pessoa a cada 24 h", () => {
    const { r, id } = committed();
    r.must("u-pessoa", { type: "LEMBRAR", pactId: id });
    expect(r.run("u-pessoa", { type: "LEMBRAR", pactId: id }, { now: at(0.5) })).toMatchObject({ error: "LEMBRETE_FREQUENTE", info: { hours: 24 } });
    expect(r.run("u-pessoa", { type: "LEMBRAR", pactId: id }, { now: at(1.1) }).ok).toBe(true);
  });
});

describe("dados DEMO e links", () => {
  it("o exemplo é montado pelas próprias regras e cobre os estados", () => {
    const s = buildDemoPacts(NOW);
    const status = Object.fromEntries(s.pacts.map((p) => [p.id, p.status]));
    expect(status).toMatchObject({
      [DEMO_PACT_IDS.parecer]: "EM_NEGOCIACAO", [DEMO_PACT_IDS.planta]: "COMPROMETIDO", [DEMO_PACT_IDS.dotacao]: "SOLICITADO",
      [DEMO_PACT_IDS.rotas]: "VALIDADO", [DEMO_PACT_IDS.planilha]: "COMPROMETIDO", [DEMO_PACT_IDS.login]: "CANCELADO",
      [DEMO_PACT_IDS.vistoria]: "RECUSADO", [DEMO_PACT_IDS.painel]: "VALIDADO",
    });
    expect(s.limits).toEqual(DEMO_PACT_LIMITS);
    expect(JSON.stringify(buildDemoPacts(NOW))).toBe(JSON.stringify(s));
    const planilha = s.pacts.find((p) => p.id === DEMO_PACT_IDS.planilha) as CooperationPact;
    expect(planilha.escalations[0]).toMatchObject({ status: "ABERTA", targets: ["u-diego", "u-secretaria"] });
    expect(planilha.proposals.at(-1)).toMatchObject({ kind: "RENEGOCIACAO", status: "ABERTA" });
  });

  it("Mediar no DECIA e link do pacto", () => {
    expect(mediationHref({ id: "pacto-1", sessionId: null })).toBe("/decia/mediacao-pacto-1?pacto=pacto-1");
    expect(mediationHref({ id: "pacto-1", sessionId: "s-orcamento-2027" })).toBe("/decia/s-orcamento-2027?pacto=pacto-1");
    expect(pactHref("pacto-1")).toBe("/goals?pacto=pacto-1");
  });
});

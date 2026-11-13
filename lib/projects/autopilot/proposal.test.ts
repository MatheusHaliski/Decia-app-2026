import { describe, expect, it } from "vitest";
import { computeMetrics } from "../metrics";
import { timelineView, traceabilityView, wbsView } from "../views";
import { addDays } from "./dates";
import { EXAMPLE_OFICIO } from "./examples";
import { extractDemand } from "./extract";
import {
  blankProject, editProposal, projectFromTemplate, proposalNetwork, proposalToProject, proposeScheme, scheduleProposal, type ProjectProposal, type ProposalOp,
} from "./proposal";
import { toNoun } from "./recipes";

const NOW = new Date("2026-11-12T12:00:00");
const facts = extractDemand(EXAMPLE_OFICIO, { now: NOW });
const base = () => proposeScheme(facts, { now: NOW, sourceLabel: "Ofício nº 123/2026 – SECID/DTI", sourceKind: "COLAR" });
const edit = (p: ProjectProposal, ...ops: ProposalOp[]) =>
  ops.reduce((acc, op) => {
    const r = editProposal(acc, op);
    if (!r.ok) throw new Error(`${op.op}: ${r.error}`);
    return r.proposal;
  }, p);
const keyOf = (p: ProjectProposal, title: RegExp) => p.tasks.find((t) => title.test(t.title))!.key;
const deps = (p: ProjectProposal) => proposalNetwork(p).deps.map(([a, b]) => `${p.tasks.find((t) => t.key === a)!.title.slice(0, 13)}>${p.tasks.find((t) => t.key === b)!.title.slice(0, 13)}`);

describe("esquema proposto a partir do ofício", () => {
  const p = base();

  it("7 fases canônicas, entregas da demanda + modelo da área + ciclo de vida, com crédito aos modelos", () => {
    expect(p.phases.map((x) => x.phase)).toEqual(["DEMANDA", "PLANEJAMENTO", "ELABORACAO", "ANALISE", "APROVACAO", "EXECUCAO", "ENCERRAMENTO"]);
    expect(p.kind).toBe("TI");
    expect(p.area).toBe("SOFTWARE");
    expect(p.tasks.filter((t) => t.origin === "DEMANDA")).toHaveLength(5);
    // a receita de TI só acrescenta o que a demanda não cobriu: testes (essencial); a implantação já veio do ofício
    expect(p.tasks.filter((t) => t.origin === "MODELO").map((t) => t.title)).toEqual(["Plano de testes e homologação"]);
    expect(p.tasks.filter((t) => t.origin === "CICLO").map((t) => t.phase)).toEqual(["DEMANDA", "DEMANDA", "PLANEJAMENTO", "ANALISE", "APROVACAO", "ENCERRAMENTO", "ENCERRAMENTO"]);
    expect(p.credits.map((c) => c.id)).toEqual([
      "area.administracao.estudo-tecnico-preliminar", "area.software.plano-de-testes", "area.software.runbook-de-implantacao-e-reversao", "area.planejamento.plano-de-capacitacao",
    ]);
    expect(p.credits[0]!.title).toBe("Estudo técnico preliminar (ETP) de contratação");
    const etp = p.tasks.find((t) => /estudo técnico/.test(t.title))!;
    expect(etp).toMatchObject({ phase: "ELABORACAO", pert: { o: 5, m: 10, p: 15 }, excerpt: "elaborar o estudo técnico preliminar (ETP)", wbsTitle: "Elaboração do estudo técnico preliminar (ETP)" });
    expect(p).toMatchObject({ title: "Implantação do sistema de protocolo digital", deadline: "2027-06-30", startDate: "2026-11-12" });
  });

  it("rede: dentro da fase por passos (contratar → testar → implantar → migrar → capacitar); cada fase depois da anterior", () => {
    expect(deps(p)).toEqual([
      "Termo de aber>Plano do proj", "Mapa das part>Plano do proj", "Plano do proj>Elaborar o es", "Elaborar o es>Análise de ri", "Análise de ri>Aprovação do ",
      "Aprovação do >Contratar a s", "Contratar a s>Plano de test", "Plano de test>Implantação d", "Implantação d>Migrar os pro", "Migrar os pro>Capacitar os ",
      "Capacitar os >Aceite formal", "Aceite formal>Entrega final",
    ]);
  });

  it("cronograma pelo CPM do motor; prazos de trás para frente a partir de 30/06/2027; folga quando cabe", () => {
    const s = scheduleProposal(p);
    expect(s.ok).toBe(true);
    expect(s.finish).toBeCloseTo(103.83, 2);
    expect(s).toMatchObject({ finishDate: "2027-02-23", deadline: "2027-06-30", slackDays: 127, overrunDays: 0, lateTasks: [] });
    const last = p.tasks.find((t) => t.title === "Entrega final da demanda")!;
    expect(s.rows[last.key]).toMatchObject({ due: "2027-06-30", critical: true });
    expect(s.rows[keyOf(p, /Contratar/)]).toMatchObject({ start: "2026-12-03", end: "2027-01-20", due: "2027-05-27" });
  });

  it("prazo inviável: aviso com QUANTOS dias o caminho crítico estoura; prazo fixado numa atividade também conta", () => {
    const tight = edit(p, { op: "SET_DEADLINE", date: addDays(p.startDate, 29) });
    const s = scheduleProposal(tight);
    expect(s.overrunDays).toBe(74); // 103,83 dias de caminho crítico × 30 dias de prazo
    expect(s.slackDays).toBe(-74);
    expect(s.lateTasks.length).toBeGreaterThan(0);
    const pinned = edit(p, { op: "TASK_DUE", key: keyOf(p, /estudo técnico/), date: "2026-11-25" });
    const s2 = scheduleProposal(pinned);
    expect(s2.rows[keyOf(p, /estudo técnico/)]).toMatchObject({ pinned: true, due: "2026-11-25", end: "2026-11-30" });
    expect(s2.overrunDays).toBe(5);
  });

  it("sem prazo nenhum, não há data-limite por atividade nem estouro", () => {
    const s = scheduleProposal(edit(p, { op: "SET_DEADLINE", date: null }));
    expect(s.deadline).toBeUndefined();
    expect(s.overrunDays).toBe(0);
    expect(Object.values(s.rows).every((r) => r.due === undefined)).toBe(true);
  });
});

describe("editar antes de salvar", () => {
  it("renomear, durações (PERT inválido recusado), responsável e marca de edição (perde o ✦)", () => {
    const p = base();
    const k = keyOf(p, /Contratar/);
    expect(editProposal(p, { op: "TASK_RENAME", key: k, title: "  " })).toEqual({ ok: false, error: "TEXTO_VAZIO" });
    expect(editProposal(p, { op: "TASK_PERT", key: k, pert: { o: 50, m: 40, p: 60 } })).toEqual({ ok: false, error: "VALOR_INVALIDO" });
    const q = edit(p, { op: "TASK_RENAME", key: k, title: "Contratar a plataforma por pregão" }, { op: "TASK_PERT", key: k, pert: { o: 20, m: 30, p: 40 } }, { op: "TASK_RESPONSIBLE", key: k, userId: "u-bruno" });
    const t = q.tasks.find((x) => x.key === k)!;
    expect(t).toMatchObject({ title: "Contratar a plataforma por pregão", wbsTitle: "Contratação da plataforma por pregão", responsibleId: "u-bruno", edited: true });
    expect(scheduleProposal(q).finish).toBeCloseTo(103.8334 - 17.5, 3); // TE do contrato caiu de 47,5 para 30 dias
    expect(editProposal(p, { op: "TASK_RENAME", key: "nao-existe", title: "x" })).toEqual({ ok: false, error: "NAO_ENCONTRADO" });
  });

  it("reordenar troca a sequência; 'em paralelo' junta no mesmo passo; excluir mantém o passo de quem vinha junto", () => {
    const p = base();
    const moved = edit(p, { op: "TASK_MOVE", key: keyOf(p, /Capacitar/), dir: -1 });
    expect(deps(moved)).toEqual(expect.arrayContaining(["Implantação d>Capacitar os ", "Capacitar os >Migrar os pro", "Migrar os pro>Aceite formal"]));
    const parallel = edit(p, { op: "TASK_AFTER", key: keyOf(p, /Plano de testes/), after: false });
    expect(deps(parallel)).toEqual(expect.arrayContaining(["Aprovação do >Contratar a s", "Aprovação do >Plano de test", "Contratar a s>Implantação d", "Plano de test>Implantação d"]));
    // [ETP, A (depois), B (junto de A)] — tirar A: B passa a vir depois do ETP
    let q = edit(p, { op: "TASK_ADD", phase: "ELABORACAO", title: "Levantar os requisitos" }, { op: "TASK_ADD", phase: "ELABORACAO", title: "Pesquisa de mercado" });
    q = edit(q, { op: "TASK_AFTER", key: keyOf(q, /Pesquisa/), after: false });
    expect(deps(q)).toEqual(expect.arrayContaining(["Elaborar o es>Levantar os r", "Elaborar o es>Pesquisa de m"]));
    q = edit(q, { op: "TASK_REMOVE", key: keyOf(q, /Levantar/) });
    expect(q.tasks.find((t) => /Pesquisa/.test(t.title))!.after).toBe(true);
    expect(deps(q)).toEqual(expect.arrayContaining(["Elaborar o es>Pesquisa de m", "Pesquisa de m>Análise de ri"]));
    expect(editProposal(q, { op: "TASK_ADD", phase: "ANALISE", title: " " })).toEqual({ ok: false, error: "TEXTO_VAZIO" });
  });

  it("excluir uma fase tira as atividades da rede; mover a fase muda a ordem de execução; mover a atividade de fase", () => {
    const p = base();
    const noAnalysis = edit(p, { op: "PHASE_TOGGLE", phase: "ANALISE", included: false });
    expect(deps(noAnalysis)).toContain("Elaborar o es>Aprovação do ");
    expect(proposalNetwork(noAnalysis).tasks.some((t) => t.phase === "ANALISE")).toBe(false);
    const analysisFirst = edit(p, { op: "PHASE_MOVE", phase: "ANALISE", dir: -1 });
    expect(analysisFirst.phases.map((x) => x.phase).slice(2, 4)).toEqual(["ANALISE", "ELABORACAO"]);
    expect(deps(analysisFirst)).toEqual(expect.arrayContaining(["Plano do proj>Análise de ri", "Análise de ri>Elaborar o es", "Elaborar o es>Aprovação do "]));
    const late = edit(p, { op: "TASK_PHASE", key: keyOf(p, /Capacitar/), phase: "ENCERRAMENTO" });
    expect(deps(late)).toContain("Entrega final>Capacitar os ");
  });
});

describe("salvar: o projeto da Mesa", () => {
  it("versão 1 'Gerado pelo Autopiloto a partir de …', origem com créditos, prazos por atividade e o mesmo cronograma", () => {
    const p = edit(base(), { op: "TASK_RESPONSIBLE", key: keyOf(base(), /estudo técnico/), userId: "u-carla" });
    const m = proposalToProject(p, { id: "ap-teste", actorId: "u-pessoa", now: NOW });
    expect(m.versions).toEqual([{ number: 1, at: NOW.toISOString(), actorId: "u-pessoa", key: "autopilotCreated", vars: { source: "Ofício nº 123/2026 – SECID/DTI" } }]);
    expect(m.origin).toMatchObject({ kind: "AUTOPILOTO", ref: "Ofício nº 123/2026 – SECID/DTI" });
    expect(m.origin!.credits).toHaveLength(4);
    expect(m.tasks.map((t) => t.code)).toEqual(Array.from({ length: 13 }, (_, i) => `T${String(i + 1).padStart(2, "0")}`));
    expect(m.tasks.at(-1)).toMatchObject({ title: "Entrega final da demanda", milestone: true, dueAt: "2027-06-30" });
    expect(m.tasks.every((t) => t.dueAt)).toBe(true);
    // a Mesa recalcula pelo mesmo motor e chega ao mesmo término
    const tl = timelineView(m);
    expect(tl.finish).toBeCloseTo(scheduleProposal(p).finish, 4);
    expect(wbsView(m).issues).toEqual([]);
    expect(traceabilityView(m).rows.map((r) => r.code)).toEqual(["RF-01", "RF-02", "RF-03", "RF-04", "RF-05"]);
    const etp = m.tasks.find((t) => /estudo técnico/.test(t.title))!;
    expect(m.raci.filter((r) => r.taskId === etp.id)).toEqual([{ taskId: etp.id, userId: "u-carla", letters: ["R"] }, { taskId: etp.id, userId: "u-pessoa", letters: ["A"] }]);
    expect(m.team).toEqual([{ userId: "u-pessoa", role: "GERENTE" }, { userId: "u-carla", role: "EQUIPE" }]);
    expect(m.charter.milestones).toEqual([{ id: "m1", title: "Prazo da demanda (Ofício nº 123/2026 – SECID/DTI)", date: "2027-06-30" }]);
    expect(m.budgetLines.map((b) => b.amount)).toEqual([850_000]);
    // plano de comunicação ligado ao mapa poder × interesse: demandante, destinatário e secretaria (3 × 3) de perto; controle externo satisfeito
    expect(m.communications!.map((c) => [c.frequency, c.audienceIds.length])).toEqual([["QUINZENAL", 3], ["POR_MARCO", 1]]);
    expect(() => computeMetrics(m)).not.toThrow();
  });

  it("prazo inviável vira risco registrado com os dias calculados", () => {
    const p = edit(base(), { op: "SET_DEADLINE", date: addDays("2026-11-12", 29) });
    const m = proposalToProject(p, { id: "ap-x", actorId: "u-pessoa", now: NOW });
    expect(m.risks.at(-1)).toMatchObject({ title: "Prazo da demanda menor que o caminho crítico (74 dias a mais)", impactLevel: 5 });
  });

  it("em branco e a partir de modelo (tipo de demanda ou o projeto da aula)", () => {
    const blank = blankProject({ id: "p-novo", title: "Meu projeto", area: "JURIDICO", approach: "PREDITIVO", startDate: "2026-11-16", actorId: "u-pessoa", now: NOW });
    expect(blank).toMatchObject({ title: "Meu projeto", area: "JURIDICO", tasks: [], version: 1, origin: { kind: "CRIAR_PROJETO" } });
    expect(blank.versions[0]).toMatchObject({ key: "projectCreated", vars: { title: "Meu projeto" } });
    expect(timelineView(blank).ok).toBe(true);
    expect(() => computeMetrics(blank)).not.toThrow();
    const aq = projectFromTemplate("tipo-aquisicao", { id: "p-aq", title: "", startDate: "2026-12-01", actorId: "u-pessoa", now: NOW, templateLabel: "Contratação" });
    expect(aq.title).toBe("Contratação");
    expect(aq.startDate).toBe("2026-12-01");
    expect(aq.tasks.map((t) => t.title)).toEqual(expect.arrayContaining(["Estudo técnico preliminar (ETP)", "Termo de referência (TR)", "Parecer jurídico sobre a contratação", "Licitação e assinatura do contrato"]));
    expect(aq.versions[0]).toMatchObject({ key: "projectFromTemplate", vars: { template: "Contratação" } });
    expect(aq.origin).toMatchObject({ kind: "MODELO" });
    const aula = projectFromTemplate("aula-decia", { id: "p-aula", title: "Minha turma", startDate: "2026-12-01", actorId: "u-pessoa", now: NOW, templateLabel: "Projeto da aula" });
    expect(aula).toMatchObject({ id: "p-aula", title: "Minha turma", version: 1 });
    expect(timelineView(aula).finish).toBe(14);
  });

  it("verbo de entrega vira substantivo na EAP", () => {
    expect(toNoun("Contratar a solução de software")).toBe("Contratação da solução de software");
    expect(toNoun("Migrar os processos")).toBe("Migração dos processos");
    expect(toNoun("Desenvolver um aplicativo")).toBe("Desenvolvimento de um aplicativo");
    expect(toNoun("Plano de testes")).toBe("Plano de testes");
  });
});

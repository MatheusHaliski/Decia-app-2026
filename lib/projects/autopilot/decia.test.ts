import { describe, expect, it } from "vitest";
import { attachArtifact, markArtifactApplied } from "@/lib/decia/session/artifact";
import { createMemorySessionRepository } from "@/lib/decia/session/repository";
import { buildDemoOrgPolicy } from "@/lib/decia/session/fixtures";
import { createMemoryLedger } from "@/lib/points/ledger";
import { applyCommand } from "../commands";
import { buildDemoProject } from "../fixtures";
import { addDays } from "./dates";
import {
  applyPlanChanges, diffPlan, parsePlan, planChangeCommands, projectSessionInput, proposalPlan, proposalSessionInput, renderPlan, scheduleImpact, suggestedMembers,
  type PlanChange, type SessionLabels,
} from "./decia";
import { EXAMPLE_OFICIO } from "./examples";
import { extractDemand } from "./extract";
import { editProposal, proposeScheme, scheduleProposal, type ProjectProposal, type ProposalOp } from "./proposal";

const NOW = new Date("2026-11-12T12:00:00");
const PEOPLE = { "u-pessoa": { name: "Pessoa Exemplo" }, "u-ana": { name: "Ana Exemplo" }, "u-bruno": { name: "Bruno Exemplo" } };
const LABELS: SessionLabels = {
  heading: (kind, title) => `${kind === "PROJETO" ? "Projeto" : "Proposta"} — ${title}`,
  objective: "Objetivo",
  deadline: "Prazo da demanda",
  finish: (days, date) => `Término: ${days} dias (${date})`,
  overrun: (n, deadline) => `Estoura o prazo (${deadline}) em ${n} dias`,
  fits: (slack, deadline) => `Cabe no prazo (${deadline}), folga de ${slack}`,
  noDeadline: "Sem prazo",
  criticalPath: (path) => `Caminho crítico: ${path}`,
  phase: (n, phase) => `Fase ${n} · ${phase}`,
  milestone: "marco",
  unassigned: "a definir",
  howTo: "Edite as linhas abaixo.",
  sessionTitle: (_k, title) => `Proposta: ${title}`,
  sessionObjective: (_k, title) => `Decidir a proposta “${title}”`,
};
const facts = extractDemand(EXAMPLE_OFICIO, { now: NOW });
const base = () => proposeScheme(facts, { now: NOW, sourceLabel: "Ofício nº 123/2026", sourceKind: "COLAR" });
const edit = (p: ProjectProposal, ...ops: ProposalOp[]) => ops.reduce((acc, op) => {
  const r = editProposal(acc, op);
  if (!r.ok) throw new Error(`${op.op}: ${r.error}`);
  return r.proposal;
}, p);
const keyOf = (p: ProjectProposal, title: RegExp) => p.tasks.find((t) => title.test(t.title))!.key;
const lineOf = (text: string, re: RegExp) => text.split("\n").find((l) => re.test(l))!;

describe("proposta → sessão do DECIA", () => {
  it("monta título, objetivo, membros pelos responsáveis e o artefato com fases, tarefas, prazos e o aviso de estouro", () => {
    const tight = edit(base(), { op: "SET_DEADLINE", date: addDays(base().startDate, 29) },
      { op: "TASK_RESPONSIBLE", key: keyOf(base(), /estudo técnico/), userId: "u-ana" },
      { op: "TASK_RESPONSIBLE", key: keyOf(base(), /Plano de testes/), userId: "u-pessoa" },
      { op: "TASK_RESPONSIBLE", key: keyOf(base(), /Termo de abertura/), userId: "u-inexistente" });
    const input = proposalSessionInput(tight, { draftId: "abcdefgh1234", actorId: "u-pessoa", people: PEOPLE, labels: LABELS });
    expect(input.title).toBe("Proposta: Implantação do sistema de protocolo digital");
    expect(input.objective).toMatch(/^Decidir a proposta/);
    // quem abre vira PROPRIETARIO pelo repositório; gente fora do diretório não entra
    expect(input.participants).toEqual([{ userId: "u-ana", role: "EDITOR" }]);
    const a = input.artifact!;
    expect(a).toMatchObject({ kind: "PROPOSTA_AUTOPILOTO", href: "/desk?draft=abcdefgh1234", draftId: "abcdefgh1234", projectId: null });
    const s = scheduleProposal(tight);
    expect(a.summary).toMatchObject({ phases: 7, tasks: 13, deadline: tight.deadline, finish: s.finishDate, overrunDays: 74 });
    expect(a.text).toContain("Estoura o prazo (2026-12-11) em 74 dias");
    expect(a.text).toContain(`⏱ Prazo da demanda: ${tight.deadline}`);
    expect(a.text).toContain("## Fase 1 · DEMANDA [DEMANDA]");
    expect(lineOf(a.text, /estudo técnico/)).toMatch(/^- \[T\d\d\] Elaborar o estudo técnico preliminar \(ETP\) \| 10 d \| \d{4}-\d{2}-\d{2} \| Ana Exemplo$/);
    expect(a.text).toMatch(/\| marco \|/);
    expect(Object.keys(a.refs)).toHaveLength(13);
    expect(a.refs.T01).toBe(proposalPlan(tight).phases[0]!.tasks[0]!.ref);
  });

  it("fases excluídas não vão para a sessão; o texto se lê de volta sem mudanças", () => {
    const p = edit(base(), { op: "PHASE_TOGGLE", phase: "ANALISE", included: false });
    const { text } = renderPlan(proposalPlan(p), PEOPLE, LABELS);
    expect(text).not.toContain("[ANALISE]");
    const parsed = parsePlan(text, LABELS);
    expect(parsed.found).toBe(true);
    expect(parsed.deadline).toBe(p.deadline);
    expect(parsed.tasks.every((t) => t.code && t.phase)).toBe(true);
    expect(diffPlan(text, text, PEOPLE, LABELS)).toEqual({ ok: true, changes: [], issues: [] });
  });

  it("membros sugeridos sem repetição, sem quem abre e só do diretório", () => {
    expect(suggestedMembers(["u-ana", "u-ana", "u-pessoa", null, "u-x", "u-bruno"], "u-pessoa", PEOPLE)).toEqual([{ userId: "u-ana", role: "EDITOR" }, { userId: "u-bruno", role: "EDITOR" }]);
  });
});

describe("decisões da minuta → de volta ao rascunho", () => {
  const p = base();
  const input = proposalSessionInput(p, { draftId: "abcdefgh1234", actorId: "u-pessoa", people: PEOPLE, labels: LABELS });
  const text = input.artifact!.text;
  const refs = input.artifact!.refs;
  const etp = lineOf(text, /estudo técnico/);
  const etpCode = /\[(T\d\d)\]/.exec(etp)![1]!;
  const tests = lineOf(text, /Plano de testes/);
  const testsCode = /\[(T\d\d)\]/.exec(tests)![1]!;

  it("lê renomear, duração, prazo, responsável, remover, incluir e o prazo da demanda; aplica pelo passo 3", () => {
    const next = text
      .replace(etp, `- [${etpCode}] Estudo técnico preliminar revisado | 15 d | 2027-01-20 | Ana Exemplo`)
      .replace(`${tests}\n`, "")
      .replace(/⏱ Prazo da demanda: .*/, "⏱ Prazo da demanda: 2027-05-31")
      .replace("[EXECUCAO]", "[EXECUCAO]\n- [+] Treinar os multiplicadores | 4 d");
    const d = diffPlan(text, next, PEOPLE, LABELS);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.issues).toEqual([]);
    expect(d.changes.map((c) => c.type)).toEqual(["PRAZO", "RENOMEAR", "DURACAO", "PRAZO_TAREFA", "RESPONSAVEL", "REMOVER", "INCLUIR"]);
    const r = applyPlanChanges(p, d.changes, refs);
    expect(r.failed).toEqual([]);
    expect(r.applied).toHaveLength(7);
    const t = r.proposal.tasks.find((x) => x.key === refs[etpCode])!;
    expect(t).toMatchObject({ title: "Estudo técnico preliminar revisado", dueAt: "2027-01-20", responsibleId: "u-ana", edited: true });
    expect(t.pert).toEqual({ o: 7.5, m: 15, p: 22.5 }); // TE 10 → 15: os três pontos na mesma proporção
    expect(r.proposal.tasks.some((x) => x.key === refs[testsCode])).toBe(false);
    expect(r.proposal.deadline).toBe("2027-05-31");
    const added = r.proposal.tasks.find((x) => x.title === "Treinar os multiplicadores")!;
    expect(added).toMatchObject({ phase: "EXECUCAO", origin: "PESSOA", pert: { o: 4, m: 4, p: 4 } });
    // depois de aplicado, a mesma minuta como base não gera nada de novo
    expect(diffPlan(next, next, PEOPLE, LABELS)).toMatchObject({ ok: true, changes: [] });
  });

  it("mover de fase e objetivo novo; linhas ilegíveis viram avisos, não mudanças", () => {
    const moved = text.replace(`${etp}\n`, "").replace("[EXECUCAO]", `[EXECUCAO]\n${etp}`)
      .replace(/◎ Objetivo: .*/, "◎ Objetivo: Protocolo digital em todas as regionais")
      .replace(tests, tests.replace(/\| [^|]+$/, "| Fulano Desconhecido").replace(/\| [\d.]+ d \|/, "| muitos |"));
    const d = diffPlan(text, moved, PEOPLE, LABELS);
    if (!d.ok) throw new Error("sem bloco");
    expect(d.changes).toEqual([
      { type: "OBJETIVO", from: p.objective, to: "Protocolo digital em todas as regionais" },
      { type: "FASE", code: etpCode, title: "Elaborar o estudo técnico preliminar (ETP)", from: "ELABORACAO", to: "EXECUCAO" },
    ]);
    expect(d.issues.map((i) => i.reason).sort()).toEqual(["DURACAO_INVALIDA", "RESPONSAVEL_DESCONHECIDO"]);
    const r = applyPlanChanges(p, d.changes, refs);
    expect(r.proposal.tasks.find((x) => x.key === refs[etpCode])!.phase).toBe("EXECUCAO");
    expect(r.proposal.objective).toBe("Protocolo digital em todas as regionais");
  });

  it("minuta reescrita (sem as linhas da proposta) não remove nada; código repetido e data inválida avisam", () => {
    expect(diffPlan(text, "Resumo da sessão\n- Evidências: nenhuma", PEOPLE, LABELS)).toMatchObject({ ok: false, reason: "SEM_BLOCO" });
    const dup = text.replace(etp, `${etp}\n${etp.replace(/\| \d{4}-\d{2}-\d{2} \|/, "| 2027-02-31 |")}`);
    const d = diffPlan(text, dup, PEOPLE, LABELS);
    if (!d.ok) throw new Error("sem bloco");
    expect(d.changes).toEqual([]);
    expect(d.issues.map((i) => i.reason).sort()).toEqual(["CODIGO_REPETIDO", "DATA_INVALIDA"]);
    expect(diffPlan(text, text.replace("[EXECUCAO]", "[EXECUCAO]\n").replace(/^/, "- [+] Sem fase\n"), PEOPLE, LABELS)).toMatchObject({ ok: true, issues: [{ reason: "SEM_FASE" }] });
  });

  it("atividade que sumiu do rascunho falha sozinha, sem travar as outras", () => {
    const changes: PlanChange[] = [{ type: "RENOMEAR", code: "T99", from: "x", to: "y" }, { type: "PRAZO", from: p.deadline ?? null, to: null }];
    const r = applyPlanChanges(p, changes, refs);
    expect(r.failed).toEqual([{ change: changes[0], error: "NAO_ENCONTRADO" }]);
    expect(r.proposal.deadline).toBeUndefined();
  });
});

describe("projeto salvo → sessão e pedidos de mudança", () => {
  const model = buildDemoProject();
  it("anexa o esquema do projeto com link de volta e sugere gerente, patrocinador e responsáveis", () => {
    const input = projectSessionInput(model, { actorId: "u-pessoa", people: { ...PEOPLE, ...Object.fromEntries(model.tasks.map((t) => [t.responsibleId ?? "x", { name: t.responsibleId ?? "x" }])) }, labels: LABELS, today: "2026-11-12" });
    expect(input.projectId).toBe(model.id);
    expect(input.artifact).toMatchObject({ kind: "PROJETO", href: `/projects/${model.id}`, projectId: model.id, draftId: null });
    expect(input.artifact!.summary.tasks).toBe(model.tasks.length);
    expect(input.artifact!.text).toContain(`[${model.tasks[0]!.code}] ${model.tasks[0]!.title.replace(/\|/g, "/")}`);
    expect(input.participants.every((p) => p.userId !== "u-pessoa")).toBe(true);
  });

  it("cada decisão vira CHANGE_REQUEST com o impacto no prazo; repetido não entra de novo", () => {
    const c: PlanChange = { type: "DURACAO", code: "T01", title: "Levantar requisitos", from: 5, to: 8 };
    expect(scheduleImpact(c)).toBe(3);
    expect(scheduleImpact({ type: "PRAZO", from: "2026-12-01", to: "2026-12-11" })).toBe(10);
    const cmds = planChangeCommands(model, [{ title: "T01: duração 5 → 8 dias", scheduleDays: 3 }, { title: "T01: duração 5 → 8 dias" }, { title: "  " }], "Sessão do DECIA");
    expect(cmds).toEqual([{ type: "CHANGE_REQUEST", title: "T01: duração 5 → 8 dias", changeType: "NORMAL", impact: { scheduleDays: 3 }, sevenRs: { raised: "Sessão do DECIA" } }]);
    const r = applyCommand(model, cmds[0]!, { actorId: "u-pessoa", now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.changes.at(-1)).toMatchObject({ title: "T01: duração 5 → 8 dias", status: "SOLICITADA", impact: { scheduleDays: 3 } });
    expect(planChangeCommands(r.model, [{ title: "T01: duração 5 → 8 dias" }], "x")).toEqual([]);
  });
});

describe("artefato na sessão (lib/decia/session/artifact)", () => {
  it("a minuta nasce com o texto anexado; aplicar avança a base e só o proprietário aplica", () => {
    const input = proposalSessionInput(base(), { draftId: "abcdefgh1234", actorId: "u-pessoa", people: PEOPLE, labels: LABELS });
    const repo = createMemorySessionRepository([], buildDemoOrgPolicy(NOW), { ledger: createMemoryLedger(), people: PEOPLE, search: () => [] });
    const r = repo.create(input, "u-pessoa", NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.session.minuta).toMatchObject({ revision: 1, text: input.artifact!.text });
    expect(r.session.artifact).toMatchObject({ baseText: input.artifact!.text, baseRevision: 1, applications: [], attachedBy: "u-pessoa" });
    expect(r.session.participants.map((p) => p.role)).toEqual(["PROPRIETARIO"]);
    const edited = repo.editMinuta(r.session.id, "u-pessoa", `${input.artifact!.text}\n- [+] Nova | 2 d`, NOW);
    expect(edited.ok).toBe(true);
    expect(repo.markArtifactApplied(r.session.id, "u-pessoa", 0, NOW)).toEqual({ ok: false, reason: "SEM_ALTERACAO" });
    const done = repo.markArtifactApplied(r.session.id, "u-pessoa", 1, NOW);
    if (!done.ok) throw new Error(done.reason);
    expect(done.session.artifact).toMatchObject({ baseRevision: 2, baseText: `${input.artifact!.text}\n- [+] Nova | 2 d`, applications: [{ by: "u-pessoa", revision: 2, changes: 1 }] });
    expect(done.session.artifact!.text).toBe(input.artifact!.text);
    const plain = repo.create({ title: "Sem artefato", objective: "x", participants: [{ userId: "u-ana", role: "EDITOR" }] }, "u-pessoa", NOW);
    if (!plain.ok) throw new Error(plain.reason);
    expect(plain.session.artifact).toBeUndefined();
    expect(markArtifactApplied(plain.session, "u-pessoa", 1, NOW)).toEqual({ ok: false, reason: "SEM_ALTERACAO" });
    const withAna = { ...done.session, participants: [...done.session.participants, { userId: "u-ana", role: "EDITOR" as const, joinedAt: NOW.toISOString() }] };
    expect(markArtifactApplied(withAna, "u-ana", 1, NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(attachArtifact({ ...input.artifact!, text: "x".repeat(30_000) }, "u-pessoa", NOW.toISOString()).minuta.text).toHaveLength(20_000);
  });
});

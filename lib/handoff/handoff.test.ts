/**
 * Dossiê de Transição (RF36): coleta determinística (projetos, tarefas, decisões, pendências, riscos, contatos, fontes), privacidade
 * (privados só com consentimento, sigilosos só por referência), plano de transferência com sucessor por item, ciência do sucessor,
 * checklist e exportação (Markdown, JSON, HTML para impressão).
 */
import { describe, expect, it } from "vitest";
import { buildDemoDecisions, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { translate } from "@/lib/i18n/core";
import type { MemoryHit, MemorySearch } from "@/lib/memory/search";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { collectDossier, collectWithMemory, daysBetween, isLegalTask, memoryQueryFor, pendenciesOf, taskPendency, type CollectInput } from "./collect";
import { exportFileName, renderFact, toJson, toMarkdown, toPrintHtml, type ExportContext } from "./export";
import { buildDemoHandoffTasks } from "./fixtures";
import { buildDemoDossiers, createMemoryHandoffRepository } from "./repository";
import type { HandoffDossier } from "./types";
import {
  acknowledge, assignDefaultSuccessor, assignSuccessor, cancel, checklist, createDossier, refuse, sendToSuccessors, setItemNote, successorsOf,
  summarize, toggleCheck, transferableItems, unassigned,
} from "./workflow";

const NOW = new Date("2026-11-12T12:00:00Z");
const TODAY = "2026-11-12";
const t = (key: string, vars?: Record<string, string | number | Date | null | undefined>) => translate("pt-BR", key, vars);
const ctx: ExportContext = { t, people: DEMO_PEOPLE, formatDateTime: (iso) => iso.slice(0, 16).replace("T", " ") };

const input = (over: Partial<CollectInput> = {}): CollectInput => ({
  subject: { id: "u-pessoa", name: "Pessoa Exemplo" },
  today: TODAY,
  consentForPrivateItems: false,
  people: DEMO_PEOPLE,
  projects: [buildDemoProject()],
  decisions: buildDemoDecisions(NOW),
  tasks: buildDemoHandoffTasks(NOW),
  taskSource: "DEMO",
  ...over,
});

const newDossier = (over: Partial<Parameters<typeof createDossier>[0]> = {}): HandoffDossier => createDossier({
  id: "d1", subject: { id: "u-pessoa", name: "Pessoa Exemplo" }, reason: "SAIDA", effectiveDate: "2026-11-30", today: TODAY,
  requestedBy: { id: "viewer:CHEFE", name: "Chefia Exemplo", profile: "CHEFE" }, consentForPrivateItems: false, defaultSuccessorId: null,
  collected: collectDossier(input()), now: NOW.toISOString(), ...over,
});

describe("coleta (RF36.CA01): o que a pessoa deixa, por seção", () => {
  it("projetos, atividades, decisões, riscos, contatos e fontes vêm das fontes DEMO e do Acervo de exemplo", () => {
    const c = collectDossier(input());
    const ids = (section: string) => c.items.filter((i) => i.section === section).map((i) => i.id);
    expect(ids("PROJETOS")).toEqual(["projeto:decia-v1"]);
    const project = c.items.find((i) => i.id === "projeto:decia-v1")!;
    expect(project.facts.map((f) => renderFact(t, f))).toEqual(["Fase: Elaboração", "Papel: Gerente do projeto", "Atividades sob a responsabilidade: 0 abertas · 2 concluídas"]);
    expect(ids("DECISOES")).toEqual(expect.arrayContaining(["decisao:d-arquitetura", "decisao:d-sprint-5", "decisao:d-fornecedor-suporte"]));
    expect(ids("DECISOES")).not.toContain("decisao:d-lancamento"); // revisada: só história
    expect(c.history.decisionsClosed).toBe(1);
    expect(ids("RISCOS")).toEqual(["risco:decia-v1:k1"]); // o único risco aberto de que ela é dona
    expect(ids("CONTATOS")).toEqual(expect.arrayContaining(["parte:decia-v1:s1", "contato:u-ana", "contato:u-carla", "comunicacao:decia-v1:cm1"]));
    expect(ids("CONTATOS")).not.toContain("contato:u-pessoa");
    // fontes: referências das tarefas (sem repetir), evidências das decisões; nada de contato pessoal em lugar nenhum
    expect(c.items.filter((i) => i.section === "FONTES" && i.id.startsWith("referencia:")).map((i) => i.href)).toEqual(expect.arrayContaining([
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm", "https://www.escolavirtual.gov.br/",
    ]));
    expect(c.items.some((i) => i.id.startsWith("evidencia:d-arquitetura:"))).toBe(true);
    expect(JSON.stringify(c.items)).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}|\(\d{2}\)\s?\d{4,5}-\d{4}/i); // nem e-mail nem telefone
    expect(c.sources).toEqual(["DEMO"]);
    expect(c.history.tasksDone).toBe(1);
  });

  it("pendências: prazo legal antes de vencida e de bloqueada; decisão atrasada; tudo ordenado da mais grave", () => {
    const c = collectDossier(input());
    const pend = pendenciesOf(c.items);
    expect(pend.map((i) => [i.id, i.pendency])).toEqual([
      ["tarefa:t-dossie-parecer-aditivo", "PRAZO_LEGAL"],
      ["tarefa:t-dossie-ata-comite", "VENCIDA"],
      ["tarefa:t-dossie-termo-referencia", "BLOQUEADA"],
    ]);
    const blocked = c.items.find((i) => i.id === "tarefa:t-dossie-termo-referencia")!;
    expect(blocked.facts.map((f) => renderFact(t, f)).join(" · ")).toContain("Bloqueio: Aguardando a pesquisa de preços do setor de compras");
    // a decisão atrasada aparece para quem é dono dela
    const late = collectDossier(input({ decisions: buildDemoDecisions(new Date("2026-12-31T12:00:00Z")).map((a) => (a.decision.id === "d-sprint-5" ? { ...a, decision: { ...a.decision, targetDate: "2026-11-01T00:00:00Z" } } : a)) }));
    expect(late.items.find((i) => i.id === "decisao:d-sprint-5")!.pendency).toBe("DECISAO_ATRASADA");
  });

  it("regras de prazo: legal na janela ou vencido, vencida, bloqueada, concluída sem pendência", () => {
    const base = { id: "x", title: "x", state: "DISPONIVEL", dueAt: "2026-11-20" };
    expect(isLegalTask({ ...base, area: "JURIDICO" })).toBe(true);
    expect(isLegalTask({ ...base, extensions: { caseNumber: "0001234-56.2026.8.16.0001" } })).toBe(true);
    expect(isLegalTask({ ...base, category: "LICENCA_ANUENCIA" })).toBe(true);
    expect(isLegalTask(base)).toBe(false);
    expect(taskPendency({ ...base, area: "JURIDICO" }, TODAY)).toBe("PRAZO_LEGAL");
    expect(taskPendency({ ...base, area: "JURIDICO", dueAt: "2027-02-01" }, TODAY)).toBeUndefined();
    expect(taskPendency({ ...base, area: "JURIDICO", dueAt: "2026-10-01" }, TODAY)).toBe("PRAZO_LEGAL");
    expect(taskPendency({ ...base, dueAt: "2026-11-11" }, TODAY)).toBe("VENCIDA");
    expect(taskPendency({ ...base, state: "BLOQUEADA", dueAt: null }, TODAY)).toBe("BLOQUEADA");
    expect(taskPendency({ ...base, state: "CONCLUIDA", dueAt: "2026-01-01" }, TODAY)).toBeUndefined();
    expect(daysBetween("2026-11-12", "2026-11-20")).toBe(8);
    expect(daysBetween("2026-11-12", "2026-11-10")).toBe(-2);
  });

  it("RF36.CA05: privados só com consentimento (fora dele, só a contagem); sigilosos só por referência", () => {
    const without = collectDossier(input());
    expect(without.privateExcluded).toBe(1);
    expect(without.items.some((i) => i.id === "tarefa:t-dossie-anotacoes")).toBe(false);
    const withConsent = collectDossier(input({ consentForPrivateItems: true }));
    expect(withConsent.privateExcluded).toBe(0);
    expect(withConsent.items.some((i) => i.id === "tarefa:t-dossie-anotacoes")).toBe(true);
    const secret = without.items.find((i) => i.id === "tarefa:t-dossie-avaliacao-equipe")!;
    expect(secret.restricted).toBe(true);
    expect(secret.title).toBe("");
    expect(JSON.stringify(without.items)).not.toContain("Avaliação de desempenho");
  });

  it("tarefas reais (API) entram com link para o Acervo; as de exemplo não ganham link", () => {
    const api = collectDossier(input({ taskSource: "API", tasks: [{ id: "55555555-5555-4555-8555-555555555555", title: "Real", state: "EM_USO", ownerId: "u-pessoa" }] }));
    expect(api.items.find((i) => i.id.startsWith("tarefa:"))).toMatchObject({ source: "API", href: "/tasks/55555555-5555-4555-8555-555555555555" });
    expect(api.sources).toEqual(["API", "DEMO"]);
    expect(collectDossier(input()).items.find((i) => i.id === "tarefa:t-dossie-ata-comite")!.href).toBeNull();
  });

  it("fontes da Memória Institucional: trecho exato e citação, buscados com os títulos do que a pessoa deixa", () => {
    const hit: MemoryHit = {
      docId: "port-12", kind: "PORTARIA", title: "Portaria 12/2025 — comitê de TI", department: "SECID", year: 2025, href: null, score: 0.42,
      passage: { text: "As decisões do comitê serão registradas com o porquê.", start: 10, end: 63 }, citation: "Portaria 12/2025 — SECID, §3",
    };
    let asked = "";
    const search: MemorySearch = (q, opts) => { asked = q; expect(opts).toMatchObject({ k: 5, readable: ["PUBLICO", "INTERNO"] }); return [hit]; };
    const c = collectWithMemory(input(), search);
    expect(asked).toContain("Plataforma DECIA v1.0");
    expect(asked).not.toContain("Avaliação de desempenho");
    const mem = c.items.find((i) => i.source === "MEMORIA")!;
    expect(mem).toMatchObject({ section: "FONTES", title: hit.title, citation: { text: hit.passage.text, ref: hit.citation } });
    expect(renderFact(t, mem.facts[0]!)).toBe("Portaria · SECID · 2025");
    expect(c.sources).toEqual(["DEMO", "MEMORIA"]);
    // sem índice carregado (busca vazia), nada muda
    expect(collectWithMemory(input(), () => []).items.some((i) => i.source === "MEMORIA")).toBe(false);
    expect(memoryQueryFor([])).toBe("");
  });
});

describe("plano de transferência e ciência do sucessor (RF36.CA03, máquina de estados)", () => {
  it("o sucessor padrão preenche os transferíveis; contatos e fontes são leitura; o titular não pode ser sucessor", () => {
    const d = newDossier({ defaultSuccessorId: "u-carla" });
    expect(transferableItems(d).every((i) => i.successorId === "u-carla")).toBe(true);
    expect(d.items.filter((i) => !i.transferable).every((i) => i.successorId === null)).toBe(true);
    expect(newDossier({ defaultSuccessorId: "u-pessoa" }).defaultSuccessorId).toBeNull();
    const contact = d.items.find((i) => i.section === "CONTATOS" && !i.transferable)!;
    expect(assignSuccessor(d, contact.id, "u-bruno", "x", TODAY)).toEqual({ ok: false, error: "ITEM_NAO_TRANSFERIVEL" });
    expect(assignSuccessor(d, "projeto:decia-v1", "u-pessoa", "x", TODAY)).toEqual({ ok: false, error: "SUCESSOR_IGUAL_AO_TITULAR" });
    expect(assignSuccessor(d, "nao-existe", "u-bruno", "x", TODAY)).toEqual({ ok: false, error: "ITEM_NAO_ENCONTRADO" });
  });

  it("enviar exige sucessor em todo item; cada sucessor dá ciência; com todos, TRANSFERIDO", () => {
    let d = newDossier();
    const missing = sendToSuccessors(d, "viewer:CHEFE", TODAY);
    expect(missing).toEqual({ ok: false, error: "SEM_SUCESSOR", vars: { n: transferableItems(d).length } });
    let r = assignDefaultSuccessor(d, "u-carla", "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    r = assignSuccessor(d, "projeto:decia-v1", "u-bruno", "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(unassigned(d)).toEqual([]);
    expect(successorsOf(d).sort()).toEqual(["u-bruno", "u-carla"]);
    r = setItemNote(d, "projeto:decia-v1", "Falta o portão da Análise", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    r = sendToSuccessors(d, "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(d.status).toBe("AGUARDANDO_SUCESSOR");
    expect(assignSuccessor(d, "projeto:decia-v1", "u-ana", "x", TODAY)).toMatchObject({ ok: false, error: "ESTADO_INVALIDO" });
    expect(acknowledge(d, "u-elisa", TODAY)).toEqual({ ok: false, error: "NAO_E_SUCESSOR" });
    r = acknowledge(d, "u-carla", "2026-11-13T10:00:00Z");
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(d.status).toBe("AGUARDANDO_SUCESSOR");
    r = acknowledge(d, "u-bruno", "2026-11-13T11:00:00Z");
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(d.status).toBe("TRANSFERIDO");
    expect(d.history.map((e) => e.kind)).toEqual(["GERADO", "SUCESSOR", "SUCESSOR", "ENVIADO", "CIENCIA", "CIENCIA"]);
    expect(checklist(d).find((c) => c.id === "CIENCIA")!.done).toBe(true);
    expect(cancel(d, "x", "viewer:CHEFE", TODAY)).toMatchObject({ ok: false, error: "ESTADO_INVALIDO" });
  });

  it("recusa com motivo obrigatório: RECUSADO, itens desse sucessor ficam vazios; novo sucessor e reenvio; cancelar exige motivo", () => {
    let d = newDossier({ defaultSuccessorId: "u-carla" });
    let r = sendToSuccessors(d, "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(refuse(d, "u-carla", "   ", TODAY)).toEqual({ ok: false, error: "MOTIVO_OBRIGATORIO" });
    r = refuse(d, "u-carla", "Estou em licença no período", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(d.status).toBe("RECUSADO");
    expect(d.refusal).toMatchObject({ successorId: "u-carla", reason: "Estou em licença no período" });
    expect(unassigned(d).length).toBe(transferableItems(d).length);
    r = assignDefaultSuccessor(d, "u-elisa", "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    r = sendToSuccessors(r.dossier, "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    expect(r.dossier).toMatchObject({ status: "AGUARDANDO_SUCESSOR", refusal: null });
    expect(cancel(r.dossier, "", "viewer:CHEFE", TODAY)).toEqual({ ok: false, error: "MOTIVO_OBRIGATORIO" });
    const c = cancel(r.dossier, "A pessoa ficou no setor", "viewer:CHEFE", TODAY);
    expect(c.ok && c.dossier.status).toBe("CANCELADO");
  });

  it("checklist: itens calculados e marcados à mão; resumo só com as contagens do dossiê (D-12)", () => {
    let d = newDossier({ defaultSuccessorId: "u-carla" });
    const ids = checklist(d).map((c) => [c.id, c.auto, c.done]);
    expect(ids).toEqual([
      ["SUCESSORES", true, true], ["PENDENCIAS", false, false], ["PRIVADOS", true, true], ["CONTATOS", false, false], ["FONTES", false, false],
      ["PRESERVACAO", true, true], ["CIENCIA", true, false],
    ]);
    const r = toggleCheck(d, "PENDENCIAS", true, "viewer:CHEFE", TODAY);
    if (!r.ok) throw new Error(r.error);
    d = r.dossier;
    expect(checklist(d).find((c) => c.id === "PENDENCIAS")!.done).toBe(true);
    const lines = summarize(d).map((f) => renderFact(t, f));
    const count = (s: string) => d.items.filter((i) => i.section === s).length;
    expect(lines[0]).toBe(`Pessoa Exemplo deixa — projetos: ${count("PROJETOS")} · tarefas e atividades: ${count("TAREFAS")} · decisões em andamento: ${count("DECISOES")}.`);
    expect(lines[1]).toBe("Pendências: 3 (prazos legais: 1 · vencidas ou atrasadas: 1 · bloqueadas: 1).");
    expect(lines).toContain("Itens privados fora do dossiê, sem consentimento: 1.");
    expect(lines.at(-1)).toBe("Todos os itens transferíveis têm sucessor (1 pessoas).");
  });
});

describe("exportação (RF36.CA02): Markdown, JSON e HTML para impressão", () => {
  it("Markdown com as seções, o plano, o checklist e a ciência; texto do usuário escapado; sigiloso só por referência", () => {
    const d = newDossier({ defaultSuccessorId: "u-carla" });
    const md = toMarkdown(d, ctx);
    expect(md.startsWith("# Dossiê de transição — Pessoa Exemplo\n")).toBe(true);
    for (const h of ["## Projetos (1)", "## Pendências (3)", "## Fontes de conhecimento", "## Plano de transferência", "## Checklist da transição", "## Ciência do sucessor"]) expect(md).toContain(h);
    expect(md).toContain("⚠ Prazo legal");
    expect(md).toContain("Sucessor: Carla Exemplo");
    expect(md).toContain("| Plataforma DECIA v1.0 | Projetos | Carla Exemplo |");
    expect(md).toContain("- [x] Cada item transferível tem sucessor");
    expect(md).not.toContain("Avaliação de desempenho");
    expect(md).toContain("Item sigiloso (referência");
    const tricky = { ...d, items: d.items.map((i) => (i.id === "projeto:decia-v1" ? { ...i, title: "Projeto *A* | <b>" } : i)) };
    expect(toMarkdown(tricky, ctx)).toContain("Projeto \\*A\\* \\| \\<b\\>");
  });

  it("JSON com chaves estáveis e os nomes das pessoas citadas; HTML de impressão escapado e sem cor literal", () => {
    const d = newDossier({ defaultSuccessorId: "u-carla" });
    const parsed = JSON.parse(toJson(d, DEMO_PEOPLE));
    expect(parsed.schema).toBe("ws.handoff/1");
    expect(parsed.dossier.items.length).toBe(d.items.length);
    expect(parsed.people).toMatchObject({ "u-pessoa": "Pessoa Exemplo", "u-carla": "Carla Exemplo", "viewer:CHEFE": "Chefia Exemplo" });
    const evil = { ...d, subjectName: "<script>alert(1)</script>" };
    const html = toPrintHtml(evil, ctx);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(html).toContain("<th scope=\"col\">Sucessor</th>");
    expect(exportFileName(d, "md")).toBe("dossie-transicao-pessoa-exemplo-2026-11-30.md");
    expect(exportFileName({ ...d, subjectName: "Ação & Cia" }, "json")).toBe("dossie-transicao-acao-cia-2026-11-30.json");
  });
});

describe("repositório DEMO", () => {
  it("guarda, substitui pela versão nova e avisa quem assina; o exemplo já está à espera da ciência da Pessoa Exemplo", () => {
    const repo = createMemoryHandoffRepository([]);
    let calls = 0;
    const off = repo.subscribe(() => { calls += 1; });
    const d = newDossier();
    repo.save(d);
    repo.save({ ...d, version: 2 });
    expect(repo.list()).toHaveLength(1);
    expect(repo.get("d1")!.version).toBe(2);
    expect(calls).toBe(2);
    off();
    const [seed] = buildDemoDossiers(NOW);
    expect(seed).toMatchObject({ subjectId: "u-diego", reason: "SAIDA", status: "AGUARDANDO_SUCESSOR" });
    expect(successorsOf(seed!)).toEqual(["u-pessoa"]);
  });
});

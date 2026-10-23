import { describe, expect, it } from "vitest";
import { buildDemoSocial, DEMO_PROJECT_IDS as P, DEMO_TASK_IDS as T, DEMO_USERS as U } from "./fixtures";
import { delegate, projectById, remix, taskById } from "./rules";
import { dueKindOf, profileTabsFor, toProfileHeaderViewModel, toProjectCardViewModel, toTaskCardViewModel } from "./view-model";

const NOW = new Date("2026-10-06T12:00:00Z");
const s = buildDemoSocial(NOW);
const vm = (id: string, viewer: string | null = U.pessoa, state = s) => toTaskCardViewModel(state, viewer, taskById(state, id)!, NOW);

describe("TaskCardViewModel (ANATOMIA_CARDS §3/§7)", () => {
  it("tipo → glifo/tom/família; estado → tom; variações derivadas", () => {
    const etp = vm(T.anaEtp);
    expect(etp).toMatchObject({ type: "ESTUDO_TECNICO_PRELIMINAR", typeSymbol: "⌕", family: "protocolo", state: "DISPONIVEL", stateTone: "accent", href: `/tasks/${T.anaEtp}` });
    expect([...etp.variants]).toEqual(expect.arrayContaining(["DISPONIVEL", "CHANCELADA"]));
    expect(vm(T.chefeDesenho).family).toBe("blueprint");
    expect(vm(T.anaAta).family).toBe("carimbo");
    expect([...vm(T.brunoRemix).variants]).toEqual(expect.arrayContaining(["REMIX", "GERADA_IA"]));
    expect([...vm(T.pessoaRelatorio, U.pessoa).variants]).toContain("PRAZO_LEGAL");
    expect([...vm(T.chefePortaria).variants]).toContain("FAVORITA"); // salva como favorita pela Pessoa
  });
  it("prazo: vencido, próximo (≤ 3 dias) ou ok", () => {
    expect(dueKindOf("2026-10-05", NOW)).toBe("over");
    expect(dueKindOf("2026-10-09", NOW)).toBe("soon");
    expect(dueKindOf("2026-10-20", NOW)).toBe("ok");
    expect(dueKindOf(null, NOW)).toBeNull();
    expect(vm(T.pessoaRelatorio).dueKind).toBe("over");
    expect(vm(T.pessoaRelatorio).legal).toBe(true);
  });
  it("permissões com motivo: remix de SIGILOSO negado; visitante sem login", () => {
    expect(vm(T.anaSigiloso).perms.remix).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    expect(vm(T.anaEtp).perms.remix.ok).toBe(true);
    expect(vm(T.anaEtp, null).perms.react).toEqual({ ok: false, reason: "NAO_AUTENTICADO" });
    expect(vm(T.diegoChecklist).perms.giveBack.ok).toBe(true);
    expect(vm(T.anaEtp).perms.giveBack).toEqual({ ok: false, reason: "SEM_ATRIBUICAO" });
    expect(vm(T.anaSigiloso).perms.share).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
  });
  it("crédito do remix (original + via) e 'remixado por'", () => {
    const r = remix(s, U.pessoa, { type: "TASK", id: T.brunoRemix }, NOW);
    if (!r.ok) throw new Error(r.error);
    const card = vm(r.resultId, U.pessoa, r.state);
    expect(card.credit).toMatchObject({ originalAuthor: { id: U.ana }, originalId: T.anaOficioIa, via: { id: U.bruno } });
    expect(vm(T.anaOficioIa).remixedBy).toBe(1);
  });
  it("delegação no card: 'delegada a Y · aguardando' para o remetente", () => {
    const r = delegate(s, U.pessoa, { type: "TASK", id: T.pessoaCronograma }, { toUserId: U.chefe }, NOW);
    if (!r.ok) throw new Error(r.error);
    const card = vm(T.pessoaCronograma, U.pessoa, r.state);
    expect(card.delegation).toMatchObject({ status: "PROPOSTA", to: { id: U.chefe }, from: { id: U.pessoa }, toViewer: false });
    expect([...card.variants]).toContain("ATRIBUIDA");
    expect(vm(T.pessoaCronograma, U.chefe, r.state).delegation?.toViewer).toBe(true);
  });
});

describe("ProjectCardViewModel", () => {
  it("mosaico com até 6 tarefas, fase e variações de visibilidade", () => {
    const p = toProjectCardViewModel(s, U.pessoa, projectById(s, P.anaMobilidade)!);
    expect(p).toMatchObject({ status: "PUBLICADO", phase: "ELABORACAO", phaseIndex: 2, tasksCount: 3 });
    expect(p.mosaic.map((m) => m.symbol)).toEqual(["⌕", "▦", "◉"]);
    expect([...toProjectCardViewModel(s, U.chefe, projectById(s, P.chefeSede)!).variants]).toEqual(expect.arrayContaining(["EM_DECISAO", "EMPRESA"]));
  });
});

describe("cabeçalho do perfil (Matriz B; RF16.CA01/CA04/CA06)", () => {
  const counter = (h: NonNullable<ReturnType<typeof toProfileHeaderViewModel>>, k: string) => h.counters.find((c) => c.key === k)?.value;
  it("próprio perfil: DP visível, contadores reais (incl. rascunhos)", () => {
    const h = toProfileHeaderViewModel(s, U.pessoa, U.pessoa)!;
    expect(h.isSelf).toBe(true);
    expect(counter(h, "points")).toBe(1240);
    expect(counter(h, "tasks")).toBe(5);
    expect(counter(h, "followers")).toBe(1); // Ana ATIVO; Diego REMOVIDO não conta
    expect(h.follow).toEqual({ ok: false, reason: "SEGUIR_A_SI" });
  });
  it("terceiros: só o que o viewer vê; DP oculto; Hype por hypeVisibility", () => {
    const byPessoa = toProfileHeaderViewModel(s, U.pessoa, U.ana)!;
    const byCarla = toProfileHeaderViewModel(s, U.carla, U.ana)!;
    expect(counter(byPessoa, "tasks")).toBe(5);
    expect(counter(byCarla, "tasks")).toBe(2);
    expect(counter(byPessoa, "points")).toBeNull();
    // decisões: a contagem bruta incluiria sessões que o viewer não vê → só o dono
    expect(counter(byPessoa, "decisions")).toBeNull();
    expect(counter(toProfileHeaderViewModel(s, U.ana, U.ana)!, "decisions")).not.toBeNull();
    // seguindo: follows ATIVO feitos pela própria pessoa, coerente com followersCount do outro lado
    const following = s.follows.filter((f) => f.followerId === U.ana && f.status === "ATIVO").length;
    expect(counter(byPessoa, "following")).toBe(following);
    expect(counter(byPessoa, "hype")).toBe(712);
    expect(counter(toProfileHeaderViewModel(s, U.pessoa, U.bruno)!, "hype")).toBeNull();
    expect(byPessoa.following).toBe(true);
  });
  it("institucionais: EMPRESA → badge + /companies, sem DP/Hype; chefe → /departments", () => {
    const emp = toProfileHeaderViewModel(s, U.pessoa, U.secretaria)!;
    expect(emp.institutional).toMatchObject({ kind: "EMPRESA", href: "/companies/secretaria-exemplo" });
    expect(emp.counters.map((c) => c.key)).toEqual(["tasks", "projects", "decisions", "followers", "following"]);
    expect(toProfileHeaderViewModel(s, U.pessoa, U.chefe)!.institutional).toMatchObject({ kind: "CHEFE", href: "/departments/cpoe", acronym: "CPOE" });
    expect(toProfileHeaderViewModel(s, U.pessoa, "u-nao-existe")).toBeNull();
  });
  it("sub-abas: dono 15; terceiros 1–5 (EMPRESA sem a 5) sem depender do perfil de quem olha", () => {
    expect(profileTabsFor(s, U.pessoa, U.pessoa)).toHaveLength(15);
    const third = profileTabsFor(s, U.pessoa, U.ana);
    expect(third.map((t) => t.slug)).toEqual(["acervo", "projetos", "programas", "decisoes", "deliberativo"]);
    expect(third.every((t) => !t.hiddenFor)).toBe(true);
    expect(profileTabsFor(s, U.pessoa, U.secretaria).map((t) => t.slug)).toEqual(["acervo", "projetos", "programas", "decisoes"]);
  });
});

describe("composição do card de projeto não vaza tarefas ocultas (RF7/RF17)", () => {
  it("mosaico e total contam só o que o viewer vê", () => {
    const base = projectById(s, P.anaMobilidade)!;
    const withSecret = { ...s, projects: s.projects.map((p) => (p.id === base.id ? { ...p, taskIds: [...p.taskIds, T.anaSigiloso, T.anaPrivada] } : p)) };
    const project = projectById(withSecret, base.id)!;
    const byDiego = toProjectCardViewModel(withSecret, U.diego, project);
    expect(byDiego.mosaic.map((m) => m.id)).not.toContain(T.anaSigiloso);
    expect(byDiego.mosaic.map((m) => m.id)).not.toContain(T.anaPrivada);
    expect(JSON.stringify(byDiego)).not.toContain(taskById(s, T.anaSigiloso)!.title);
    const byOwner = toProjectCardViewModel(withSecret, U.ana, project);
    expect(byOwner.tasksCount).toBe(byDiego.tasksCount + 2);
  });
});

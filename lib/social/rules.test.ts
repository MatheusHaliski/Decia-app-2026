import { describe, expect, it } from "vitest";
import { buildDemoSocial, DEMO_PROJECT_IDS as P, DEMO_TASK_IDS as T, DEMO_USERS as U } from "./fixtures";
import {
  addComment, assignmentsTo, canDeleteComment, canInteract, canSeeHype, canTransition, canView, countersOf, delegate, delegateCandidates, delegatePermission,
  deleteComment, editComment, followersCount, giveBack, giveBackPermission, hasLiked, isFollowing, itemOf, markNotificationsRead, muralFeed, myQualitative,
  notificationsFor, notify, parseMentions, personById, profileProjects, profileTasks, react, recipientPermission, remix, remixChain, remixPermission,
  remixedByCount, respond, respondToAssignment, savedListOf, savedOf, share, shareChannelPermission, taskById, threadOf, toggleFavorite, toggleFollow,
  toggleSave, COMMENT_MAX, GIVE_BACK_MIN, type Item, type Result,
} from "./rules";
import type { Assignment, AssignmentStatus, SocialState, TargetRef } from "./types";

const NOW = new Date("2026-10-06T12:00:00Z");
const LATER = new Date("2026-10-06T12:30:00Z");
const NEXT_HOUR = new Date("2026-10-06T13:10:00Z");
const fresh = () => buildDemoSocial(NOW);
const task = (id: string): TargetRef => ({ type: "TASK", id });
const proj = (id: string): TargetRef => ({ type: "PROJECT", id });
const item = (s: SocialState, ref: TargetRef) => itemOf(s, ref) as Item;
function ok<R extends Result<object>>(r: R): Extract<R, { ok: true }> {
  if (!r.ok) throw new Error(`esperava sucesso, veio ${r.error}`);
  return r as Extract<R, { ok: true }>;
}
const err = (r: Result<object>) => (r.ok ? "OK" : r.error);

describe("visibilidade (RF16.CA03, RF6.CA06, RF26.CA08; D-93)", () => {
  const s = fresh();
  it("PUBLICA vê todo mundo, inclusive visitante; EMPRESA só mesma empresa; DEPARTAMENTO só a lotação", () => {
    expect(canView(s, null, item(s, task(T.anaEtp)))).toBe(true);
    expect(canView(s, U.carla, item(s, task(T.anaEtp)))).toBe(true);
    expect(canView(s, U.pessoa, item(s, task(T.anaPlanilha)))).toBe(true);
    expect(canView(s, U.carla, item(s, task(T.anaPlanilha)))).toBe(false);
    expect(canView(s, null, item(s, task(T.anaPlanilha)))).toBe(false);
    expect(canView(s, U.pessoa, item(s, task(T.anaAta)))).toBe(true); // mesma SECID-UTS
    expect(canView(s, U.chefe, item(s, task(T.anaAta)))).toBe(false); // CPOE
  });
  it("PRIVADA e RASCUNHO nunca para terceiros; o dono sempre vê", () => {
    expect(canView(s, U.pessoa, item(s, task(T.anaPrivada)))).toBe(false);
    expect(canView(s, U.ana, item(s, task(T.anaPrivada)))).toBe(true);
    expect(canView(s, U.ana, item(s, proj("p-pessoa-rascunho")))).toBe(false);
  });
  it("RESTRITO/SIGILOSO só para o departamento dono", () => {
    expect(canView(s, U.pessoa, item(s, task(T.anaSigiloso)))).toBe(true);
    expect(canView(s, U.bruno, item(s, task(T.anaSigiloso)))).toBe(false); // EMPRESA, mas CPOE
  });
  it("responsável e destinatário de atribuição em aberto veem o item", () => {
    expect(canView(s, U.pessoa, item(s, task(T.diegoChecklist)))).toBe(true);
    expect(canView(s, U.pessoa, item(s, task(T.chefeDesenho)))).toBe(true);
  });
  it("interagir exige login (NAO_AUTENTICADO) e leitura (ACESSO_NEGADO)", () => {
    expect(canInteract(s, null, item(s, task(T.anaEtp)))).toEqual({ ok: false, reason: "NAO_AUTENTICADO" });
    expect(canInteract(s, U.carla, item(s, task(T.anaPlanilha)))).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(err(react(s, U.carla, task(T.anaPlanilha), "CURTIR", NOW))).toBe("ACESSO_NEGADO");
    expect(err(react(s, U.pessoa, task("t-nao-existe"), "CURTIR", NOW))).toBe("NAO_ENCONTRADO");
  });
  it("perfil: itens do dono + delegados aceitos, filtrados pelo viewer; contagem difere por viewer", () => {
    const own = profileTasks(s, U.ana, U.ana).map((t) => t.id);
    expect(own).toContain(T.anaPrivada);
    const byPessoa = profileTasks(s, U.pessoa, U.ana).map((t) => t.id);
    expect(byPessoa).toEqual(expect.arrayContaining([T.anaEtp, T.anaAta, T.anaSigiloso, T.anaPlanilha]));
    expect(byPessoa).not.toContain(T.anaPrivada);
    const byCarla = profileTasks(s, U.carla, U.ana).map((t) => t.id);
    expect(byCarla.sort()).toEqual([T.anaEtp, T.anaOficioIa].sort());
    expect(profileTasks(s, U.pessoa, U.pessoa).map((t) => t.id)).toContain(T.diegoChecklist); // delegada e aceita
    expect(profileProjects(s, null, U.ana).map((p) => p.id)).toEqual([P.anaMobilidade]);
  });
  it("Hype conforme hypeVisibility (RF16.CA04)", () => {
    const pessoa = personById(s, U.pessoa)!; // EMPRESA
    expect(canSeeHype(s, U.ana, pessoa)).toBe(true);
    expect(canSeeHype(s, U.carla, pessoa)).toBe(false);
    expect(canSeeHype(s, null, personById(s, U.ana)!)).toBe(true); // PUBLICO
    expect(canSeeHype(s, U.pessoa, personById(s, U.bruno)!)).toBe(false); // SO_EU
    expect(canSeeHype(s, U.bruno, personById(s, U.bruno)!)).toBe(true);
    expect(canSeeHype(s, U.pessoa, personById(s, U.secretaria)!)).toBe(false); // EMPRESA não tem Hype
  });
});

describe("reações (RF26.CA01/CA02; D-90)", () => {
  it("CURTIR liga e desliga; contador acompanha", () => {
    let s = fresh();
    const before = countersOf(s, task(T.anaEtp)).likes;
    s = ok(react(s, U.pessoa, task(T.anaEtp), "CURTIR", NOW)).state;
    expect(hasLiked(s, task(T.anaEtp), U.pessoa)).toBe(true);
    expect(countersOf(s, task(T.anaEtp)).likes).toBe(before + 1);
    const off = ok(react(s, U.pessoa, task(T.anaEtp), "CURTIR", NOW));
    expect(off.active).toBe(false);
    expect(countersOf(off.state, task(T.anaEtp)).likes).toBe(before);
  });
  it("qualitativa: uma por pessoa e alvo — trocar substitui, repetir remove; CURTIR é independente", () => {
    let s = fresh();
    s = ok(react(s, U.pessoa, task(T.anaEtp), "CURTIR", NOW)).state;
    s = ok(react(s, U.pessoa, task(T.anaEtp), "UTIL", NOW)).state;
    s = ok(react(s, U.pessoa, task(T.anaEtp), "INOVADOR", NOW)).state;
    expect(myQualitative(s, task(T.anaEtp), U.pessoa)).toBe("INOVADOR");
    expect(countersOf(s, task(T.anaEtp)).reactions.UTIL).toBe(0);
    expect(hasLiked(s, task(T.anaEtp), U.pessoa)).toBe(true);
    s = ok(react(s, U.pessoa, task(T.anaEtp), "INOVADOR", NOW)).state;
    expect(myQualitative(s, task(T.anaEtp), U.pessoa)).toBeNull();
  });
  it("reação do dono é AUTO_INTERACAO e não notifica", () => {
    const s = ok(react(fresh(), U.ana, task(T.anaEtp), "CURTIR", NOW)).state;
    expect(s.reactions.at(-1)!.ignoredReason).toBe("AUTO_INTERACAO");
    expect(notificationsFor(s, U.ana)).toHaveLength(0);
  });
});

describe("notificações (RF26.CA09)", () => {
  it("agrupa por tipo + alvo + hora; nova hora abre outra; nunca para si mesmo", () => {
    let s = fresh();
    s = ok(react(s, U.pessoa, task(T.anaEtp), "CURTIR", NOW)).state;
    s = ok(react(s, U.carla, task(T.anaEtp), "CURTIR", LATER)).state;
    let mine = notificationsFor(s, U.ana).filter((n) => n.type === "REACAO");
    expect(mine).toHaveLength(1);
    expect(mine[0]!.payload).toMatchObject({ count: 2, actors: [U.pessoa, U.carla] });
    s = ok(react(s, U.bruno, task(T.anaEtp), "UTIL", NEXT_HOUR)).state;
    mine = notificationsFor(s, U.ana).filter((n) => n.type === "REACAO");
    expect(mine).toHaveLength(2);
    const self = notify(s, { recipientId: U.ana, actorId: U.ana, type: "REACAO", resource: task(T.anaEtp), targetTitle: "x" }, NOW);
    expect(self).toBe(s);
  });
  it("notificação lida não recebe agregação; marcar como lidas só afeta o destinatário", () => {
    let s = ok(react(fresh(), U.pessoa, task(T.anaEtp), "CURTIR", NOW)).state;
    s = markNotificationsRead(s, U.ana, NOW);
    s = ok(react(s, U.carla, task(T.anaEtp), "CURTIR", LATER)).state;
    expect(notificationsFor(s, U.ana).filter((n) => n.type === "REACAO")).toHaveLength(2);
    expect(notificationsFor(s, U.pessoa).some((n) => !n.read)).toBe(true);
  });
});

describe("comentários (RF26.CA03; D-91)", () => {
  it("comenta, responde em 1 nível (resposta a resposta vai para a raiz) e notifica dono, autor e menções", () => {
    let s = fresh();
    const r1 = ok(addComment(s, U.pessoa, task(T.anaEtp), "  Ficou ótimo, @bruno.exemplo veja  ", NOW));
    s = r1.state;
    const c = s.comments.find((x) => x.id === r1.commentId)!;
    expect(c.contentMd).toBe("Ficou ótimo, @bruno.exemplo veja");
    expect(c.mentions).toEqual(["bruno.exemplo"]);
    expect(notificationsFor(s, U.bruno).some((n) => n.type === "MENCAO")).toBe(true);
    expect(notificationsFor(s, U.ana).some((n) => n.type === "COMENTARIO")).toBe(true);
    const reply = ok(addComment(s, U.carla, task(T.anaEtp), "Concordo", LATER, "c-seed-2")); // c-seed-2 já é resposta de c-seed-1
    expect(reply.state.comments.find((x) => x.id === reply.commentId)!.parentCommentId).toBe("c-seed-1");
    expect(notificationsFor(reply.state, U.diego).some((n) => n.type === "COMENTARIO")).toBe(true); // autor da raiz
    const thread = threadOf(reply.state, task(T.anaEtp));
    expect(thread[0]!.replies.map((x) => x.authorId)).toEqual([U.ana, U.carla]);
  });
  it("vazio, longo e alvo invisível são recusados", () => {
    const s = fresh();
    expect(err(addComment(s, U.pessoa, task(T.anaEtp), "   ", NOW))).toBe("COMENTARIO_VAZIO");
    expect(err(addComment(s, U.pessoa, task(T.anaEtp), "x".repeat(COMMENT_MAX + 1), NOW))).toBe("COMENTARIO_LONGO");
    expect(err(addComment(s, U.carla, task(T.anaAta), "oi", NOW))).toBe("ACESSO_NEGADO");
    expect(err(addComment(s, null, task(T.anaEtp), "oi", NOW))).toBe("NAO_AUTENTICADO");
  });
  it("menção a quem não vê o item não notifica; usuário inexistente é ignorado", () => {
    const s = fresh();
    expect(parseMentions(s, "oi @ninguem.aqui e @carla.exemplo, e-mail a@b.com")).toEqual(["carla.exemplo"]);
    const r = ok(addComment(s, U.pessoa, task(T.anaAta), "@carla.exemplo olha", NOW)); // DEPARTAMENTO: Carla não vê
    expect(notificationsFor(r.state, U.carla)).toHaveLength(0);
  });
  it("editar só o autor (grava editedAt); excluir autor ou chefe do departamento, exclusão lógica", () => {
    let s = fresh();
    expect(err(editComment(s, U.pessoa, "c-seed-1", "outra coisa", NOW))).toBe("COMENTARIO_SO_AUTOR");
    s = ok(editComment(s, U.diego, "c-seed-1", "Texto revisto", NOW)).state;
    expect(s.comments.find((x) => x.id === "c-seed-1")).toMatchObject({ contentMd: "Texto revisto", editedAt: NOW.toISOString() });
    expect(canDeleteComment(s, U.pessoa, s.comments.find((x) => x.id === "c-seed-3")!)).toBe(false);
    expect(canDeleteComment(s, U.diego, s.comments.find((x) => x.id === "c-seed-3")!)).toBe(true); // chefe da SECID-UTS
    s = ok(deleteComment(s, U.diego, "c-seed-1")).state;
    expect(s.comments.find((x) => x.id === "c-seed-1")).toMatchObject({ active: false, deletedBy: U.diego });
    expect(threadOf(s, task(T.anaEtp))[0]!.comment.active).toBe(false); // raiz removida fica porque tem resposta
    expect(err(deleteComment(s, U.diego, "c-seed-1"))).toBe("COMENTARIO_REMOVIDO");
    expect(err(editComment(s, U.diego, "c-seed-1", "x", NOW))).toBe("COMENTARIO_REMOVIDO");
    expect(countersOf(s, task(T.anaEtp)).comments).toBe(2);
  });
});

describe("salvar (RF26.CA04, RF6.CA05)", () => {
  it("salva, favorita e remove; lista marca indisponível o alvo que ficou invisível", () => {
    let s = fresh();
    s = ok(toggleSave(s, U.pessoa, task(T.anaEtp), NOW)).state;
    expect(savedOf(s, task(T.anaEtp), U.pessoa)?.favorite).toBe(false);
    s = ok(toggleFavorite(s, U.pessoa, task(T.anaEtp), NOW)).state;
    expect(savedOf(s, task(T.anaEtp), U.pessoa)?.favorite).toBe(true);
    s = ok(toggleSave(s, U.pessoa, task(T.anaEtp), NOW)).state;
    expect(savedOf(s, task(T.anaEtp), U.pessoa)).toBeUndefined();
    const list = savedListOf(s, U.pessoa, "TASK");
    expect(list.find((x) => x.saved.targetId === "t-carla-interna")?.available).toBe(false);
    expect(ok(toggleSave(s, U.pessoa, task("t-carla-interna"), NOW)).saved).toBe(false); // remover vale mesmo indisponível
    expect(err(toggleSave(s, U.carla, task(T.anaPlanilha), NOW))).toBe("ACESSO_NEGADO");
  });
  it("favoritar algo não salvo salva já como favorito", () => {
    const s = ok(toggleFavorite(fresh(), U.pessoa, task(T.anaEtp), NOW)).state;
    expect(savedOf(s, task(T.anaEtp), U.pessoa)).toMatchObject({ favorite: true });
  });
});

describe("compartilhar (RF26.CA05; D-94)", () => {
  it("Mural cria Share + MuralEntry COMPARTILHAMENTO na empresa do ator", () => {
    const r = ok(share(fresh(), U.pessoa, task(T.anaEtp), "MURAL", NOW));
    expect(r.state.shares.at(-1)).toMatchObject({ channel: "MURAL", actorId: U.pessoa });
    expect(r.state.mural[0]).toMatchObject({ kind: "COMPARTILHAMENTO", companyId: "c-secretaria", targetId: T.anaEtp, actorId: U.pessoa });
    expect(countersOf(r.state, task(T.anaEtp)).shares).toBe(2);
  });
  it("sessão DECIA exige sessão existente; link externo tem token e validade (máx. 30 dias)", () => {
    const s = fresh();
    expect(err(share(s, U.pessoa, task(T.anaEtp), "SESSAO_DECIA", NOW))).toBe("SESSAO_OBRIGATORIA");
    expect(ok(share(s, U.pessoa, task(T.anaEtp), "SESSAO_DECIA", NOW, { sessionId: "s-orcamento-2027" })).state.shares.at(-1)!.sessionId).toBe("s-orcamento-2027");
    const link = ok(share(s, U.pessoa, task(T.anaEtp), "LINK_EXTERNO", NOW, { expiresInDays: 90 }));
    expect(link.link).toMatch(/^\/s\/demo[0-9a-f]{8}$/);
    expect(link.state.shares.at(-1)!.expiresAt).toBe(new Date(NOW.getTime() + 30 * 86_400_000).toISOString());
  });
  it("classificação e visibilidade limitam os canais", () => {
    const s = fresh();
    const sig = item(s, task(T.anaSigiloso));
    expect(shareChannelPermission(s, U.pessoa, sig, "MURAL")).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    expect(shareChannelPermission(s, U.pessoa, sig, "SESSAO_DECIA")).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    const internal = item(s, task(T.anaPlanilha)); // EMPRESA/INTERNO
    expect(shareChannelPermission(s, U.pessoa, internal, "MURAL").ok).toBe(true);
    expect(shareChannelPermission(s, U.pessoa, internal, "LINK_EXTERNO")).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    expect(shareChannelPermission(s, U.pessoa, item(s, task(T.pessoaCronograma)), "MURAL")).toEqual({ ok: false, reason: "NAO_PUBLICO" });
    expect(shareChannelPermission(s, U.pessoa, item(s, proj(P.chefeSede)), "LINK_EXTERNO")).toEqual({ ok: false, reason: "NAO_PUBLICO" });
  });
});

describe("remixar (RF26.CA06; D-92)", () => {
  it("cria cópia no meu Acervo com crédito, RASCUNHO/PRIVADA, sem contadores; origem reuseCount+1; Remix e notificação", () => {
    const s0 = fresh();
    const r = ok(remix(s0, U.pessoa, task(T.anaEtp), NOW));
    const copy = taskById(r.state, r.resultId)!;
    expect(copy).toMatchObject({ ownerId: U.pessoa, originalTaskId: T.anaEtp, state: "RASCUNHO", visibility: "PRIVADA", title: taskById(s0, T.anaEtp)!.title, seals: [], dueAt: null, accessClass: "PUBLICO" });
    expect(countersOf(r.state, task(copy.id))).toMatchObject({ likes: 0, comments: 0, saves: 0 });
    expect(taskById(r.state, T.anaEtp)!.reuseCount).toBe(taskById(s0, T.anaEtp)!.reuseCount + 1);
    expect(r.state.remixes.at(-1)).toMatchObject({ actorId: U.pessoa, sourceId: T.anaEtp, resultId: copy.id, sourceType: "TASK", resultType: "TASK" });
    expect(notificationsFor(r.state, U.ana).some((n) => n.type === "REMIX")).toBe(true);
    expect(profileTasks(r.state, U.pessoa, U.pessoa).map((t) => t.id)).toContain(copy.id);
    expect(remixedByCount(r.state, task(T.anaEtp))).toBe(1);
  });
  it("remix de remix mantém a cadeia e credita o autor do original", () => {
    const r = ok(remix(fresh(), U.pessoa, task(T.brunoRemix), NOW));
    expect(remixChain(r.state, task(r.resultId)).map((x) => x.id)).toEqual([T.brunoRemix, T.anaOficioIa]);
    expect(notificationsFor(r.state, U.bruno).some((n) => n.type === "REMIX")).toBe(true);
    expect(notificationsFor(r.state, U.ana).some((n) => n.type === "REMIX" && n.resourceId === T.anaOficioIa)).toBe(true);
  });
  it("SIGILOSO/RESTRITO nunca; próprio item, DEPARTAMENTO, visitante e invisível também não", () => {
    const s = fresh();
    expect(remixPermission(s, U.pessoa, item(s, task(T.anaSigiloso)))).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    expect(remixPermission(s, U.bruno, item(s, task(T.pessoaProtocolo)))).toEqual({ ok: false, reason: "ACESSO_NEGADO" }); // CPOE não vê
    expect(remixPermission(s, U.ana, item(s, task(T.pessoaProtocolo)))).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" }); // RESTRITO
    expect(remixPermission(s, U.ana, item(s, task(T.anaEtp)))).toEqual({ ok: false, reason: "PROPRIO_ITEM" });
    expect(remixPermission(s, U.pessoa, item(s, task(T.anaAta)))).toEqual({ ok: false, reason: "NAO_PUBLICO" });
    expect(remixPermission(s, null, item(s, task(T.anaEtp)))).toEqual({ ok: false, reason: "NAO_AUTENTICADO" });
    expect(err(remix(s, U.pessoa, task(T.anaSigiloso), NOW))).toBe("CLASSIFICACAO_RESTRITA");
  });
  it("projeto: cópia com origin REMIX e originalProjectId", () => {
    const r = ok(remix(fresh(), U.pessoa, proj(P.anaMobilidade), NOW));
    const p = r.state.projects.find((x) => x.id === r.resultId)!;
    expect(p).toMatchObject({ origin: "REMIX", originalProjectId: P.anaMobilidade, ownerId: U.pessoa, status: "RASCUNHO", visibility: "PRIVADA" });
  });
});

describe("seguir (RF14.CA04; idempotente e reativável)", () => {
  it("ATIVO → REMOVIDO → ATIVO no mesmo registro; contador acompanha", () => {
    let s = fresh();
    const before = followersCount(s, "USER", U.bruno);
    const on = ok(toggleFollow(s, U.pessoa, "USER", U.bruno, NOW));
    expect(on.following).toBe(true);
    s = on.state;
    const id = s.follows.at(-1)!.id;
    s = ok(toggleFollow(s, U.pessoa, "USER", U.bruno, NOW)).state;
    expect(s.follows.find((f) => f.id === id)!.status).toBe("REMOVIDO");
    expect(followersCount(s, "USER", U.bruno)).toBe(before);
    s = ok(toggleFollow(s, U.pessoa, "USER", U.bruno, NOW)).state;
    expect(s.follows.filter((f) => f.followerId === U.pessoa && f.targetId === U.bruno)).toHaveLength(1);
    expect(isFollowing(s, U.pessoa, "USER", U.bruno)).toBe(true);
  });
  it("não segue a si mesmo; visitante precisa entrar; alvo inexistente é 404", () => {
    const s = fresh();
    expect(err(toggleFollow(s, U.pessoa, "USER", U.pessoa, NOW))).toBe("SEGUIR_A_SI");
    expect(err(toggleFollow(s, null, "DEPARTMENT", "d-cpoe", NOW))).toBe("NAO_AUTENTICADO");
    expect(err(toggleFollow(s, U.pessoa, "COMPANY", "c-x", NOW))).toBe("NAO_ENCONTRADO");
    expect(ok(toggleFollow(s, U.pessoa, "COMPANY", "c-secretaria", NOW)).following).toBe(true);
  });
});

describe("delegar / atribuir (RF18.CA03–CA06; Assignment V20; D-92)", () => {
  const base: Assignment = {
    id: "a", targetType: "TASK", targetId: "t", fromUserId: U.chefe, toUserId: U.pessoa, origin: "BOTAO_ESQUEMA", status: "PROPOSTA", dueAt: null,
    message: null, reason: null, previousResponsibleId: U.chefe, traceNodeId: null, respondedAt: null, createdAt: NOW.toISOString(),
  };
  it("máquina de estados espelha AssignmentStatus do Java", () => {
    const all: AssignmentStatus[] = ["PROPOSTA", "ACEITA", "RECUSADA", "DEVOLVIDA"];
    const allowed = all.flatMap((f) => all.filter((t) => canTransition(f, t)).map((t) => `${f}>${t}`));
    expect(allowed).toEqual(["PROPOSTA>ACEITA", "PROPOSTA>RECUSADA", "ACEITA>DEVOLVIDA"]);
  });
  it("respond: mesma ordem de erros do Assignment.respond do Java", () => {
    expect(respond(base, U.ana, "ACEITA", null, NOW)).toEqual({ ok: false, error: "ACESSO_NEGADO" });
    expect(respond({ ...base, status: "ACEITA" }, U.pessoa, "RECUSADA", "x", NOW)).toEqual({ ok: false, error: "ATRIBUICAO_JA_RESPONDIDA" });
    expect(respond(base, U.pessoa, "DEVOLVIDA", "motivo", NOW)).toEqual({ ok: false, error: "ATRIBUICAO_TRANSICAO_INVALIDA" });
    expect(respond({ ...base, status: "RECUSADA" }, U.pessoa, "DEVOLVIDA", "motivo", NOW)).toEqual({ ok: false, error: "ATRIBUICAO_TRANSICAO_INVALIDA" });
    expect(respond(base, U.pessoa, "RECUSADA", "  ", NOW)).toEqual({ ok: false, error: "MOTIVO_OBRIGATORIO" });
    const r = respond(base, U.pessoa, "ACEITA", null, NOW);
    expect(r.ok && r.assignment).toMatchObject({ status: "ACEITA", respondedAt: NOW.toISOString() });
  });
  it("delegar cria PROPOSTA (BOTAO_ESQUEMA), previousResponsibleId e UMA notificação ao destinatário", () => {
    const r = ok(delegate(fresh(), U.pessoa, task(T.pessoaCronograma), { toUserId: U.chefe, message: "Pode revisar?", dueAt: "2026-10-10" }, NOW));
    const a = r.state.assignments.find((x) => x.id === r.assignmentId)!;
    expect(a).toMatchObject({ status: "PROPOSTA", origin: "BOTAO_ESQUEMA", fromUserId: U.pessoa, toUserId: U.chefe, previousResponsibleId: U.pessoa, message: "Pode revisar?", dueAt: "2026-10-10" });
    expect(notificationsFor(r.state, U.chefe).filter((n) => n.type === "ATRIBUICAO_PROPOSTA")).toHaveLength(1);
    expect(canView(r.state, U.chefe, item(r.state, task(T.pessoaCronograma)))).toBe(true); // PRIVADA, mas é destinatário
    // a mesma pessoa de novo → 409, e sem segunda notificação
    expect(err(delegate(r.state, U.pessoa, task(T.pessoaCronograma), { toUserId: U.chefe }, NOW))).toBe("ATRIBUICAO_DUPLICADA");
  });
  it("chefe delegando a membro do seu departamento usa origem MINHA_EQUIPE (RF10)", () => {
    const r = ok(delegate(fresh(), U.chefe, task("t-chefe-email"), { toUserId: U.bruno }, NOW));
    expect(r.state.assignments.find((x) => x.id === r.assignmentId)!.origin).toBe("MINHA_EQUIPE");
  });
  it("guardas: a si mesmo, outra empresa, institucional, já responsável, fechado, SIGILOSO, prazo passado, mensagem longa", () => {
    const s = fresh();
    const it2 = item(s, task(T.pessoaCronograma));
    expect(recipientPermission(s, U.pessoa, it2, U.pessoa)).toEqual({ ok: false, reason: "AUTO_ATRIBUICAO" });
    expect(recipientPermission(s, U.pessoa, it2, U.carla)).toEqual({ ok: false, reason: "EMPRESA_DIFERENTE" });
    expect(recipientPermission(s, U.pessoa, it2, U.secretaria)).toEqual({ ok: false, reason: "DESTINATARIO_INSTITUCIONAL" });
    expect(recipientPermission(s, U.chefe, item(s, task(T.diegoChecklist)), U.pessoa).ok).toBe(false);
    expect(recipientPermission(s, U.pessoa, item(s, task(T.pessoaProtocolo)), U.chefe)).toEqual({ ok: false, reason: "DESTINATARIO_SEM_ACESSO" }); // RESTRITO, CPOE
    expect(delegatePermission(s, U.pessoa, item(s, task(T.anaPlanilha)))).toEqual({ ok: false, reason: "ESTADO_INVALIDO" }); // CONCLUIDA
    expect(delegatePermission(s, U.pessoa, item(s, task(T.anaSigiloso)))).toEqual({ ok: false, reason: "CLASSIFICACAO_RESTRITA" });
    expect(delegatePermission(s, U.pessoa, item(s, task("t-carla-mapa")))).toEqual({ ok: false, reason: "EMPRESA_DIFERENTE" });
    expect(delegatePermission(s, null, item(s, task(T.anaEtp)))).toEqual({ ok: false, reason: "NAO_AUTENTICADO" });
    expect(delegatePermission(s, U.pessoa, item(s, task(T.anaEtp))).ok).toBe(true); // RF18.CA03: qualquer um que vê, mesma empresa
    expect(err(delegate(s, U.pessoa, task(T.pessoaCronograma), { toUserId: U.chefe, dueAt: "2026-10-01" }, NOW))).toBe("PRAZO_INVALIDO");
    expect(err(delegate(s, U.pessoa, task(T.pessoaCronograma), { toUserId: U.chefe, message: "x".repeat(1001) }, NOW))).toBe("MENSAGEM_LONGA");
  });
  it("candidatos: mesma empresa, sem institucionais, sem o próprio; busca por nome, @usuário e sigla", () => {
    const s = fresh();
    const ids = delegateCandidates(s, U.pessoa).map((p) => p.id);
    expect(ids).not.toContain(U.pessoa);
    expect(ids).not.toContain(U.carla);
    expect(ids).not.toContain(U.secretaria);
    expect(delegateCandidates(s, U.pessoa, "@chefe").map((p) => p.id)).toEqual([U.chefe]);
    expect(delegateCandidates(s, U.pessoa, "cpoe").map((p) => p.id).sort()).toEqual([U.bruno, U.chefe, U.curadoria].sort());
  });
  it("aceitar passa o responsável (DISPONIVEL → EM_USO) e entra no Acervo do destinatário; recusar exige motivo", () => {
    let s = ok(delegate(fresh(), U.pessoa, task(T.pessoaCronograma), { toUserId: U.chefe }, NOW)).state;
    const id = s.assignments[0]!.id;
    expect(err(respondToAssignment(s, U.pessoa, id, "ACEITA", null, NOW))).toBe("ACESSO_NEGADO");
    expect(err(respondToAssignment(s, U.chefe, id, "RECUSADA", "", NOW))).toBe("MOTIVO_OBRIGATORIO");
    s = ok(respondToAssignment(s, U.chefe, id, "ACEITA", null, LATER)).state;
    expect(taskById(s, T.pessoaCronograma)).toMatchObject({ responsibleId: U.chefe, state: "EM_USO", ownerId: U.pessoa });
    expect(profileTasks(s, U.chefe, U.chefe).map((t) => t.id)).toContain(T.pessoaCronograma);
    expect(notificationsFor(s, U.pessoa).filter((n) => n.type === "ATRIBUICAO_ACEITA")).toHaveLength(1);
    expect(err(respondToAssignment(s, U.chefe, id, "ACEITA", null, LATER))).toBe("ATRIBUICAO_JA_RESPONDIDA");
  });
  it("retornar (DEVOLVIDA): só com ACEITA, motivo ≥ 20, responsável volta ao anterior", () => {
    let s = fresh();
    expect(giveBackPermission(s, U.chefe, task(T.diegoChecklist))).toEqual({ ok: false, reason: "SEM_ATRIBUICAO" });
    expect(err(giveBack(s, U.pessoa, task(T.diegoChecklist), "curto", NOW))).toBe("MOTIVO_OBRIGATORIO");
    s = ok(giveBack(s, U.pessoa, task(T.diegoChecklist), "Sem agenda até o fim do mês, por favor reatribuir.", NOW)).state;
    expect(s.assignments.find((a) => a.id === "a-seed-2")).toMatchObject({ status: "DEVOLVIDA", reason: "Sem agenda até o fim do mês, por favor reatribuir." });
    expect(taskById(s, T.diegoChecklist)!.responsibleId).toBe(U.diego);
    expect(notificationsFor(s, U.diego).filter((n) => n.type === "ATRIBUICAO_DEVOLVIDA")).toHaveLength(1);
    expect(GIVE_BACK_MIN).toBe(20);
  });
  it("recusar não muda o responsável; 'Delegadas a mim' ordena abertas primeiro", () => {
    let s = fresh();
    s = ok(respondToAssignment(s, U.pessoa, "a-seed-1", "RECUSADA", "Estou de férias", NOW)).state;
    expect(taskById(s, T.chefeDesenho)!.responsibleId).toBeNull();
    expect(assignmentsTo(s, U.pessoa).map((a) => a.status)).toEqual(["ACEITA", "RECUSADA"]);
  });
});

describe("Mural (RF27.CA01/CA02/CA04/CA06)", () => {
  const s = fresh();
  it("empresa: só alvos visíveis (a entrada EMPRESA de outra empresa some); visitante vê só públicos", () => {
    const ids = muralFeed(s, U.pessoa, "empresa").map((e) => e.id);
    expect(ids).not.toContain("m-seed-7");
    expect(ids).toContain("m-seed-6"); // projeto PUBLICA de outra empresa
    expect(muralFeed(s, null, "empresa").every((e) => ["m-seed-1", "m-seed-2", "m-seed-3", "m-seed-5", "m-seed-6"].includes(e.id))).toBe(true);
  });
  it("vitrine = projetos publicados; seguindo = pessoas/departamentos seguidos", () => {
    expect(muralFeed(s, U.pessoa, "vitrine").every((e) => e.kind === "PROJETO_PUBLICADO")).toBe(true);
    const following = muralFeed(s, U.pessoa, "seguindo").map((e) => e.actorId);
    expect(new Set(following)).toEqual(new Set([U.ana, U.chefe])); // segue Ana e a CPOE
    expect(muralFeed(s, null, "seguindo")).toEqual([]);
  });
});

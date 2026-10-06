// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { buildDemoSocial, DEMO_TASK_IDS as T, DEMO_USERS as U } from "@/lib/social/fixtures";
import { pageByRoute } from "@/lib/pages/registry";
import { createMemoryRepository } from "@/lib/social/repository";
import { taskById } from "@/lib/social/rules";
import type { ViewerId } from "@/lib/social/types";
import { toTaskCardViewModel } from "@/lib/social/view-model";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import { AssignmentInbox, CommentThread, FollowButton, ProfileView, ShareSheet, SocialScope, TaskSchemeCard, useSocial, type TaskCardLayout } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-10-06T12:00:00Z");
function setup(viewer: ViewerId = U.pessoa) {
  const repo = createMemoryRepository(buildDemoSocial(NOW));
  const render = (ui: ReactElement, profile: ViewerProfile = "EMPREGADO") =>
    renderWithProviders(<SocialScope repo={repo} viewerId={viewer} now={NOW}>{ui}</SocialScope>, { profile });
  return { repo, render };
}

/** Card que relê o estado do repositório (como as páginas fazem). */
function LiveCard({ id, layout = "compact" }: { id: string; layout?: TaskCardLayout }) {
  const { state, viewerId, now } = useSocial();
  return <TaskSchemeCard vm={toTaskCardViewModel(state, viewerId, taskById(state, id)!, now)} layout={layout} />;
}

const bar = () => within(screen.getByTestId("social-bar"));

describe("TaskSchemeCard — layouts e estados (ANATOMIA_CARDS §3)", () => {
  it.each(["compact", "list", "expanded", "attachment", "mini"] as const)("layout %s: título como link, tipo e estado em texto", (layout) => {
    const { render } = setup();
    render(<LiveCard id={T.anaEtp} layout={layout} />);
    const card = screen.getByTestId("task-card");
    expect(card.getAttribute("data-layout")).toBe(layout);
    expect(screen.getByRole("link", { name: /Estudo técnico preliminar — calçadas/ }).getAttribute("href")).toBe(`/tasks/${T.anaEtp}`);
    expect(card.getAttribute("aria-label")).toContain("Disponível");
    if (layout !== "mini" && layout !== "attachment") expect(screen.getByTestId("social-bar")).toBeTruthy();
    else expect(screen.queryByTestId("social-bar")).toBeNull();
  });
  it("faísca ✦ com aria-label, lacre, carimbo CONCLUÍDA, rascunho tracejado, crédito de remix", () => {
    const { render } = setup();
    const { unmount } = render(<><LiveCard id={T.brunoRemix} /><LiveCard id={T.anaEtp} /></>);
    expect(screen.getAllByRole("img", { name: "Gerado com IA" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Chancela do departamento: SECID-UTS" })).toBeTruthy();
    expect(screen.getByTestId("credit-line").textContent).toContain("remix de Ana Exemplo");
    unmount();
    const { render: r2 } = setup(U.ana);
    r2(<><LiveCard id={T.anaPlanilha} /><LiveCard id={T.anaPrivada} /></>);
    expect(screen.getAllByTestId("stamp")[0]!.textContent).toBe("Concluída");
    const draft = screen.getAllByTestId("task-card")[1]!;
    expect(draft.className).toContain("border-dashed");
    expect(draft.getAttribute("data-variant")).toContain("RASCUNHO");
  });
  it("prazo vencido em texto (nunca só cor)", () => {
    const { render } = setup();
    render(<LiveCard id={T.pessoaRelatorio} />);
    expect(screen.getByText(/vencido:/)).toBeTruthy();
  });
});

describe("SocialBar (RF18.CA01, RF26)", () => {
  it("curtir alterna aria-pressed e o contador", () => {
    const { render } = setup();
    render(<LiveCard id={T.anaEtp} />);
    const like = bar().getByTestId("action-like");
    expect(like.getAttribute("aria-pressed")).toBe("false");
    expect(like.textContent).toContain("Curtir (2)");
    fireEvent.click(like);
    expect(bar().getByTestId("action-like").getAttribute("aria-pressed")).toBe("true");
    expect(bar().getByTestId("action-like").textContent).toContain("Curtir (3)");
  });
  it("remixar SIGILOSO fica desabilitado COM motivo e não abre o diálogo", async () => {
    const { render } = setup();
    render(<LiveCard id={T.anaSigiloso} />);
    const remix = bar().getByRole("button", { name: /Remixar/ });
    expect(remix.getAttribute("aria-disabled")).toBe("true");
    expect(remix.textContent).toContain("classificação RESTRITO ou SIGILOSO");
    expect(remix.getAttribute("title")).toContain("SIGILOSO");
    fireEvent.click(remix);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((await screen.findAllByText(/classificação RESTRITO ou SIGILOSO não permite/)).length).toBeGreaterThan(1);
  });
  it("visitante: ações pedem login", () => {
    const { render } = setup(null);
    render(<LiveCard id={T.anaEtp} />);
    expect(bar().getByTestId("action-like").getAttribute("aria-disabled")).toBe("true");
    expect(bar().getByTestId("action-like").textContent).toContain("Entre na sua conta");
  });
  it("remixar cria a cópia com crédito e oferece ir ao Acervo", () => {
    const { render, repo } = setup();
    render(<LiveCard id={T.anaEtp} />);
    fireEvent.click(bar().getByTestId("action-remix"));
    const dialog = screen.getByRole("dialog", { name: /Remixar/ });
    expect(within(dialog).getByTestId("remix-copies").textContent).toContain("título");
    expect(within(dialog).getByRole("link", { name: "Ana Exemplo" })).toBeTruthy();
    fireEvent.click(within(dialog).getByTestId("remix-confirm"));
    const copy = repo.snapshot().tasks.find((t) => t.originalTaskId === T.anaEtp && t.ownerId === U.pessoa);
    expect(copy).toMatchObject({ state: "RASCUNHO", visibility: "PRIVADA" });
    expect(within(screen.getByRole("dialog")).getByTestId("remix-go-acervo").getAttribute("href")).toBe("/profile?tab=acervo");
  });
  it("salvar alterna e mostra o estado em texto", () => {
    const { render } = setup();
    render(<LiveCard id={T.anaEtp} layout="expanded" />);
    fireEvent.click(bar().getByTestId("action-save"));
    expect(bar().getByTestId("action-save").textContent).toContain("Salvo");
    expect(bar().getByTestId("action-favorite")).toBeTruthy();
  });
  it("reação qualitativa pelo seletor (layout ampliado)", () => {
    const { render, repo } = setup();
    render(<LiveCard id={T.anaEtp} layout="expanded" />);
    fireEvent.click(bar().getByTestId("action-react"));
    fireEvent.click(screen.getByTestId("reaction-UTIL"));
    expect(repo.snapshot().reactions.some((r) => r.actorId === U.pessoa && r.reactionType === "UTIL" && r.targetId === T.anaEtp)).toBe(true);
  });
});

describe("CommentThread (RF26.CA03)", () => {
  it("comenta, responde e exclui o próprio (exclusão lógica)", () => {
    const { render, repo } = setup();
    render(<CommentThread target={{ type: "TASK", id: T.anaEtp }} />);
    expect(screen.getByRole("heading", { name: "Comentários (3)" })).toBeTruthy();
    fireEvent.change(screen.getByTestId("comment-new-text"), { target: { value: "Muito bom, @ana.exemplo!" } });
    fireEvent.click(screen.getByTestId("comment-new-submit"));
    expect(screen.getByRole("heading", { name: "Comentários (4)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "@ana.exemplo" }).getAttribute("href")).toBe("/u/ana.exemplo");
    const mine = screen.getAllByTestId("comment").find((c) => c.textContent?.includes("Muito bom"))!;
    fireEvent.click(within(mine).getByTestId("comment-delete"));
    expect(repo.snapshot().comments.find((c) => c.contentMd.startsWith("Muito bom"))).toMatchObject({ active: false, deletedBy: U.pessoa });
    const first = screen.getAllByTestId("comment")[0]!;
    fireEvent.click(within(first).getByTestId("comment-reply"));
    fireEvent.change(screen.getByTestId("comment-reply-form-text"), { target: { value: "Concordo com o Diego" } });
    fireEvent.click(screen.getByTestId("comment-reply-form-submit"));
    expect(repo.snapshot().comments.at(-1)).toMatchObject({ parentCommentId: "c-seed-1", authorId: U.pessoa });
  });
  it("estado vazio e limite de caracteres desabilita o envio", () => {
    const { render } = setup();
    render(<CommentThread target={{ type: "TASK", id: T.pessoaLink }} />);
    expect(screen.getByText("Nenhum comentário ainda")).toBeTruthy();
    const submit = screen.getByTestId("comment-new-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("comment-new-text"), { target: { value: "x".repeat(1001) } });
    expect(submit.disabled).toBe(true);
    expect(screen.getByText(/1\.?001\/1\.?000 caracteres/)).toBeTruthy();
  });
});

describe("ShareSheet (RF26.CA05)", () => {
  it("canais do ShareChannel; Mural cria a entrada; SIGILOSO mostra o motivo", () => {
    const { render, repo } = setup();
    const vm = toTaskCardViewModel(repo.snapshot(), U.pessoa, taskById(repo.snapshot(), T.anaEtp)!, NOW);
    const { unmount } = render(<ShareSheet open onOpenChange={() => {}} vm={vm} />);
    for (const c of ["MURAL", "SESSAO_DECIA", "LINK_EXTERNO"]) expect(screen.getByTestId(`share-channel-${c}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId("share-link"));
    expect((screen.getByTestId("share-link-value") as HTMLInputElement).value).toMatch(/^\/s\/demo/);
    fireEvent.click(screen.getByTestId("share-mural"));
    expect(repo.snapshot().mural[0]).toMatchObject({ kind: "COMPARTILHAMENTO", actorId: U.pessoa, targetId: T.anaEtp });
    unmount();
    const sig = toTaskCardViewModel(repo.snapshot(), U.pessoa, taskById(repo.snapshot(), T.anaSigiloso)!, NOW);
    render(<ShareSheet open onOpenChange={() => {}} vm={sig} />);
    expect(screen.getByTestId("share-reason-MURAL").textContent).toContain("SIGILOSO");
    expect(screen.queryByTestId("share-mural")).toBeNull();
  });
});

describe("FollowButton (RF14.CA04)", () => {
  it("Seguir ⇄ Seguindo com aria-pressed; não aparece no próprio perfil", () => {
    const { render } = setup();
    const { unmount } = render(<FollowButton targetType="USER" targetId={U.bruno} name="Bruno Exemplo" />);
    const b = screen.getByTestId("follow-button");
    expect(b.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(b);
    expect(screen.getByTestId("follow-button").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("follow-button").textContent).toContain("Seguindo");
    unmount();
    render(<FollowButton targetType="USER" targetId={U.pessoa} name="Pessoa" />);
    expect(screen.queryByTestId("follow-button")).toBeNull();
  });
});

describe("Delegar (RF18.CA03–CA05)", () => {
  it("diálogo: busca, pessoa sem acesso desabilitada com motivo, cria PROPOSTA e notifica", () => {
    const { render, repo } = setup();
    render(<LiveCard id={T.pessoaCronograma} layout="expanded" />);
    fireEvent.click(bar().getByTestId("action-delegate"));
    const dialog = screen.getByTestId("delegate-dialog");
    fireEvent.change(within(dialog).getByTestId("delegate-search"), { target: { value: "carla" } });
    expect(within(dialog).getByText("Ninguém encontrado com esse termo.")).toBeTruthy(); // outra empresa nem aparece
    fireEvent.change(within(dialog).getByTestId("delegate-search"), { target: { value: "@chefe" } });
    fireEvent.click(within(dialog).getByRole("option", { name: /Chefe Exemplo/ }));
    fireEvent.change(within(dialog).getByTestId("delegate-message"), { target: { value: "Revisa as datas?" } });
    fireEvent.click(within(dialog).getByTestId("delegate-confirm"));
    const a = repo.snapshot().assignments[0]!;
    expect(a).toMatchObject({ status: "PROPOSTA", toUserId: U.chefe, fromUserId: U.pessoa, message: "Revisa as datas?", origin: "BOTAO_ESQUEMA" });
    expect(repo.snapshot().notifications.filter((n) => n.recipientId === U.chefe && n.type === "ATRIBUICAO_PROPOSTA")).toHaveLength(1);
    expect(screen.getByTestId("delegation-line").textContent).toContain("Delegada a Chefe Exemplo · aguardando");
  });
  it("RESTRITO: colega de outro departamento aparece desabilitado com o motivo", () => {
    const { render } = setup();
    render(<LiveCard id={T.pessoaProtocolo} layout="expanded" />);
    fireEvent.click(bar().getByTestId("action-delegate"));
    const opt = within(screen.getByTestId("delegate-dialog")).getByRole("option", { name: /Bruno Exemplo/ });
    expect(opt.getAttribute("aria-disabled")).toBe("true");
    expect(opt.textContent).toContain("fora do departamento");
  });
  it("Delegadas a mim: aceitar; recusar exige motivo; devolver exige ≥ 20", async () => {
    const { render, repo } = setup();
    render(<AssignmentInbox />);
    const pending = () => screen.getAllByTestId("assignment-row").find((r) => r.getAttribute("data-assignment-id") === "a-seed-1")!;
    fireEvent.click(within(pending()).getByTestId("assignment-refuse"));
    fireEvent.click(screen.getByTestId("refuse-dialog-confirm"));
    expect(await screen.findByText("Escreva pelo menos 1 caracteres.")).toBeTruthy();
    expect(repo.snapshot().assignments.find((a) => a.id === "a-seed-1")!.status).toBe("PROPOSTA");
    await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }); });
    fireEvent.click(within(pending()).getByTestId("assignment-accept"));
    expect(repo.snapshot().assignments.find((a) => a.id === "a-seed-1")!.status).toBe("ACEITA");
    expect(repo.snapshot().tasks.find((t) => t.id === T.chefeDesenho)!.responsibleId).toBe(U.pessoa);
    const accepted = screen.getAllByTestId("assignment-row").find((r) => r.getAttribute("data-assignment-id") === "a-seed-2")!;
    fireEvent.click(within(accepted).getByTestId("assignment-return"));
    fireEvent.change(screen.getByTestId("return-dialog-text"), { target: { value: "curto demais" } });
    fireEvent.click(screen.getByTestId("return-dialog-confirm"));
    expect(repo.snapshot().assignments.find((a) => a.id === "a-seed-2")!.status).toBe("ACEITA");
    fireEvent.change(screen.getByTestId("return-dialog-text"), { target: { value: "Sem agenda neste mês, por favor reatribuir." } });
    fireEvent.click(screen.getByTestId("return-dialog-confirm"));
    expect(repo.snapshot().assignments.find((a) => a.id === "a-seed-2")).toMatchObject({ status: "DEVOLVIDA" });
  });
});

describe("ProfileView — sub-abas por viewer (Matriz B)", () => {
  const profileTabs = () => within(screen.getAllByRole("tablist")[0]!).getAllByRole("tab");
  const tabNames = () => profileTabs().map((t) => t.textContent);
  it("dono vê Acervo, Projetos, salvos, Delegadas a mim e contadores com DP", () => {
    const { render } = setup();
    render(<ProfileView page={pageByRoute("/profile")!} />);
    expect(tabNames()).toEqual(expect.arrayContaining(["Acervo de Tarefas", "Projetos salvos", "Tarefas salvas"]));
    expect(screen.getByTestId("assignment-inbox")).toBeTruthy();
    expect(within(screen.getByTestId("profile-counters")).getByText("1.240")).toBeTruthy();
    expect(screen.getByTestId("tab-acervo")).toBeTruthy();
  });
  it("terceiro vê só 1–5, Seguir e itens filtrados; DP oculto", () => {
    const { render } = setup(U.carla);
    render(<ProfileView page={pageByRoute("/u/[username]")!} username="ana.exemplo" />);
    expect(profileTabs()).toHaveLength(5);
    expect(tabNames()).not.toContain("Tarefas salvas");
    expect(screen.getByTestId("follow-button")).toBeTruthy();
    expect(screen.getAllByTestId("task-card")).toHaveLength(2); // Carla (outra empresa) só vê as PUBLICA
    expect(screen.queryByTestId("assignment-inbox")).toBeNull();
    expect(within(screen.getByTestId("profile-counters")).getAllByText("oculto para você").length).toBeGreaterThan(0);
  });
  it("institucional: chefe e empresa com etiqueta e atalho; EMPRESA sem a sub-aba 5", () => {
    const { render } = setup();
    const { unmount } = render(<ProfileView page={pageByRoute("/u/[username]")!} username="chefe.exemplo" />);
    expect(screen.getByText("Chefe de CPOE")).toBeTruthy();
    expect(screen.getByTestId("institutional-link").getAttribute("href")).toBe("/departments/cpoe");
    unmount();
    render(<ProfileView page={pageByRoute("/u/[username]")!} username="secretaria.exemplo" />);
    expect(screen.getByTestId("institutional-link").getAttribute("href")).toBe("/companies/secretaria-exemplo");
    expect(profileTabs()).toHaveLength(4);
    expect(within(screen.getByTestId("profile-counters")).queryByText(/Pontos|Points/)).toBeNull();
  });
});


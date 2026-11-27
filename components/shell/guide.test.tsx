// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { pageByRoute } from "@/lib/pages/registry";
import { AppShell } from "./AppShell";
import { NavGroups } from "./SidebarNav";
import { PageHeader } from "./PageHeader";
import { RfPage } from "./RfPage";

/**
 * Modo produto × laboratório (auditoria "Informação e guia da interface"): jargão só no laboratório, "Em breve" textual no menu e
 * na página, faixa de modo demonstração e ajuda "?" por tela.
 */
const state = vi.hoisted(() => ({ lab: false, pathname: "/mural" }));
vi.mock("@/lib/nav/labView", () => ({ useLabView: () => state.lab }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
}));

beforeEach(() => { state.lab = false; state.pathname = "/mural"; });

describe("RfPage no modo produto", () => {
  it("sem chips de RF, CAs, célula de acesso nem nota de matriz; vazio das sub-abas em linguagem de usuário", async () => {
    renderWithProviders(<RfPage page={pageByRoute("/search")!} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Buscar");
    expect(screen.queryByText("RF27")).toBeNull();
    expect(screen.queryByRole("heading", { name: "O que esta aba vai fazer" })).toBeNull();
    expect(screen.queryByText(/visível/)).toBeNull();
    expect(screen.queryByText(/Matriz A/)).toBeNull();
    expect(await screen.findByRole("tablist")).toBeTruthy();
    expect(screen.getByText(/Esta parte ainda está em construção/)).toBeTruthy();
  });

  it("rota esqueleto: vazio orientado 'Em breve: …' com o que fazer enquanto isso e link útil", () => {
    renderWithProviders(<RfPage page={pageByRoute("/insights")!} />);
    const soon = screen.getByTestId("coming-soon");
    expect(within(soon).getByText("Em breve: o painel de insights")).toBeTruthy();
    expect(within(soon).getByText(/Enquanto isso/)).toBeTruthy();
    expect(within(soon).getByRole("link", { name: "Ver meus DECIA Points" }).getAttribute("href")).toBe("/points");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Painel de insights");
  });

  it("rota de prévia com link que depende do perfil (página da organização)", () => {
    renderWithProviders(<RfPage page={pageByRoute("/companies")!} />, { profile: "CHEFE" });
    expect(screen.getByRole("link", { name: "Abrir a página da minha organização" }).getAttribute("href")).toMatch(/^\/companies\/[^/]+$/);
  });

  it("sem acesso: mensagem de usuário, sem código 403 nem seletor de perfil, com caminho de volta", () => {
    renderWithProviders(<RfPage page={pageByRoute("/admin")!} />, { profile: "EMPREGADO" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Sem acesso a esta área");
    expect(alert.textContent).not.toContain("403");
    expect(screen.queryByTestId("viewer-select")).toBeNull();
    expect(within(alert).getByRole("link", { name: "Voltar para Hoje" }).getAttribute("href")).toBe("/today");
  });

  it("no laboratório continua tudo: chips, CAs, célula de acesso e 403 com seletor", () => {
    state.lab = true;
    const { unmount } = renderWithProviders(<RfPage page={pageByRoute("/insights")!} />);
    expect(screen.getAllByText("RF43").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "O que esta aba vai fazer" })).toBeTruthy();
    expect(screen.queryByTestId("coming-soon")).toBeNull();
    unmount();
    renderWithProviders(<RfPage page={pageByRoute("/admin")!} />, { profile: "EMPREGADO" });
    expect(screen.getByRole("alert").textContent).toContain("403 ACESSO_NEGADO");
  });
});

describe("menu: 'Em breve' e 'proposta' em texto", () => {
  it("rotas esqueleto/prévia levam o selo 'Em breve' em texto; o selo 'proposta' só no laboratório", () => {
    const { unmount } = renderWithProviders(<NavGroups />, { profile: "CHEFE" });
    const insights = screen.getByRole("link", { name: /Painel de insights/ });
    expect(within(insights).getByText("Em breve")).toBeTruthy();
    expect(insights.getAttribute("data-soon")).toBe("true");
    expect(within(screen.getByRole("link", { name: /Acervo de Tarefas/ })).queryByText("Em breve")).toBeNull();
    expect(screen.queryByText("proposta")).toBeNull();
    unmount();
    state.lab = true;
    renderWithProviders(<NavGroups />, { profile: "CHEFE" });
    expect(within(screen.getByRole("link", { name: /Minha equipe/ })).getByText("proposta")).toBeTruthy();
  });

  it("menu recolhido: o nome acessível diz '(em breve)'", () => {
    renderWithProviders(<NavGroups collapsed />, { profile: "EMPREGADO" });
    expect(screen.getByRole("link", { name: "Painel de insights (em breve)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hoje" }).getAttribute("href")).toBe("/today");
  });
});

describe("AppShell: faixa de demonstração e ajuda '?'", () => {
  it("rota demo mostra a faixa textual; rota real não", () => {
    const { unmount } = renderWithProviders(<AppShell><p /></AppShell>);
    const banner = screen.getByTestId("demo-banner");
    expect(banner.textContent).toContain("Modo demonstração:");
    expect(banner.textContent).toContain("some ao recarregar");
    unmount();
    state.pathname = "/tasks";
    renderWithProviders(<AppShell><p /></AppShell>);
    expect(screen.queryByTestId("demo-banner")).toBeNull();
  });

  it("'?' no cabeçalho abre o parágrafo da tela e o próximo passo", async () => {
    state.pathname = "/tasks";
    renderWithProviders(<AppShell><PageHeader title="Acervo de Tarefas" rfs={["RF41"]} /></AppShell>);
    expect(screen.queryByText("RF41")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ajuda sobre esta tela" }));
    const panel = await screen.findByRole("dialog", { name: "Sobre esta tela" });
    expect(within(panel).getByText(/O Acervo reúne as suas tarefas/)).toBeTruthy();
    expect(within(panel).getByRole("link", { name: "Criar uma tarefa" }).getAttribute("href")).toBe("/tasks/new");
  });

  it("rota sem texto de ajuda e cabeçalho fora do AppShell não mostram o '?'", () => {
    state.pathname = "/points";
    const { unmount } = renderWithProviders(<AppShell><PageHeader title="Pontos" /></AppShell>);
    expect(screen.queryByTestId("page-help")).toBeNull();
    unmount();
    renderWithProviders(<PageHeader title="Solto" />);
    expect(screen.queryByTestId("page-help")).toBeNull();
  });
});

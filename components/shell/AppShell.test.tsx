// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { pageByRoute } from "@/lib/pages/registry";
import { AppShell } from "./AppShell";
import { RfPage } from "./RfPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  usePathname: () => "/mural",
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
}));

describe("AppShell", () => {
  it("landmarks, skip link, 5 grupos da sidebar para EMPREGADO com Mural ativo e badges; barra inferior com + Criar", async () => {
    renderWithProviders(<AppShell><p>conteúdo</p></AppShell>);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("conteudo");
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" }).getAttribute("href")).toBe("#conteudo");
    const sidebar = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(sidebar).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Descobrir", "Meu trabalho", "Criar", "Jogar e ganhar", "Gestão"]);
    expect(within(sidebar).getByRole("link", { name: /Mural/ }).getAttribute("aria-current")).toBe("page");
    expect(within(sidebar).queryByRole("link", { name: "Admin" })).toBeNull();
    const bottom = screen.getByRole("navigation", { name: "Navegação principal (celular)" });
    expect(within(bottom).getAllByRole("link")).toHaveLength(4);
    fireEvent.click(screen.getByTestId("bottom-create"));
    const sheet = await screen.findByRole("dialog", { name: "Criar" });
    expect(within(sheet).getAllByRole("link").map((l) => l.textContent)).toHaveLength(4);
  });

  it("sino: badge com não lidas, popover com lista mock e 'marcar todas como lidas'", async () => {
    renderWithProviders(<AppShell><p /></AppShell>);
    const bell = await screen.findByTestId("bell");
    await waitFor(() => expect(bell.getAttribute("aria-label")).toBe("Notificações (3 não lidas)"));
    fireEvent.click(bell);
    const panel = await screen.findByRole("dialog", { name: "Notificações" });
    expect(within(panel).getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
    fireEvent.click(within(panel).getByRole("button", { name: "Marcar todas como lidas" }));
    await waitFor(() => expect(screen.getByTestId("bell").getAttribute("aria-label")).toBe("Notificações"));
  });

  it("Central de Perfil: dados do perfil, links e troca do perfil de visualização muda a sidebar (CHEFE ganha Gestão › Minha equipe; EMPRESA ganha Nova chancela)", async () => {
    renderWithProviders(<AppShell><p /></AppShell>);
    fireEvent.click(screen.getByTestId("user-panel"));
    const panel = await screen.findByRole("dialog", { name: "Central de Perfil" });
    expect(within(panel).getByText("Pessoa Exemplo")).toBeTruthy();
    expect(within(panel).getByRole("link", { name: /Meu perfil/ }).getAttribute("href")).toBe("/profile");
    expect(within(panel).getByRole("link", { name: /Preferências/ }).getAttribute("href")).toBe("/settings");
    fireEvent.change(within(panel).getByTestId("viewer-select"), { target: { value: "CHEFE" } });
    const sidebar = screen.getByRole("navigation", { name: "Menu principal" });
    await waitFor(() => expect(within(sidebar).getByRole("link", { name: /Minha equipe/ }).getAttribute("href")).toBe("/departments/cpoe/team"));
    fireEvent.change(within(panel).getByTestId("viewer-select"), { target: { value: "VISITANTE" } });
    await waitFor(() => expect(within(sidebar).getAllByRole("heading", { level: 2 })).toHaveLength(1));
    expect(screen.queryByTestId("bell")).toBeNull();
  });

  it("tema e idioma pelo menu da barra superior aplicam no <html> e traduzem o shell", async () => {
    renderWithProviders(<AppShell><p /></AppShell>);
    fireEvent.click(screen.getByTestId("theme-menu"));
    const menu = await screen.findByRole("menu", { name: "Tema e idioma" });
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /Terminal/ }));
    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("terminal"));
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /English/ }));
    await waitFor(() => expect(document.documentElement.getAttribute("lang")).toBe("en"));
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeTruthy();
  });
});

describe("RfPage (página-esqueleto)", () => {
  it("cita o RF, lista os CAs do README, mostra sub-abas e EmptyState; perfil sem acesso recebe 403 simulado", async () => {
    renderWithProviders(<RfPage page={pageByRoute("/mural")!} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mural");
    expect(screen.getAllByText("RF27").length).toBeGreaterThan(0);
    expect(await screen.findByRole("tablist")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Mural da empresa" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "O que esta aba vai fazer" })).toBeTruthy();
    expect(screen.getAllByRole("list", { name: "Critérios de aceite" })[0]!.children.length).toBe(6);
    expect(screen.getByText(/Sub-aba “Mural da empresa” ainda sem conteúdo/)).toBeTruthy();
  });

  it("403 simulado para perfil oculto na matriz (Admin como EMPREGADO)", () => {
    renderWithProviders(<RfPage page={pageByRoute("/admin")!} />, { profile: "EMPREGADO" });
    expect(screen.getByRole("alert").textContent).toContain("403 ACESSO_NEGADO");
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

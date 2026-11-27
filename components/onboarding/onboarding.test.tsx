// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { FirstSteps } from "./FirstSteps";
import { TodayView } from "./TodayView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/today",
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
}));

vi.mock("@/lib/tasks/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/tasks/client")>();
  return { ...mod, tasksApi: { ...mod.tasksApi, list: vi.fn().mockResolvedValue([]) } };
});

describe("Primeiros passos", () => {
  it("lista os quatro passos com link, marca um passo, guarda nas preferências e mostra o progresso em texto", async () => {
    const adapter = memoryAdapter();
    renderWithProviders(<FirstSteps />, { adapters: [adapter] });
    const card = await screen.findByTestId("first-steps");
    expect(within(card).getByRole("heading", { name: "Primeiros passos" })).toBeTruthy();
    expect(within(card).getAllByRole("listitem")).toHaveLength(4);
    expect(within(card).getByRole("link", { name: "Abrir o perfil" }).getAttribute("href")).toBe("/profile");
    expect(within(card).getByRole("link", { name: "Escolher profissão" }).getAttribute("href")).toBe("/settings?tab=trabalho");
    expect(within(card).getByRole("link", { name: "Criar tarefa" }).getAttribute("href")).toBe("/tasks/new");
    expect(within(card).getByRole("link", { name: "Abrir o Acervo" }).getAttribute("href")).toBe("/tasks");
    expect(within(card).getAllByText("0 de 4 passos feitos").length).toBeGreaterThan(0);

    fireEvent.click(within(card).getByRole("checkbox", { name: /Completar o perfil/ }));
    await waitFor(() => expect(within(card).getAllByText("1 de 4 passos feitos").length).toBeGreaterThan(0));
    expect(within(card).getByRole("checkbox", { name: /Completar o perfil · feito/ }).getAttribute("aria-checked")).toBe("true");
    expect(adapter.saved.at(-1)!.onboarding).toEqual({ done: ["perfil"], dismissed: false });
  });

  it("profissão já escolhida conta como feita (marcada e travada); dispensar esconde e 'mostrar' traz de volta", async () => {
    const adapter = memoryAdapter();
    renderWithProviders(<FirstSteps />, { adapters: [adapter], prefs: { preferredOccupation: "direito" } });
    const occupation = await screen.findByRole("checkbox", { name: /Escolher a sua profissão · feito/ });
    expect(occupation.getAttribute("aria-checked")).toBe("true");
    expect((occupation as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText("1 de 4 passos feitos").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("first-steps-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("first-steps")).toBeNull());
    expect(adapter.saved.at(-1)!.onboarding.dismissed).toBe(true);
    fireEvent.click(screen.getByTestId("first-steps-restore"));
    expect(await screen.findByTestId("first-steps")).toBeTruthy();
  });

  it("todos feitos: mensagem de conclusão", async () => {
    renderWithProviders(<FirstSteps />, { prefs: { preferredOccupation: "direito", onboarding: { done: ["perfil", "primeira-tarefa", "melhorias"], dismissed: false } } });
    expect(await screen.findByText(/Tudo pronto!/)).toBeTruthy();
  });
});

describe("Tela Hoje", () => {
  it("título Hoje, Tarefa do Dia, primeiros passos e atalhos com o Mural por último", async () => {
    renderWithProviders(<TodayView />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hoje");
    expect(await screen.findByTestId("first-steps")).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Atalhos" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/tasks/new", "/tasks", "/desk", "/decia", "/mural"]);
    // Tarefa do Dia (DailyTask) carregou o Acervo vazio
    expect(await screen.findByText("Nenhuma tarefa aberta para sugerir hoje")).toBeTruthy();
  });

  it("visitante não vê a tela (acesso só com sessão)", () => {
    renderWithProviders(<TodayView />, { profile: "VISITANTE" });
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

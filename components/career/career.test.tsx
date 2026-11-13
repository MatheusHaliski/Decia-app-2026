// @vitest-environment jsdom
/**
 * Profissão preferida em Configurações › Trabalho (RF81.CA01/CA10, D-147): combobox acessível com aria-activedescendant, busca sem
 * caixa nem acento, "ainda não sei", aviso de privacidade e o que muda no criador. Plano de desenvolvimento da profissão (D-153).
 */
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { DevelopmentPlanPanel } from "./DevelopmentPlan";
import { OccupationCombobox } from "./OccupationCombobox";
import { OccupationSettingsCard } from "./OccupationSettingsCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams("tab=trabalho"),
  useParams: () => ({}),
}));

const combo = () => screen.getByRole("combobox") as HTMLInputElement;
const options = () => within(screen.getByRole("listbox")).getAllByRole("option");

describe("combobox da profissão (RF81.CA10)", () => {
  it("abre agrupado pelas categorias, navega por teclado com aria-activedescendant e escolhe com Enter", () => {
    const onChange = vi.fn();
    renderWithProviders(<OccupationCombobox value={null} onChange={onChange} label="Profissão" hint="dica" />);
    const input = combo();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-controls")).toBe(screen.getByRole("listbox").id);
    // primeira opção: ainda não sei; depois os 79 ramos, a começar pela categoria TI (Desenvolvimento de software)
    expect(options()).toHaveLength(80);
    expect(options()[0]!.textContent).toContain("Ainda não sei");
    expect(screen.getByRole("listbox").textContent!.indexOf("Desenvolvimento de software")).toBeLessThan(screen.getByRole("listbox").textContent!.indexOf("Engenharia"));
    expect(input.getAttribute("aria-activedescendant")).toBe(options()[0]!.id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options()[1]!.id);
    expect(options()[1]!.getAttribute("data-code")).toBe("ciencia-de-dados");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("ciencia-de-dados");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("a partir de 2 letras autocompleta por rótulo e aliases, sem caixa nem acento (advogada → Direito); Esc fecha", () => {
    const onChange = vi.fn();
    renderWithProviders(<OccupationCombobox value={null} onChange={onChange} label="Profissão" />);
    fireEvent.change(combo(), { target: { value: "ADVOGADA" } });
    expect(options().map((o) => o.getAttribute("data-code"))).toEqual(["direito"]);
    expect(options()[0]!.textContent).toContain("Jurídico");
    expect(screen.getByText(/1 sugestões/)).toBeTruthy();
    fireEvent.keyDown(combo(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("direito");
    fireEvent.change(combo(), { target: { value: "xyzw" } });
    expect(screen.getAllByText(/Nenhuma profissão encontrada/).length).toBeGreaterThan(0);
    fireEvent.keyDown(combo(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("com valor, mostra o rótulo; clicar numa opção escolhe; Limpar volta a 'ainda não sei'", () => {
    const onChange = vi.fn();
    renderWithProviders(<OccupationCombobox value="engenharia-civil" onChange={onChange} label="Profissão" />);
    expect(combo().value).toBe("Engenharia Civil");
    fireEvent.click(combo());
    const selected = options().find((o) => o.getAttribute("aria-selected") === "true")!;
    expect(selected.getAttribute("data-code")).toBe("engenharia-civil");
    fireEvent.click(options().find((o) => o.getAttribute("data-code") === "design")!);
    expect(onChange).toHaveBeenLastCalledWith("design");
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("Configurações › Trabalho: profissão preferida (D-147)", () => {
  it("avisa que só a pessoa vê, salva nas preferências e explica o que muda no criador", async () => {
    const adapter = memoryAdapter();
    renderWithProviders(<OccupationSettingsCard />, { adapters: [adapter] });
    expect(screen.getByTestId("occupation-privacy").textContent).toContain("Só você vê; não aparece no seu perfil nem para a empresa.");
    expect(screen.getByTestId("occupation-generic")).toBeTruthy();
    fireEvent.change(combo(), { target: { value: "engenharia de software" } });
    fireEvent.keyDown(combo(), { key: "Enter" });
    await waitFor(() => expect(adapter.saved.at(-1)?.preferredOccupation).toBe("engenharia-de-software"));
    const effect = screen.getByTestId("occupation-effect");
    expect(effect.textContent).toContain("Desenvolvimento de software");
    expect(effect.textContent).toContain("Engenharia de Software já vem como campo de estudo");
    expect(within(effect).getByRole("link", { name: /Abrir o criador de tarefas/ }).getAttribute("href")).toBe("/tasks/new");
    expect(screen.getByText("Profissão salva: Engenharia de Software.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    await waitFor(() => expect(adapter.saved.at(-1)?.preferredOccupation).toBeNull());
  });
});

describe("plano de desenvolvimento (fora do criador: cada item abre /tasks/new?modelo=)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("em ordem de prioridade, com o progresso das tarefas da pessoa, sem códigos internos e marcado em revisão (D-153)", async () => {
    renderWithProviders(<DevelopmentPlanPanel fieldCode="engenharia-de-software" defaultOpen tasks={[{ id: "t1", state: "CONCLUIDA", extensions: { guidedTask: "L4", studyField: "engenharia-de-software" } }]} />);
    const plan = screen.getByTestId("development-plan");
    expect(await within(plan).findByTestId("plan-in-review", {}, { timeout: 8000 })).toBeTruthy();
    const items = plan.querySelectorAll("[data-plan-item]");
    expect(items[0]!.getAttribute("data-plan-item")).toBe("campo.engenharia-de-software.L4");
    expect(items[0]!.getAttribute("data-status")).toBe("CONCLUIDA");
    expect(within(items[0] as HTMLElement).getByRole("link", { name: "Abrir a tarefa" }).getAttribute("href")).toBe("/tasks/t1");
    expect(within(items[1] as HTMLElement).getByRole("link", { name: /^Criar a tarefa / }).getAttribute("href")).toBe("/tasks/new?modelo=campo.engenharia-de-software.D4");
    expect(screen.getByTestId("plan-progress").textContent).toContain(`1 de ${items.length} concluídas`);
    expect(plan.textContent).not.toMatch(/\b[LDX](10|[1-9])\b/);
    expect(plan.textContent).not.toMatch(/\(pesquisa\)|status|v?2026\.\d+\.\d+/i);
    expect(fetchMock).not.toHaveBeenCalled(); // tarefas recebidas: nada de API
  });

  it("sem sessão o progresso fica indisponível, mas o plano aparece", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    renderWithProviders(<DevelopmentPlanPanel fieldCode="direito" />);
    const plan = screen.getByTestId("development-plan");
    expect(plan.hasAttribute("open")).toBe(false);
    await act(async () => { fireEvent.click(within(plan).getByText(/Seu plano de desenvolvimento · Direito/)); });
    await waitFor(() => expect(screen.getByTestId("plan-progress").textContent).toContain("Entre na sua conta"), { timeout: 8000 });
    expect(plan.querySelectorAll("[data-plan-item]").length).toBeGreaterThan(0);
  });
});

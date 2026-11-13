// @vitest-environment jsdom
/**
 * /lab/perfis — Simulador de Perfis e Governança (D-35): o perfil A troca o app inteiro, o B só compara; a tabela, o resumo e as
 * explicações saem da mesma matriz do registro; os cenários guiados trocam o perfil e levam à página certa.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGES } from "@/lib/pages/registry";
import { VIEWER_STORAGE_KEY } from "@/lib/viewer/ViewerProvider";
import { renderWithProviders } from "@/test-utils/render";
import PerfisLab from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
  usePathname: () => "/lab/perfis",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
});

const sim = () => screen.getByTestId("profile-simulator");
const table = () => screen.getByTestId("sim-table");

describe("simulador de perfis no laboratório", () => {
  it("compara o perfil do app com outro, só com as diferenças, e explica o porquê de cada célula", () => {
    renderWithProviders(<PerfisLab />, { profile: "CHEFE" });
    expect((within(sim()).getByTestId("sim-profile-a") as HTMLSelectElement).value).toBe("CHEFE");
    expect((within(sim()).getByTestId("sim-profile-b") as HTMLSelectElement).value).toBe("VISITANTE");
    expect(screen.getByTestId("sim-summary").textContent).toContain("O que muda de Chefe de departamento para Visitante");
    // só as diferenças: todas as linhas marcadas; a linha de /seals/review: o chefe edita, o visitante não vê
    const rows = table().querySelectorAll("tbody tr[data-route]");
    expect(rows.length).toBeGreaterThan(0);
    expect([...rows].every((r) => r.getAttribute("data-diff"))).toBe(true);
    const seals = table().querySelector<HTMLElement>("tr[data-route='/seals/review']")!;
    expect(seals.getAttribute("data-diff")).toBe("SO_A");
    const [cellA, cellB] = [...seals.querySelectorAll("td")];
    expect(cellA!.textContent).toBe("✎edita");
    expect(cellB!.textContent).toBe("⊘não vê (403)");
    fireEvent.click(within(seals).getByText("Ver o porquê"));
    const whyChief = seals.querySelector<HTMLElement>("[data-why=CHEFE]")!;
    expect(whyChief.textContent).toContain("Papel:");
    expect(whyChief.textContent).toContain("requireIssuerOrCurator(FILA_REVISAO)");
    expect(seals.querySelector<HTMLElement>("[data-why=VISITANTE]")!.textContent).toContain("D-60");
    // todas as páginas, com as iguais também
    fireEvent.click(within(sim()).getByRole("switch", { name: /Só as diferenças/ }));
    expect(table().querySelectorAll("tbody tr[data-route]").length).toBe(PAGES.length);
  });

  it("trocar o perfil A muda o perfil do app; o B só a comparação", () => {
    renderWithProviders(<PerfisLab />, { profile: "EMPREGADO" });
    fireEvent.change(within(sim()).getByTestId("sim-profile-b"), { target: { value: "EMPRESA" } });
    expect(screen.getByTestId("sim-summary").textContent).toContain("O que muda de Empregado para Empresa");
    expect(localStorage.getItem(VIEWER_STORAGE_KEY)).toBeNull();
    fireEvent.change(within(sim()).getByTestId("sim-profile-a"), { target: { value: "CURADOR" } });
    expect(localStorage.getItem(VIEWER_STORAGE_KEY)).toBe("CURADOR");
    expect((screen.getByTestId("viewer-select") as HTMLSelectElement).value).toBe("CURADOR");
    expect(screen.getByTestId("sim-summary").textContent).toContain("O que muda de Curador para Empresa");
    // a matriz completa acompanha o perfil do app e tem uma linha por página registrada
    expect(screen.getByTestId("sim-matrix").querySelectorAll("tbody tr:not(:has(th[scope=colgroup]))").length).toBe(PAGES.length);
  });

  it("cenário guiado: como Visitante, tentar editar uma tarefa troca o perfil e leva à edição (acesso negado)", () => {
    renderWithProviders(<PerfisLab />, { profile: "CHEFE" });
    const card = within(screen.getByTestId("sim-scenarios")).getByText("Como Visitante, tente editar uma tarefa").closest("[data-scenario]") as HTMLElement;
    expect(card.textContent).toContain("403 ACESSO_NEGADO");
    fireEvent.click(within(card).getByRole("button", { name: "Ir como Visitante" }));
    expect(localStorage.getItem(VIEWER_STORAGE_KEY)).toBe("VISITANTE");
    expect(push).toHaveBeenCalledWith("/tasks/t-exemplo/edit");
    const chief = within(screen.getByTestId("sim-scenarios")).getByText("Como Chefe, conceda uma chancela").closest("[data-scenario]") as HTMLElement;
    expect(chief.getAttribute("data-expect")).toBe("E");
    fireEvent.click(within(chief).getByRole("button", { name: "Ir como Chefe de departamento" }));
    expect(localStorage.getItem(VIEWER_STORAGE_KEY)).toBe("CHEFE");
    expect(push).toHaveBeenLastCalledWith("/seals/review");
  });
});

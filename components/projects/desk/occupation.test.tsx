// @vitest-environment jsdom
/**
 * "Criar projeto" pela profissão preferida (auditoria 27/11/2026): área e modelo pela categoria da profissão, fora de TI sem a
 * governança de TI, e o motivo visível do "Criar em branco" desabilitado (aria-describedby).
 */
import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeMetrics } from "@/lib/projects/metrics";
import { createMemoryProjectRepository } from "@/lib/projects/repository";
import { renderWithProviders } from "@/test-utils/render";
import { GENERIC_DEFAULTS, projectDefaultsFor, templateAreaOverride, TEMPLATE_BY_AREA } from "./areaDefaults";
import { CreateProject } from "./CreateProject";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/desk",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const NOW = () => new Date("2026-11-27T12:00:00Z");

describe("areaDefaults (puro)", () => {
  it("profissão → área e modelo: obra, contratação, jurídico, TI; sem profissão, o padrão de antes", () => {
    expect(projectDefaultsFor("engenharia-civil")).toMatchObject({ area: "ENGENHARIA", template: "tipo-obra", approach: "PREDITIVO", fromOccupation: true });
    expect(projectDefaultsFor("ciencias-contabeis")).toMatchObject({ area: "ADMINISTRACAO", template: "tipo-aquisicao" });
    expect(projectDefaultsFor("direito")).toMatchObject({ area: "JURIDICO", template: "tipo-normativo" });
    expect(projectDefaultsFor("engenharia-de-software")).toMatchObject({ area: "SOFTWARE", template: "tipo-ti" });
    expect(projectDefaultsFor(null)).toBe(GENERIC_DEFAULTS);
    expect(projectDefaultsFor("ramo-inexistente")).toBe(GENERIC_DEFAULTS);
    expect(Object.keys(TEMPLATE_BY_AREA)).toHaveLength(9);
  });

  it("modelos genéricos herdam a área da profissão; os específicos mantêm a sua", () => {
    const design = projectDefaultsFor("design");
    expect(design.template).toBe("tipo-outra");
    expect(templateAreaOverride("tipo-outra", design)).toBe("DESIGN");
    expect(templateAreaOverride("tipo-obra", design)).toBeNull();
    expect(templateAreaOverride("tipo-outra", GENERIC_DEFAULTS)).toBeNull();
  });
});

describe("CreateProject com a profissão", () => {
  it("engenheira civil: área Engenharia e modelo de obra já marcados; o projeto nasce fora de TI, sem governança de TI", async () => {
    const repo = createMemoryProjectRepository([]);
    const created: string[] = [];
    renderWithProviders(<CreateProject repo={repo} now={NOW} onCreated={(id) => created.push(id)} />, { prefs: { preferredOccupation: "engenharia-civil" } });
    expect((screen.getByTestId("blank-area") as HTMLSelectElement).value).toBe("ENGENHARIA");
    expect(screen.getAllByTestId("from-occupation").length).toBe(2);
    expect(screen.getByTestId("blank-governance").textContent).toContain("Fora de TI");
    expect(screen.getByRole("radio", { name: /Obra de engenharia/ }).getAttribute("aria-checked")).toBe("true");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Criar a partir do modelo" })); });
    const model = repo.get(created[0]!)!;
    expect(model.area).toBe("ENGENHARIA");
    const metrics = computeMetrics(model);
    const ids = metrics.governance.map((m) => m.id);
    expect(ids).not.toContain("G_ISO38500");
    expect(ids).not.toContain("G_RUN_GROW_TRANSFORM");
    expect(ids).not.toContain("G_ACORDOS_SERVICO");
  });

  it("projeto em branco com profissão de design fica na área Design; trocar a área tira a marca", async () => {
    const repo = createMemoryProjectRepository([]);
    const created: string[] = [];
    renderWithProviders(<CreateProject repo={repo} now={NOW} onCreated={(id) => created.push(id)} />, { prefs: { preferredOccupation: "design" } });
    const blank = screen.getByRole("heading", { name: "Em branco" }).closest("section")!;
    fireEvent.change(within(blank).getByLabelText(/Título do projeto/), { target: { value: "Identidade da feira" } });
    await act(async () => { fireEvent.click(within(blank).getByRole("button", { name: "Criar em branco" })); });
    expect(repo.get(created[0]!)!.area).toBe("DESIGN");
    fireEvent.change(screen.getByTestId("blank-area"), { target: { value: "SOFTWARE" } });
    expect(within(blank).queryByTestId("from-occupation")).toBeNull();
    expect(screen.getByTestId("blank-governance").textContent).toContain("Projeto de TI");
  });

  it("sem profissão continua como antes (TI); 'Criar em branco' desabilitado mostra o motivo ligado por aria-describedby", () => {
    renderWithProviders(<CreateProject repo={createMemoryProjectRepository([])} now={NOW} />);
    expect((screen.getByTestId("blank-area") as HTMLSelectElement).value).toBe("SOFTWARE");
    expect(screen.queryByTestId("from-occupation")).toBeNull();
    const btn = screen.getByRole("button", { name: "Criar em branco" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const reason = screen.getByTestId("blank-reason");
    expect(reason.textContent).toContain("Dê um título ao projeto");
    expect(btn.getAttribute("aria-describedby")).toBe(reason.id);
    fireEvent.change(screen.getByLabelText(/Título do projeto/, { selector: "input:not([aria-describedby])" }), { target: { value: "X" } });
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByTestId("blank-reason")).toBeNull();
  });
});

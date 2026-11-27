// @vitest-environment jsdom
/**
 * Criador completo de projetos (/projects/new, RF5): passos com validação ao avançar e foco no primeiro erro, regra condicional
 * (sigiloso exige justificativa), RACI básico, revisão final e criação no repositório DEMO abrindo a Mesa; começar de um modelo.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewProjectPage from "@/app/(shell)/projects/new/page";
import { createMemoryProjectRepository, setDemoProjectRepository } from "@/lib/projects/repository";
import { renderWithProviders } from "@/test-utils/render";
import { ProjectWizard } from "./ProjectWizard";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/new",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const NOW = () => new Date("2026-11-12T12:00:00");
const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const next = () => fireEvent.click(screen.getByTestId("wizard-next"));
const stepIs = (s: string) => expect(document.querySelector("[data-wizard-step]")!.getAttribute("data-wizard-step")).toBe(s);

beforeEach(() => nav.push.mockReset());

describe("assistente de criação de projeto", () => {
  it("valida cada passo, aplica as regras e cria o projeto completo no repositório, abrindo a Mesa", async () => {
    const repo = createMemoryProjectRepository([]);
    renderWithProviders(<ProjectWizard repo={repo} now={NOW} />);
    stepIs("ident");
    next();
    expect(await screen.findByText("Informe o nome do projeto.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Nome do projeto/)));
    fill(/Nome do projeto/, "Portal da transparência");
    fill("Área do projeto", "ADMINISTRACAO");
    next();

    stepIs("charter");
    next();
    expect(screen.getByTestId("wizard-errors").textContent).toContain("5 campos");
    fill(/^Objetivo 1/, "Publicar 100% dos contratos vigentes");
    fill("Indicador", "% de contratos publicados");
    fill("Meta", "100%");
    fill("Prazo do objetivo", "2027-06-30");
    expect(screen.getByTestId("smart-0").getAttribute("data-smart")).toBe("false"); // falta o objetivo estratégico (relevante)
    fill("Justificativa 1", "Exigência da LAI");
    fill("Escopo (dentro) 1", "Contratos vigentes");
    fill("Critérios de sucesso 1", "Portal no ar");
    fireEvent.click(screen.getByTestId("wizard-add-deliverable"));
    fill(/^Entrega 1/, "Painel de contratos");
    next();

    stepIs("stakeholders");
    fireEvent.click(screen.getByTestId("wizard-add-stakeholder"));
    fill(/^Parte interessada 1/, "Controle interno");
    fill("Poder (1–5)", "5");
    fill("Interesse (1–5)", "2");
    expect(screen.getByTestId("strategy-0").textContent).toContain("Manter satisfeito");
    next();

    stepIs("team");
    next();
    expect(await screen.findByText("Escolha o patrocinador (quem aprova o TAP).")).toBeTruthy();
    fill(/^Patrocinador/, "u-ana");
    const raci = screen.getByTestId("wizard-raci");
    expect(raci.querySelector("caption")!.textContent).toContain("Matriz RACI");
    // o gerente começa como R+A; tirar o A do gerente sem dar a outro é erro
    fireEvent.change(within(raci).getByLabelText("Pessoa Exemplo em Painel de contratos"), { target: { value: "R" } });
    next();
    expect(await screen.findByText("Falta quem responde (A) por esta entrega.")).toBeTruthy();
    fireEvent.change(within(raci).getByLabelText("Ana Exemplo em Painel de contratos"), { target: { value: "A" } });
    next();

    stepIs("approach");
    fill("Quantidade de sprints", "2");
    expect(screen.getByTestId("wizard-sprints").textContent).toContain("2 sprints");
    next();
    stepIs("schedule");
    fill("Término previsto", "2027-06-30");
    next();
    stepIs("budget");
    next();
    stepIs("risks");
    next();

    stepIs("governance");
    fill(/^Classificação/, "SIGILOSO");
    next();
    expect(await screen.findByText("Sigiloso exige a justificativa da classificação.")).toBeTruthy();
    fill(/Justificativa da classificação/, "Dados pessoais de fornecedores");
    next();

    stepIs("review");
    expect(screen.getByTestId("wizard-review").textContent).toContain("Tudo certo para criar o projeto.");
    fireEvent.click(screen.getByTestId("wizard-create"));
    const [p] = repo.list!();
    expect(p).toMatchObject({ title: "Portal da transparência", area: "ADMINISTRACAO", access: { accessClass: "SIGILOSO", justification: "Dados pessoais de fornecedores" }, targetEndDate: "2027-06-30" });
    expect(p!.charter.sponsorId).toBe("u-ana");
    expect(p!.raci).toEqual(expect.arrayContaining([{ taskId: "t1", userId: "u-pessoa", letters: ["R"] }, { taskId: "t1", userId: "u-ana", letters: ["A"] }]));
    expect(p!.stakeholders[0]).toMatchObject({ name: "Controle interno", power: 5, interest: 2 });
    expect(p!.sprints).toHaveLength(2);
    expect(nav.push).toHaveBeenCalledWith(`/projects/${p!.id}/edit`);
  });

  it("criar antes da hora leva ao primeiro passo com pendência; o índice marca os passos", async () => {
    renderWithProviders(<ProjectWizard repo={createMemoryProjectRepository([])} now={NOW} />);
    fill(/Nome do projeto/, "Só o nome");
    fireEvent.click(screen.getByRole("button", { name: /7\. Orçamento/ }));
    stepIs("budget");
    fireEvent.click(screen.getByTestId("wizard-create"));
    stepIs("charter");
    expect(screen.getByTestId("wizard-errors")).toBeTruthy();
    expect(document.querySelector('[data-step="ident"]')!.getAttribute("data-state")).toBe("done");
    expect(screen.getByRole("button", { name: /2\. Termo de abertura/ }).getAttribute("aria-current")).toBe("step");
  });

  it("começar de um modelo preenche o assistente; em /projects/new os atalhos de modelo e Autopiloto continuam", async () => {
    const repo = createMemoryProjectRepository([]);
    setDemoProjectRepository(repo);
    renderWithProviders(<NewProjectPage />);
    fireEvent.change(screen.getByLabelText("Modelo para preencher o assistente"), { target: { value: "tipo-aquisicao" } });
    fireEvent.click(screen.getByTestId("wizard-use-template"));
    expect((screen.getByLabelText(/Nome do projeto/) as HTMLInputElement).value).toBe("Contratação (Lei 14.133)");
    fireEvent.click(screen.getByRole("button", { name: /2\. Termo de abertura/ }));
    expect(screen.getByTestId("wizard-deliverables").querySelectorAll("[data-deliverable]").length).toBeGreaterThan(0);
    expect(document.querySelector('section[aria-labelledby="new-template"]')).toBeTruthy();
    expect(document.querySelector('section[aria-labelledby="new-blank"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Abrir o Autopiloto" }).getAttribute("href")).toBe("/autopilot");
    setDemoProjectRepository(null);
  });
});

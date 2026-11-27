// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { createDecision, linkWork } from "@/lib/decia/commands";
import { buildDemoDecisions, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { DecisionApiLimitError } from "@/lib/decia/http";
import { createMemoryRepository, setDemoRepository } from "@/lib/decia/repository";
import type { DecisionAggregate } from "@/lib/decia/types";
import { DecisionApiNotice, DecisionsBoard, LinkedDecisions, NewDecisionDialog, projectFilterOptions } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/decia",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-10-06T12:00:00Z");
const TASK = "t-termo";

afterEach(() => setDemoRepository(null));

function agg(id: string, question: string, extra: Partial<DecisionAggregate["decision"]> = {}): DecisionAggregate {
  const a = createDecision({ question, complexity: "RAPIDA", impact: "MEDIO", ownerUserId: "u-pessoa" }, NOW, id);
  return { ...a, decision: { ...a.decision, ...extra } };
}

describe("Nova decisão — motivo visível do botão desabilitado", () => {
  it("sem '?' o botão fica desabilitado e descrito pelo motivo (aria-describedby)", () => {
    const repo = createMemoryRepository([]);
    renderWithProviders(<NewDecisionDialog open onOpenChange={() => {}} repository={repo} currentUserId="u-pessoa" onCreated={() => {}} />);
    const button = screen.getByTestId("create-decision") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByTestId("create-decision-reason").textContent).toContain("15 caracteres");
    fireEvent.change(screen.getByRole("textbox", { name: /pergunta/i }), { target: { value: "Qual fornecedor de nuvem contratar" } });
    const reason = screen.getByTestId("create-decision-reason");
    expect(reason.textContent).toContain("?");
    expect(button.getAttribute("aria-describedby")).toBe(reason.id);
    fireEvent.change(screen.getByRole("textbox", { name: /pergunta/i }), { target: { value: "Qual fornecedor de nuvem contratar?" } });
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByTestId("create-decision-reason")).toBeNull();
  });
});

describe("Filtro de projeto", () => {
  const withProject = agg("d1", "Aprovar a saída da fase?", { projectId: "33333333-3333-4333-8333-333333333333" });
  it("na API usa só os projetos citados pelas decisões, nunca os exemplos DEMO", () => {
    const opts = projectFilterOptions([withProject, agg("d2", "Sem projeto nenhum?")], "API");
    expect(opts).toEqual([{ value: "33333333-3333-4333-8333-333333333333", label: "#33333333" }]);
    const demo = projectFilterOptions(buildDemoDecisions(NOW), "DEMO");
    expect(demo.length).toBeGreaterThan(0);
  });
  it("no quadro (API) o select mostra o projeto da decisão e não os DEMO", () => {
    renderWithProviders(<DecisionsBoard decisions={[withProject]} now={NOW} people={DEMO_PEOPLE} currentUserId="u-pessoa" source="API" />);
    const select = screen.getByLabelText("Projeto") as HTMLSelectElement;
    const labels = [...select.options].map((o) => o.textContent);
    expect(labels).toContain("#33333333");
    expect(labels).not.toContain("App de Atendimento (demo)");
  });
});

describe("Decisões ligadas (tarefa ↔ decisão)", () => {
  it("lista as decisões com vínculo TAREFA e liga uma nova pela mesma fonte", async () => {
    const linked = linkWork(agg("d-ligada", "Qual modelo de contrato usar?"), { targetType: "TAREFA", targetId: TASK, label: "Termo" }, "u-pessoa", NOW);
    const other = agg("d-outra", "Qual fornecedor de nuvem contratar?");
    const repo = createMemoryRepository([linked, other]);
    setDemoRepository(repo);
    renderWithProviders(<LinkedDecisions taskId={TASK} taskTitle="Preparar o termo de referência" />);
    const block = screen.getByTestId("linked-decisions");
    expect(within(block).getByRole("link", { name: /modelo de contrato/ })).toBeTruthy();
    expect(within(block).queryByRole("link", { name: /fornecedor de nuvem/ })).toBeNull();
    fireEvent.click(screen.getByTestId("link-decision"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Decisão"), { target: { value: "d-outra" } });
    await act(async () => { fireEvent.click(within(dialog).getByTestId("confirm-link-decision")); });
    expect(repo.get("d-outra")!.workLinks).toEqual([expect.objectContaining({ targetType: "TAREFA", targetId: TASK, label: "Preparar o termo de referência" })]);
    expect(within(screen.getByTestId("linked-decisions")).getByRole("link", { name: /fornecedor de nuvem/ })).toBeTruthy();
    // desligar tira o vínculo
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Desligar da decisão Qual modelo/ })); });
    expect(repo.get("d-ligada")!.workLinks).toEqual([]);
  });

  it("sem decisão disponível o botão fica desabilitado com o motivo visível", () => {
    setDemoRepository(createMemoryRepository([]));
    renderWithProviders(<LinkedDecisions taskId={TASK} />);
    const button = screen.getByTestId("link-decision") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const reason = document.getElementById(button.getAttribute("aria-describedby")!);
    expect(reason?.textContent).toContain("Nenhuma decisão disponível");
  });
});

describe("Aviso de limite da API", () => {
  it("lista o que não foi gravado no servidor", () => {
    renderWithProviders(<DecisionApiNotice error={new DecisionApiLimitError(["decision.fields", "workLinks.labTarget"])} />);
    const alert = screen.getByTestId("decision-api-limit");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(within(alert).getAllByRole("listitem")).toHaveLength(2);
  });
});

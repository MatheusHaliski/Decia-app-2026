// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { NotificationRow, withDates } from "@/components/shell/NotificationsBell";
import type { TaskView } from "@/lib/tasks/client";
import { DailyTask, DailyTaskView } from "./DailyTask";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams("tab=tarefa-do-dia"),
  useParams: () => ({}),
}));

const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";
const task = (id: string, over: Partial<TaskView> = {}): TaskView => ({
  id, version: 1, title: `Tarefa ${id.slice(0, 4)}`, type: "DOCUMENTO", priority: "ALTA", state: "DISPONIVEL", accessClass: "INTERNO",
  visibility: "PRIVADA", ...over,
} as TaskView);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Tarefa do Dia com o prazo mais próximo (RF44 · RF41.CA04)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mostra a tarefa de prazo mais próximo, o motivo em texto e as próximas", () => {
    renderWithProviders(
      <DailyTaskView today="2026-11-24" tasks={[task(A, { title: "Parecer da obra", dueAt: "2026-12-20" }), task(B, { title: "Responder LAI", legalDueAt: "2026-11-26" })]} />,
    );
    expect(screen.getByTestId("daily-task-title").textContent).toContain("Responder LAI");
    expect(screen.getByTestId("daily-task-title").getAttribute("href")).toBe(`/tasks/${B}`);
    const reason = screen.getByTestId("daily-task-reason");
    expect(reason.getAttribute("data-reason")).toBe("PROXIMA");
    expect(reason.textContent).toContain("É o prazo mais próximo: vence em 2 dias (26/11/2026) · prazo legal");
    expect(screen.getByText("Depois desta")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Parecer da obra" }).getAttribute("href")).toBe(`/tasks/${A}`);
  });

  it("sem tarefa aberta: estado vazio com o caminho para o Acervo", () => {
    renderWithProviders(<DailyTaskView today="2026-11-24" tasks={[task(A, { state: "CONCLUIDA", dueAt: "2026-11-25" })]} />);
    expect(screen.getByText("Nenhuma tarefa aberta para sugerir hoje")).toBeTruthy();
  });

  it("carrega o Acervo em ordem de prazo e mostra erro com nova tentativa", async () => {
    fetchMock.mockResolvedValueOnce(json(500, { code: "ERRO" }));
    renderWithProviders(<DailyTask />);
    expect(await screen.findByText("Não foi possível carregar a Tarefa do Dia")).toBeTruthy();
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/api/tasks?");
    expect(url).toContain("ordem=PRAZO");
    fetchMock.mockResolvedValueOnce(json(200, [task(A, { title: "Sem prazo", priority: "CRITICA" })]));
    screen.getByRole("button", { name: /tentar/i }).click();
    await waitFor(() => expect(screen.getByTestId("daily-task-reason").getAttribute("data-reason")).toBe("PRIORIDADE"));
    expect(screen.getByTestId("daily-task-reason").textContent).toContain("esta tem a maior prioridade (Crítica)");
  });
});

describe("linha da central com aviso de prazo (RF41.CA04)", () => {
  it("formata a data no idioma e liga à tarefa", () => {
    expect(withDates({ date: "2026-11-27", title: "x" }, ["date"], "pt-BR")).toEqual({ date: "27/11/2026", title: "x" });
    expect(withDates({ date: "amanhã" }, ["date"], "pt-BR")).toEqual({ date: "amanhã" });
    renderWithProviders(
      <ul>
        <NotificationRow n={{ id: "n", kind: "PRAZO", titleKey: "prazosdiarios.notif.soonLegal", vars: { title: "Responder LAI", date: "2026-11-27", n: 3 },
          dateVars: ["date"], minutesAgo: 5, read: false, href: `/tasks/${B}` }} />
      </ul>,
    );
    const link = screen.getByRole("link", { name: /Responder LAI/ });
    expect(link.getAttribute("href")).toBe(`/tasks/${B}`);
    expect(link.textContent).toContain("⚖ O prazo legal de “Responder LAI” vence em 3 dias (27/11/2026)");
  });
});

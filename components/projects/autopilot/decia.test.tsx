// @vitest-environment jsdom
/**
 * RF30.CA06 na tela: "Discutir no DECIA" no passo do esquema (proposta em rascunho) e na visão geral do projeto salvo abre a
 * sessão com a proposta anexada, membros sugeridos e link de volta; o que a sessão decide na minuta volta ao rascunho (ou vira
 * pedido de mudança no projeto) — só pelo proprietário.
 */
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionView } from "@/components/decia/session";
import { ProjectOverview } from "@/components/projects/desk/ProjectOverview";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { buildDemoOrgPolicy } from "@/lib/decia/session/fixtures";
import { createMemorySessionRepository, setDemoSessionRepository } from "@/lib/decia/session/repository";
import { loadProposalDraft } from "@/lib/projects/autopilot/drafts";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { createMemoryProjectRepository, setDemoProjectRepository } from "@/lib/projects/repository";
import { createMemoryLedger } from "@/lib/points/ledger";
import { renderWithProviders } from "@/test-utils/render";
import { AutopilotWizard } from "./AutopilotWizard";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn() }),
  usePathname: () => "/decia/s",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-11-12T12:00:00");
const sessionsRepo = () => createMemorySessionRepository([], buildDemoOrgPolicy(NOW), { ledger: createMemoryLedger(), people: DEMO_PEOPLE, search: () => [] });

afterEach(() => {
  sessionStorage.clear();
  nav.push.mockReset();
  setDemoSessionRepository(null);
  setDemoProjectRepository(null);
});

describe("Autopiloto → sessão do DECIA antes de salvar", () => {
  it("abre a sessão com a proposta anexada, o responsável como membro e a volta; a decisão da minuta volta ao rascunho", () => {
    const sessions = sessionsRepo();
    const { unmount } = renderWithProviders(<AutopilotWizard repo={createMemoryProjectRepository([])} sessions={sessions} now={() => NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar um ofício de exemplo" }));
    fireEvent.click(screen.getByRole("button", { name: /Ler a demanda/ }));
    fireEvent.click(screen.getByRole("button", { name: /Gerar o esquema do projeto/ }));
    // aperta o prazo para a proposta estourar e põe a Ana como responsável do ETP
    fireEvent.change(screen.getByTestId("proposal-deadline"), { target: { value: "2026-12-11" } });
    const etp = document.querySelector<HTMLElement>('li[data-task-title^="Elaborar o estudo técnico"]')!;
    fireEvent.change(etp.querySelector("select")!, { target: { value: "u-ana" } });

    fireEvent.click(screen.getByRole("button", { name: "Discutir no DECIA" }));
    const s = sessions.list()[0]!;
    expect(nav.push).toHaveBeenCalledWith(`/decia/${s.id}`);
    expect(s).toMatchObject({ status: "ABERTA", title: "Proposta do Autopiloto: Implantação do sistema de protocolo digital", projectId: null });
    expect(s.participants.map((p) => [p.userId, p.role])).toEqual([["u-pessoa", "PROPRIETARIO"], ["u-ana", "EDITOR"]]);
    expect(s.artifact!.kind).toBe("PROPOSTA_AUTOPILOTO");
    expect(s.minuta.text).toContain("Aviso: o caminho crítico estoura o prazo (11/12/2026) em 74 dias.");
    expect(s.minuta.text).toContain("## Fase 3 · Elaboração [ELABORACAO]");
    const draftId = s.artifact!.draftId!;
    expect(loadProposalDraft(draftId)).toBeTruthy();
    unmount();

    renderWithProviders(<SessionView sessionId={s.id} repo={sessions} />);
    const panel = screen.getByTestId("session-artifact");
    expect(screen.getByRole("heading", { name: /Em discussão: Implantação do sistema de protocolo digital/ })).toBeTruthy();
    expect(screen.getByTestId("artifact-overrun").textContent).toContain("74 dias");
    expect(screen.getByRole("link", { name: /Voltar ao rascunho/ }).getAttribute("href")).toBe(`/desk?draft=${draftId}`);
    expect(screen.getByText("Nada novo na minuta em relação à base.")).toBeTruthy();
    expect((screen.getByTestId("artifact-apply") as HTMLButtonElement).disabled).toBe(true);

    // a sessão decide na minuta: o ETP passa a 15 dias e entra uma atividade nova na Execução
    const etpLine = s.minuta.text.split("\n").find((l) => l.includes("Elaborar o estudo técnico"))!;
    const next = s.minuta.text.replace(etpLine, etpLine.replace(/\| 10 d \|/, "| 15 d |")).replace("[EXECUCAO]", "[EXECUCAO]\n- [+] Treinar os multiplicadores | 4 d");
    act(() => { expect(sessions.editMinuta(s.id, "u-ana", next).ok).toBe(true); });
    expect(panel.querySelectorAll("[data-change]").length).toBe(2);
    expect(screen.getByText(/duração 10 → 15 dias/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("artifact-apply"));
    expect(screen.getByTestId("artifact-status").textContent).toBe("2 mudança(s) aplicada(s) ao rascunho.");
    const draft = loadProposalDraft(draftId)!;
    expect(draft.proposal.tasks.find((t) => t.title.startsWith("Elaborar o estudo técnico"))!.pert).toEqual({ o: 7.5, m: 15, p: 22.5 });
    expect(draft.proposal.tasks.some((t) => t.title === "Treinar os multiplicadores" && t.phase === "EXECUCAO")).toBe(true);
    // a base avançou: nada a devolver de novo
    expect(sessions.get(s.id)!.artifact).toMatchObject({ baseRevision: 2, applications: [{ changes: 2 }] });
    expect(screen.getByText("Nada novo na minuta em relação à base.")).toBeTruthy();

    // membro que não é proprietário não devolve
    act(() => { expect(sessions.editMinuta(s.id, "u-ana", next.replace("| 15 d |", "| 12 d |")).ok).toBe(true); });
    fireEvent.change(screen.getByTestId("act-as"), { target: { value: "u-ana" } });
    expect((screen.getByTestId("artifact-apply") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Só o proprietário da sessão devolve as decisões.")).toBeTruthy();

    // tudo ou nada: com uma decisão recusada (duração acima do limite), nada é aplicado e as duas seguem pendentes
    fireEvent.change(screen.getByTestId("act-as"), { target: { value: "u-pessoa" } });
    const base = sessions.get(s.id)!.minuta.text;
    const etpBad = base.split("\n").find((l) => l.includes("Elaborar o estudo técnico"))!;
    const bad = base.replace(etpBad, etpBad.replace(/\| [\d.]+ d \|/, "| 4000 d |")).replace("[EXECUCAO]", "[EXECUCAO]\n- [+] Revisar o termo | 2 d");
    act(() => { expect(sessions.editMinuta(s.id, "u-pessoa", bad).ok).toBe(true); });
    const before = loadProposalDraft(draftId)!.proposal;
    const pendingBefore = panel.querySelectorAll("[data-change]").length;
    fireEvent.click(screen.getByTestId("artifact-apply"));
    expect(screen.getByTestId("artifact-status").textContent).toMatch(/1/);
    expect(loadProposalDraft(draftId)!.proposal).toEqual(before);
    expect(sessions.get(s.id)!.artifact!.applications).toHaveLength(1);
    expect(panel.querySelectorAll("[data-change]").length).toBe(pendingBefore);
  });
});

describe("Projeto salvo → sessão do DECIA", () => {
  it("abre pela visão geral e devolve as decisões como pedidos de mudança", () => {
    const sessions = sessionsRepo();
    setDemoSessionRepository(sessions);
    const model = buildDemoProject();
    const projects = createMemoryProjectRepository([model]);
    setDemoProjectRepository(projects);
    const { unmount } = renderWithProviders(<ProjectOverview model={model} today="2026-11-12" />);
    fireEvent.click(screen.getByRole("button", { name: "Discutir no DECIA" }));
    const s = sessions.list()[0]!;
    expect(nav.push).toHaveBeenCalledWith(`/decia/${s.id}`);
    expect(s).toMatchObject({ projectId: model.id, artifact: { kind: "PROJETO", href: `/projects/${model.id}` } });
    unmount();

    renderWithProviders(<SessionView sessionId={s.id} repo={sessions} />);
    expect(screen.getByRole("link", { name: /Voltar ao projeto/ }).getAttribute("href")).toBe(`/projects/${model.id}`);
    const t1 = model.tasks.find((t) => !t.milestone)!;
    const line = s.minuta.text.split("\n").find((l) => l.startsWith(`- [${t1.code}]`))!;
    act(() => { expect(sessions.editMinuta(s.id, "u-pessoa", s.minuta.text.replace(line, line.replace(/\| [\d.]+ d \|/, "| 99 d |"))).ok).toBe(true); });
    const before = projects.get(model.id)!.changes.length;
    fireEvent.click(screen.getByRole("button", { name: "Registrar como pedidos de mudança" }));
    expect(screen.getByTestId("artifact-status").textContent).toBe("1 pedido(s) de mudança registrado(s) no projeto.");
    const changes = projects.get(model.id)!.changes;
    expect(changes).toHaveLength(before + 1);
    expect(changes.at(-1)).toMatchObject({ status: "SOLICITADA", title: expect.stringContaining(`${t1.code} ${t1.title}: duração`) });
    expect(changes.at(-1)!.sevenRs.raised).toBe(`Sessão do DECIA “${s.title}”`);
  });
});

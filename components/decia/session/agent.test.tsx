// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import type { AgentCharter } from "@/lib/ai/autonomy";
import { AuditPanel } from "@/components/decia/audit/AuditPanel";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { agentStoreFor } from "@/lib/decia/session/agentStore";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "@/lib/decia/session/fixtures";
import { MINUTA_TARGET } from "@/lib/decia/session/policy";
import { createMemorySessionRepository } from "@/lib/decia/session/repository";
import { createMemoryLedger } from "@/lib/points/ledger";
import { SessionView } from "./SessionView";

const nav = vi.hoisted(() => ({ search: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, prefetch: vi.fn() }),
  usePathname: () => "/decia/s-infraestrutura",
  useSearchParams: () => nav.search,
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

const NOW = new Date();
const S = DEMO_SESSION_IDS.infra;
const charter: AgentCharter = {
  goal: "Completar a minuta com o que a sessão registrou", authorizedBy: "u-pessoa", scopeTargetIds: [MINUTA_TARGET], allowedTools: ["propor_minuta", "organizar_encaminhamentos"],
  maxSteps: 10, maxTokens: 20_000, expiresAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString(), connectorIds: [],
};
function makeRepo(agent = true) {
  const audit = createAuditLog();
  const repo = createMemorySessionRepository(buildDemoSessions(NOW), { ...buildDemoOrgPolicy(NOW), ceiling: "AGENTE" }, { ledger: createMemoryLedger(), audit, people: DEMO_PEOPLE, search: () => [] });
  if (agent && !repo.changeMode(S, "u-pessoa", "AGENTE", charter, NOW).ok) throw new Error("modo");
  const store = agentStoreFor(repo, { tickMs: null, search: () => [] });
  return { repo, audit, store };
}
const open = (tab: string | null, repo: ReturnType<typeof makeRepo>["repo"]) => {
  nav.search = new URLSearchParams(tab ? `tab=${tab}` : "");
  return renderWithProviders(<SessionView sessionId={S} repo={repo} />);
};

beforeEach(() => {
  nav.replace.mockReset();
  window.sessionStorage.clear();
});

describe("agente da sessão (RF51.CA04)", () => {
  it("sem o modo Agente explica o que falta e não oferece iniciar", () => {
    const { repo } = makeRepo(false);
    open("minuta", repo);
    const panel = screen.getByTestId("agent-panel");
    expect(within(panel).getByTestId("agent-unavailable").textContent).toContain("modo Agente");
    expect(within(panel).queryByTestId("agent-start")).toBeNull();
  });

  it("mostra o mandato; iniciar avisa os membros; pausar e avançar um passo lista ferramenta, alvos, tokens, resumo e motivo", () => {
    const { repo } = makeRepo();
    open("minuta", repo);
    const panel = screen.getByTestId("agent-panel");
    expect(within(panel).getByTestId("agent-charter").textContent).toContain("Pessoa Exemplo");
    expect(within(panel).getByTestId("agent-usage").textContent).toContain("0/10 passos");
    fireEvent.click(within(panel).getByTestId("agent-start"));
    expect(within(panel).getByTestId("agent-live").textContent).toContain("Agente iniciado");
    expect(within(panel).getByText("Executando")).toBeTruthy();
    expect(repo.get(S)!.messages.at(-1)!.notice).toMatchObject({ kind: "AGENTE", event: "INICIADO" });
    fireEvent.click(within(panel).getByTestId("agent-pause"));
    expect(within(panel).getByText("Pausado")).toBeTruthy();
    fireEvent.click(within(panel).getByTestId("agent-step"));
    const row = within(panel).getByTestId("agent-step-1");
    expect(row.textContent).toContain("Propor texto para a minuta");
    expect(row.textContent).toContain("Evidências apresentadas");
    expect(row.textContent).toContain("Motivo: A seção estava vazia");
    expect(within(panel).getByTestId("agent-usage").textContent).toContain("1/10 passos");
    expect(within(panel).getByRole("table").querySelector("caption")?.className).toContain("sr-only");
    // a minuta da tela mostra o texto aplicado
    expect(repo.get(S)!.minuta.text).toContain("## Evidências apresentadas");
  });

  it("desfazer até o checkpoint volta a minuta; interromper encerra e avisa", () => {
    const { repo, audit, store } = makeRepo();
    const before = repo.get(S)!.minuta.text;
    open("minuta", repo);
    const panel = screen.getByTestId("agent-panel");
    fireEvent.click(within(panel).getByTestId("agent-start"));
    fireEvent.click(within(panel).getByTestId("agent-pause"));
    fireEvent.click(within(panel).getByTestId("agent-step"));
    fireEvent.click(within(panel).getByTestId("agent-step"));
    fireEvent.click(within(panel).getByTestId("agent-undo-1"));
    expect(repo.get(S)!.minuta.text).toBe(before);
    expect(within(panel).getAllByText("Desfeito")).toHaveLength(2);
    expect(audit.list().at(-1)!.action).toBe("REVERTEU");
    fireEvent.click(within(panel).getByTestId("agent-stop"));
    expect(within(panel).getByText("Interrompido")).toBeTruthy();
    expect(within(panel).getByTestId("agent-ended").textContent).toContain("interrompido por uma pessoa");
    expect(store.latest(S)!.core.status).toBe("INTERROMPIDO");
  });

  it("trocar o modo encerra a execução e o aviso aparece na conversa; a auditoria mostra o passo e quem autorizou", () => {
    const { repo, audit, store } = makeRepo();
    store.start(S, "u-pessoa", {
      section: { EVIDENCIAS: "Evidências apresentadas", PERGUNTAS: "Perguntas em aberto", DECISOES: "Decisões", ENCAMINHAMENTOS: "Encaminhamentos", FONTES: "Fontes" },
      followUpProposal: (q) => q, summary: (s, n) => `Completou a seção “${s}” com ${n} item(ns)`, reason: () => "seção vazia", formatDate: (d) => d,
    });
    store.step(S);
    repo.changeMode(S, "u-pessoa", "SUGESTOES", null, new Date());
    expect(store.latest(S)!.core.status).toBe("INTERROMPIDO");
    const view = open(null, repo);
    expect(within(screen.getByTestId("chat-log")).getByText(/O agente foi interrompido \(sistema\): a política de IA mudou/)).toBeTruthy();
    view.unmount();
    renderWithProviders(<AuditPanel repo={repo} />);
    expect(screen.getAllByText("Agente aplicou (mandato)").length).toBeGreaterThan(0);
    expect(audit.list().some((r) => r.agent?.authorizedBy === "u-pessoa")).toBe(true);
  });
});

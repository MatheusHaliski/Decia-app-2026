// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { buildDemoAudit, buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "@/lib/decia/session/fixtures";
import { createMemorySessionRepository, setDemoSessionRepository } from "@/lib/decia/session/repository";
import { createMemoryLedger } from "@/lib/points/ledger";
import AdminPage from "@/app/(shell)/admin/page";
import ReviewPage from "@/app/(shell)/decia/review/page";
import SessionRoute from "@/app/(shell)/decia/[sessionId]/page";

const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => nav.search,
  useParams: () => ({}),
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

const NOW = new Date();
const fresh = () => {
  const repo = createMemorySessionRepository(buildDemoSessions(NOW), buildDemoOrgPolicy(NOW), { ledger: createMemoryLedger(), audit: createAuditLog(buildDemoAudit(NOW)), people: DEMO_PEOPLE, search: () => [] });
  setDemoSessionRepository(repo);
  return repo;
};

beforeEach(() => {
  nav.search = new URLSearchParams();
});

describe("/decia/[sessionId]", () => {
  it("id desconhecido → 404; id DEMO ou criado nesta aba passa", async () => {
    await expect(SessionRoute({ params: Promise.resolve({ sessionId: "nao-existe" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(SessionRoute({ params: Promise.resolve({ sessionId: "../admin" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await SessionRoute({ params: Promise.resolve({ sessionId: DEMO_SESSION_IDS.infra }) })).toBeTruthy();
    expect(await SessionRoute({ params: Promise.resolve({ sessionId: "s-nova-abc123-0" }) })).toBeTruthy();
  });
});

describe("/decia/review — painel de auditoria", () => {
  it("CHEFE vê a trilha; EMPREGADO recebe 403 simulado", () => {
    fresh();
    const { unmount } = renderWithProviders(<ReviewPage />, { profile: "CHEFE" });
    expect(screen.getByTestId("audit-panel")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Trilha de auditoria das revisões" })).toBeTruthy();
    unmount();
    renderWithProviders(<ReviewPage />, { profile: "EMPREGADO" });
    expect(screen.getByRole("alert").textContent).toContain("403 ACESSO_NEGADO");
    expect(screen.queryByTestId("audit-panel")).toBeNull();
  });
});

describe("/admin — política de IA da organização", () => {
  it("ADMIN vê todas as abas; na de IA muda o teto, vê o impacto e as sessões recebem o aviso", () => {
    const repo = fresh();
    nav.search = new URLSearchParams("tab=ia");
    renderWithProviders(<AdminPage />, { profile: "ADMIN" });
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    const panel = screen.getByTestId("org-ai-policy");
    fireEvent.click(within(panel).getByRole("radio", { name: /^Sob solicitação/ }));
    fireEvent.change(within(panel).getByLabelText("Padrão das sessões novas"), { target: { value: "MANUAL" } });
    fireEvent.click(within(panel).getByTestId("save-org-policy"));
    const impact = screen.getByTestId("org-impact");
    expect(impact.textContent).toContain("Infraestrutura para os próximos 12 meses: Sugestões → Sob solicitação · 5 membro(s) avisados · 1 proposta(s) obsoleta(s)");
    fireEvent.click(screen.getByTestId("confirm-org-policy"));
    expect(repo.org()).toMatchObject({ ceiling: "SOB_SOLICITACAO", defaultMode: "MANUAL", version: 2, changedBy: "org:ADMIN" });
    expect(repo.get(DEMO_SESSION_IDS.infra)!.messages.at(-1)!.notice).toMatchObject({ kind: "TETO_ALTERADO" });
    expect(screen.getByText(/Política v2 em vigor: 12 aviso\(s\) enviados/)).toBeTruthy();
  });

  it("EMPRESA entra só pela aba de IA e edita; CHEFE recebe 403", () => {
    fresh();
    const { unmount } = renderWithProviders(<AdminPage />, { profile: "EMPRESA" });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["IA do sistema"]);
    expect((screen.getByTestId("save-org-policy") as HTMLButtonElement).disabled).toBe(true); // nada mudou ainda
    expect(screen.queryByText("Só ADMIN e EMPRESA editam a política da organização.")).toBeNull();
    unmount();
    renderWithProviders(<AdminPage />, { profile: "CHEFE" });
    expect(screen.getByRole("alert").textContent).toContain("403 ACESSO_NEGADO");
  });
});

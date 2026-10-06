// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { SessionsPanel } from "./SessionsPanel";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams("tab=sessoes"),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const LIST = [
  { id: "s-atual", deviceName: "Firefox no notebook", lastActiveAt: "2026-10-06T12:00:00Z", expiresAt: "2026-10-07T12:00:00Z", persistent: false, current: true },
  { id: "s-celular", deviceName: "Chrome no celular", lastActiveAt: "2026-10-05T09:30:00Z", expiresAt: "2026-11-04T09:30:00Z", persistent: true, current: false },
  { id: "s-tablet", deviceName: null, lastActiveAt: "2026-10-01T18:00:00Z", expiresAt: "2026-10-31T18:00:00Z", persistent: true, current: false },
];

/** RF2.CA05 (Bloco 4, D-62): lista com a atual marcada, encerrar um com confirmação, sair de todos os outros. */
describe("Configurações › Sessões", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); push.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("lista as sessões com a atual marcada e encerra outra só depois de confirmar", async () => {
    let list = LIST;
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/auth/sessions") && (init?.method ?? "GET") === "GET") return json(200, list);
      if (u.endsWith("/api/auth/sessions/s-celular") && init?.method === "DELETE") { list = LIST.filter((s) => s.id !== "s-celular"); return json(204, null); }
      return json(404, { code: "NAO_ENCONTRADO" });
    });
    renderWithProviders(<SessionsPanel />);
    const items = await screen.findAllByTestId("session-item");
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute("data-current")).toBe("true");
    expect(within(items[0]!).getByText("Esta sessão")).toBeTruthy();
    expect(within(items[0]!).queryByTestId("session-revoke")).toBeNull();      // a atual sai pelo logout, não por "encerrar"
    expect(within(items[2]!).getByText("Dispositivo sem nome")).toBeTruthy();

    fireEvent.click(within(items[1]!).getByTestId("session-revoke"));
    const dialog = await screen.findByRole("dialog", { name: "Encerrar esta sessão?" });
    expect(within(dialog).getByText(/Chrome no celular/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false); // nada antes de confirmar
    fireEvent.click(within(dialog).getByTestId("session-confirm"));
    await waitFor(() => expect(screen.getAllByTestId("session-item")).toHaveLength(2));
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith("/api/auth/sessions/s-celular") && i?.method === "DELETE")).toBe(true);
  });

  it("sair de todos os outros chama DELETE /api/auth/sessions e fica só a atual", async () => {
    let list = LIST;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "DELETE") { list = LIST.filter((s) => s.current); return json(200, { sessionsEnded: 2 }); }
      return json(200, list);
    });
    renderWithProviders(<SessionsPanel />);
    await screen.findAllByTestId("session-item");
    fireEvent.click(screen.getByTestId("sessions-revoke-others"));
    const dialog = await screen.findByRole("dialog", { name: "Sair de todos os outros dispositivos?" });
    fireEvent.click(within(dialog).getByTestId("session-confirm"));
    await waitFor(() => expect(screen.getAllByTestId("session-item")).toHaveLength(1));
    expect(screen.getByTestId("sessions-revoke-others").hasAttribute("disabled")).toBe(true);
  });

  it("API fora do ar: ErrorState com tentar de novo", async () => {
    fetchMock.mockRejectedValue(new TypeError("ECONNREFUSED"));
    renderWithProviders(<SessionsPanel />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("API indisponível")).toBeTruthy();
  });
});

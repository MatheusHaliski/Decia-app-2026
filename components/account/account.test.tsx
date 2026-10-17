// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { UserPanel } from "@/components/shell/UserPanel";
import { LoginForm, RegisterForm } from "@/components/auth/AuthForms";
import { DataPanel, DELETE_CONFIRM_WORD } from "./DataPanel";
import { DeletionBanner } from "./DeletionBanner";
import { OwnProfile, ownCounters } from "./OwnProfile";
import { pageByRoute } from "@/lib/pages/registry";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE", jobTitle: "Analista", termsVersion: "0.2", privacyVersion: "0.2" };

const withSession = (ui: React.ReactNode) => (
  <CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>
);

describe("sessão real na barra (P19, aba anônima)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); push.mockReset(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  it("sem sessão (aba anônima, navegador novo) a barra mostra VISITANTE e não chama /api/me; o seletor de laboratório não aparece", async () => {
    renderWithProviders(withSession(<UserPanel />));
    await waitFor(() => expect(screen.getByTestId("user-panel-handle").textContent).toBe("Visitante"));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("user-panel"));
    expect(await screen.findByRole("link", { name: "Entrar" })).toBeTruthy();
    expect(screen.queryByTestId("viewer-select")).toBeNull();
  });

  it("com sessão mostra a conta real e volta a VISITANTE quando a sessão acaba (logout aqui ou em outra aba)", async () => {
    fetchMock.mockImplementation(async (url) => (String(url).endsWith("/api/me") ? json(200, ME) : json(404, {})));
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<UserPanel />));
    await waitFor(() => expect(screen.getByTestId("user-panel-handle").textContent).toBe("@maria.silva"));
    expect(screen.queryByText(/pessoa\.exemplo/)).toBeNull();
    act(() => tokenStore.clear());
    await waitFor(() => expect(screen.getByTestId("user-panel-handle").textContent).toBe("Visitante"));
  });
});

describe("excluir conta com 30 dias para reativar (RF3.CA19, D-145)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

  it("o modal explica as consequências, exige senha, 'entendi' e a palavra; agenda e oferece reativar", async () => {
    let me: Record<string, unknown> = { ...ME };
    const calls: { method: string; url: string; body?: unknown }[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      calls.push({ method, url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (u.endsWith("/api/me") && method === "GET") return json(200, me);
      if (u.endsWith("/api/me/deletion") && method === "POST") {
        me = { ...me, status: "DELETION_SCHEDULED", deletionScheduledAt: new Date(Date.now() + 30 * 86400_000).toISOString() };
        return json(202, { status: "DELETION_SCHEDULED", cancelable: true });
      }
      if (u.endsWith("/api/me/deletion") && method === "DELETE") { me = { ...ME }; return json(200, { status: "ACTIVE", cancelable: false }); }
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<><DeletionBanner /><DataPanel /></>));
    fireEvent.click(await screen.findByTestId("delete-account-open"));
    const dialog = await screen.findByTestId("delete-account-dialog");
    expect(within(dialog).getByTestId("delete-consequences").querySelectorAll("li").length).toBeGreaterThanOrEqual(6);
    expect(within(dialog).getByText(/Para cancelar, entre em até 30 dias/)).toBeTruthy();
    const confirm = within(dialog).getByTestId("delete-account-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Senha atual/), { target: { value: "minha-senha" } });
    fireEvent.change(within(dialog).getByTestId("delete-confirm-word"), { target: { value: DELETE_CONFIRM_WORD.toLowerCase() } });
    expect(confirm.disabled, "falta o 'entendi'").toBe(true);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    expect(await screen.findByTestId("deletion-banner")).toBeTruthy();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ currentPassword: "minha-senha" });
    expect(screen.getAllByText(/faltam 30 dias/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId("reactivate-account"));
    await waitFor(() => expect(screen.queryByTestId("deletion-banner")).toBeNull());
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/api/me/deletion"))).toBe(true);
    expect(screen.getByTestId("delete-account-open")).toBeTruthy();
  });
});

describe("login com 2FA e cadastro com os termos da Velion", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); push.mockReset(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

  it("401 DOIS_FATORES_NECESSARIO abre o campo do código; o código vai no segundo envio", async () => {
    const bodies: Record<string, unknown>[] = [];
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      bodies.push(body);
      return body.twoFactorCode ? json(200, { accessToken: "a", user: { id: "u" } }) : json(401, { status: 401, code: "DOIS_FATORES_NECESSARIO", message: "Informe o código.", details: { twoFactorRequired: true } });
    });
    renderWithProviders(<LoginForm next="/settings" />);
    fireEvent.change(screen.getByLabelText(/E-mail ou usuário|Usuário ou e-mail|identificador/i), { target: { value: "maria.silva" } });
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: "senha" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    const code = await screen.findByTestId("login-2fa-code");
    expect(screen.getByTestId("login-2fa-asked")).toBeTruthy();
    fireEvent.change(code, { target: { value: "123 456" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/settings"));
    expect(bodies[0]!.twoFactorCode).toBeUndefined();
    expect(bodies[1]!.twoFactorCode).toBe("123 456");
  });

  it("cadastro: tipo de usuário com explicação e links para os Termos e a Política da Velion", () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByText("Pessoa que trabalha em uma empresa ou órgão.")).toBeTruthy();
    const terms = screen.getByTestId("register-terms");
    expect(within(terms).getByText(/Velion, dona da Orange Social/)).toBeTruthy();
    expect(within(terms).getByRole("link", { name: "Termos de Uso" }).getAttribute("href")).toBe("/termos");
    expect(within(terms).getByRole("link", { name: "Política de Privacidade" }).getAttribute("href")).toBe("/privacidade");
  });
});

describe("Meu perfil com a conta real (P19, RF6.CA01)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const PAGE = pageByRoute("/profile")!;
  const task = (id: string, state: string) => ({ id: `00000000-0000-4000-8000-00000000000${id}`, title: `Tarefa ${id}`, type: "DOCUMENTO", state, version: 0 });
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  it("sem sessão pede para entrar, sem pessoa de exemplo e sem chamar a API", async () => {
    renderWithProviders(withSession(<OwnProfile page={PAGE} />));
    expect(await screen.findByText("Entre para ver seu perfil")).toBeTruthy();
    expect(screen.getByTestId("profile-sign-in").getAttribute("href")).toBe("/login?next=%2Fprofile");
    expect(screen.queryByText(/Pessoa Exemplo|pessoa\.exemplo/)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com sessão mostra o nome, o usuário, a biografia e contadores das tarefas reais", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, { ...ME, bio: "Cuido de contratos.", twoFactorEnabled: false });
      if (u.includes("/api/tasks")) return json(200, [task("1", "EM_USO"), task("2", "CONCLUIDA"), task("3", "DISPONIVEL")]);
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<OwnProfile page={PAGE} />));
    await waitFor(() => expect(screen.getByTestId("profile-name").textContent).toBe("Maria"));
    expect(screen.getByTestId("profile-handle").textContent).toBe("@maria.silva · Analista");
    expect(screen.getByTestId("profile-bio").textContent).toBe("Cuido de contratos.");
    expect(screen.getByText("2FA desligado")).toBeTruthy();
    const counters = screen.getByTestId("profile-counters");
    await waitFor(() => expect(within(counters).getByText("3")).toBeTruthy());
    expect(counters.querySelector('[data-counter="inProgress"] dd')?.textContent).toBe("1");
    expect(counters.querySelector('[data-counter="done"] dd')?.textContent).toBe("1");
    expect(counters.querySelector('[data-counter="followers"]')).toBeNull();
    expect(await screen.findAllByTestId("persisted-task-card")).toHaveLength(3);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/tasks"))).toHaveLength(1);
    expect(screen.queryByText(/Pessoa Exemplo|1\.240/)).toBeNull();
  });

  it("contadores só contam o que a API devolveu", () => {
    expect(ownCounters(null)).toBeNull();
    expect(ownCounters([])).toEqual({ tasks: 0, inProgress: 0, done: 0 });
  });
});

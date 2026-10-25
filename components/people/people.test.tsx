// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { ProfileView } from "@/components/social/ProfileView";
import { pageByRoute } from "@/lib/pages/registry";
import { PeopleSearch, PEOPLE_SEARCH_DEBOUNCE_MS } from "./PeopleSearch";
import { PublicProfile, publicProfileTabs } from "./PublicProfile";

const replace = vi.fn();
let currentSearch = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/search",
  useSearchParams: () => currentSearch,
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const qOf = (url: unknown) => new URL(String(url), "http://x").searchParams.get("q");
const peopleCalls = (m: ReturnType<typeof vi.fn>) => m.mock.calls.filter(([u]) => String(u).includes("/api/people"));
const sleep = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const ANA = { id: "22222222-2222-4222-8222-222222222222", username: "ana.souza", name: "Ana Souza", jobTitle: "Analista de contratos", avatarUrl: "https://cdn.example/ana.png" };
const ANDRE = { id: "33333333-3333-4333-8333-333333333333", username: "andre.lima", name: "André Lima", jobTitle: "Engenheiro" };
const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };

const withSession = (ui: React.ReactNode) => <CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>;
const type = (value: string) => fireEvent.change(screen.getByTestId("people-search-input"), { target: { value } });

describe("busca de pessoas (RF17, aba PESSOAS)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); replace.mockReset(); currentSearch = new URLSearchParams(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  it("com menos de 2 caracteres mostra a dica e não chama a API", async () => {
    renderWithProviders(<PeopleSearch />);
    expect(screen.getByLabelText("Buscar pessoas da sua empresa")).toBeTruthy();
    type("a");
    await sleep(PEOPLE_SEARCH_DEBOUNCE_MS + 100);
    expect(screen.getByText("Comece a digitar")).toBeTruthy();
    type(" a ");
    await sleep(PEOPLE_SEARCH_DEBOUNCE_MS + 100);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("espera a pausa na digitação (debounce): uma chamada só, com o texto final, e o texto vai para a URL", async () => {
    fetchMock.mockImplementation(async () => json(200, [ANA]));
    renderWithProviders(<PeopleSearch />);
    type("a");
    type("an");
    type("ana");
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(peopleCalls(fetchMock)).toHaveLength(1));
    await sleep(PEOPLE_SEARCH_DEBOUNCE_MS + 100);
    expect(peopleCalls(fetchMock)).toHaveLength(1);
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(qOf(url)).toBe("ana");
    expect(url).toContain("limit=20");
    expect(replace).toHaveBeenCalledWith("/search?q=ana", { scroll: false });
  });

  it("descarta a resposta de uma busca anterior que chega depois (fora de ordem)", async () => {
    let releaseFirst: (r: Response) => void = () => {};
    fetchMock.mockImplementation((url) => (qOf(url) === "an"
      ? new Promise<Response>((resolve) => { releaseFirst = resolve; })
      : Promise.resolve(json(200, [ANDRE]))));
    renderWithProviders(<PeopleSearch />);
    type("an");
    await waitFor(() => expect(peopleCalls(fetchMock)).toHaveLength(1));
    type("andre");
    await waitFor(() => expect(peopleCalls(fetchMock)).toHaveLength(2));
    // a primeira chamada recebeu um sinal de cancelamento
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
    expect(await screen.findByText("André Lima", { exact: false })).toBeTruthy();
    await act(async () => { releaseFirst(json(200, [ANA])); await Promise.resolve(); });
    await sleep(20);
    expect(screen.queryByText(/Ana Souza/)).toBeNull();
    expect(screen.getAllByTestId("person-result")).toHaveLength(1);
  });

  it("lista os cards com o link para /u/{username}, avatar, cargo e o total anunciado; ?q= da URL busca de cara", async () => {
    currentSearch = new URLSearchParams("tab=pessoas&q=an");
    fetchMock.mockImplementation(async () => json(200, [ANA, ANDRE]));
    renderWithProviders(<PeopleSearch />);
    expect((screen.getByTestId("people-search-input") as HTMLInputElement).value).toBe("an");
    const cards = await screen.findAllByTestId("person-result");
    expect(cards).toHaveLength(2);
    expect(cards[0]!.getAttribute("href")).toBe("/u/ana.souza");
    expect(cards[1]!.getAttribute("href")).toBe("/u/andre.lima");
    expect(within(cards[0]!).getByTestId("person-result-handle").textContent).toBe("@ana.souza · Analista de contratos");
    // foto por link externo (gravada antes do upload) não é carregada: mostra as iniciais (RF3.CA05)
    expect(cards[0]!.querySelector("img")).toBeNull();
    expect(cards[0]!.querySelector("[role=img]")?.textContent).toBe("AS");
    expect(within(cards[1]!).getByRole("img", { hidden: true }).getAttribute("aria-label")).toBe("André Lima");
    expect(screen.getByRole("list", { name: "Pessoas encontradas" }).querySelectorAll("li")).toHaveLength(2);
    const status = screen.getByTestId("people-search-status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("2 pessoas encontradas");
    expect(cards[0]!.querySelector("mark")?.textContent?.toLowerCase()).toBe("an");
    expect(peopleCalls(fetchMock)).toHaveLength(1);
  });

  it("nenhum resultado: 'ninguém encontrado na sua empresa'", async () => {
    fetchMock.mockImplementation(async () => json(200, []));
    renderWithProviders(<PeopleSearch />);
    type("zzz");
    expect(await screen.findAllByText("Ninguém encontrado na sua empresa")).toBeTruthy();
    expect(screen.queryByTestId("person-result")).toBeNull();
  });

  it("erro com 'tentar de novo' que repete a busca", async () => {
    fetchMock.mockImplementationOnce(async () => json(500, { code: "ERRO_INTERNO", message: "x", correlationId: "c-1" }));
    fetchMock.mockImplementation(async () => json(200, [ANA]));
    renderWithProviders(<PeopleSearch />);
    type("ana");
    expect(await screen.findByText("Não foi possível buscar pessoas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findAllByTestId("person-result")).toHaveLength(1);
  });

  it("401 da API pede para entrar, com volta para /search", async () => {
    fetchMock.mockImplementation(async () => json(401, { code: "NAO_AUTENTICADO", message: "Entre." }));
    renderWithProviders(<PeopleSearch />);
    type("ana");
    const link = await screen.findByTestId("people-search-sign-in");
    expect(link.getAttribute("href")).toBe("/login?next=%2Fsearch");
    expect(screen.getByText("Entre para buscar pessoas")).toBeTruthy();
  });

  it("sem sessão (provider da conta anônimo) pede para entrar sem chamar a API", async () => {
    renderWithProviders(withSession(<PeopleSearch />));
    type("ana");
    expect(await screen.findByTestId("people-search-sign-in")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("perfil de terceiros com dados reais (RF16)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const PAGE = pageByRoute("/u/[username]")!;
  const PROFILE = { id: ANA.id, username: "ana.souza", name: "Ana Souza", fullName: "Ana Maria Souza", profileType: "EMPREGADO", jobTitle: "Analista de contratos", bio: "Contratos e convênios.", verified: true, self: false };
  const task = (n: string, state: string) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, title: `Tarefa ${n}`, type: "DOCUMENTO", state, version: 0 });
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); replace.mockReset(); currentSearch = new URLSearchParams(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  it("fora do laboratório, /u/[username] com sessão mostra o cabeçalho da API e o Acervo Digital com as tarefas visíveis", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, ME);
      if (u.includes("/api/people/by-username/ana.souza")) return json(200, PROFILE);
      if (u.includes(`/api/people/${ANA.id}/tasks`)) return json(200, [task("1", "EM_USO"), task("2", "CONCLUIDA")]);
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<ProfileView page={PAGE} username="ana.souza" />));
    await waitFor(() => expect(screen.getByTestId("profile-name").textContent).toBe("Ana Souza"));
    expect(screen.getByTestId("profile-handle").textContent).toBe("@ana.souza · Analista de contratos");
    expect(screen.getByTestId("profile-bio").textContent).toBe("Contratos e convênios.");
    expect(screen.getByText("Verificado")).toBeTruthy();
    expect(await screen.findAllByTestId("persisted-task-card")).toHaveLength(2);
    const counters = screen.getByTestId("profile-counters");
    expect(counters.querySelector('[data-counter="tasks"] dd')?.textContent).toBe("2");
    expect(counters.querySelector('[data-counter="inProgress"] dd')?.textContent).toBe("1");
    expect(counters.querySelector('[data-counter="done"] dd')?.textContent).toBe("1");
    expect(counters.querySelector('[data-counter="followers"]')).toBeNull();
    const taskCall = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("/tasks"))!;
    expect(taskCall).toContain("limit=50");
    expect(screen.queryByText(/Sem perfil para este acesso|Pessoa Exemplo|DEMO/)).toBeNull();
    // só as sub-abas de terceiros
    const tabs = screen.getAllByRole("tab").map((x) => x.textContent);
    expect(tabs).toHaveLength(5);
    expect(tabs).not.toContain("Tarefas salvas");
  });

  it("404 do servidor mostra 'perfil não encontrado' sem detalhes e sem buscar tarefas", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, ME);
      return json(404, { code: "NAO_ENCONTRADO", message: "Recurso não encontrado." });
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<PublicProfile page={PAGE} username="nao.existe" />));
    const box = await screen.findByTestId("public-profile-not-found");
    expect(within(box).getByText("Perfil não encontrado")).toBeTruthy();
    expect(box.textContent).not.toMatch(/nao\.existe|inativ|desativad|exclu/i);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/tasks"))).toBe(false);
    expect(screen.queryByTestId("public-profile-header")).toBeNull();
  });

  it("sem sessão pede para entrar e não chama a API", async () => {
    renderWithProviders(withSession(<PublicProfile page={PAGE} username="ana.souza" />));
    expect(await screen.findByText("Entre para ver este perfil")).toBeTruthy();
    expect(screen.getByTestId("public-profile-sign-in").getAttribute("href")).toBe("/login?next=%2Fu%2Fana.souza");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("o próprio @usuário vai para Meu perfil (sem ir à API de pessoas)", async () => {
    fetchMock.mockImplementation(async (url) => (String(url).endsWith("/api/me") ? json(200, ME) : json(404, {})));
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<PublicProfile page={PAGE} username="Maria.Silva" />));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/api/people"))).toBe(false);
  });

  it("`self` na resposta também vai para Meu perfil", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, ME);
      if (u.includes("/api/people/by-username/")) return json(200, { ...PROFILE, self: true });
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<PublicProfile page={PAGE} username="outro.nome" />));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/tasks"))).toBe(false);
  });

  it("EMPRESA não tem a sub-aba 'deliberativo'", () => {
    expect(publicProfileTabs("EMPREGADO").map((x) => x.slug)).toEqual(["acervo", "projetos", "programas", "decisoes", "deliberativo"]);
    expect(publicProfileTabs("EMPRESA").map((x) => x.slug)).toEqual(["acervo", "projetos", "programas", "decisoes"]);
  });
});

// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { pageByRoute } from "@/lib/pages/registry";
import { departmentHref, nodeColor } from "@/lib/institutional/client";
import { DepartmentPageReal } from "./DepartmentPage";
import { CompanyPageReal } from "./CompanyPage";
import DepartmentRoute from "@/app/(shell)/departments/[slug]/page";
import CompanyRoute from "@/app/(shell)/companies/[slug]/page";

let currentSearch = new URLSearchParams();
let currentParams: Record<string, string> = {};
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/departments/uts",
  useSearchParams: () => currentSearch,
  useParams: () => currentParams,
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
const COMPANY = { id: "c0000000-0000-4000-8000-000000000001", slug: "secid", name: "Secretaria das Cidades", accentColor: "orange" };
const DEPT = {
  id: "d0000000-0000-4000-8000-000000000001", slug: "uts", acronym: "UTS", name: "Unidade Técnica", color: "blue", monogram: "U", about: "Projetos de saneamento.",
  coverUrl: null, company: COMPANY, head: { id: "22222222-2222-4222-8222-222222222222", username: "ana.chefe", name: "Ana Chefe", jobTitle: "Engenheira", role: "CHEFE" },
  members: 3, followers: 2, member: false,
};
const MEMBERS = [
  { id: "22222222-2222-4222-8222-222222222222", username: "ana.chefe", name: "Ana Chefe", jobTitle: "Engenheira", role: "CHEFE" },
  { id: "33333333-3333-4333-8333-333333333333", username: "bruno.lima", name: "Bruno Lima", jobTitle: "Analista", role: "MEMBRO" },
];
const COMPANY_PAGE = { id: COMPANY.id, slug: "secid", name: "Secretaria das Cidades", about: "Órgão estadual.", websiteUrl: "https://www.cidades.pr.gov.br",
  accentColor: "orange", account: { id: "44444444-4444-4444-8444-444444444444", username: "secid", name: "SECID" }, departments: 2, people: 14, followers: 5, owner: false };
const DEPARTMENTS = [
  { id: DEPT.id, slug: "uts", companySlug: "secid", acronym: "UTS", name: "Unidade Técnica", color: "blue", monogram: "U", members: 3 },
  { id: "d0000000-0000-4000-8000-000000000002", slug: "uap", companySlug: "secid", acronym: "UAP", name: "Unidade de Apoio", color: null, monogram: null, members: 0 },
];

const withSession = (ui: React.ReactNode) => <CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>;
const DEPT_PAGE = pageByRoute("/departments/[slug]")!;
const COMPANY_ROUTE = pageByRoute("/companies/[slug]")!;
const urls = (m: ReturnType<typeof vi.fn>) => m.mock.calls.map(([u, init]) => `${(init as RequestInit | undefined)?.method ?? "GET"} ${new URL(String(u)).pathname}${new URL(String(u)).search}`);

describe("página do departamento com dados reais (RF14)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); currentSearch = new URLSearchParams(); currentParams = {}; });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  it("cabeçalho da API: sigla em h2, empresa com link, chefe com link para o perfil e contadores do servidor; seguir com aria-pressed", async () => {
    let following = false;
    let followers = 2;
    fetchMock.mockImplementation(async (url, init) => {
      const u = new URL(String(url));
      const m = init?.method ?? "GET";
      if (u.pathname === "/api/me") return json(200, ME);
      if (u.pathname === "/api/departments/uts") return json(200, DEPT);
      if (u.pathname === "/api/departments/uts/follow") {
        if (m === "PUT") { following = true; followers += 1; }
        if (m === "DELETE") { following = false; followers -= 1; }
        return json(200, { following, self: false, followers, followingCount: 0 });
      }
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<DepartmentPageReal page={DEPT_PAGE} slug="uts" company="secid" />));
    const header = await screen.findByTestId("department-header");
    expect(within(header).getByRole("heading", { level: 2 }).textContent).toBe("UTS");
    expect(within(header).getByTestId("department-company").getAttribute("href")).toBe("/companies/secid");
    expect(within(header).getByRole("link", { name: "Ana Chefe" }).getAttribute("href")).toBe("/u/ana.chefe");
    const counters = within(header).getByTestId("institution-counters");
    expect(counters.querySelector('[data-counter="people"] dd')?.textContent).toBe("3");
    expect(counters.querySelector('[data-counter="followers"] dd')?.textContent).toBe("2");
    expect(screen.getByTestId("institution-about").textContent).toBe("Projetos de saneamento.");
    expect(screen.queryByText(/DEMO|Pessoa Exemplo/)).toBeNull();

    const button = await screen.findByTestId("follow-institution");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId("follow-institution").getAttribute("aria-pressed")).toBe("true"));
    expect(counters.querySelector('[data-counter="followers"] dd')?.textContent).toBe("3");
    fireEvent.click(screen.getByTestId("follow-institution"));
    await waitFor(() => expect(screen.getByTestId("follow-institution").getAttribute("aria-pressed")).toBe("false"));
    expect(urls(fetchMock).filter((x) => x.includes("/follow"))).toEqual([
      "GET /api/departments/uts/follow?company=secid", "PUT /api/departments/uts/follow?company=secid", "DELETE /api/departments/uts/follow?company=secid",
    ]);
  });

  it("sub-aba Equipe lista as pessoas da API com link para o perfil, papel e sem contato", async () => {
    currentSearch = new URLSearchParams("tab=equipe");
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(String(url));
      if (u.pathname === "/api/me") return json(200, ME);
      if (u.pathname === "/api/departments/uts") return json(200, DEPT);
      if (u.pathname === "/api/departments/uts/members") return json(200, MEMBERS);
      if (u.pathname.endsWith("/follow")) return json(200, { following: false, self: false, followers: 2, followingCount: 0 });
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<DepartmentPageReal page={DEPT_PAGE} slug="uts" company={null} />));
    const team = await screen.findByTestId("department-team");
    expect(within(team).getAllByRole("listitem")).toHaveLength(2);
    expect(within(team).getByRole("link", { name: "Bruno Lima" }).getAttribute("href")).toBe("/u/bruno.lima");
    expect(within(team).getByText("Chefe")).toBeTruthy();
    expect(team.textContent).not.toMatch(/@exemplo|\+55/);
    expect(screen.getByText(/mostram o perfil só para quem é da mesma empresa/)).toBeTruthy();
  });

  it("404 do servidor mostra 'departamento não encontrado' sem cabeçalho nem seguir", async () => {
    fetchMock.mockImplementation(async (url) => (new URL(String(url)).pathname === "/api/me" ? json(200, ME) : json(404, { status: 404, code: "NAO_ENCONTRADO" })));
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<DepartmentPageReal page={DEPT_PAGE} slug="nao-existe" company={null} />));
    expect(await screen.findByTestId("department-not-found")).toBeTruthy();
    expect(screen.getByText("Departamento não encontrado")).toBeTruthy();
    expect(screen.queryByTestId("follow-institution")).toBeNull();
    expect(urls(fetchMock).some((x) => x.includes("/follow"))).toBe(false);
  });

  it("erro de rede mostra 'tentar de novo' que repete a leitura", async () => {
    let calls = 0;
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(String(url));
      if (u.pathname === "/api/me") return json(200, ME);
      if (u.pathname === "/api/departments/uts") { calls += 1; return calls === 1 ? json(503, { status: 503, code: "SERVICO_INDISPONIVEL", message: "fora" }) : json(200, DEPT); }
      return json(200, { following: false, self: false, followers: 2, followingCount: 0 });
    });
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<DepartmentPageReal page={DEPT_PAGE} slug="uts" company={null} />));
    fireEvent.click(await screen.findByRole("button", { name: /tentar de novo/i }));
    expect(await screen.findByTestId("department-header")).toBeTruthy();
  });

  it("sem sessão pede para entrar e não chama a API do departamento", async () => {
    fetchMock.mockImplementation(async () => json(401, {}));
    renderWithProviders(withSession(<DepartmentPageReal page={DEPT_PAGE} slug="uts" company="secid" />));
    const signIn = await screen.findByTestId("department-sign-in");
    expect(signIn.getAttribute("href")).toContain(encodeURIComponent("/departments/uts?company=secid"));
    expect(urls(fetchMock).some((x) => x.includes("/api/departments"))).toBe(false);
  });

  it("sem provedor de sessão (laboratório/testes antigos) a rota continua DEMO, sem chamar a API", async () => {
    currentParams = { slug: "secid-uts" };
    renderWithProviders(<DepartmentRoute />);
    await waitFor(() => expect(screen.getAllByText(/UTS/).length).toBeGreaterThan(0));
    expect(urls(fetchMock).some((x) => x.includes("/api/departments"))).toBe(false);
  });
});

describe("página da empresa com dados reais (RF15)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); currentSearch = new URLSearchParams(); currentParams = {}; });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

  const api = (overrides: Record<string, Response> = {}) => async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    const m = init?.method ?? "GET";
    const key = `${m} ${u.pathname}`;
    if (overrides[key]) return overrides[key]!.clone();
    if (u.pathname === "/api/me") return json(200, ME);
    if (u.pathname === "/api/companies/secid") return json(200, COMPANY_PAGE);
    if (u.pathname === "/api/companies/secid/departments") return json(200, DEPARTMENTS);
    if (u.pathname === "/api/companies/secid/follow") return json(200, { following: m === "PUT", self: false, followers: m === "PUT" ? 6 : 5, followingCount: 0 });
    return json(404, {});
  };

  it("cabeçalho com nome em h2, site oficial, conta institucional e contadores reais; seguir a empresa", async () => {
    fetchMock.mockImplementation(api());
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<CompanyPageReal page={COMPANY_ROUTE} slug="secid" />));
    const header = await screen.findByTestId("company-header");
    expect(within(header).getByRole("heading", { level: 2 }).textContent).toBe("Secretaria das Cidades");
    expect(within(header).getByTestId("company-website").getAttribute("href")).toBe("https://www.cidades.pr.gov.br");
    expect(within(header).getByTestId("company-website").getAttribute("rel")).toContain("noopener");
    expect(within(header).getByRole("link", { name: "Ver conta institucional" }).getAttribute("href")).toBe("/u/secid");
    const counters = within(header).getByTestId("institution-counters");
    expect(counters.querySelector('[data-counter="departments"] dd')?.textContent).toBe("2");
    expect(counters.querySelector('[data-counter="people"] dd')?.textContent).toBe("14");
    expect(counters.querySelector('[data-counter="followers"] dd')?.textContent).toBe("5");
    fireEvent.click(await screen.findByTestId("follow-institution"));
    await waitFor(() => expect(screen.getByTestId("follow-institution").getAttribute("aria-pressed")).toBe("true"));
    expect(counters.querySelector('[data-counter="followers"] dd')?.textContent).toBe("6");
    expect(screen.queryAllByRole("tab").map((x) => x.textContent)).not.toContain("Gestão");
  });

  it("sub-aba Departamentos lista os ativos com link para a página de cada um (com ?company=)", async () => {
    currentSearch = new URLSearchParams("tab=departamentos");
    fetchMock.mockImplementation(api());
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<CompanyPageReal page={COMPANY_ROUTE} slug="secid" />));
    const list = await screen.findByTestId("company-departments");
    expect(within(list).getByRole("link", { name: "UTS" }).getAttribute("href")).toBe("/departments/uts?company=secid");
    expect(within(list).getByText("3 pessoas")).toBeTruthy();
    expect(within(list).getByText("0 pessoas")).toBeTruthy();
  });

  it("404 (inexistente ou inativa) mostra 'empresa não encontrada'", async () => {
    fetchMock.mockImplementation(api({ "GET /api/companies/secid": json(404, { status: 404, code: "NAO_ENCONTRADO" }) }));
    tokenStore.set("jwt-de-teste");
    renderWithProviders(withSession(<CompanyPageReal page={COMPANY_ROUTE} slug="secid" />));
    expect(await screen.findByTestId("company-not-found")).toBeTruthy();
    expect(screen.getByText("Empresa não encontrada")).toBeTruthy();
  });

  it("sem provedor de sessão a rota continua DEMO", async () => {
    currentParams = { slug: "secid" };
    renderWithProviders(<CompanyRoute />);
    await waitFor(() => expect(screen.getAllByRole("heading").length).toBeGreaterThan(0));
    expect(urls(fetchMock).some((x) => x.includes("/api/companies"))).toBe(false);
  });
});

describe("cliente institucional", () => {
  it("cor por token e link do departamento com a empresa", () => {
    expect(nodeColor("Blue")).toBe("blue");
    expect(nodeColor("#ff0000")).toBeNull();
    expect(departmentHref("uts", "secid")).toBe("/departments/uts?company=secid");
    expect(departmentHref("uts")).toBe("/departments/uts");
  });
});

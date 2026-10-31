// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { addSpecialty, cleanSpecialty } from "@/lib/account/publication";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { pageByRoute } from "@/lib/pages/registry";
import { PublicProfile } from "@/components/people/PublicProfile";
import { AccountPanel } from "./AccountPanel";
import { OwnProfile } from "./OwnProfile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", email: "maria@example.com", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
const COMPANY_ME = { ...ME, id: "55555555-5555-4555-8555-555555555555", username: "secid", fullName: "Secretaria das Cidades", profileType: "EMPRESA" };
const withSession = (ui: React.ReactNode) => <CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>;

interface Call { method: string; path: string; body?: unknown }

describe("Configurações › Conta › Perfil público (RF3: especialidades e quem vê)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let calls: Call[] = [];
  let publication = { specialties: ["BIM"], profileVisibility: "AUTENTICADOS" };
  let putReply: (body: { specialties: string[]; profileVisibility: string }) => Response = (b) => { publication = b; return json(200, publication); };

  beforeEach(() => {
    calls = [];
    publication = { specialties: ["BIM"], profileVisibility: "AUTENTICADOS" };
    putReply = (b) => { publication = b; return json(200, publication); };
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path, body });
      if (path === "/api/me") return json(200, ME);
      if (path === "/api/me/publication" && method === "GET") return json(200, publication);
      if (path === "/api/me/publication" && method === "PUT") return putReply(body);
      return json(404, { status: 404, code: "NAO_ENCONTRADO" });
    });
    tokenStore.set("jwt-de-teste");
  });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

  it("acrescenta com Enter, ignora repetida sem caixa nem acento, remove com rótulo acessível e salva com a visibilidade", async () => {
    renderWithProviders(withSession(<AccountPanel />));
    const card = await screen.findByTestId("account-publication");
    await waitFor(() => expect(within(card).getByTestId("specialty-list").textContent).toContain("BIM"));
    const input = within(card).getByLabelText("Especialidades") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Gestão   de contratos " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "gestao DE contratos" } });
    fireEvent.click(within(card).getByTestId("specialty-add"));
    expect(within(card).getByRole("alert").textContent).toContain("já está na lista");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(within(card).getByTestId("specialty-add"));
    expect(within(card).getByRole("alert").textContent).toContain("de 2 a 40 caracteres");
    fireEvent.click(within(card).getByRole("button", { name: "Remover BIM" }));
    expect(within(card).getByTestId("specialty-list").textContent).toBe("Gestão de contratos×");
    fireEvent.click(within(card).getByRole("radio", { name: /Só pessoas da minha empresa/ }));
    fireEvent.click(within(card).getByTestId("publication-save"));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ specialties: ["Gestão de contratos"], profileVisibility: "EMPRESA" });
    expect(await screen.findByText("Perfil público salvo")).toBeTruthy();
  });

  it("422 do servidor aparece no campo; falha de leitura mostra 'tentar de novo'", async () => {
    putReply = () => json(422, { status: 422, code: "VALIDACAO", message: "Revise", details: { fields: { specialties: "Use até 10 especialidades." } } });
    renderWithProviders(withSession(<AccountPanel />));
    const card = await screen.findByTestId("account-publication");
    fireEvent.click(await within(card).findByTestId("publication-save"));
    expect(await within(card).findByText("Use até 10 especialidades.")).toBeTruthy();
  });

  it("a leitura falhou: erro com 'tentar de novo' que relê", async () => {
    let first = true;
    fetchMock.mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/me") return json(200, ME);
      if (path === "/api/me/publication" && (init?.method ?? "GET") === "GET") {
        if (first) { first = false; return json(503, { status: 503, code: "SERVICO_INDISPONIVEL", message: "fora" }); }
        return json(200, publication);
      }
      return json(404, {});
    });
    renderWithProviders(withSession(<AccountPanel />));
    const card = await screen.findByTestId("account-publication");
    fireEvent.click(await within(card).findByRole("button", { name: /tentar de novo/i }));
    await waitFor(() => expect(within(card).getByTestId("specialty-list").textContent).toContain("BIM"));
  });
});

describe("especialidades e parte institucional nos perfis (RF3, RF6)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); tokenStore.set("jwt-de-teste"); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

  it("conta EMPRESA vê a parte institucional real (empresa, departamentos com link e totais da API) separada do portfólio", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/me") return json(200, COMPANY_ME);
      if (path === "/api/tasks") return json(200, []);
      if (path === "/api/me/publication") return json(200, { specialties: [], profileVisibility: "AUTENTICADOS" });
      if (path === "/api/me/institution") {
        return json(200, {
          company: { id: "c1", slug: "secid", name: "Secretaria das Cidades", accentColor: "orange" }, companyStatus: "ATIVA", owner: true, people: 14,
          departments: [{ id: "d1", slug: "uts", companySlug: "secid", acronym: "UTS", name: "Unidade Técnica", color: "blue", monogram: "U", members: 3 }],
        });
      }
      return json(404, {});
    });
    renderWithProviders(withSession(<OwnProfile page={pageByRoute("/profile")!} />));
    const section = await screen.findByTestId("my-institution");
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe("Parte institucional");
    expect(within(section).getByTestId("my-institution-company").getAttribute("href")).toBe("/companies/secid");
    expect(within(section).getByRole("link", { name: "UTS" }).getAttribute("href")).toBe("/departments/uts?company=secid");
    const counters = within(section).getByTestId("my-institution-counters");
    expect(counters.querySelector('[data-counter="departments"] dd')?.textContent).toBe("1");
    expect(counters.querySelector('[data-counter="people"] dd')?.textContent).toBe("14");
    expect(screen.queryByTestId("profile-specialties")).toBeNull();
  });

  it("sem vínculo e conta comum, a seção não aparece; especialidades da API aparecem no cabeçalho", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/me") return json(200, ME);
      if (path === "/api/tasks") return json(200, []);
      if (path === "/api/me/publication") return json(200, { specialties: ["BIM", "Licitações"], profileVisibility: "EMPRESA" });
      if (path === "/api/me/institution") return json(200, { company: null, owner: false, departments: [] });
      return json(404, {});
    });
    renderWithProviders(withSession(<OwnProfile page={pageByRoute("/profile")!} />));
    const tags = await screen.findByTestId("profile-specialties");
    expect(within(tags).getAllByRole("listitem").map((x) => x.textContent)).toEqual(["BIM", "Licitações"]);
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/api/me/institution"))).toBe(true));
    expect(screen.queryByTestId("my-institution")).toBeNull();
  });

  it("perfil de terceiros mostra as especialidades devolvidas pela API", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/me") return json(200, ME);
      if (path === "/api/people/by-username/ana.souza") {
        return json(200, { id: "22222222-2222-4222-8222-222222222222", username: "ana.souza", name: "Ana Souza", profileType: "EMPREGADO", self: false, specialties: ["Saneamento"] });
      }
      if (path.endsWith("/tasks")) return json(200, []);
      return json(404, {});
    });
    renderWithProviders(withSession(<PublicProfile page={pageByRoute("/u/[username]")!} username="ana.souza" />));
    const tags = await screen.findByTestId("profile-specialties");
    expect(tags.textContent).toBe("Saneamento");
  });
});

describe("limpeza das especialidades no cliente", () => {
  it("espaços colapsados e repetidas ignoradas sem caixa nem acento", () => {
    expect(cleanSpecialty("  Gestão \n pública ")).toBe("Gestão pública");
    expect(addSpecialty(["Gestão pública"], "GESTAO PUBLICA")).toEqual({ list: ["Gestão pública"], added: false });
    expect(addSpecialty([], " BIM ")).toEqual({ list: ["BIM"], added: true });
  });
});

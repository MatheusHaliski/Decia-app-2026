// @vitest-environment jsdom
/**
 * Mesa de Trabalho do perfil (RF21): "Minha mesa" com os cartões dos projetos (fase, % concluído, próximo marco, versão), os
 * rascunhos do Autopiloto e o criar projeto; "Mesa da equipe" por fase; `/desk?draft=<id>` (rota do RF30) abre a proposta em
 * modo rascunho e salva na Mesa; visão geral do projeto com os indicadores do motor e os atalhos.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeskPage from "@/app/(shell)/desk/page";
import NewProjectPage from "@/app/(shell)/projects/new/page";
import { listProposalDrafts, saveProposalDraft } from "@/lib/projects/autopilot/drafts";
import { EXAMPLE_OFICIO } from "@/lib/projects/autopilot/examples";
import { extractDemand } from "@/lib/projects/autopilot/extract";
import { proposalToProject, proposeScheme } from "@/lib/projects/autopilot/proposal";
import { buildDemoProject, DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { createMemoryProjectRepository, setDemoProjectRepository, type ProjectRepository } from "@/lib/projects/repository";
import { renderWithProviders } from "@/test-utils/render";
import { MyDesk, TeamBoard } from "./MyDesk";
import { ProjectOverviewPage } from "./ProjectOverview";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn() }),
  usePathname: () => "/desk",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const NOW = new Date("2026-11-12T12:00:00");
const proposal = () => proposeScheme(extractDemand(EXAMPLE_OFICIO, { now: NOW }), { now: NOW, sourceLabel: "Ofício nº 123/2026 – SECID/DTI", sourceKind: "COLAR" });
function seeded(): ProjectRepository {
  const repo = createMemoryProjectRepository([buildDemoProject()]);
  repo.create!(proposalToProject(proposal(), { id: "ap-teste", actorId: "u-pessoa", now: NOW }));
  return repo;
}
const card = (id: string) => document.querySelector<HTMLElement>(`[data-project-card="${id}"]`)!;

beforeEach(() => {
  nav.search = "";
});
afterEach(() => {
  sessionStorage.clear();
  nav.push.mockReset();
  nav.replace.mockReset();
  setDemoProjectRepository(null);
});

describe("Minha mesa", () => {
  it("cartões com fase, % concluído, próximo marco e versão; abrir na Mesa e na visão geral", () => {
    renderWithProviders(<MyDesk repo={seeded()} today="2026-11-12" />);
    // o mais recente primeiro: o gerado pelo Autopiloto
    expect([...document.querySelectorAll("[data-project-card]")].map((c) => c.getAttribute("data-project-card"))).toEqual(["ap-teste", DEMO_PROJECT_ID]);
    const demo = card(DEMO_PROJECT_ID);
    expect(within(demo).getByText("Fase: Elaboração")).toBeTruthy();
    expect(within(demo).getByText("v4")).toBeTruthy();
    expect(within(demo).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("42"); // (3·100 + 3·100 + 4·50 + 1·30) / 20 dias
    expect(demo.querySelector("[data-next-milestone]")!.textContent).toMatch(/Próximo marco: Entrega v1\.0 · 16/);
    expect(within(demo).getByRole("link", { name: /Abrir na Mesa/ }).getAttribute("href")).toBe(`/projects/${DEMO_PROJECT_ID}/edit`);
    expect(within(demo).getByRole("link", { name: "Visão geral" }).getAttribute("href")).toBe(`/projects/${DEMO_PROJECT_ID}`);
    const ap = card("ap-teste");
    expect(within(ap).getByText("Gerado pelo Autopiloto")).toBeTruthy();
    expect(within(ap).getByText("Fase: Demanda")).toBeTruthy();
    expect(within(ap).getByText("v1")).toBeTruthy();
    expect(ap.querySelector("[data-next-milestone]")!.textContent).toMatch(/Aprovação do comitê \(portão\) · 03/);
    expect(within(ap).getByText(/Gerado pelo Autopiloto a partir de Ofício nº 123\/2026 – SECID\/DTI/)).toBeTruthy();
    // a prévia da skin e da arte de fundo continua
    expect(screen.getByRole("link", { name: "Trocar skin ou arte" }).getAttribute("href")).toBe("/settings?tab=aparencia");
  });

  it("rascunhos do Autopiloto ainda não salvos: abrir na Mesa (rascunho) ou descartar", () => {
    const id = saveProposalDraft({ proposal: proposal() });
    renderWithProviders(<MyDesk repo={seeded()} today="2026-11-12" />);
    const item = document.querySelector<HTMLElement>(`[data-draft="${id}"]`)!;
    expect(within(item).getByText("Implantação do sistema de protocolo digital")).toBeTruthy();
    expect(within(item).getByRole("link", { name: "Abrir na Mesa (rascunho)" }).getAttribute("href")).toBe(`/desk?draft=${id}`);
    fireEvent.click(within(item).getByRole("button", { name: "Descartar o rascunho Implantação do sistema de protocolo digital" }));
    expect(document.querySelector(`[data-draft="${id}"]`)).toBeNull();
    expect(listProposalDrafts()).toEqual([]);
  });

  it("criar projeto em branco abre a Mesa do projeto novo (versão 1 'Projeto criado')", () => {
    const repo = seeded();
    renderWithProviders(<MyDesk repo={repo} today="2026-11-12" />);
    const blank = document.querySelector<HTMLElement>('[data-create-project] section[aria-labelledby="new-blank"]')!;
    fireEvent.change(within(blank).getByLabelText(/Título do projeto/), { target: { value: "Portal da transparência" } });
    fireEvent.change(within(blank).getByLabelText("Área do projeto"), { target: { value: "ADMINISTRACAO" } });
    fireEvent.click(within(blank).getByRole("button", { name: "Criar em branco" }));
    const created = repo.list!()[0]!;
    expect(created).toMatchObject({ title: "Portal da transparência", area: "ADMINISTRACAO", version: 1, versions: [expect.objectContaining({ key: "projectCreated" })] });
    expect(nav.push).toHaveBeenCalledWith(`/projects/${created.id}/edit`);
  });

  it("Mesa da equipe: os projetos da aba agrupados pela fase atual", () => {
    renderWithProviders(<TeamBoard repo={seeded()} />);
    expect(within(document.querySelector<HTMLElement>('[data-team-phase="ELABORACAO"]')!).getByRole("link", { name: "Plataforma DECIA v1.0" }).getAttribute("href")).toBe(`/projects/${DEMO_PROJECT_ID}`);
    expect(within(document.querySelector<HTMLElement>('[data-team-phase="DEMANDA"]')!).getByRole("link", { name: "Implantação do sistema de protocolo digital" })).toBeTruthy();
    expect(within(document.querySelector<HTMLElement>('[data-team-phase="EXECUCAO"]')!).getByText("Nenhum projeto.")).toBeTruthy();
  });
});

describe("/desk?draft=<id> — Mesa em modo rascunho (RF30)", () => {
  it("abre a proposta como sub-aba própria, edita e salva criando o projeto na Mesa", () => {
    const repo = createMemoryProjectRepository([]);
    setDemoProjectRepository(repo);
    const id = saveProposalDraft({ proposal: proposal() });
    nav.search = `draft=${id}`;
    renderWithProviders(<DeskPage />);
    expect(screen.getByRole("tab", { name: "Rascunho do Autopiloto" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector(`[data-draft-desk="${id}"]`)).toBeTruthy();
    expect(screen.getByText(/nada foi salvo ainda/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Excluir Mapa das partes interessadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar e abrir na Mesa" }));
    const [created] = repo.list!();
    expect(created!.tasks.some((t) => t.title === "Mapa das partes interessadas")).toBe(false);
    expect(created!.versions[0]).toMatchObject({ key: "autopilotCreated" });
    expect(nav.push).toHaveBeenCalledWith(`/projects/${created!.id}/edit`);
    expect(listProposalDrafts()).toEqual([]);
  });

  it("rascunho vencido ou inexistente: aviso e caminho de volta ao Autopiloto", () => {
    setDemoProjectRepository(createMemoryProjectRepository([]));
    nav.search = "draft=abcdefgh1234";
    renderWithProviders(<DeskPage />);
    expect(screen.getByText("Rascunho não encontrado")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Autopiloto: projeto a partir de uma demanda/ }).getAttribute("href")).toBe("/autopilot");
  });
});

describe("/projects/new", () => {
  it("a partir de modelo: contratação com ETP, TR, parecer e licitação, creditando os modelos de área", () => {
    const repo = createMemoryProjectRepository([]);
    setDemoProjectRepository(repo);
    renderWithProviders(<NewProjectPage />);
    const tpl = document.querySelector<HTMLElement>('section[aria-labelledby="new-template"]')!;
    fireEvent.click(within(tpl).getByRole("radio", { name: /Contratação \(Lei 14\.133\)/ }));
    fireEvent.change(within(tpl).getByLabelText("Título do projeto"), { target: { value: "Compra de notebooks" } });
    fireEvent.click(within(tpl).getByRole("button", { name: "Criar a partir do modelo" }));
    const [p] = repo.list!();
    expect(p!.title).toBe("Compra de notebooks");
    expect(p!.tasks.map((t) => t.title)).toEqual(expect.arrayContaining(["Estudo técnico preliminar (ETP)", "Termo de referência (TR)", "Licitação e assinatura do contrato"]));
    expect(p!.origin).toMatchObject({ kind: "MODELO", label: "Contratação (Lei 14.133)" });
    expect(p!.versions[0]).toMatchObject({ key: "projectFromTemplate", vars: { template: "Contratação (Lei 14.133)" } });
    expect(screen.getByRole("link", { name: "Abrir o Autopiloto" }).getAttribute("href")).toBe("/autopilot");
  });
});

describe("visão geral do projeto (/projects/[id])", () => {
  it("resumo, indicadores do motor, ciclo de vida, últimas versões e atalhos para Mesa, Simulador e Espelho", () => {
    renderWithProviders(<ProjectOverviewPage projectId={DEMO_PROJECT_ID} repo={seeded()} today="2026-11-12" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Plataforma DECIA v1\.0/);
    const ind = (k: string) => document.querySelector<HTMLElement>(`[data-indicator="${k}"]`)!.textContent;
    expect(ind("finish")).toMatch(/14 d/);
    expect(ind("finish")).toMatch(/Caminho crítico: T01 → T03 → T05 → T06 → T07/);
    expect(ind("cpi")).toMatch(/0,89/);
    expect(ind("cpi")).toMatch(/Acima do orçamento/i);
    expect(ind("spi")).toMatch(/0,55/);
    expect(ind("nextMilestone")).toMatch(/Entrega v1\.0/);
    expect(document.querySelector('[aria-current="step"]')!.textContent).toMatch(/Elaboração/);
    expect([...document.querySelectorAll("[data-version]")].map((v) => v.getAttribute("data-version"))).toEqual(["4", "3", "2", "1"]);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(expect.arrayContaining([`/projects/${DEMO_PROJECT_ID}/edit`, `/projects/${DEMO_PROJECT_ID}/simulate`, `/projects/${DEMO_PROJECT_ID}/mirror`]));
  });

  it("projeto gerado pelo Autopiloto: origem com a fonte e os modelos creditados; prazo cabe", () => {
    renderWithProviders(<ProjectOverviewPage projectId="ap-teste" repo={seeded()} today="2026-11-12" />);
    expect(document.querySelector('[data-origin="AUTOPILOTO"]')!.textContent).toMatch(/Gerado pelo Autopiloto a partir de Ofício nº 123\/2026 – SECID\/DTI/);
    expect(screen.getByText("Estudo técnico preliminar (ETP) de contratação")).toBeTruthy();
    expect(document.querySelector('[data-indicator="deadline"]')!.textContent).toMatch(/Cabe no prazo/);
  });

  it("projeto que não está na aba: aviso com o exemplo e o criar projeto", () => {
    renderWithProviders(<ProjectOverviewPage projectId="nao-existe" repo={seeded()} today="2026-11-12" />);
    expect(screen.getByText("Projeto não está nesta aba")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Criar projeto" }).getAttribute("href")).toBe("/projects/new");
  });
});

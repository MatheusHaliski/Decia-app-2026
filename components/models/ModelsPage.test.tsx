// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoModelsRepository, setDemoModelsRepository } from "@/lib/models/useModels";
import { pageByRoute } from "@/lib/pages/registry";
import { seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger, type PointsLedger } from "@/lib/points/ledger";
import { setPointsLedger } from "@/lib/points/usePoints";
import { loadTaskDraft } from "@/lib/tasks/drafts";
import { renderWithProviders } from "@/test-utils/render";
import { ModelsPage } from "./ModelsPage";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/models",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const PAGE = pageByRoute("/models")!;
let ledger: PointsLedger;

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  nav.push.mockReset();
  ledger = createMemoryLedger();
  seedLabPersonas(ledger, new Date());
  setPointsLedger(ledger);
  setDemoModelsRepository(null);
});
afterEach(() => {
  setPointsLedger(null);
  setDemoModelsRepository(null);
});

const draftIdFrom = (href: string) => new URL(href, "http://localhost").searchParams.get("rascunho");

/** Balcão de Modelos (`/models`, RF40). */
describe("Balcão de Modelos", () => {
  it("prateleira Chancelados e Comunidade com busca e filtros; o card mostra autor, departamento, licença, preço e reutilizações", async () => {
    renderWithProviders(<ModelsPage page={PAGE} />);
    const grid = await screen.findByTestId("models-grid");
    expect(within(grid).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["model-card-mo-etp", "model-card-mo-tr", "model-card-mo-kit-contratacao"]);
    const tr = screen.getByTestId("model-card-mo-tr");
    expect(tr.textContent).toContain("Bruno Exemplo · SECID-UTS");
    expect(tr.textContent).toContain("Cópia livre");
    expect(tr.textContent).toContain("9 reutilizações");
    expect(tr.textContent).toContain("Modelo oficial da Secretaria");
    fireEvent.click(within(tr).getByRole("button", { name: /Ver detalhes de Termo de referência/ }));
    expect(nav.replace).toHaveBeenCalledWith("/models?modelo=mo-tr", { scroll: false });

    nav.search = "tab=comunidade";
    renderWithProviders(<ModelsPage page={PAGE} />);
    const searches = await screen.findAllByTestId("models-search");
    fireEvent.change(searches[1]!, { target: { value: "parecer" } });
    await waitFor(() => expect(within(screen.getAllByTestId("models-grid")[1]!).getAllByRole("listitem")).toHaveLength(1));
    fireEvent.change(searches[1]!, { target: { value: "" } });
    fireEvent.change(screen.getAllByTestId("models-kind")[1]!, { target: { value: "KIT" } });
    await waitFor(() => expect(within(screen.getAllByTestId("models-grid")[1]!).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["model-card-mo-kit-entrega-software"]));
  });

  it("detalhe com prévia e licença, sem expor quem reutilizou; modelo grátis vira rascunho do criador", async () => {
    nav.search = "modelo=mo-defeito";
    renderWithProviders(<ModelsPage page={PAGE} />);
    const detail = await screen.findByTestId("model-detail");
    expect(detail.textContent).toContain("Quem reutilizou não aparece");
    expect(within(detail).getByTestId("model-reuses").textContent).toContain("21 reutilizações");
    expect(detail.textContent).toContain("Critérios de aceite");
    fireEvent.click(within(detail).getByTestId("model-use"));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    const href = nav.push.mock.calls[0]![0] as string;
    expect(href).toMatch(/^\/tasks\/new\?rascunho=/);
    const draft = loadTaskDraft(draftIdFrom(href));
    expect(draft?.draft.title).toBe("Correção de defeito com análise de causa raiz");
    expect(draft?.origin).toMatchObject({ kind: "OUTRO", ref: "mo-defeito" });
    expect(demoModelsRepository().get("mo-defeito")!.reuseCount).toBe(22);
    expect(ledger.entries("u-carla")).toEqual([]);
  });

  it("modelo pago: pede confirmação, debita quem usa, credita o autor e o rascunho leva o crédito da licença com atribuição", async () => {
    nav.search = "modelo=mo-adr";
    renderWithProviders(<ModelsPage page={PAGE} />);
    const detail = await screen.findByTestId("model-detail");
    fireEvent.click(within(detail).getByTestId("model-use"));
    expect((await within(detail).findByText("Este modelo custa 10 DP")).parentElement!.textContent).toContain("Diego Exemplo");
    expect(nav.push).not.toHaveBeenCalled();
    fireEvent.click(within(detail).getByRole("button", { name: "Confirmar e usar (10 DP)" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    expect(ledger.balance("u-pessoa")).toBe(1230);
    expect(ledger.balance("u-diego")).toBe(10);
    const draft = loadTaskDraft(draftIdFrom(nav.push.mock.calls[0]![0] as string));
    expect(draft?.draft.descriptionMd).toContain("Baseado no modelo “Registro de decisão de arquitetura (ADR)”, de Diego Exemplo");
  });

  it("sem saldo o uso pago é recusado com a explicação; o projeto leva à Mesa e ao Autopiloto", async () => {
    setPointsLedger(createMemoryLedger());
    setDemoModelsRepository(null);
    nav.search = "modelo=mo-kit-contratacao";
    renderWithProviders(<ModelsPage page={PAGE} />);
    const detail = await screen.findByTestId("model-detail");
    fireEvent.click(within(detail).getByTestId("model-use"));
    fireEvent.click(await within(detail).findByRole("button", { name: "Confirmar e usar (30 DP)" }));
    const alert = await within(detail).findByRole("alert");
    expect(alert.textContent).toContain("SALDO_INSUFICIENTE");
    expect(alert.textContent).toContain("faltam 30 DP");

    nav.search = "modelo=mo-projeto-decia";
    renderWithProviders(<ModelsPage page={PAGE} />);
    const project = (await screen.findAllByTestId("model-detail")).at(-1)!;
    expect(project.textContent).toContain("Somente leitura");
    fireEvent.click(within(project).getByTestId("model-use"));
    expect(within(project).getByRole("link", { name: /Abrir a Mesa do projeto/ }).getAttribute("href")).toBe("/projects/decia-v1/edit");
    expect(within(project).getByRole("link", { name: /Planejar com o Autopiloto/ }).getAttribute("href")).toBe("/autopilot");
  });

  it("oferecer como modelo: grava na Comunidade pela função reutilizável e aparece em Meus modelos oferecidos", async () => {
    renderWithProviders(<ModelsPage page={PAGE} />);
    fireEvent.click(await screen.findByTestId("offer-open"));
    const form = await screen.findByTestId("offer-form");
    fireEvent.change(within(form).getByTestId("offer-template"), { target: { value: "area.administracao.relatorio-gerencial-com-indicadores" } });
    fireEvent.change(within(form).getByTestId("offer-price"), { target: { value: "60" } });
    fireEvent.submit(form);
    expect((await within(form).findByRole("alert")).textContent).toContain("de 0 a 50 DP");
    fireEvent.change(within(form).getByTestId("offer-price"), { target: { value: "12" } });
    fireEvent.submit(form);
    const mine = await screen.findByTestId("models-mine");
    const offer = demoModelsRepository().list().find((o) => o.authorId === "u-pessoa")!;
    expect(offer).toMatchObject({ shelf: "COMUNIDADE", pricePoints: 12, department: "SECID-UTS", license: "ATRIBUICAO" });
    expect(mine.textContent).toContain(offer.title);
    expect(nav.replace).toHaveBeenLastCalledWith(`/models?modelo=${offer.id}`, { scroll: false });
  });

  it("CURADOR só navega: sem oferecer nem usar", async () => {
    nav.search = "modelo=mo-etp";
    renderWithProviders(<ModelsPage page={PAGE} />, { profile: "CURADOR" });
    const detail = await screen.findByTestId("model-detail");
    expect(within(detail).queryByTestId("model-use")).toBeNull();
    expect(screen.queryByTestId("offer-open")).toBeNull();
  });
});

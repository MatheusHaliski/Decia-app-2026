// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExtractPage from "@/app/(shell)/tasks/extrair/page";
import TaskExtractRoute from "@/app/(shell)/tasks/[id]/extrair/page";
import { pageByRoute } from "@/lib/pages/registry";
import { loadTaskDraft } from "@/lib/tasks/drafts";
import { renderWithProviders } from "@/test-utils/render";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: vi.fn() }),
  usePathname: () => "/tasks/extrair",
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

type V = string | number;
const g = (...pairs: [number, V][]) => pairs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n");
const DXF = [
  g([0, "SECTION"], [2, "HEADER"], [9, "$INSUNITS"], [70, 6], [0, "ENDSEC"]),
  g([0, "SECTION"], [2, "ENTITIES"]),
  g([0, "LWPOLYLINE"], [8, "PISO"], [90, 4], [70, 1], [10, 0], [20, 0], [10, 6], [20, 0], [10, 6], [20, 5], [10, 0], [20, 5]),
  g([0, "ENDSEC"], [0, "EOF"]),
].join("\n");

const UUID = "33333333-3333-4333-8333-333333333333";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  nav.push.mockReset();
  sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("registro das rotas novas", () => {
  it("/tasks/extrair e /tasks/[id]/extrair citam RF34 e RF70, só para quem está logado", () => {
    for (const route of ["/tasks/extrair", "/tasks/[id]/extrair"]) {
      const page = pageByRoute(route)!;
      expect(page.rfs).toEqual(["RF34", "RF70"]);
      expect(page.access.VISITANTE).toBe("O");
      expect(page.access.EMPREGADO).toBe("E");
    }
  });
});

describe("/tasks/extrair (arquivo avulso)", () => {
  it("mostra a bancada dentro da página do RF e lê um DXF", async () => {
    renderWithProviders(<ExtractPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Extrair dados de desenho/ })).toBeTruthy();
    expect(screen.getByTestId("cad-workbench")).toBeTruthy();
    fireEvent.change(screen.getByTestId("cad-input"), { target: { files: [new File([DXF], "piso.dxf")] } });
    expect(await screen.findByTestId("cad-qty-dxf:area:PISO")).toBeTruthy();
    expect((screen.getByTestId("cad-qty-dxf:area:PISO") as HTMLInputElement).value).toBe("30");
  });

  it("visitante recebe 403 (rota só para quem está logado)", () => {
    renderWithProviders(<ExtractPage />, { profile: "VISITANTE" });
    expect(screen.getByText("403 ACESSO_NEGADO")).toBeTruthy();
    expect(screen.queryByTestId("cad-workbench")).toBeNull();
  });
});

describe("/tasks/[id]/extrair (a partir de uma tarefa)", () => {
  const route = async (id: string) => TaskExtractRoute({ params: Promise.resolve({ id }) });

  it("id fora do formato é 404", async () => {
    await expect(route("../../etc")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("tarefa DEMO de desenho técnico (dono = CHEFE): mostra a origem, o aviso do DWG e a bancada; o rascunho leva a tarefa de origem", async () => {
    renderWithProviders(await route("t-chefe-planta"), { profile: "CHEFE" });
    const source = await screen.findByTestId("cad-source");
    expect(source.textContent).toContain("Planta baixa da sede regional");
    expect(source.textContent).toContain(".dwg");
    expect(source.textContent).toContain("O desenho desta tarefa está em DWG: exporte como DXF ou IFC e envie aqui.");
    fireEvent.change(screen.getByTestId("cad-input"), { target: { files: [new File([DXF], "planta.dxf")] } });
    await screen.findByTestId("cad-quantities");
    fireEvent.click(screen.getByTestId("cad-create-task"));
    const id = String(nav.push.mock.calls[0]![0]).split("=")[1]!;
    const handoff = loadTaskDraft(id)!;
    expect(handoff.origin).toEqual({ kind: "CAD", label: "planta.dxf", ref: "t-chefe-planta" });
    expect(handoff.draft.type).toBe("PLANILHA");
    expect(handoff.draft.descriptionMd).toContain("Tarefa de origem: [Planta baixa da sede regional](/tasks/t-chefe-planta)");
  });

  it("outra pessoa (EMPREGADO) vê a tarefa mas não extrai: 403 ACESSO_NEGADO", async () => {
    renderWithProviders(await route("t-chefe-planta"), { profile: "EMPREGADO" });
    expect(await screen.findByText("403 ACESSO_NEGADO")).toBeTruthy();
    expect(screen.getByText("Só o dono da tarefa extrai dados do desenho")).toBeTruthy();
    expect(screen.queryByTestId("cad-workbench")).toBeNull();
  });

  it("tarefa do tipo CRONOGRAMA não é de desenho nem documento: 422", async () => {
    renderWithProviders(await route("t-pessoa-cronograma"), { profile: "EMPREGADO" });
    expect(await screen.findByText("422 VALIDACAO")).toBeTruthy();
    expect(screen.getByText("Esta tarefa não é de desenho técnico nem de documento")).toBeTruthy();
  });

  it("tarefa persistida: lista os anexos legíveis, baixa o .dxf do próprio servidor e lê no navegador", async () => {
    const bytes = new TextEncoder().encode(DXF);
    fetchMock.mockImplementation(async (input) => {
      const u = new URL(String(input));
      if (u.pathname === `/api/tasks/${UUID}`) return json(200, { id: UUID, title: "Planta executiva", type: "DESENHO_TECNICO", editable: true, version: 1 });
      if (u.pathname === `/api/tasks/${UUID}/attachments`) {
        return json(200, [
          { id: "a1", fileName: "planta.dxf", sizeBytes: bytes.length, available: true, scanStatus: "LIMPO" },
          { id: "a2", fileName: "memorial.pdf", sizeBytes: 900, available: true, scanStatus: "LIMPO" },
          { id: "a3", fileName: "virus.dxf", sizeBytes: 10, available: true, scanStatus: "INFECTADO" },
        ]);
      }
      if (u.pathname === `/api/tasks/${UUID}/attachments/a1/content`) return new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } });
      return json(404, { code: "NAO_ENCONTRADO" });
    });
    renderWithProviders(await route(UUID));
    expect((await screen.findByTestId("cad-source")).textContent).toContain("Planta executiva");
    const attachments = await screen.findByTestId("cad-attachments");
    expect(attachments.textContent).toBe("Anexos desta tarefa que dá para ler:planta.dxf");
    fireEvent.click(screen.getByRole("button", { name: "Ler o anexo planta.dxf" }));
    await waitFor(() => expect((screen.getByTestId("cad-qty-dxf:area:PISO") as HTMLInputElement).value).toBe("30"));
    expect(fetchMock.mock.calls.some(([i]) => String(i).endsWith("/attachments/a1/content"))).toBe(true);
  });

  it("tarefa persistida que a pessoa não pode editar: 403, sem baixar anexos", async () => {
    fetchMock.mockImplementation(async (input) => {
      const u = new URL(String(input));
      if (u.pathname === `/api/tasks/${UUID}`) return json(200, { id: UUID, title: "Planta de outra pessoa", type: "DESENHO_TECNICO", editable: false, version: 1 });
      return json(404, { code: "NAO_ENCONTRADO" });
    });
    renderWithProviders(await route(UUID));
    expect(await screen.findByText("403 ACESSO_NEGADO")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([i]) => String(i).includes("/attachments"))).toBe(false);
  });
});

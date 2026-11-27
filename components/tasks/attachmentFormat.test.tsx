// @vitest-environment jsdom
/**
 * Formato nos anexos e evidências: ícone + família · variante + detalhes, "estimado" quando derivado no navegador, aviso quando o anexo
 * não corresponde ao formato pedido na tarefa e filtro por família em /attachments.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { MyAttachments, TaskAttachments } from "./Attachments";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ID = "22222222-2222-4222-8222-222222222222";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const att = (id: string, fileName: string, mimeType: string, over: Record<string, unknown> = {}) => ({
  id, taskId: ID, taskTitle: "Base de imóveis", fileName, mimeType, sizeBytes: 1000, image: mimeType.startsWith("image/"), scanStatus: "LIMPO", available: true,
  createdAt: "2026-11-12T13:00:00Z", ...over,
});
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe("formato dos anexos", () => {
  it("no detalhe: formato estimado, formato do servidor com detalhes e aviso de divergência com o pedido", async () => {
    fetchMock.mockResolvedValue(json(200, [
      att("44444444-4444-4444-8444-444444444441", "imoveis.csv", "text/csv"),
      att("44444444-4444-4444-8444-444444444442", "imoveis.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      att("44444444-4444-4444-8444-444444444443", "export.csv", "text/csv", { formatFamily: "PLANILHA", formatVariant: "CSV", formatDetails: { encoding: "UTF8", delimiter: "SEMICOLON" } }),
    ]));
    const task = { id: ID, version: 1, title: "Base de imóveis", type: "PLANILHA", editable: false, state: "EM_USO", extensions: { fileFormat: "family=PLANILHA&variant=XLSX" } };
    renderWithProviders(<TaskAttachments task={task as never} />);
    const items = await screen.findAllByTestId("attachment-item");
    const fmt = items.map((i) => within(i).getByTestId("attachment-format"));
    expect(fmt[0]!.textContent).toContain("Planilha · CSV");
    expect(fmt[0]!.textContent).toContain("estimado pela extensão");
    expect(fmt[0]!.getAttribute("data-match")).toBe("false");
    expect(within(fmt[0]!).getByTestId("format-mismatch").textContent).toContain("difere do pedido: Planilha · XLSX");
    expect(fmt[1]!.getAttribute("data-match")).toBe("true");
    expect(fmt[2]!.textContent).toContain("Planilha · CSV · ponto e vírgula (;), UTF-8");
    expect(fmt[2]!.getAttribute("data-estimated")).toBe("false");
    expect(screen.getByTestId("format-asked").textContent).toContain("2 anexos não correspondem ao formato pedido");
    // o ícone ao lado do texto é decorativo
    expect(fmt[0]!.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("em /attachments: formato em cada linha e filtro por família", async () => {
    fetchMock.mockResolvedValue(json(200, [
      att("44444444-4444-4444-8444-444444444441", "imoveis.csv", "text/csv"),
      att("44444444-4444-4444-8444-444444444442", "planta.dwg", "image/vnd.dwg"),
      att("44444444-4444-4444-8444-444444444443", "foto.jpg", "image/jpeg"),
    ]));
    renderWithProviders(<MyAttachments />);
    expect(await screen.findAllByTestId("my-attachment-row")).toHaveLength(3);
    const select = screen.getByLabelText(/^Formato/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["", "PLANILHA", "IMAGEM", "DESENHO_TECNICO"]);
    fireEvent.change(select, { target: { value: "DESENHO_TECNICO" } });
    const rows = screen.getAllByTestId("my-attachment-row");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByTestId("attachment-format").textContent).toContain("Desenho técnico · DWG");
  });
});

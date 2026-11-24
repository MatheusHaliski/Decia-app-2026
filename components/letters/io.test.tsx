// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { buildDemoPieces } from "@/lib/letters/fixtures";
import { exportDocx } from "@/lib/letters/io/docx";
import { createMemoryLettersRepository } from "@/lib/letters/repository";
import { LettersHome } from "./LettersHome";
import { PieceEditor } from "./PieceEditor";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/letters/relatorio-auditoria-protocolo",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const readBlob = (b: Blob) =>
  new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.readAsText(b);
  });
const NOW = new Date("2026-11-13T12:00:00Z");
const ID = "relatorio-auditoria-protocolo";

async function setup() {
  const repo = createMemoryLettersRepository(buildDemoPieces(NOW));
  renderWithProviders(<PieceEditor pieceId={ID} repo={repo} />);
  await screen.findByRole("complementary", { name: "Copiloto linguístico e narrativo" });
  return repo;
}

function upload(name: string, content: string | Uint8Array, type = "text/plain") {
  const file = new File([content], name, { type });
  fireEvent.change(screen.getByTestId("letters-import-input"), { target: { files: [file] } });
}

describe("importar no editor — RF52.CA04/CA07", () => {
  it("mostra o relatório de fidelidade antes de aplicar; confirmar substitui numa revisão nova e Desfazer volta", async () => {
    const repo = await setup();
    const before = repo.get(ID)!;
    fireEvent.click(screen.getByRole("button", { name: "Importar…" }));
    const dialog = await screen.findByRole("dialog", { name: "Importar documento" });
    expect(within(dialog).getByRole("button", { name: "Confirmar importação" }).hasAttribute("disabled")).toBe(true);
    upload("nota.md", "# Nota\n\nTexto **forte** com [link](https://ex.com).\n\n![fig](a.png)\n\n- a\n- b\n");
    const report = await within(dialog).findByTestId("letters-import-report");
    expect(within(report).getByText(/nota\.md · MD · 3 bloco\(s\)/)).toBeTruthy();
    expect(within(report).getByText("Descartado")).toBeTruthy();
    expect(report.querySelector('[data-loss="IMAGEM"]')!.textContent).toMatch(/Imagens e figuras descartadas.*: 1/);
    expect(report.querySelector('[data-loss="LINK"]')!.textContent).toMatch(/texto \(endereço\)/);
    expect(within(report).getByRole("list", { name: "Prévia" }).textContent).toContain("Texto forte com link (https://ex.com).");
    // nada mudou antes do aceite
    expect(repo.get(ID)!.revision).toBe(before.revision);
    within(dialog).getByRole("radio", { name: /Substituir o conteúdo/ });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar importação" }));
    await waitFor(() => expect(repo.get(ID)!.revision).toBe(before.revision + 1));
    expect(repo.get(ID)!.blocks.map((b) => b.text)).toEqual(["Nota", "Texto forte com link (https://ex.com).", "a\nb"]);
    expect(screen.getByText(/Conteúdo substituído por nota\.md \(MD, 3 blocos\)/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("editor-cmd-undo"));
    expect(repo.get(ID)!.blocks).toEqual(before.blocks);
  });

  it("acrescentar ao fim mantém os blocos atuais", async () => {
    const repo = await setup();
    const n = repo.get(ID)!.blocks.length;
    fireEvent.click(screen.getByRole("button", { name: "Importar…" }));
    const dialog = await screen.findByRole("dialog");
    upload("extra.txt", "Parágrafo extra.");
    await within(dialog).findByText("Nada será perdido: todo o conteúdo cabe no editor por blocos.");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Acrescentar ao fim/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar importação" }));
    await waitFor(() => expect(repo.get(ID)!.blocks).toHaveLength(n + 1));
    expect(repo.get(ID)!.blocks.at(-1)!.text).toBe("Parágrafo extra.");
  });

  it("arquivo recusado mostra o motivo e não altera a peça", async () => {
    const repo = await setup();
    const before = repo.get(ID)!;
    fireEvent.click(screen.getByRole("button", { name: "Importar…" }));
    const dialog = await screen.findByRole("dialog");
    upload("relatorio.pdf", "%PDF-1.7", "application/pdf");
    const alert = await within(dialog).findByTestId("letters-import-rejected");
    expect(alert.getAttribute("data-reason")).toBe("FORMATO_NAO_SUPORTADO");
    expect(alert.textContent).toMatch(/Formato não suportado/);
    expect(alert.textContent).toMatch(/A peça atual não foi alterada/);
    upload("macro.docm", new Uint8Array([0x50, 0x4b, 3, 4]));
    await waitFor(() => expect(within(dialog).getByTestId("letters-import-rejected").getAttribute("data-reason")).toBe("DOCX_MACROS"));
    expect(within(dialog).getByRole("button", { name: "Confirmar importação" }).hasAttribute("disabled")).toBe(true);
    expect(repo.get(ID)).toBe(before);
  });

  it("HTML com script: o conteúdo aparece como texto e o script é listado como removido", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "Importar…" }));
    const dialog = await screen.findByRole("dialog");
    upload("p.html", '<p onclick="x()">Olá<script>window.__pwned = 1</script> <b>&lt;img src=x&gt;</b></p>', "text/html");
    const report = await within(dialog).findByTestId("letters-import-report");
    expect(report.querySelector('[data-loss="SCRIPT"]')!.textContent).toMatch(/: 2$/);
    expect(within(report).getByRole("list", { name: "Prévia" }).textContent).toContain("Olá <img src=x>");
    expect(report.querySelector("img")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });
});

describe("exportar — RF52.CA05", () => {
  const created: Blob[] = [];
  beforeEach(() => {
    created.length = 0;
    Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => (created.push(b), "blob:letters/1")), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("o menu lista só os formatos habilitados e a impressão; baixar Markdown gera o arquivo", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    const menu = await screen.findByTestId("letters-export-menu");
    const names = within(menu).getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["Markdown (.md)", "Texto puro (.txt)", "Página HTML (.html)", "Word (.docx)", "Imprimir / salvar como PDF"]);
    expect(menu.textContent).not.toMatch(/ODT|RTF/);
    fireEvent.click(within(menu).getByRole("button", { name: "Markdown (.md)" }));
    await waitFor(() => expect(created).toHaveLength(1));
    const text = await readBlob(created[0]!);
    expect(text).toContain("# Relatório técnico — Auditoria do sistema de protocolo digital");
    expect(text).toContain("tipo: RELATORIO_TECNICO");
    expect(await screen.findByText(/Arquivo relatorio-tecnico-auditoria-do-protocolo-digital\.md gerado\./)).toBeTruthy();
  });

  it("imprimir abre a versão para impressão (HTML escapado, sem script)", async () => {
    await setup();
    const win = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Imprimir / salvar como PDF" }));
    expect(open).toHaveBeenCalledWith("blob:letters/1", "_blank");
    const html = await readBlob(created[0]!);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<dt>Tipo</dt><dd>Relatório técnico</dd>");
    win.addEventListener.mock.calls[0]![1]();
    expect(win.print).toHaveBeenCalled();
    expect(screen.getByText(/Versão para impressão aberta/)).toBeTruthy();
  });
});

describe("sumário e busca — RF52.CA03", () => {
  it("sumário lista os títulos e leva ao bloco", async () => {
    await setup();
    const toc = screen.getByTestId("letters-toc");
    expect(within(toc).getAllByRole("button")).toHaveLength(7);
    fireEvent.click(within(toc).getByRole("button", { name: "Ir para o título 3 Metodologia" }));
    expect(document.activeElement?.closest("[data-block-id]")?.getAttribute("data-block-id")).toBe("b6");
  });

  it("busca sem acento destaca blocos, conta e navega com próximo/anterior selecionando o trecho", async () => {
    await setup();
    const input = screen.getByTestId("letters-search");
    fireEvent.change(input, { target: { value: "AUDITORIA" } });
    const status = screen.getByTestId("letters-search-status");
    expect(status.textContent).toBe("3 resultado(s).");
    expect(document.querySelectorAll("[data-search-hits]").length).toBe(2);
    expect(within(screen.getByTestId("letters-search-results")).getAllByRole("button")[0]!.querySelector("mark")!.textContent).toBe("Auditoria");
    input.focus();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(status.textContent).toMatch(/^Resultado 1 de 3 · Bloco 1/);
    expect(document.activeElement).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(status.textContent).toMatch(/^Resultado 2 de 3 · Bloco 3/);
    const ta = document.activeElement as HTMLTextAreaElement;
    expect(ta.value.slice(ta.selectionStart, ta.selectionEnd).toLowerCase()).toBe("auditoria");
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(status.textContent).toMatch(/^Resultado 3 de 3/);
    fireEvent.change(input, { target: { value: "inexistente" } });
    expect(status.textContent).toBe("Nenhum resultado para “inexistente”.");
    expect(document.querySelectorAll("[data-search-hits]").length).toBe(0);
  });
});

describe("/letters — importar como nova peça", () => {
  beforeEach(() => nav.push.mockReset());

  it("um .docx vira peça nova (título do documento) e abre no editor", async () => {
    const repo = createMemoryLettersRepository([]);
    renderWithProviders(<LettersHome repo={repo} />);
    fireEvent.click(await screen.findByRole("button", { name: "Importar arquivo" }));
    const dialog = await screen.findByRole("dialog", { name: "Importar arquivo como nova peça" });
    const source = buildDemoPieces(NOW)[2]!;
    upload("parecer.docx", await exportDocx(source), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    await within(dialog).findByText(/Título do documento: Parecer nº 12\/2026/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar peça com este conteúdo" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    const created = repo.list()[0]!;
    expect(nav.push).toHaveBeenCalledWith(`/letters/${created.id}`);
    expect(created).toMatchObject({ title: source.title, docType: "PARECER", revision: 1 });
    expect(created.blocks.map((b) => b.text)).toEqual(source.blocks.map((b) => b.text));
    expect(created.history[0]).toMatchObject({ origin: "IMPORT", summary: "io.imported" });
  });
});

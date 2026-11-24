import { describe, expect, it } from "vitest";
import { buildDemoPieces } from "../fixtures";
import { exportPiece } from "./export";
import { importFile } from "./import";
import type { ExportFormat } from "./model";
import { samplePiece, shape, TEST_LABELS } from "./testkit";

const enc = new TextEncoder();

async function roundTrip(piece: ReturnType<typeof samplePiece>, format: ExportFormat) {
  const file = await exportPiece(piece, format, TEST_LABELS);
  const bytes = typeof file.data === "string" ? enc.encode(file.data) : file.data;
  const r = await importFile({ name: file.fileName, bytes });
  if (!r.ok) throw new Error(`recusado: ${r.reason} ${r.detail ?? ""}`);
  return { file, doc: r.doc };
}

describe("ida e volta (importar o que exportou) — RF52.CA05", () => {
  it("Markdown: blocos, níveis, texto com caracteres de marcação e metadados voltam iguais, sem perdas", async () => {
    const piece = samplePiece();
    const { file, doc } = await roundTrip(piece, "md");
    expect(file.fileName).toBe("relatorio-ensaio-de-ida-volta-v2.md");
    expect(shape(doc.blocks)).toEqual(shape(piece.blocks));
    expect(doc.meta).toMatchObject({ title: piece.title, docType: "RELATORIO_TECNICO", genre: "TECNICO", language: "pt-BR" });
    expect(doc.losses).toEqual([]);
  });

  it("texto: blocos e níveis voltam iguais; o título da peça não é gravado (texto puro)", async () => {
    const piece = samplePiece();
    const { doc } = await roundTrip(piece, "txt");
    expect(shape(doc.blocks)).toEqual(shape(piece.blocks));
    expect(doc.losses).toEqual([]);
  });

  it("HTML: blocos, referências e metadados voltam iguais; o cabeçalho de metadados não vira conteúdo", async () => {
    const piece = samplePiece();
    const { doc } = await roundTrip(piece, "html");
    expect(shape(doc.blocks)).toEqual(shape(piece.blocks));
    expect(doc.meta).toMatchObject({ title: piece.title, docType: "RELATORIO_TECNICO", genre: "TECNICO", language: "pt-BR" });
    expect(doc.losses).toEqual([]);
  });

  it("DOCX: blocos, listas separadas, citações e referências voltam iguais", async () => {
    const piece = samplePiece();
    const { file, doc } = await roundTrip(piece, "docx");
    expect(file.mime).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(shape(doc.blocks)).toEqual(shape(piece.blocks));
    expect(doc.meta).toMatchObject({ title: piece.title, docType: "RELATORIO_TECNICO", genre: "TECNICO", language: "pt-BR" });
    expect(doc.losses).toEqual([]);
  });

  it.each(["md", "txt", "html", "docx"] as const)("peças DEMO em %s voltam iguais", async (format) => {
    for (const piece of buildDemoPieces(new Date("2026-11-13T12:00:00Z"))) {
      const { doc } = await roundTrip(piece, format);
      expect(shape(doc.blocks), `${piece.id} em ${format}`).toEqual(shape(piece.blocks));
    }
  });
});

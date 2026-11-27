import { describe, expect, it } from "vitest";
import { TASK_TYPE_NAMES } from "@/lib/tasks/client";
import { extensionOf, fileIconSpec, KIND_TONE, TASK_TYPE_ICON } from "./kinds";

describe("tipo de arquivo → ícone (função pura)", () => {
  it("extensão, nome e MIME levam à família e à sigla certas", () => {
    expect(fileIconSpec({ extension: "pdf" })).toEqual({ kind: "pdf", abbr: "PDF", tone: "red" });
    expect(fileIconSpec({ extension: ".DOCX" })).toMatchObject({ kind: "doc", abbr: "DOCX", tone: "blue" });
    expect(fileIconSpec({ name: "orcamento.xlsx" })).toMatchObject({ kind: "sheet", abbr: "XLSX", tone: "green" });
    expect(fileIconSpec({ name: "aula.pptx" })).toMatchObject({ kind: "slides", tone: "orange" });
    expect(fileIconSpec({ mime: "text/csv; charset=utf-8" })).toMatchObject({ kind: "csv", abbr: "CSV" });
    expect(fileIconSpec({ mime: "image/heic" })).toMatchObject({ kind: "image" });
    expect(fileIconSpec({ mime: "application/vnd.oasis.opendocument.text" })).toMatchObject({ kind: "odt", abbr: "ODT" });
    for (const [ext, kind] of [["md", "text"], ["html", "html"], ["ods", "ods"], ["odp", "odp"], ["svg", "image"], ["zip", "archive"], ["dwg", "cad"], ["dxf", "cad"], ["ifc", "ifc"], ["glb", "model3d"], ["mp3", "audio"], ["mp4", "video"]] as const) {
      expect(fileIconSpec({ extension: ext }).kind).toBe(kind);
    }
  });

  it("formato digitado livre e endereços: sigla reconhecida no texto, link quando o caminho não tem extensão", () => {
    expect(fileIconSpec({ extension: "PNG 1080×1080" })).toMatchObject({ kind: "image", abbr: "PNG" });
    expect(fileIconSpec({ url: "https://example.org/norma.pdf?x=1" })).toMatchObject({ kind: "pdf" });
    expect(fileIconSpec({ url: "https://example.org/pagina" })).toMatchObject({ kind: "link", abbr: "URL" });
    expect(extensionOf("C:\\pasta\\planta.DXF")).toBe("dxf");
    expect(fileIconSpec({})).toMatchObject({ kind: "generic", abbr: "" });
  });

  it("todo tipo de tarefa tem ícone; a sigla cabe no desenho (até 4)", () => {
    for (const ty of TASK_TYPE_NAMES) {
      expect(TASK_TYPE_ICON[ty]).toBeTruthy();
      const s = fileIconSpec({ type: ty });
      expect(s.abbr.length).toBeLessThanOrEqual(4);
      expect(KIND_TONE[s.kind]).toBeTruthy();
    }
    expect(fileIconSpec({ type: "PLANILHA" }).kind).toBe("sheet");
    expect(fileIconSpec({ type: "PASTA" }).kind).toBe("folder");
  });
});

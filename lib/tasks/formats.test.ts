import { describe, expect, it } from "vitest";
import { fileIconSpec } from "@/components/fileicons/kinds";
import {
  attachmentFormat, changeFormat, cleanDetails, FORMAT_FAMILIES, FORMAT_FAMILY_FIELDS, FORMAT_VARIANT_CODES, FORMAT_VARIANTS, fieldsFor, formatFromView,
  formatIconSource, formatMismatch, formatToRequest, invalidFormatFields, matchesFormat, packFormat, suggestedCriteria, unpackFormat, variantOf,
} from "./formats";

const KEY = /^[a-z][a-zA-Z0-9]{1,30}$/;

describe("catálogo família → variante (dado puro)", () => {
  it("toda variante tem família válida, código do backend, extensões, MIME, ícone reconhecível e campos válidos", () => {
    const seen = new Set<string>();
    for (const v of FORMAT_VARIANTS) {
      expect(FORMAT_FAMILIES).toContain(v.family);
      expect(FORMAT_VARIANT_CODES).toContain(v.code);
      expect(v.extensions.length).toBeGreaterThan(0);
      expect(v.mime.length).toBeGreaterThan(0);
      const pair = `${v.family}/${v.code}`;
      expect(seen.has(pair)).toBe(false);
      seen.add(pair);
      expect(fileIconSpec(formatIconSource({ family: v.family, variant: v.code })).kind).not.toBe("generic");
      for (const f of fieldsFor(v.family, v.code)) {
        expect(f.key).toMatch(KEY);
        if (f.kind === "select") expect(f.options?.length).toBeGreaterThan(0);
        if (f.kind === "number") expect(f.min).toBeLessThanOrEqual(f.max!);
      }
    }
    for (const fam of FORMAT_FAMILIES) FORMAT_FAMILY_FIELDS[fam].forEach((f) => expect(f.key).toMatch(KEY));
    // o mesmo código pode existir em mais de uma família (PDF de documento, apresentação e prancha)
    expect(FORMAT_VARIANTS.filter((v) => v.code === "PDF").map((v) => v.family)).toEqual(["DOCUMENTO", "APRESENTACAO", "DESENHO_TECNICO"]);
    expect(variantOf("PLANILHA", "XLSM")?.refused).toBe(true);
  });

  it("campos: os comuns da família + os próprios da variante", () => {
    expect(fieldsFor("PLANILHA", "CSV").map((f) => f.key)).toEqual(["headerRow", "delimiter", "encoding", "decimal"]);
    expect(fieldsFor("PLANILHA", "XLSX").map((f) => f.key)).toEqual(["headerRow", "sheets", "formulas", "protected"]);
    expect(fieldsFor("PLANILHA", "DOCX")).toEqual(fieldsFor("PLANILHA", ""));
  });

  it("trocar de variante preserva os comuns e descarta (e diz) os que não se aplicam", () => {
    const csv = { family: "PLANILHA" as const, variant: "CSV" as const, details: { headerRow: "true", delimiter: "SEMICOLON", encoding: "UTF8" } };
    const r = changeFormat(csv, "PLANILHA", "XLSX");
    expect(r.next).toEqual({ family: "PLANILHA", variant: "XLSX", details: { headerRow: "true" } });
    expect(r.dropped.sort()).toEqual(["delimiter", "encoding"]);
    expect(changeFormat(csv, "PLANILHA", "PPTX").next.variant).toBe("");
  });

  it("detalhes inválidos são apontados e não vão para a gravação", () => {
    const f = { family: "DOCUMENTO" as const, variant: "PDF_A" as const, details: { pages: "abc", pdfaLevel: "9Z", signed: "true" } };
    expect(invalidFormatFields(f)).toEqual(["pages", "pdfaLevel"]);
    expect(cleanDetails(f)).toEqual({ signed: "true" });
  });
});

describe("adaptador da tarefa (colunas próprias da V71; espelho antigo só lido)", () => {
  it("formato → formatFamily/formatVariant/formatDetailsJson e volta; sem família não grava nada", () => {
    expect(formatToRequest({ family: "", variant: "", details: {} })).toEqual({});
    const f = { family: "PLANILHA" as const, variant: "CSV" as const, details: { delimiter: "SEMICOLON", encoding: "UTF8", headerRow: "true" } };
    const req = formatToRequest(f);
    expect(req).toMatchObject({ formatFamily: "PLANILHA", formatVariant: "CSV" });
    expect(JSON.parse(req.formatDetailsJson!)).toEqual(f.details);
    expect(formatFromView(req)).toEqual(f);
    expect(formatToRequest({ family: "IMAGEM", variant: "", details: {} })).toEqual({ formatFamily: "IMAGEM" });
    // tarefa gravada antes das colunas: o espelho em extensions ainda é lido
    expect(formatFromView({ extensions: { fileFormat: packFormat(f) } })).toEqual(f);
    expect(unpackFormat(packFormat(f))).toEqual(f);
  });

  it("detalhes em JSON inválido ou que não é objeto viram vazio; anexo aceita formatDetailsJson da API", () => {
    expect(formatFromView({ formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: "[1]" }).details).toEqual({});
    expect(formatFromView({ formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: "{x" }).details).toEqual({});
    const got = attachmentFormat({ fileName: "a.csv", formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: '{"encoding":"UTF8"}' })!;
    expect(got.estimated).toBe(false);
    expect(got.format.details.encoding).toBe("UTF8");
  });

  it("colunas próprias do backend, quando vierem, valem antes do espelho", () => {
    const v = { formatFamily: "DOCUMENTO", formatVariant: "PDF_A", formatDetailsJson: '{"pdfaLevel":"2B"}', extensions: { fileFormat: "family=PLANILHA" } };
    expect(formatFromView(v)).toEqual({ family: "DOCUMENTO", variant: "PDF_A", details: { pdfaLevel: "2B" } });
    expect(formatFromView({ formatFamily: "MARTE" }).family).toBe("");
  });

  it("critérios de aceite sugeridos saem só do que foi escolhido", () => {
    const s = suggestedCriteria({ family: "PLANILHA", variant: "CSV", details: { encoding: "UTF8", headerRow: "true", decimal: "" } });
    expect(s.map((x) => x.key)).toEqual(["taskForm.fmt.crit.variant", "taskForm.fmt.crit.headerRow", "taskForm.fmt.crit.encoding"]);
    expect(s[2]).toMatchObject({ vars: { value: "UTF8" }, optionKey: "taskForm.fmt.opt.encoding.UTF8" });
    expect(suggestedCriteria({ family: "", variant: "", details: {} })).toEqual([]);
  });
});

describe("formato de anexos e divergência com o pedido", () => {
  it("estimado pela extensão/MIME quando o servidor não manda; do servidor quando manda", () => {
    expect(attachmentFormat({ fileName: "dados.csv", mimeType: "text/csv" })).toEqual({ format: { family: "PLANILHA", variant: "CSV", details: {} }, estimated: true });
    expect(attachmentFormat({ fileName: "sem-extensao", mimeType: "application/pdf" })?.format.variant).toBe("PDF");
    expect(attachmentFormat({ fileName: "x.bin", mimeType: "application/octet-stream" })).toBeNull();
    expect(attachmentFormat({ fileName: "a.pdf", formatFamily: "DESENHO_TECNICO", formatVariant: "PDF", formatDetails: { paper: "A1" } }))
      .toEqual({ format: { family: "DESENHO_TECNICO", variant: "PDF", details: { paper: "A1" } }, estimated: false });
  });

  it("pediu XLSX e anexou CSV → diverge; família sem variante aceita qualquer extensão da família", () => {
    const asked = { family: "PLANILHA" as const, variant: "XLSX" as const, details: {} };
    expect(matchesFormat(asked, { fileName: "orcamento.csv" })).toBe(false);
    expect(matchesFormat(asked, { fileName: "orcamento.xlsx" })).toBe(true);
    expect(matchesFormat({ family: "DESENHO_TECNICO", variant: "", details: {} }, { fileName: "prancha.pdf" })).toBe(true);
    expect(matchesFormat({ family: "", variant: "", details: {} }, { fileName: "a.csv" })).toBeNull();
    expect(matchesFormat(asked, { fileName: "desconhecido.bin" })).toBeNull();
  });

  it("formatMismatch ignora evidências e arquivos de formato desconhecido", () => {
    const task = { extensions: { fileFormat: "family=PLANILHA&variant=XLSX" } };
    const list = [
      { fileName: "a.csv", mimeType: "text/csv" }, { fileName: "b.xlsx" }, { fileName: "foto.jpg", evidence: { id: "e" } }, { fileName: "c.bin" },
    ];
    expect(formatMismatch(task, list)).toEqual([{ fileName: "a.csv", actual: { family: "PLANILHA", variant: "CSV", details: {} }, estimated: true }]);
    expect(formatMismatch({ extensions: {} }, list)).toEqual([]);
  });
});

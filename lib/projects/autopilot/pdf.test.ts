/**
 * Leitor de PDF do Autopiloto: os PDFs são montados aqui mesmo, com fluxos comprimidos por zlib (o mesmo FlateDecode dos PDFs
 * reais) e lidos com o `DecompressionStream` da plataforma — o mesmo caminho do navegador.
 */
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractPdfText, parseToUnicode } from "./pdf";
import { readDemandBytes } from "./sources";

type Obj = string | null | { dict: string; stream: Uint8Array | string; compress?: boolean };

/** PDF mínimo: objetos numerados a partir de 1, trailer com /Root 1 0 R (xref simbólica: o leitor não depende dela). */
function buildPdf(objects: Obj[], trailerExtra = ""): Uint8Array {
  const parts: Buffer[] = [Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  objects.forEach((o, i) => {
    const n = i + 1;
    if (o === null) return; // número reservado (o objeto vive num fluxo de objetos)
    if (typeof o === "string") {
      parts.push(Buffer.from(`${n} 0 obj\n${o}\nendobj\n`, "latin1"));
      return;
    }
    const raw = typeof o.stream === "string" ? Buffer.from(o.stream, "latin1") : Buffer.from(o.stream);
    const data = o.compress === false ? raw : deflateSync(raw);
    const filter = o.compress === false ? "" : " /Filter /FlateDecode";
    parts.push(Buffer.from(`${n} 0 obj\n<< ${o.dict}${filter} /Length ${data.length} >>\nstream\n`, "latin1"), data, Buffer.from("\nendstream\nendobj\n", "latin1"));
  });
  parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R${trailerExtra} >>\nstartxref\n0\n%%EOF\n`, "latin1"));
  return new Uint8Array(Buffer.concat(parts));
}

const page = (contents: string, resources: string) => [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${contents} >>`,
];

describe("texto de PDF no navegador", () => {
  it("fonte simples (WinAnsi): Tj, TJ com espaçamento, ' e T*, com acentos em octal e quebras de linha", async () => {
    const content = [
      "BT /F1 12 Tf 72 760 Td (Of\\355cio n\\272 45/2026 \\(SECID\\)) Tj",
      "0 -16 Td [(Prazo: at) 20 (\\351 30/11/2026)] TJ",
      "T* [(Elaborar) -300 (o) -300 (termo) -300 (de) -300 (refer\\352ncia)] TJ",
      "(Valor: R$ 120.000,00) ' ET",
    ].join("\n");
    const bytes = buildPdf([...page("4 0 R", "<< /Font << /F1 5 0 R >> >>"), { dict: "", stream: content }, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]);
    const r = await extractPdfText(bytes);
    expect(r).toEqual({ ok: true, pages: 1, text: "Ofício nº 45/2026 (SECID)\nPrazo: até 30/11/2026\nElaborar o termo de referência\nValor: R$ 120.000,00" });
  });

  it("fonte composta (Identity-H) com CMap ToUnicode comprimido, códigos de 2 bytes em hexadecimal", async () => {
    // glifos inventados: A–Z = 0x21…, a–z = 0x41…, espaço = 0x03, dígitos = 0x10…, "ú" = 0x60
    const cmap = [
      "/CIDInit /ProcSet findresource begin 12 dict begin begincmap",
      "1 begincodespacerange <0000> <FFFF> endcodespacerange",
      "2 beginbfchar <0003> <0020> <0060> <00FA> endbfchar",
      "3 beginbfrange <0010> <0019> <0030> <0021> <003A> <0041> <0041> <005A> <0061> endbfrange",
      "endcmap CMapName currentdict /CMap defineresource pop end end",
    ].join("\n");
    const code = (s: string) => [...s].map((c) => {
      const v = c === " " ? 0x03 : c === "ú" ? 0x60 : /\d/.test(c) ? 0x10 + Number(c) : /[A-Z]/.test(c) ? 0x21 + c.charCodeAt(0) - 65 : 0x41 + c.charCodeAt(0) - 97;
      return v.toString(16).padStart(4, "0");
    }).join("");
    const content = `BT /F2 11 Tf 1 0 0 1 72 700 Tm <${code("Prazo de 60 dias")}> Tj 1 0 0 1 72 680 Tm <${code("Assunto Saúde")}> Tj ET`;
    const bytes = buildPdf([
      ...page("4 0 R", "<< /Font << /F2 5 0 R >> >>"),
      { dict: "", stream: content },
      "<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Arial /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>",
      "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ABCDEF+Arial >>",
      { dict: "", stream: cmap },
    ]);
    const r = await extractPdfText(bytes);
    expect(r).toEqual({ ok: true, pages: 1, text: "Prazo de 60 dias\nAssunto Saúde" });
    expect(parseToUnicode(cmap).map.get(0x21)).toBe("A");
  });

  it("dicionários da página dentro de um fluxo de objetos (/ObjStm, PDF 1.5+) e conteúdo em array", async () => {
    const inner = ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 7 0 R >> >> /Contents [5 0 R 6 0 R] >>"];
    const header = `2 0 3 ${inner[0]!.length + 1} `;
    const objstm = header + inner.join("\n");
    const bytes = buildPdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      null,
      null,
      { dict: `/Type /ObjStm /N 2 /First ${header.length}`, stream: objstm },
      { dict: "", stream: "BT /F1 12 Tf 72 700 Td (Primeira parte) Tj ET" },
      { dict: "", stream: "BT /F1 12 Tf 72 680 Td (segunda parte do texto) Tj ET" },
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]);
    const r = await extractPdfText(bytes);
    // dois fluxos de conteúdo da mesma página; o "Td" para baixo vira quebra de linha
    expect(r).toEqual({ ok: true, pages: 1, text: "Primeira parte\nsegunda parte do texto" });
  });

  it("PDF cifrado, PDF só com imagem (sem camada de texto) e arquivo que não é PDF: motivo claro", async () => {
    const cifrado = buildPdf([...page("4 0 R", "<< >>"), { dict: "", stream: "BT /F1 12 Tf (x) Tj ET" }], " /Encrypt 9 0 R");
    expect(await extractPdfText(cifrado)).toEqual({ ok: false, reason: "CIFRADO" });
    const imagem = buildPdf([
      ...page("4 0 R", "<< /XObject << /Im1 5 0 R >> >>"),
      { dict: "", stream: "q 595 0 0 842 0 0 cm /Im1 Do Q" },
      { dict: "/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8", stream: "\x00" },
    ]);
    expect(await extractPdfText(imagem)).toEqual({ ok: false, reason: "SEM_TEXTO" });
    expect(await extractPdfText(new TextEncoder().encode("isto não é um PDF"))).toEqual({ ok: false, reason: "NAO_E_PDF" });
  });

  it("pela porta de entrada do Autopiloto: .pdf com texto, cifrado e acima do limite", async () => {
    const ok = buildPdf([...page("4 0 R", "<< /Font << /F1 5 0 R >> >>"), { dict: "", stream: "BT /F1 12 Tf (Assunto: Reforma da sede) Tj ET" }, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]);
    expect(await readDemandBytes("oficio.pdf", ok)).toMatchObject({ ok: true, kind: "PDF", pages: 1, text: "Assunto: Reforma da sede" });
    const cifrado = buildPdf([...page("4 0 R", "<< >>")], " /Encrypt << /Filter /Standard >>");
    expect(await readDemandBytes("oficio.pdf", cifrado)).toEqual({ ok: false, reason: "PDF_CIFRADO" });
    expect(await readDemandBytes("grande.pdf", new Uint8Array(5 * 1024 * 1024 + 1))).toEqual({ ok: false, reason: "GRANDE_DEMAIS" });
  });
});

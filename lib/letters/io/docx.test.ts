import { describe, expect, it } from "vitest";
import { docxParts, exportDocx } from "./docx";
import { importFile } from "./import";
import { parseXml, XmlError } from "./xml";
import { openZip, writeZip } from "./zip";
import { samplePiece, shape } from "./testkit";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const CT_MAIN = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const contentTypes = (main = CT_MAIN) =>
  `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${main}"/></Types>`;
const ROOT_RELS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';

/** Documento "como o Word salva em pt-BR": ids de estilo localizados (Ttulo1, Citao), runs formatados, link, tabela… */
const WORD_DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W} xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
<w:body>
<w:p><w:pPr><w:pStyle w:val="Ttulo"/></w:pPr><w:r><w:t>Parecer técnico nº 7</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>1 Contexto</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Texto em negrito </w:t></w:r><w:r><w:t>e normal</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r><w:r><w:t xml:space="preserve"> &amp; &lt;escapado&gt;.</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Veja o </w:t></w:r><w:hyperlink r:id="rIdLink"><w:r><w:t>portal</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> e a </w:t></w:r><w:ins w:id="9" w:author="X"><w:r><w:t>inserção</w:t></w:r></w:ins><w:del w:id="10" w:author="X"><w:r><w:delText>exclusão</w:delText></w:r></w:del><w:r><w:t>.</w:t></w:r><w:r><w:br/><w:t>Nova linha.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Ttulo2"/></w:pPr><w:r><w:t>1.1 Itens</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t>passo um</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t>passo dois</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t>subpasso</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Citao"/></w:pPr><w:r><w:t>Citação direta longa (AUTOR, 2020, p. 3).</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Item</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>10</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"/></w:drawing></w:r><w:r><w:t>Legenda da figura</w:t></w:r></w:p>
<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>3</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>Referências</w:t></w:r></w:p>
<w:p><w:r><w:t>SILVA, J. Livro. 2020.</w:t></w:r></w:p>
<w:p><w:r><w:t>SOUZA, M. Artigo. 2021.</w:t></w:r></w:p>
<w:sectPr/>
</w:body></w:document>`;

const STYLES = `<?xml version="1.0"?><w:styles ${W}>
<w:style w:type="paragraph" w:styleId="Ttulo"><w:name w:val="Title"/></w:style>
<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/></w:style>
<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/></w:style>
<w:style w:type="paragraph" w:styleId="PargrafodaLista"><w:name w:val="List Paragraph"/></w:style>
<w:style w:type="paragraph" w:styleId="Citao"><w:name w:val="Quote"/></w:style>
</w:styles>`;
const NUMBERING = `<?xml version="1.0"?><w:numbering ${W}><w:abstractNum w:abstractNumId="5"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="lowerLetter"/></w:lvl></w:abstractNum><w:num w:numId="3"><w:abstractNumId w:val="5"/></w:num></w:numbering>`;
const DOC_RELS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://exemplo.gov.br/portal" TargetMode="External"/></Relationships>';

async function wordPackage(over: Record<string, string | null> = {}) {
  const files: Record<string, string | null> = {
    "[Content_Types].xml": contentTypes(),
    "_rels/.rels": ROOT_RELS,
    "word/document.xml": WORD_DOC,
    "word/styles.xml": STYLES,
    "word/numbering.xml": NUMBERING,
    "word/_rels/document.xml.rels": DOC_RELS,
    "word/header1.xml": `<?xml version="1.0"?><w:hdr ${W}><w:p><w:r><w:t>Cabeçalho</w:t></w:r></w:p></w:hdr>`,
    ...over,
  };
  return writeZip(Object.entries(files).filter((e): e is [string, string] => e[1] !== null).map(([name, data]) => ({ name, data })));
}

describe("DOCX exportado — RF52.CA05", () => {
  it("todas as partes são XML bem formado e o pacote tem as partes obrigatórias", async () => {
    const parts = docxParts(samplePiece());
    for (const p of parts) expect(() => parseXml(p.data), p.name).not.toThrow();
    const zip = openZip(await exportDocx(samplePiece()));
    expect([...zip.entries.keys()]).toEqual(["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels", "word/styles.xml", "word/numbering.xml", "docProps/core.xml", "docProps/app.xml"]);
    const doc = await zip.readText("word/document.xml");
    expect(doc).toContain('<w:pStyle w:val="Heading1"/>');
    expect(doc).toContain("&lt;v2&gt;");
    expect(doc).not.toContain("<v2>");
    // cada lista tem a sua numeração (listas vizinhas não se fundem)
    expect(await zip.readText("word/numbering.xml")).toContain('<w:num w:numId="1">');
  });

  it("título com caracteres especiais e controles proibidos continua XML válido", async () => {
    const piece = { ...samplePiece(), title: 'A & B <c> "d" \u0001 fim' };
    for (const p of docxParts(piece)) expect(() => parseXml(p.data), p.name).not.toThrow();
    const r = await importFile({ name: "x.docx", bytes: await exportDocx(piece) });
    expect(r.ok && r.doc.meta.title).toBe('A & B <c> "d"  fim');
  });

  it("sem compressão (armazenado) também abre pelo importador", async () => {
    const piece = samplePiece();
    const r = await importFile({ name: "x.docx", bytes: await exportDocx(piece, { compress: false }) });
    expect(r.ok && shape(r.doc.blocks)).toEqual(shape(piece.blocks));
  });
});

describe("DOCX montado como o Word salva — RF52.CA04", () => {
  it("lê títulos por estilo (ids localizados), listas, citação, tabela e referências; lista as perdas antes do aceite", async () => {
    const r = await importFile({ name: "parecer.docx", bytes: await wordPackage() });
    if (!r.ok) throw new Error(r.reason);
    const { doc } = r;
    expect(doc.meta.title).toBe("Parecer técnico nº 7");
    expect(shape(doc.blocks)).toEqual([
      { kind: "TITULO", level: 1, text: "1 Contexto" },
      { kind: "PARAGRAFO", text: "Texto em negrito e normal & <escapado>." },
      { kind: "PARAGRAFO", text: "Veja o portal (https://exemplo.gov.br/portal) e a inserção.\nNova linha." },
      { kind: "TITULO", level: 2, text: "1.1 Itens" },
      { kind: "LISTA", text: "passo um\npasso dois\nsubpasso" },
      { kind: "CITACAO", text: "Citação direta longa (AUTOR, 2020, p. 3)." },
      { kind: "PARAGRAFO", text: "Item | Valor" },
      { kind: "PARAGRAFO", text: "A | 10" },
      { kind: "PARAGRAFO", text: "Legenda da figura" },
      { kind: "PARAGRAFO", text: "3" },
      { kind: "TITULO", level: 1, text: "Referências" },
      { kind: "REFERENCIAS", text: "SILVA, J. Livro. 2020.\nSOUZA, M. Artigo. 2021." },
    ]);
    const codes = Object.fromEntries(doc.losses.map((l) => [l.code, l.kind]));
    expect(codes).toMatchObject({
      FORMATACAO_CARACTERE: "ACHATADO",
      FORMATACAO_PARAGRAFO: "ACHATADO",
      NOTA_RODAPE: "DESCARTADO",
      LINK: "APROXIMADO",
      REVISAO_RASTREADA: "APROXIMADO",
      LISTA_NUMERADA: "APROXIMADO",
      LISTA_ANINHADA: "ACHATADO",
      TABELA: "ACHATADO",
      IMAGEM: "DESCARTADO",
      CAMPO: "APROXIMADO",
      CABECALHO_RODAPE: "DESCARTADO",
    });
    expect(doc.stats.byKind).toMatchObject({ TITULO: 3, LISTA: 1, REFERENCIAS: 1 });
  });

  it("caixa de texto vira parágrafo (achatado), sem descartar o texto", async () => {
    const refs = '<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>Referências';
    const doc = WORD_DOC.replace(
      refs,
      `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><w:txbxContent><w:p><w:r><w:t>Texto na caixa</w:t></w:r></w:p></w:txbxContent></w:drawing></mc:Choice><mc:Fallback><w:pict><w:txbxContent><w:p><w:r><w:t>Texto na caixa</w:t></w:r></w:p></w:txbxContent></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p>${refs}`,
    );
    const r = await importFile({ name: "c.docx", bytes: await wordPackage({ "word/document.xml": doc }) });
    if (!r.ok) throw new Error(r.reason);
    expect(r.doc.blocks.filter((b) => b.text === "Texto na caixa")).toHaveLength(1);
    expect(r.doc.losses.find((l) => l.code === "CAIXA_TEXTO")).toMatchObject({ kind: "ACHATADO", count: 1 });
  });

  it("sem styles.xml os ids de estilo ainda indicam os títulos", async () => {
    const r = await importFile({ name: "s.docx", bytes: await wordPackage({ "word/styles.xml": null }) });
    expect(r.ok && r.doc.blocks[0]).toMatchObject({ kind: "TITULO", level: 1, text: "1 Contexto" });
  });
});

describe("DOCX recusado com motivo — RF52.CA07", () => {
  it("pacote com macro (macroEnabled) é recusado; .docm nem é lido", async () => {
    const bytes = await wordPackage({ "[Content_Types].xml": contentTypes("application/vnd.ms-word.document.macroEnabled.main+xml") });
    expect(await importFile({ name: "m.docx", bytes })).toMatchObject({ ok: false, reason: "DOCX_MACROS" });
    expect(await importFile({ name: "m.docm", bytes })).toMatchObject({ ok: false, reason: "DOCX_MACROS" });
  });

  it("XML malformado em document.xml", async () => {
    const bytes = await wordPackage({ "word/document.xml": WORD_DOC.replace("</w:body>", "") });
    expect(await importFile({ name: "x.docx", bytes })).toMatchObject({ ok: false, reason: "XML_MALFORMADO" });
  });

  it("DTD/entidade externa (XXE) é recusada", async () => {
    const bytes = await wordPackage({ "word/document.xml": `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><w:document ${W}><w:body><w:p><w:r><w:t>&e;</w:t></w:r></w:p></w:body></w:document>` });
    expect(await importFile({ name: "x.docx", bytes })).toMatchObject({ ok: false, reason: "XML_MALFORMADO" });
  });

  it("ZIP sem document.xml, não-Word, criptografado (OLE) e texto com extensão .docx", async () => {
    expect(await importFile({ name: "a.docx", bytes: await wordPackage({ "word/document.xml": null }) })).toMatchObject({ ok: false, reason: "DOCX_INVALIDO" });
    expect(await importFile({ name: "b.docx", bytes: await writeZip([{ name: "mimetype", data: "application/epub+zip" }]) })).toMatchObject({ ok: false, reason: "DOCX_INVALIDO" });
    const ole = new Uint8Array(512);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(await importFile({ name: "c.docx", bytes: ole })).toMatchObject({ ok: false, reason: "DOCX_CRIPTOGRAFADO" });
    expect(await importFile({ name: "d.docx", bytes: new TextEncoder().encode("só texto") })).toMatchObject({ ok: false, reason: "TIPO_DIVERGENTE" });
  });

  it("arquivo truncado é recusado", async () => {
    const bytes = await wordPackage();
    expect(await importFile({ name: "t.docx", bytes: bytes.subarray(0, bytes.length - 40) })).toMatchObject({ ok: false, reason: "DOCX_INVALIDO" });
  });

  it("o leitor de XML recusa o que não é bem formado", () => {
    expect(() => parseXml("<a><b></a>")).toThrow(XmlError);
    expect(() => parseXml("<a x=1/>")).toThrow(XmlError);
    expect(() => parseXml("<a>&nbsp;</a>")).toThrow(XmlError);
    expect(() => parseXml("<a/><b/>")).toThrow(XmlError);
    expect(parseXml('<a x="1 &amp; 2"><![CDATA[<x>]]>&#233;</a>')).toEqual({ name: "a", attrs: { x: "1 & 2" }, children: ["<x>", "é"] });
  });
});

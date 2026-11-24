/**
 * DOCX (Office Open XML / WordprocessingML) sem biblioteca: lê o ZIP com `DecompressionStream("deflate-raw")` e o XML de
 * `word/document.xml` (+ `styles.xml`, `numbering.xml`, `docProps/core.xml`); escreve um pacote mínimo válido.
 * Mapeamento: estilos Título/Heading n → TITULO n; Title → título da peça; Quote/Citação → CITACAO; parágrafos com
 * numeração ou estilo de lista → LISTA (agrupados por lista); Bibliography/Bibliografia → REFERENCIAS; o resto →
 * PARAGRAFO. O que não cabe no modelo (formatação, imagens, tabelas, notas, comentários, revisões, cabeçalhos,
 * caixas de texto, campos) entra no relatório de fidelidade. Macros nunca são executadas: pacote com macro é recusado.
 */
import { clampLevel, LossLog, type DocMeta, type DraftBlock } from "./model";
import type { ExportablePiece } from "./export";
import { childEls, findEl, firstEl, isEl, parseXml, textOf, xmlEscape, type XmlElement } from "./xml";
import { openZip, writeZip, type ZipArchive } from "./zip";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxReadError = "DOCX_INVALIDO" | "DOCX_MACROS" | "XML_MALFORMADO";
export class DocxError extends Error {
  constructor(readonly code: DocxReadError, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "DocxError";
  }
}

/* ── Leitura ──────────────────────────────────────────────────────────────────────────────────────────── */

type ParaRole = { kind: "TITULO"; level: number } | { kind: "TITLE" } | { kind: "CITACAO" } | { kind: "LISTA" } | { kind: "REFERENCIAS" } | { kind: "PARAGRAFO" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Papel do parágrafo pelo nome do estilo (nomes em inglês, português, espanhol, francês, alemão). */
export function roleOfStyle(name: string): ParaRole | null {
  const n = norm(name);
  const h = /^(heading|titulo|ttulo|titre|uberschrift|berschrift|encabezado|kop)\s*([1-9])$/.exec(n);
  if (h) return { kind: "TITULO", level: Number(h[2]) };
  if (/^(title|titulo|ttulo|titre|titel)$/.test(n)) return { kind: "TITLE" };
  if (/^(intense )?(quote|citacao|citacion|cita|zitat|citation)\b/.test(n)) return { kind: "CITACAO" };
  if (/^(bibliograph|bibliografia|referencias?\b|references?\b)/.test(n)) return { kind: "REFERENCIAS" };
  if (/^(list|lista|liste|listenabsatz|paragrafo da lista|parrafo de lista)/.test(n)) return { kind: "LISTA" };
  return null;
}

const attr = (el: XmlElement | undefined, name: string) => el?.attrs[name];

interface Ctx {
  styles: Map<string, string>;
  /** numId → formato do nível 0..8 */
  numFmt: Map<string, string[]>;
  links: Map<string, string>;
  losses: LossLog;
}

async function readXml(zip: ZipArchive, path: string): Promise<XmlElement | undefined> {
  const text = await zip.readText(path);
  if (text === undefined) return undefined;
  try {
    return parseXml(text);
  } catch (e) {
    throw new DocxError("XML_MALFORMADO", `${path}: ${(e as Error).message}`);
  }
}

function readStyles(root: XmlElement | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!root) return out;
  for (const s of childEls(root, "w:style")) {
    const id = attr(s, "w:styleId");
    const name = attr(firstEl(s, "w:name"), "w:val");
    if (id) out.set(id, name ?? id);
  }
  return out;
}

function readNumbering(root: XmlElement | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!root) return out;
  const abstract = new Map<string, string[]>();
  for (const a of childEls(root, "w:abstractNum")) {
    const fmts: string[] = [];
    for (const lvl of childEls(a, "w:lvl")) fmts[Number(attr(lvl, "w:ilvl") ?? 0)] = attr(firstEl(lvl, "w:numFmt"), "w:val") ?? "bullet";
    abstract.set(attr(a, "w:abstractNumId") ?? "", fmts);
  }
  for (const n of childEls(root, "w:num")) out.set(attr(n, "w:numId") ?? "", abstract.get(attr(firstEl(n, "w:abstractNumId"), "w:val") ?? "") ?? []);
  return out;
}

function readRels(root: XmlElement | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!root) return out;
  for (const r of childEls(root, "Relationship")) if (r.attrs.Id && r.attrs.Target) out.set(r.attrs.Id, r.attrs.Target);
  return out;
}

const FORMAT_TAGS = new Set(["w:b", "w:bCs", "w:i", "w:iCs", "w:u", "w:strike", "w:dstrike", "w:color", "w:highlight", "w:sz", "w:rFonts", "w:vertAlign", "w:caps", "w:smallCaps", "w:shd"]);

/** Texto de um parágrafo (runs, links, inserções), contando perdas; caixas de texto viram parágrafos extras. */
function paragraphText(p: XmlElement, ctx: Ctx, extra: XmlElement[]): string {
  let out = "";
  let formatted = false;
  let inField = 0;
  const walk = (el: XmlElement) => {
    for (const c of el.children) {
      if (!isEl(c)) continue;
      switch (c.name) {
        case "w:r": {
          const rPr = firstEl(c, "w:rPr");
          if (rPr && childEls(rPr).some((x) => FORMAT_TAGS.has(x.name) && attr(x, "w:val") !== "0" && attr(x, "w:val") !== "false")) formatted = true;
          walk(c);
          break;
        }
        case "w:t":
          if (!inField) out += textOf(c);
          break;
        case "w:tab":
        case "w:ptab":
          out += "\t";
          break;
        case "w:br":
          if (attr(c, "w:type") === "page" || attr(c, "w:type") === "column") ctx.losses.add("QUEBRA");
          else out += "\n";
          break;
        case "w:cr":
          out += "\n";
          break;
        case "w:noBreakHyphen":
          out += "-";
          break;
        case "w:sym":
          ctx.losses.add("FORMATACAO_CARACTERE");
          break;
        case "w:fldChar": {
          const type = attr(c, "w:fldCharType");
          if (type === "begin") inField++;
          else if (type === "separate") inField = Math.max(0, inField - 1);
          break;
        }
        case "w:instrText":
          ctx.losses.add("CAMPO");
          break;
        case "w:drawing":
        case "w:pict":
        case "w:object": {
          const boxes: XmlElement[] = [];
          const collect = (x: XmlElement) => {
            for (const k of x.children) if (isEl(k)) (k.name === "w:txbxContent" ? boxes.push(k) : collect(k));
          };
          collect(c);
          if (boxes.length) {
            ctx.losses.add("CAIXA_TEXTO", boxes.length);
            for (const b of boxes) extra.push(...childEls(b, "w:p"));
          } else ctx.losses.add(c.name === "w:object" ? "MIDIA_EMBUTIDA" : "IMAGEM");
          break;
        }
        case "mc:AlternateContent": {
          const choice = childEls(c).find((x) => x.name === "mc:Choice") ?? childEls(c).find((x) => x.name === "mc:Fallback");
          if (choice) walk(choice);
          break;
        }
        case "w:footnoteReference":
        case "w:endnoteReference":
          ctx.losses.add("NOTA_RODAPE");
          break;
        case "w:commentReference":
          ctx.losses.add("COMENTARIO");
          break;
        case "w:del":
        case "w:moveFrom":
          ctx.losses.add("REVISAO_RASTREADA");
          break;
        case "w:ins":
        case "w:moveTo":
          ctx.losses.add("REVISAO_RASTREADA");
          walk(c);
          break;
        case "w:hyperlink": {
          const start = out.length;
          walk(c);
          const id = attr(c, "r:id");
          const url = id ? ctx.links.get(id) : undefined;
          if (url) {
            ctx.losses.add("LINK");
            const text = out.slice(start).trim();
            if (/^(https?:|mailto:)/i.test(url) && text !== url) out += ` (${url.replace(/^mailto:/i, "")})`;
          }
          break;
        }
        case "w:pPr":
        case "w:rPr":
          break;
        case "m:oMath":
        case "m:oMathPara":
          ctx.losses.add("FORMATACAO_CARACTERE");
          out += textOf(c);
          break;
        default:
          // w:smartTag, w:sdt, w:sdtContent, w:fldSimple, w:customXml, w:dir, w:bdo…
          walk(c);
      }
    }
  };
  walk(p);
  if (formatted) ctx.losses.add("FORMATACAO_CARACTERE");
  return out;
}

function roleOf(p: XmlElement, ctx: Ctx): { role: ParaRole; numId?: string } {
  const pPr = firstEl(p, "w:pPr");
  const styleId = attr(firstEl(pPr, "w:pStyle"), "w:val");
  const numPr = firstEl(pPr, "w:numPr");
  const numId = attr(firstEl(numPr, "w:numId"), "w:val");
  const ilvl = Number(attr(firstEl(numPr, "w:ilvl"), "w:val") ?? 0);
  const jc = attr(firstEl(pPr, "w:jc"), "w:val");
  if ((jc && jc !== "left" && jc !== "start" && jc !== "both") || firstEl(pPr, "w:ind")) ctx.losses.add("FORMATACAO_PARAGRAFO");
  const byStyle = styleId ? roleOfStyle(ctx.styles.get(styleId) ?? styleId) ?? roleOfStyle(styleId) : null;
  if (byStyle && byStyle.kind !== "LISTA") return { role: byStyle };
  if (numId && numId !== "0") {
    if (ilvl > 0) ctx.losses.add("LISTA_ANINHADA");
    const fmt = ctx.numFmt.get(numId)?.[ilvl] ?? "bullet";
    if (fmt !== "bullet" && fmt !== "none") ctx.losses.add("LISTA_NUMERADA");
    return { role: { kind: "LISTA" }, numId };
  }
  if (byStyle) return { role: byStyle };
  const outline = attr(firstEl(pPr, "w:outlineLvl"), "w:val");
  if (outline !== undefined && Number(outline) < 9) return { role: { kind: "TITULO", level: Number(outline) + 1 } };
  return { role: { kind: "PARAGRAFO" } };
}

function bodyBlocks(body: XmlElement, ctx: Ctx, meta: DocMeta): DraftBlock[] {
  const blocks: DraftBlock[] = [];
  let lastList: string | undefined;
  const para = (p: XmlElement) => {
    const extra: XmlElement[] = [];
    const text = paragraphText(p, ctx, extra).replace(/ /g, " ");
    const { role, numId } = roleOf(p, ctx);
    const prev = blocks[blocks.length - 1];
    if (text.trim()) {
      if (role.kind === "TITLE" && !meta.title) meta.title = text.trim();
      else if (role.kind === "TITULO" || role.kind === "TITLE") blocks.push({ kind: "TITULO", level: clampLevel(role.kind === "TITLE" ? 1 : role.level, ctx.losses), text });
      else if (role.kind === "LISTA") {
        const key = numId ?? "estilo";
        if (prev?.kind === "LISTA" && lastList === key) prev.text = `${prev.text}\n${text.replace(/\n+/g, " ")}`;
        else blocks.push({ kind: "LISTA", text: text.replace(/\n+/g, " ") });
        lastList = key;
      } else if (role.kind === "REFERENCIAS") {
        if (prev?.kind === "REFERENCIAS") prev.text = `${prev.text}\n${text.replace(/\n+/g, " ")}`;
        else blocks.push({ kind: "REFERENCIAS", text: text.replace(/\n+/g, " ") });
      } else blocks.push({ kind: role.kind, text });
    }
    if (role.kind !== "LISTA") lastList = undefined;
    for (const x of extra) para(x);
  };
  const walk = (el: XmlElement) => {
    for (const c of el.children) {
      if (!isEl(c)) continue;
      if (c.name === "w:p") para(c);
      else if (c.name === "w:tbl") {
        ctx.losses.add("TABELA");
        lastList = undefined;
        for (const tr of childEls(c, "w:tr")) {
          const cells = childEls(tr, "w:tc").map((tc) => childEls(tc, "w:p").map((p) => paragraphText(p, ctx, [])).filter((s) => s.trim()).join(" ").replace(/\n+/g, " "));
          if (cells.some((s) => s.trim())) blocks.push({ kind: "PARAGRAFO", text: cells.join(" | ") });
        }
      } else if (c.name === "w:sdt") {
        const content = firstEl(c, "w:sdtContent");
        if (content) walk(content);
      } else if (c.name === "w:customXml") walk(c);
      else if (c.name === "w:altChunk") ctx.losses.add("HTML_EMBUTIDO");
    }
  };
  walk(body);
  return blocks;
}

/** Lê um .docx. Lança `DocxError` (pacote inválido, macro, XML malformado) ou `ZipError` (ZIP ruim, bomba, CRC). */
export async function parseDocx(bytes: Uint8Array): Promise<{ meta: DocMeta; blocks: DraftBlock[]; losses: LossLog }> {
  const zip = openZip(bytes);
  const types = await zip.readText("[Content_Types].xml");
  if (!types) throw new DocxError("DOCX_INVALIDO", "[Content_Types].xml ausente");
  if (/macroEnabled/i.test(types)) throw new DocxError("DOCX_MACROS");
  if (!/wordprocessingml\.document\.main\+xml/.test(types)) throw new DocxError("DOCX_INVALIDO", "não é um documento do Word");
  const losses = new LossLog();
  const rootRels = readRels(await readXml(zip, "_rels/.rels"));
  const mainPath = ([...rootRels.values()].find((t) => /document\.xml$/.test(t)) ?? "word/document.xml").replace(/^\//, "");
  const doc = await readXml(zip, mainPath);
  if (!doc || doc.name !== "w:document") throw new DocxError("DOCX_INVALIDO", "word/document.xml ausente");
  const body = firstEl(doc, "w:body");
  if (!body) throw new DocxError("DOCX_INVALIDO", "w:body ausente");
  const dir = mainPath.includes("/") ? mainPath.slice(0, mainPath.lastIndexOf("/") + 1) : "";
  const relsPath = `${dir}_rels/${mainPath.slice(dir.length)}.rels`;
  const ctx: Ctx = {
    styles: readStyles(await readXml(zip, `${dir}styles.xml`)),
    numFmt: readNumbering(await readXml(zip, `${dir}numbering.xml`)),
    links: readRels(await readXml(zip, relsPath)),
    losses,
  };
  const names = [...zip.entries.keys()];
  if (names.some((n) => /vbaProject\.bin$/i.test(n))) losses.add("MACRO");
  if (names.some((n) => /^word\/(header|footer)\d*\.xml$/.test(n))) losses.add("CABECALHO_RODAPE");
  const meta: DocMeta = {};
  const blocks = bodyBlocks(body, ctx, meta);
  if (!meta.title) {
    const core = await readXml(zip, "docProps/core.xml").catch(() => undefined);
    const t = core ? findEl(core, "dc:title") : undefined;
    if (t && textOf(t).trim()) meta.title = textOf(t).trim();
  }
  return { meta, blocks, losses };
}

/* ── Escrita ──────────────────────────────────────────────────────────────────────────────────────────── */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Runs de uma linha de texto: tabulações viram <w:tab/>. */
function runs(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split("\t")
        .map((part) => (part ? `<w:r><w:t xml:space="preserve">${xmlEscape(part)}</w:t></w:r>` : ""))
        .join("<w:r><w:tab/></w:r>"),
    )
    .join("<w:r><w:br/></w:r>");
}

const para = (style: string | null, body: string, numId?: number) =>
  `<w:p>${style || numId ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${numId ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>` : ""}</w:pPr>` : ""}${body}</w:p>`;

export function docxDocumentXml(piece: ExportablePiece): { xml: string; lists: number } {
  const parts: string[] = [para("Title", runs(piece.title))];
  let lists = 0;
  for (const b of piece.blocks) {
    if (!b.text.trim()) continue;
    const lines = b.text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    switch (b.kind) {
      case "TITULO":
        parts.push(para(`Heading${b.level ?? 2}`, runs(lines.join(" "))));
        break;
      case "PARAGRAFO":
        parts.push(para(null, runs(lines.join("\n"))));
        break;
      case "CITACAO":
        parts.push(para("Quote", runs(lines.join("\n"))));
        break;
      case "LISTA":
        lists++;
        for (const l of lines) parts.push(para("ListParagraph", runs(l.trim()), lists));
        break;
      case "REFERENCIAS":
        for (const l of lines) parts.push(para("Bibliography", runs(l.trim())));
        break;
    }
  }
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';
  return { xml: `${XML_DECL}<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${parts.join("")}${sect}</w:body></w:document>`, lists };
}

const style = (id: string, name: string, extra = "", type = "paragraph") =>
  `<w:style w:type="${type}" w:styleId="${id}"><w:name w:val="${name}"/>${id === "Normal" ? "" : '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/>'}<w:qFormat/>${extra}</w:style>`;

export const DOCX_STYLES_XML =
  `${XML_DECL}<w:styles xmlns:w="${W_NS}">` +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
  style("Title", "Title", '<w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr>') +
  style("Heading1", "heading 1", '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr>') +
  style("Heading2", "heading 2", '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr>') +
  style("Heading3", "heading 3", '<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr>') +
  style("Quote", "Quote", '<w:pPr><w:ind w:left="2268"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr>') +
  style("ListParagraph", "List Paragraph", '<w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr>') +
  style("Bibliography", "Bibliography", '<w:pPr><w:spacing w:after="240" w:line="240" w:lineRule="auto"/></w:pPr>') +
  "</w:styles>";

export function docxNumberingXml(lists: number): string {
  const abstract = '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>';
  const nums = Array.from({ length: Math.max(1, lists) }, (_, k) => `<w:num w:numId="${k + 1}"><w:abstractNumId w:val="0"/></w:num>`).join("");
  return `${XML_DECL}<w:numbering xmlns:w="${W_NS}">${abstract}${nums}</w:numbering>`;
}

export const DOCX_CONTENT_TYPES =
  `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  "</Types>";

const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const DOCX_ROOT_RELS =
  `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>` +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>` +
  "</Relationships>";

export const DOCX_DOCUMENT_RELS =
  `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId2" Type="${REL}/numbering" Target="numbering.xml"/>` +
  "</Relationships>";

/** Data W3CDTF sem milissegundos (o que o Word espera em dcterms). */
const w3c = (iso: string) => (Number.isNaN(Date.parse(iso)) ? new Date(0) : new Date(iso)).toISOString().replace(/\.\d{3}Z$/, "Z");

export function docxCoreXml(piece: ExportablePiece): string {
  return (
    `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${xmlEscape(piece.title)}</dc:title>` +
    `<dc:language>${xmlEscape(piece.language)}</dc:language>` +
    `<cp:keywords>${xmlEscape(`${piece.docType}; ${piece.genre}`)}</cp:keywords>` +
    `<cp:revision>${piece.revision}</cp:revision>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${w3c(piece.updatedAt)}</dcterms:modified>` +
    "</cp:coreProperties>"
  );
}

export const DOCX_APP_XML = `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Work Station Letters</Application></Properties>`;

/** Partes do pacote (útil para conferir o XML nos testes). */
export function docxParts(piece: ExportablePiece): { name: string; data: string }[] {
  const { xml, lists } = docxDocumentXml(piece);
  return [
    { name: "[Content_Types].xml", data: DOCX_CONTENT_TYPES },
    { name: "_rels/.rels", data: DOCX_ROOT_RELS },
    { name: "word/document.xml", data: xml },
    { name: "word/_rels/document.xml.rels", data: DOCX_DOCUMENT_RELS },
    { name: "word/styles.xml", data: DOCX_STYLES_XML },
    { name: "word/numbering.xml", data: docxNumberingXml(lists) },
    { name: "docProps/core.xml", data: docxCoreXml(piece) },
    { name: "docProps/app.xml", data: DOCX_APP_XML },
  ];
}

export function exportDocx(piece: ExportablePiece, opts: { compress?: boolean } = {}): Promise<Uint8Array> {
  const when = Number.isNaN(Date.parse(piece.updatedAt)) ? new Date() : new Date(piece.updatedAt);
  return writeZip(docxParts(piece), when, opts);
}

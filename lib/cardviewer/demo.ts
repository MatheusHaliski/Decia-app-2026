/**
 * Exemplos DEMO da prévia (laboratório, sem API de arquivos): uma imagem SVG, uma página HTML e uma planilha .xlsx gerados no
 * navegador, sempre marcados "DEMO" na tela. Servem para ver a janela funcionando com tarefas do Mural/perfil e com projetos, que
 * ainda não têm anexos na API. Nada aqui finge ser arquivo da pessoa.
 */
import { writeZip } from "@/lib/letters/io/zip";
import type { PreviewCandidate } from "./preview";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** SVG de exemplo (cores por `currentColor`/sem literal: o desenho usa traço e preenchimento neutros do próprio SVG). */
export function demoSvg(title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect x="8" y="8" width="624" height="384" rx="24" fill="none" stroke="currentColor" stroke-width="4"/><text x="40" y="80" font-family="sans-serif" font-size="28" fill="currentColor">${esc(title)}</text><text x="40" y="360" font-family="monospace" font-size="18" fill="currentColor">DEMO</text><path d="M60 300 L180 180 L280 260 L400 140 L560 240" fill="none" stroke="currentColor" stroke-width="6"/></svg>`;
}

export function demoHtml(title: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:sans-serif;margin:2rem"><h1>${esc(title)}</h1><p>Página de exemplo (DEMO) gerada no navegador para a prévia.</p><p id="js">Scripts desligados.</p><script>document.getElementById("js").textContent="Scripts ligados (origem isolada).";</script></body></html>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** Monta um .xlsx mínimo e válido (OOXML) a partir de linhas de texto/número; `stored` evita compressão (útil em testes). */
export async function buildXlsx(sheetName: string, rows: readonly (readonly (string | number)[])[], opts: { compress?: boolean; merges?: string[]; extra?: { name: string; data: string }[] } = {}): Promise<Uint8Array> {
  const strings: string[] = [];
  const sid = (s: string) => {
    const i = strings.indexOf(s);
    if (i >= 0) return i;
    strings.push(s);
    return strings.length - 1;
  };
  const col = (i: number) => String.fromCharCode(65 + i);
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === "number" ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="s"><v>${sid(v)}</v></c>`)).join("")}</row>`).join("");
  const width = Math.max(1, ...rows.map((r) => r.length));
  const merges = opts.merges?.length ? `<mergeCells count="${opts.merges.length}">${opts.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  const files = [
    { name: "[Content_Types].xml", data: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", data: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `${XML}<workbook ${NS}><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/sharedStrings.xml", data: `${XML}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${""}</sst>` },
    { name: "xl/worksheets/sheet1.xml", data: `${XML}<worksheet ${NS}><dimension ref="A1:${col(width - 1)}${rows.length}"/><sheetData>${body}</sheetData>${merges}</worksheet>` },
    ...(opts.extra ?? []),
  ];
  // os textos compartilhados só são conhecidos depois de montar as linhas
  files[4] = { name: "xl/sharedStrings.xml", data: `${XML}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join("")}</sst>` };
  return writeZip(files, new Date(Date.UTC(2026, 10, 1)), { compress: opts.compress });
}

/** Candidatos DEMO para a prévia (imagem, página, planilha). */
export function demoCandidates(title: string): PreviewCandidate[] {
  return [
    { id: "demo:svg", name: "produto-demo.svg", kind: "SVG", source: "DEMO", mime: "image/svg+xml", demo: async () => new Blob([demoSvg(title)], { type: "image/svg+xml" }) },
    { id: "demo:html", name: "pagina-demo.html", kind: "HTML", source: "DEMO", mime: "text/html", demo: async () => new Blob([demoHtml(title)], { type: "text/html" }) },
    {
      id: "demo:xlsx", name: "planilha-demo.xlsx", kind: "XLSX", source: "DEMO", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      demo: async () => {
        const rows: (string | number)[][] = [["Item", "Quantidade", "Valor"], ...Array.from({ length: 30 }, (_, i) => [`Item ${i + 1}`, i + 1, (i + 1) * 12.5])];
        const bytes = await buildXlsx("Orçamento", rows, { compress: false, merges: [] });
        return new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      },
    },
  ];
}

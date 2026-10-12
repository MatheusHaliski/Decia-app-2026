#!/usr/bin/env node
// Gera lib/rf/catalog.gen.ts a partir de docs/diagramas/RFnn/README.md (fonte de verdade dos RFs: título na linha 1,
// HU, "Aba/rota", "Critérios de aceite cobertos" e os CAs numerados). Cada página-esqueleto cita o RF e lista os CAs
// pelo texto do README — nunca inventados aqui. Uso: node scripts/rf/gerar-catalogo.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIAGRAMAS = path.join(ROOT, "docs/diagramas");
export const OUT = path.join(ROOT, "lib/rf/catalog.gen.ts");

/** Remove ênfase/código do Markdown e desescapa `\|`, mantendo o texto. */
export function plain(md) {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

/** Células de uma linha de tabela Markdown (respeita `\|` escapado). */
function cells(line) {
  const parts = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") { cur += "\\|"; i++; continue; }
    if (ch === "|") { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.slice(1, -1).map((c) => c.trim());
}

const CA_ID = /^(RF\d+\.(?:CA|A)\d+)\b\s*(.*)$/;

export function parseReadme(id, md) {
  const lines = md.split(/\r?\n/);
  const title = plain((lines[0] ?? "").replace(/^#\s*RF\d+\s*[—–-]\s*/, ""));
  const head = lines.slice(0, 12).join("\n");
  const rota = /\*\*Aba\/rota:\*\*\s*([^\n]*?)(?=\s·\s\*\*|\n|$)/.exec(head);
  const cobertos = lines.find((l) => l.startsWith("**Critérios de aceite cobertos:**"));
  let hu = lines.find((l) => /^>\s*\*\*HU\d+\*\*/.test(l));
  if (hu) hu = plain(hu.replace(/^>\s*\*\*HU\d+\*\*\s*[—–-]?\s*/, ""));
  else {
    const p = lines.find((l) => /^HU\d+:\s*\*/.test(l));
    if (p) hu = plain(p.replace(/^HU\d+:\s*/, ""));
  }
  // primeiro parágrafo de prosa (antes de "## 1.") — resume o RF quando o README não traz a HU em bloco de citação
  let summary = null;
  for (const l of lines.slice(1)) {
    if (/^##\s/.test(l)) break;
    if (!l.trim() || /^(\*\*HU|\*\*Critérios|>\s*\*\*HU|\||#|-\s|```)/.test(l)) continue;
    const t = plain(l.replace(/^>\s*/, ""));
    if (t.length >= 80) { summary = t; break; }
  }
  // README só com cabeçalho + CAs em lista (ex.: RF26 reescrito pelos diagramas): resume pelo primeiro CA ou pelo título
  if (!summary && !hu) {
    const firstCa = lines.find((l) => /^-\s+\*\*RF\d+\.(CA|A)\d+\*\*/.test(l));
    summary = firstCa ? plain(firstCa.replace(/^-\s+/, "")) : title;
  }
  const found = new Map();
  for (const line of lines) {
    let m = null;
    let text = "";
    if (line.startsWith("|")) {
      const c = cells(line);
      if (c.length < 2) continue;
      m = CA_ID.exec(plain(c[0]));
      text = plain(c[1]);
    } else if (/^-\s+\*\*RF\d+\.(CA|A)\d+(?:\s*\([^)*]*\))?\*\*/.test(line)) {
      // `- **RF47.CA11 (Opção A — tela principal)** Dado …`: o parêntese dentro do negrito é rótulo do card (vira `note`)
      const label = /^-\s+\*\*RF\d+\.(?:CA|A)\d+\s*\(([^)*]*)\)\*\*/.exec(line);
      const stripped = plain(line.replace(/^-\s+/, "").replace(/^(\*\*RF\d+\.(?:CA|A)\d+)\s*\([^)*]*\)\*\*/, "$1**"));
      m = CA_ID.exec(stripped);
      text = m ? m[2] : "";
      if (m) m = [m[0], m[1], label ? label[1] : ""];
    }
    if (!m || !text || /^-+$/.test(text)) continue;
    const caId = m[1];
    const note = (m[2] ?? "").replace(/^[\s(]+|[\s)]+$/g, "");
    const kind = /^Dado\b/i.test(text) ? "enunciado" : "rastreabilidade";
    const prev = found.get(caId);
    if (!prev || (prev.kind === "rastreabilidade" && kind === "enunciado")) found.set(caId, { id: caId, text, note, kind });
  }
  const num = (s) => Number(/(?:CA|A)(\d+)$/.exec(s)?.[1] ?? 0);
  const cas = [...found.values()].sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }) || num(a.id) - num(b.id));
  return {
    id,
    n: Number(id.slice(2)),
    title,
    hu: hu ?? null,
    summary,
    route: rota ? plain(rota[1]) : null,
    coverage: cobertos ? plain(cobertos.replace("**Critérios de aceite cobertos:**", "")) : null,
    cas,
  };
}

export function gerar() {
  const dirs = fs.readdirSync(DIAGRAMAS).filter((d) => /^RF\d+$/.test(d) && fs.existsSync(path.join(DIAGRAMAS, d, "README.md")));
  dirs.sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
  const items = dirs.map((d) => parseReadme(d, fs.readFileSync(path.join(DIAGRAMAS, d, "README.md"), "utf8")));
  if (items.length < 48) throw new Error(`esperava ≥ 48 READMEs de RF, achei ${items.length}`);
  return [
    "// GERADO por scripts/rf/gerar-catalogo.mjs a partir de docs/diagramas/RFnn/README.md — não editar à mão.",
    "// Título, HU, Aba/rota, cobertura e CAs copiados dos READMEs (texto-fonte em pt-BR). Teste: lib/rf/catalog.test.ts.",
    "",
    "export type CaKind = 'enunciado' | 'rastreabilidade';",
    "export interface RfCa { id: string; text: string; note: string; kind: CaKind }",
    "export interface RfEntry { id: string; n: number; title: string; hu: string | null; summary: string | null; route: string | null; coverage: string | null; cas: RfCa[] }",
    "",
    `export const RF_CATALOG: readonly RfEntry[] = ${JSON.stringify(items, null, 2)};`,
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = gerar();
  if (process.argv.includes("--check")) {
    const atual = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (atual !== out) { console.error(`${path.relative(ROOT, OUT)} desatualizado: rode node scripts/rf/gerar-catalogo.mjs`); process.exit(1); }
    console.log("catálogo de RFs em dia");
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, out);
    console.log(`gerado ${path.relative(ROOT, OUT)} (${(out.match(/"id": "RF\d+"/g) ?? []).length} RFs)`);
  }
}

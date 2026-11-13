#!/usr/bin/env node
// Gera lib/tasks/fieldIndex.gen.ts a partir de contracts/career/academic-fields.json e contracts/career/occupation-packs/*.json:
// índice leve dos 79 ramos (código, rótulo pt-BR/en/es, ÁREA de trabalho padrão e pacote) e carregadores sob demanda de cada
// pacote (import dinâmico estático: cada pacote vira um pedaço separado, baixado só quando a pessoa escolhe o campo).
// Uso: node scripts/career/gerar-indice-campos.mjs [--check]   (--check falha se o arquivo gerado estiver desatualizado)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOG = path.join(ROOT, "contracts/career/academic-fields.json");
const PACKS = path.join(ROOT, "contracts/career/occupation-packs");
const OUT = path.join(ROOT, "lib/tasks/fieldIndex.gen.ts");

/** Área de trabalho padrão por grande área CINE; exceções por ramo abaixo. */
const BY_CINE = { "00": "OUTRA", "01": "PLANEJAMENTO", "02": "PESQUISA", "03": "PESQUISA", "04": "ADMINISTRACAO", "05": "PESQUISA", "06": "SOFTWARE", "07": "ENGENHARIA", "08": "ENGENHARIA", "09": "PESQUISA", "10": "ADMINISTRACAO" };
const OVERRIDES = {
  "artes-visuais": "DESIGN", "cinema-e-audiovisual": "DESIGN", "design": "DESIGN", "design-de-interiores": "DESIGN", "musica": "DESIGN",
  "jornalismo": "MARKETING", "ciencias-economicas": "ADMINISTRACAO",
  "direito": "JURIDICO", "marketing": "MARKETING", "publicidade-e-propaganda": "MARKETING", "relacoes-publicas": "MARKETING",
  "gestao-ambiental": "PLANEJAMENTO", "medicina-veterinaria": "PESQUISA",
  "ciencias-aeronauticas": "ENGENHARIA", "seguranca-do-trabalho": "ENGENHARIA", "seguranca-publica": "PLANEJAMENTO",
};
const AREAS = new Set(["SOFTWARE", "ADMINISTRACAO", "DESIGN", "PESQUISA", "MARKETING", "PLANEJAMENTO", "ENGENHARIA", "JURIDICO", "OUTRA"]);

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const packFiles = fs.readdirSync(PACKS).filter((f) => f.endsWith(".json")).sort();
const packs = packFiles.map((f) => JSON.parse(fs.readFileSync(path.join(PACKS, f), "utf8")));
const packOf = new Map();
for (const p of packs) for (const field of p.fields) packOf.set(field, p.code);

const entries = catalog.fields.map((f) => {
  const area = OVERRIDES[f.code] ?? BY_CINE[f.cine.broad] ?? "OUTRA";
  if (!AREAS.has(area)) throw new Error(`área inválida para ${f.code}: ${area}`);
  return { code: f.code, label: f.label, area, pack: packOf.get(f.code) ?? "generico" };
});
for (const k of Object.keys(OVERRIDES)) if (!entries.some((e) => e.code === k)) throw new Error(`exceção para ramo inexistente: ${k}`);

const q = (s) => JSON.stringify(s);
const lines = [
  "// GERADO por scripts/career/gerar-indice-campos.mjs a partir de contracts/career/ — não editar à mão.",
  "// Índice leve dos ramos (rótulo e área de trabalho padrão) e carregadores sob demanda dos pacotes de domínio.",
  'import type { OccupationPack } from "@/lib/career/occupationPack";',
  'import type { WorkArea } from "./client";',
  "",
  'export interface FieldEntry { code: string; label: { "pt-BR": string; en: string; es: string }; area: WorkArea; pack: string }',
  "",
  "export const FIELD_INDEX: readonly FieldEntry[] = [",
  ...entries.map((e) => `  { code: ${q(e.code)}, label: { "pt-BR": ${q(e.label["pt-BR"])}, en: ${q(e.label.en)}, es: ${q(e.label.es)} }, area: ${q(e.area)}, pack: ${q(e.pack)} },`),
  "];",
  "",
  "const asPack = (m: { default: unknown }) => m.default as OccupationPack;",
  "export const PACK_LOADERS: Readonly<Record<string, () => Promise<OccupationPack>>> = {",
  ...packs.map((p) => `  ${q(p.code)}: () => import("@/contracts/career/occupation-packs/${p.code}.json").then(asPack),`),
  "};",
  "",
];
const out = lines.join("\n");
const check = process.argv.includes("--check");
const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (check) {
  if (current !== out) {
    console.error("lib/tasks/fieldIndex.gen.ts desatualizado: rode node scripts/career/gerar-indice-campos.mjs");
    process.exit(1);
  }
  console.log(`índice de campos em dia (${entries.length} ramos, ${packs.length} pacotes)`);
} else {
  fs.writeFileSync(OUT, out);
  console.log(`gerado ${path.relative(ROOT, OUT)}: ${entries.length} ramos, ${packs.length} pacotes`);
}

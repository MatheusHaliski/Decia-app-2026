#!/usr/bin/env node
// Gera components/ui/glyphs/sprite.gen.ts a partir de docs/design-system/glyphs/ (catalog.ts + svg/*.svg).
// Fonte de verdade: GLYPHS.md / catalog.ts (gerados por glyphs/gerar.mjs). Aqui só: (1) lê o catálogo, (2) extrai o
// miolo de cada SVG (sem o <svg> externo e sem <title>, que o componente <Glyph> monta com o rótulo i18n) e (3) remove
// os fallbacks literais `var(--ws-x, #hex|rgba())` — no app a cor vem SEMPRE do token (D-11; teste de cor literal).
// Uso: node scripts/glyphs/gerar-sprite.mjs [--check]   (--check: sai com 1 se o arquivo gerado estiver desatualizado)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "docs/design-system/glyphs");
export const OUT = path.join(ROOT, "components/ui/glyphs/sprite.gen.ts");

/** `var(--ws-x, <qualquer fallback>)` → `var(--ws-x)` (fallback pode conter parênteses: rgba(...)). */
export function stripFallbacks(svg) {
  return svg.replace(/var\((--[a-z0-9-]+)\s*,\s*((?:[^()]|\([^()]*\))*)\)/g, (_m, name) => `var(${name})`);
}

/** Miolo do SVG: tudo entre <svg …> e </svg>, sem <title>. */
export function inner(svg) {
  const open = svg.indexOf(">", svg.indexOf("<svg"));
  const close = svg.lastIndexOf("</svg>");
  return svg.slice(open + 1, close).replace(/<title>[\s\S]*?<\/title>/g, "").trim();
}

function parseCatalog(ts) {
  const glyphs = [...ts.matchAll(/\{\s*name:\s*'([^']+)',\s*labelKey:\s*'([^']+)',\s*outline:\s*'[^']+',\s*clay:\s*'[^']+'(?:,\s*nodes:\s*\[([^\]]*)\])?\s*\}/g)]
    .map((m) => ({ name: m[1], labelKey: m[2], nodes: m[3] ? m[3].split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean) : [] }));
  const mojis = [...ts.matchAll(/\{\s*name:\s*'([^']+)',\s*labelKey:\s*'([^']+)',\s*face:\s*'([^']+)',\s*file:\s*'[^']+'(?:,\s*animated:\s*(true))?\s*\}/g)]
    .map((m) => ({ name: m[1], labelKey: m[2], face: m[3], animated: m[4] === "true" }));
  return { glyphs, mojis };
}

const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

export function gerar() {
  const { glyphs, mojis } = parseCatalog(read("catalog.ts"));
  if (!glyphs.length || !mojis.length) throw new Error("catálogo de glifos vazio ou em formato inesperado");
  const lines = [
    "// GERADO por scripts/glyphs/gerar-sprite.mjs a partir de docs/design-system/glyphs/ — não editar à mão.",
    "// Miolo dos SVGs (viewBox 0 0 24 24) sem fallback de cor literal: tudo por var(--ws-*) ou currentColor.",
    "// Teste: scripts/glyphs/sprite.test.ts falha se este arquivo divergir dos SVGs do catálogo.",
    "",
    "export type WsNode = 'red' | 'yellow' | 'green' | 'blue' | 'brown' | 'orange';",
    "export interface GlyphEntry { labelKey: string; nodes: readonly WsNode[]; outline: string; clay: string }",
    "export interface MojiEntry { labelKey: string; face: string; animated: boolean; svg: string }",
    "",
    "export const GLYPHS = {",
  ];
  for (const g of glyphs) {
    const outline = stripFallbacks(inner(read(`svg/${g.name}--outline.svg`)));
    const clay = stripFallbacks(inner(read(`svg/${g.name}--clay.svg`)));
    lines.push(`  '${g.name}': { labelKey: '${g.labelKey}', nodes: [${g.nodes.map((n) => `'${n}'`).join(", ")}] as const, outline: ${JSON.stringify(outline)}, clay: ${JSON.stringify(clay)} },`);
  }
  lines.push("} as const satisfies Record<string, GlyphEntry>;", "", "export const MOJIS = {");
  for (const m of mojis) {
    const svg = stripFallbacks(inner(read(`svg/moji-${m.name}.svg`)));
    lines.push(`  '${m.name}': { labelKey: '${m.labelKey}', face: ${JSON.stringify(m.face)}, animated: ${m.animated}, svg: ${JSON.stringify(svg)} },`);
  }
  lines.push("} as const satisfies Record<string, MojiEntry>;", "", "export type GlyphName = keyof typeof GLYPHS;", "export type MojiName = keyof typeof MOJIS;", "");
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = gerar();
  if (process.argv.includes("--check")) {
    const atual = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (atual !== out) { console.error(`${path.relative(ROOT, OUT)} desatualizado: rode node scripts/glyphs/gerar-sprite.mjs`); process.exit(1); }
    console.log("sprite de glifos em dia");
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, out);
    console.log(`gerado ${path.relative(ROOT, OUT)}`);
  }
}

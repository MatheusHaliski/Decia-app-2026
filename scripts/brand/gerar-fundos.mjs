#!/usr/bin/env node
// Artes de fundo das telas (RF23/RF3, D-34): a partir dos originais do dono em public/brand/RF23/ ("Aura Geometry (n).png",
// mantidos intactos) gera nomes estáveis e variantes otimizadas em public/brand/backgrounds/ — <id>.png (cópia),
// <id>-1280.webp, <id>-640.webp (2 tamanhos para srcset) e <id>-thumb.webp (320×180, seletor) — e mede a luminância
// média (0–100) de cada arte para o catálogo decidir o tom (dark < 50) e, portanto, o scrim/tinta do texto sobre a arte.
// Emite components/ui/backgrounds/aura.gen.ts com {id, source, luminance, tone, width, height}. Usa o sharp que o Next já
// instala. Uso: node scripts/brand/gerar-fundos.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "public/brand/RF23");
const OUT_DIR = path.join(ROOT, "public/brand/backgrounds");
const OUT_TS = path.join(ROOT, "components/ui/backgrounds/aura.gen.ts");

/** Luminância relativa média (0–100) por sRGB → linear → Rec. 709, a partir de uma redução 64×64. */
export async function luminance(file) {
  const { data, info } = await sharp(file).resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  let sum = 0;
  for (let i = 0; i < data.length; i += info.channels) sum += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]);
  return Math.round((sum / (data.length / info.channels)) * 1000) / 10;
}

export async function gerar({ write = true } = {}) {
  const originals = fs.readdirSync(SRC).filter((f) => /^Aura Geometry \((\d+)\)\.png$/.test(f)).sort((a, b) => Number(/\((\d+)\)/.exec(a)[1]) - Number(/\((\d+)\)/.exec(b)[1]));
  if (!originals.length) throw new Error(`nenhuma arte em ${SRC}`);
  if (write) fs.mkdirSync(OUT_DIR, { recursive: true });
  const entries = [];
  for (const [i, name] of originals.entries()) {
    const id = `aura-geometry-${String(i + 1).padStart(2, "0")}`;
    const src = path.join(SRC, name);
    const meta = await sharp(src).metadata();
    const lum = await luminance(src);
    if (write) {
      fs.copyFileSync(src, path.join(OUT_DIR, `${id}.png`));
      await sharp(src).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(OUT_DIR, `${id}-1280.webp`));
      await sharp(src).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT_DIR, `${id}-640.webp`));
      await sharp(src).resize(320, 180, { fit: "cover" }).webp({ quality: 70 }).toFile(path.join(OUT_DIR, `${id}-thumb.webp`));
    }
    entries.push({ id, source: `public/brand/RF23/${name}`, width: meta.width, height: meta.height, luminance: lum, tone: lum < 50 ? "dark" : "light" });
  }
  const ts = [
    "// GERADO por scripts/brand/gerar-fundos.mjs a partir de public/brand/RF23/ — não editar à mão.",
    "// Luminância média (0–100, Rec. 709 sobre sRGB linearizado) decide o tom: dark < 50 → scrim escuro e texto creme; light → vidro claro e texto do tema.",
    "export interface AuraArt { id: string; source: string; width: number; height: number; luminance: number; tone: 'dark' | 'light' }",
    `export const AURA_ARTS: readonly AuraArt[] = ${JSON.stringify(entries, null, 2)};`,
    "",
  ].join("\n");
  return { ts, entries };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { ts, entries } = await gerar({ write: !check });
  if (check) {
    const atual = fs.existsSync(OUT_TS) ? fs.readFileSync(OUT_TS, "utf8") : "";
    if (atual !== ts) { console.error(`${path.relative(ROOT, OUT_TS)} desatualizado: rode node scripts/brand/gerar-fundos.mjs`); process.exit(1); }
    console.log("catálogo de artes em dia");
  } else {
    fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
    fs.writeFileSync(OUT_TS, ts);
    for (const e of entries) console.log(`${e.id}  ${e.width}×${e.height}  lum=${e.luminance}  ${e.tone}`);
  }
}

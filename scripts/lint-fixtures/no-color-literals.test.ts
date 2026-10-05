import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIRS = ["components", "app", "lib", "styles"];
// catalog.gen.ts é texto dos READMEs (dados, não UI)
const ALLOWED = new Set(["styles/tokens-ws.css", "lib/rf/catalog.gen.ts"]);
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

/** Guarda genérica (D-11, D-30): nenhuma cor literal fora de styles/tokens-ws.css — nem no sprite de glifos gerado. */
describe("cor só por token em components/**, app/**, lib/** e styles/**", () => {
  it("nenhum arquivo traz #hex, rgb(), hsl() etc. (exceto tokens-ws.css)", () => {
    const offenders: string[] = [];
    for (const dir of DIRS) {
      for (const file of walk(path.join(ROOT, dir))) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        if (ALLOWED.has(rel)) continue;
        const lines = fs.readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          // ids de âncora/URL (#conteudo) e seletores CSS (#id) não são cores: exigimos 3–8 hex seguidos de fim de palavra
          const m = COLOR.exec(line.replace(/href="#[a-z-]+"/g, "").replace(/`#\$\{[^}]*\}`/g, ""));
          if (m && !/^\s*(\/\/|\*|\/\*)/.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});

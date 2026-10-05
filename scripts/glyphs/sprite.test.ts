import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { OUT, gerar, inner, stripFallbacks } from "./gerar-sprite.mjs";

/** Guarda do sprite de glifos: o arquivo gerado em components/ui/glyphs tem de bater com docs/design-system/glyphs. */
describe("WS Glyphs: sprite gerado", () => {
  it("components/ui/glyphs/sprite.gen.ts está em dia com os SVGs do catálogo (rode node scripts/glyphs/gerar-sprite.mjs)", () => {
    expect(fs.readFileSync(OUT, "utf8")).toBe(gerar());
  });

  it("remove fallbacks literais de cor e mantém o token", () => {
    expect(stripFallbacks('fill="var(--ws-node-red, #FC4E2B)"')).toBe('fill="var(--ws-node-red)"');
    expect(stripFallbacks("fill=\"var(--ws-glyph-shine, rgba(102,99,98,.55))\"")).toBe('fill="var(--ws-glyph-shine)"');
    expect(stripFallbacks('font-family=\'var(--ws-font-mono, "IBM Plex Mono"), monospace\'')).toBe("font-family='var(--ws-font-mono), monospace'");
  });

  it("extrai o miolo sem <title>", () => {
    expect(inner('<svg viewBox="0 0 24 24"><title>X</title><rect x="1"/></svg>')).toBe('<rect x="1"/>');
  });

  it("o sprite não traz cor literal nenhuma", () => {
    const s = gerar();
    expect(s).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(s).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});

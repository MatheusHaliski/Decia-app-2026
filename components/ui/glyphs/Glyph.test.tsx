// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { GLYPHS, GLYPH_NAMES, Glyph, MOJIS, MOJI_NAMES, Moji } from "./Glyph";

describe("WS Glyphs / Moji", () => {
  it("catálogo: 17 glifos e 9 mojis, com rótulo i18n", () => {
    expect(GLYPH_NAMES).toHaveLength(17);
    expect(MOJI_NAMES).toHaveLength(9);
    for (const n of GLYPH_NAMES) expect(GLYPHS[n].labelKey).toBe(`glyph.${n}`);
    for (const n of MOJI_NAMES) expect(MOJIS[n].labelKey).toBe(`moji.${n}`);
  });

  it("outline usa currentColor e o rótulo vem do catálogo (RF38.CA01); decorative esconde", () => {
    renderWithProviders(<><Glyph name="mural" /><Glyph name="buscar" decorative /></>);
    const img = screen.getByRole("img", { name: "Mural" });
    expect(img.innerHTML).toContain("currentColor");
    expect(img.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(document.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(1);
  });

  it("clay usa tokens --ws-* e nenhum hex; moji traz o rosto no rótulo e marca animação", () => {
    renderWithProviders(<><Glyph name="decia-points" variant="clay" size={40} /><Moji name="carregando" /><Moji name="vazio" /></>);
    const clay = screen.getByRole("img", { name: "DECIA Points" });
    expect(clay.innerHTML).toContain("var(--ws-");
    expect(clay.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(clay.getAttribute("width")).toBe("40");
    expect(screen.getByRole("img", { name: "Carregando >_▌" }).getAttribute("data-animated")).toBe("true");
    expect(screen.getByRole("img", { name: "Vazio >_ ?" }).getAttribute("data-animated")).toBeNull();
  });

  it("traduz o rótulo pelo idioma das preferências", () => {
    renderWithProviders(<Glyph name="sair" />, { prefs: { language: "en" } });
    expect(screen.getByRole("img", { name: "Sign out" })).toBeTruthy();
  });
});

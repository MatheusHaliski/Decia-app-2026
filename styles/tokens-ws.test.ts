import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** D-33: styles/tokens-ws.css é cópia da fonte de verdade docs/design-system/tokens-ws.css — o CI falha se divergir. */
describe("tokens v2 do app", () => {
  it("styles/tokens-ws.css é idêntico a docs/design-system/tokens-ws.css", () => {
    const app = fs.readFileSync(`${ROOT}/styles/tokens-ws.css`, "utf8");
    const docs = fs.readFileSync(`${ROOT}/docs/design-system/tokens-ws.css`, "utf8");
    expect(app).toBe(docs);
  });

  it("os quatro temas e as preferências estão definidos", () => {
    const css = fs.readFileSync(`${ROOT}/styles/tokens-ws.css`, "utf8");
    for (const theme of ["claro", "escuro", "contraste", "terminal"]) expect(css).toContain(`[data-theme="${theme}"]`);
    expect(css).toContain('[data-reduce-motion="true"]');
    const prefs = fs.readFileSync(`${ROOT}/styles/preferences.css`, "utf8");
    for (const d of ["compacta", "confortavel"]) expect(prefs).toContain(`[data-density="${d}"]`);
    for (const f of [90, 100, 112, 125]) expect(prefs).toContain(`[data-font-scale="${f}"]`);
  });
});

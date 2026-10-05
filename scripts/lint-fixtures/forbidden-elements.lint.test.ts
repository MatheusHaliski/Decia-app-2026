import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Prova dos gates do design system (D-11, D-30): a configuração REAL do ESLint (eslint.config.mjs) tem de rejeitar cada
 * elemento nativo solto fora de components/ui/**, rejeitar cor literal/classe Tailwind de cor fixa em qualquer .tsx e
 * aceitar os componentes do design system, que usam os elementos nativos por dentro.
 */
describe("eslint: gates do design system", () => {
  it("a fixture com <a>, <button>, <input>, <select>, <dialog> e <progress> falha com 6 erros de no-restricted-syntax", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const [result] = await eslint.lintFiles(["scripts/lint-fixtures/forbidden-elements.tsx"]);
    const restricted = result!.messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted).toHaveLength(6);
    const tags = restricted.map((m) => /<([a-z]+)> solto/.exec(m.message)?.[1]).sort();
    expect(tags).toEqual(["a", "button", "dialog", "input", "progress", "select"]);
    for (const m of restricted) expect(m.severity).toBe(2);
  }, 60_000);

  it("a fixture com cor literal em style={{}} e classes Tailwind de cor fixa falha com 6 erros (cn() dentro de className conta duas vezes)", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const [result] = await eslint.lintFiles(["scripts/lint-fixtures/color-literals.tsx"]);
    const restricted = result!.messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted.map((m) => m.line).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12, 12]);
    expect(restricted.filter((m) => /style=/.test(m.message))).toHaveLength(2);
    expect(restricted.filter((m) => /Tailwind/.test(m.message))).toHaveLength(4);
  }, 60_000);

  it("components/ui pode usar <button>, <a>, <input>, <select> e passa sem erro", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const results = await eslint.lintFiles(["components/ui/Button.tsx", "components/ui/Form.tsx", "components/ui/Link.tsx"]);
    for (const r of results) {
      expect(r.messages.filter((m) => m.ruleId === "no-restricted-syntax"), r.filePath).toHaveLength(0);
      expect(r.errorCount, r.filePath).toBe(0);
    }
  }, 60_000);
});

import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Prova do gate do design system (D-11): a configuração REAL do ESLint (eslint.config.mjs) tem de rejeitar cada
 * elemento nativo solto fora de components/ui/** e aceitar o Button do design system, que os usa por dentro.
 */
describe("eslint: elementos proibidos fora de components/ui", () => {
  it("a fixture com <a>, <button>, <input>, <select>, <dialog> e <progress> falha com 6 erros de no-restricted-syntax", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const [result] = await eslint.lintFiles(["scripts/lint-fixtures/forbidden-elements.tsx"]);
    const restricted = result!.messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted).toHaveLength(6);
    const tags = restricted.map((m) => /<([a-z]+)> solto/.exec(m.message)?.[1]).sort();
    expect(tags).toEqual(["a", "button", "dialog", "input", "progress", "select"]);
    for (const m of restricted) expect(m.severity).toBe(2);
  }, 60_000);

  it("components/ui/Button.tsx pode usar <button> e <a>", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const [result] = await eslint.lintFiles(["components/ui/Button.tsx"]);
    expect(result!.messages.filter((m) => m.ruleId === "no-restricted-syntax")).toHaveLength(0);
    expect(result!.errorCount).toBe(0);
  }, 60_000);
});

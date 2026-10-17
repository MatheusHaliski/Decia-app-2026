import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { loadLegal } from "./load";
import { parseInline, parseLegal, splitFrontMatter } from "./markdown";

const FILE = { TERMOS: "docs/legal/TERMOS_DE_USO.md", PRIVACIDADE: "docs/legal/POLITICA_DE_PRIVACIDADE.md" } as const;

describe("textos legais (D-143)", () => {
  it("lê cabeçalho, títulos, listas, tabelas e tags; esconde as pendências internas", () => {
    const doc = parseLegal([
      "---", "document: TERMOS", 'version: "0.2"', "status: rascunho", "---",
      "# Termos", "", "A **Velion** ({{VELION_CNPJ}}) mantém https://exemplo.org.", "",
      "- um", "- dois *itálico*", "", "| A | B |", "|---|---|", "| `x` | {{DPO_EMAIL}} |", "",
      "## Pendências para o jurídico", "", "- Q-243 interna", "### sub", "texto interno", "",
    ].join("\n"));
    expect(doc.meta).toMatchObject({ document: "TERMOS", version: "0.2", status: "rascunho" });
    expect(doc.blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "table"]);
    expect(JSON.stringify(doc.blocks)).not.toContain("Q-243");
    expect(doc.pendingTags).toEqual(["VELION_CNPJ", "DPO_EMAIL"]);
    expect(parseInline("A **Velion** {{X_1}} https://a.b/c.")).toEqual([
      { t: "text", v: "A " }, { t: "strong", v: [{ t: "text", v: "Velion" }] }, { t: "text", v: " " }, { t: "tag", v: "X_1" }, { t: "text", v: " " },
      { t: "url", v: "https://a.b/c" }, { t: "text", v: "." },
    ]);
    expect(splitFrontMatter("sem cabeçalho").meta).toEqual({});
  });

  it("os textos da Velion: só tags listadas em CAMPOS_A_PREENCHER, sem colchetes e sem a SECID como controladora", () => {
    const allowed = new Set([...fs.readFileSync("docs/legal/CAMPOS_A_PREENCHER.md", "utf8").matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]));
    for (const kind of ["TERMOS", "PRIVACIDADE"] as const) {
      const doc = loadLegal(kind);
      expect(doc.meta.document).toBe(kind);
      expect(doc.meta.status, "rascunho até preencher as tags").toBe("rascunho");
      for (const tag of doc.pendingTags) expect(allowed.has(tag), `${kind}: {{${tag}}}`).toBe(true);
      const body = JSON.stringify(doc.blocks);
      expect(body).toContain("Velion");
      expect(body).toContain("Orange Social");
      expect(body).not.toMatch(/SECID/);
      expect(splitFrontMatter(fs.readFileSync(FILE[kind], "utf8")).body, "sem colchetes no corpo (docs/legal/README.md)").not.toMatch(/[[\]]/);
    }
  });
});

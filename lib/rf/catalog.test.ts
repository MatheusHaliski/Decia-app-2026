import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { OUT, gerar, parseReadme, plain } from "../../scripts/rf/gerar-catalogo.mjs";
import { RF_CATALOG } from "./catalog.gen";
import { PAGES, rfsOf } from "@/lib/pages/registry";

/** Guarda do catálogo de RFs: lib/rf/catalog.gen.ts tem de bater com docs/diagramas/RFnn/README.md. */
describe("catálogo de RFs gerado dos READMEs", () => {
  it("lib/rf/catalog.gen.ts está em dia (rode node scripts/rf/gerar-catalogo.mjs)", () => {
    expect(fs.readFileSync(OUT, "utf8")).toBe(gerar());
  });

  it("tem RF1…RFn contíguos (todo docs/diagramas/RFnn), cada um com título, rota e pelo menos um CA ou linha de cobertura", () => {
    expect(RF_CATALOG.length).toBeGreaterThanOrEqual(50);
    expect(RF_CATALOG.map((r) => r.n)).toEqual(Array.from({ length: RF_CATALOG.length }, (_, i) => i + 1));
    for (const rf of RF_CATALOG) {
      expect(rf.title.length, rf.id).toBeGreaterThan(10);
      expect(rf.route, rf.id).toBeTruthy();
      expect(rf.cas.length > 0 || !!rf.coverage, rf.id).toBe(true);
      expect(rf.hu ?? rf.summary, rf.id).toBeTruthy();
    }
  });

  it("parser: tabela de CAs, bullets, prioridade do enunciado sobre a rastreabilidade, HU e Aba/rota", () => {
    const md = [
      "# RF99 — Título de **teste**",
      "**HU:** HU99 · **Sprint:** 1 · **Aba/rota:** Mural (`/mural`) · **Critérios:** x",
      "**Critérios de aceite cobertos:** RF99.CA01 · CA02",
      "",
      "> **HU99** — COMO alguém POSSO algo PARA fim.",
      "",
      "| CA | Rastreabilidade |",
      "|---|---|",
      "| RF99.CA02 | Classe `X` \\| atividade |",
      "| **RF99.CA01** (CA a confirmar) | Dado um caso, quando ajo, então `resultado`. |",
      "| RF99.CA01 | Classe `Y` |",
      "- **RF99.CA03** Posso fazer outra coisa.",
    ].join("\n");
    const rf = parseReadme("RF99", md);
    expect(rf.title).toBe("Título de teste");
    expect(rf.route).toBe("Mural (/mural)");
    expect(rf.hu).toBe("COMO alguém POSSO algo PARA fim.");
    expect(rf.coverage).toBe("RF99.CA01 · CA02");
    expect(rf.cas.map((c) => c.id)).toEqual(["RF99.CA01", "RF99.CA02", "RF99.CA03"]);
    expect(rf.cas[0]).toMatchObject({ kind: "enunciado", note: "CA a confirmar", text: "Dado um caso, quando ajo, então resultado." });
    expect(rf.cas[1]).toMatchObject({ kind: "rastreabilidade", text: "Classe X | atividade" });
    expect(rf.cas[2]).toMatchObject({ kind: "rastreabilidade", text: "Posso fazer outra coisa." });
    expect(plain("**a** `b` [c](d) \\| e")).toBe("a b c | e");
    // rótulo entre parênteses dentro do negrito (cards RF47/RF48: "Opção A — tela principal") vira nota do CA
    const rotulado = parseReadme("RF98", "# RF98 — T\n- **RF98.CA11 (Opção A — tela principal)** Dado a aba, quando busco, então vejo **linhas**.");
    expect(rotulado.cas[0]).toMatchObject({ id: "RF98.CA11", kind: "enunciado", note: "Opção A — tela principal", text: "Dado a aba, quando busco, então vejo linhas." });
  });

  it("toda página-esqueleto cita RFs do catálogo e todo RF do catálogo tem pelo menos uma página", () => {
    const ids = new Set(RF_CATALOG.map((r) => r.id));
    const cited = new Set<string>();
    for (const page of PAGES) for (const rf of rfsOf(page)) {
      expect(ids.has(rf), `${page.route} cita ${rf}`).toBe(true);
      cited.add(rf);
    }
    const missing = [...ids].filter((id) => !cited.has(id));
    expect(missing, "RFs sem página-esqueleto").toEqual([]);
  });
});

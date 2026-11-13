import { describe, expect, it } from "vitest";
import { charGrams, contentTerms, diceSimilarity, fold, isStopword, normalizeToken, sectionLabelOf, sentences, stem, tokenize } from "./text";

const st = (w: string) => stem(normalizeToken(w));

describe("normalização e tokens (posições exatas no texto original)", () => {
  it("compara sem acento e sem caixa, mas devolve as posições do texto original", () => {
    expect(fold("Pavimentação ÇÃO")).toBe("pavimentacao cao");
    expect(normalizeToken("e-mail")).toBe("email");
    const text = "Convênio nº 12/2025: R$ 1.200,00 — pavimentação";
    const toks = tokenize(text);
    for (const t of toks) expect(text.slice(t.start, t.end)).toBe(t.raw);
    expect(toks.map((t) => t.raw)).toEqual(["Convênio", "nº", "12/2025", "R", "1.200,00", "pavimentação"]);
  });

  it("acento em NFD (arquivo de outro sistema) vira o mesmo termo do NFC", () => {
    const nfd = "Pavimentação".normalize("NFD");
    expect(normalizeToken(tokenize(nfd)[0]!.raw)).toBe("pavimentacao");
  });

  it("palavras vazias e enchimento de pergunta saem; conteúdo fica", () => {
    expect(contentTerms("Quem já fez convênio de pavimentação com a Caixa?").map((t) => t.stem)).toEqual(["conveni", "paviment", "caix"]);
    expect(isStopword("de")).toBe(true);
    expect(isStopword("ata")).toBe(false);
  });
});

describe("radicalização leve do português", () => {
  it.each([
    ["convênios", "convênio"],
    ["pavimentação", "pavimentar"],
    ["pavimentadas", "pavimentação"],
    ["licitações", "licitação"],
    ["portarias", "portaria"],
    ["servidores", "servidor"],
    ["fiscais", "fiscal"],
    ["designação", "designado"],
    ["planejamento", "planejar"],
    ["aprovação", "aprovou"],
  ])("%s ≈ %s", (a, b) => {
    expect(st(a)).toBe(st(b));
  });

  it("não confunde palavras diferentes nem estraga as curtas", () => {
    expect(st("portaria")).not.toBe(st("porta"));
    expect(st("leis")).toBe("lei");
    expect(st("ata")).toBe("ata");
    expect(st("2025")).toBe("2025");
  });
});

describe("frases com posição exata", () => {
  it("não quebra em abreviação, número ou ordinal; título e itens viram frases próprias", () => {
    const text = [
      "# Portaria 12/2025",
      "",
      "Art. 3º O prazo é de 10 dias, conforme a Lei nº 14.133/2021. Vale R$ 1.200,00 por mês.",
      "1. Primeiro item da lista.",
      "Texto com quebra",
      "rígida no meio da frase.",
    ].join("\n");
    const got = sentences(text).map((s) => text.slice(s.start, s.end));
    expect(got).toEqual([
      "# Portaria 12/2025",
      "Art. 3º O prazo é de 10 dias, conforme a Lei nº 14.133/2021.",
      "Vale R$ 1.200,00 por mês.",
      "1. Primeiro item da lista.",
      "Texto com quebra\nrígida no meio da frase.",
    ]);
  });

  it("rótulo de seção para a citação", () => {
    expect(sectionLabelOf("## 2. Prazos de resposta")).toBe("2. Prazos de resposta");
    expect(sectionLabelOf("Art. 3º As metas do servidor")).toBe("art. 3º");
    expect(sectionLabelOf("Texto comum.")).toBeNull();
  });
});

describe("n-gramas e semelhança de grafia", () => {
  it("trigramas com borda e Dice tolerante a erro de digitação", () => {
    expect(charGrams("ata")).toEqual(["#at", "ata", "ta#"]);
    expect(diceSimilarity(st("teletrabaho"), st("teletrabalho"))).toBeGreaterThan(0.7);
    expect(diceSimilarity(st("teletrabalho"), st("orçamento"))).toBeLessThan(0.2);
  });
});

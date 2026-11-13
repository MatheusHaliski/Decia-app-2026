import { describe, expect, it } from "vitest";
import { CONTRACTIONS, tokenize } from "./tokenize";

const texts = (s: string) => tokenize(s).tokens.map((t) => t.text);

describe("tokenize — palavras, posições e frases", () => {
  it("guarda posições exatas: text.slice(start, end) === token", () => {
    const text = "A ação “rápida” do Sr. Silva custou R$ 3,5 mil (12%) em 2026.";
    const { tokens } = tokenize(text);
    for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.text);
    expect(texts(text)).toEqual(["A", "ação", "“", "rápida", "”", "do", "Sr", ".", "Silva", "custou", "R", "$", "3,5", "mil", "(", "12%", ")", "em", "2026", "."]);
  });

  it("acentos, hífen e ênclise ficam numa palavra só", () => {
    expect(texts("Realizou-se a análise do guarda-chuva d'água")).toEqual(["Realizou-se", "a", "análise", "do", "guarda-chuva", "d'água"]);
  });

  it("contrações têm preposição + artigo/pronome (do, na, pelo, à, daquele)", () => {
    const { tokens } = tokenize("Do relatório na sala pelo servidor à equipe daquele setor");
    const byText = Object.fromEntries(tokens.map((t) => [t.lower, t.contraction]));
    expect(byText.do).toEqual(["de", "o"]);
    expect(byText.na).toEqual(["em", "a"]);
    expect(byText.pelo).toEqual(["por", "o"]);
    expect(byText["à"]).toEqual(["a", "a"]);
    expect(byText.daquele).toEqual(["de", "aquele"]);
    expect(byText.relatório).toBeUndefined();
    expect(CONTRACTIONS["às"]).toEqual(["a", "as"]);
  });

  it("números (decimal, milhar, ordinal, percentual) e siglas", () => {
    const { tokens } = tokenize("O 1º lote tem 1.200 itens (3,5%) da ABNT e da S.A.");
    const kinds = Object.fromEntries(tokens.map((t) => [t.text, t.kind]));
    expect(kinds["1º"]).toBe("NUMERO");
    expect(kinds["1.200"]).toBe("NUMERO");
    expect(kinds["3,5%"]).toBe("NUMERO");
    expect(kinds.ABNT).toBe("SIGLA");
    expect(kinds["S.A."]).toBe("SIGLA");
  });

  it("URL e DOI são um token (sem a pontuação final)", () => {
    const { tokens } = tokenize("Ver https://exemplo.gov.br/a?b=1. DOI 10.1590/0034-7612.");
    expect(tokens.filter((t) => t.kind === "URL").map((t) => t.text)).toEqual(["https://exemplo.gov.br/a?b=1", "10.1590/0034-7612"]);
  });

  it("frases: abreviaturas, iniciais e meses não encerram; quebra de linha encerra", () => {
    const { sentences } = tokenize("O Sr. Silva e J. A. Souza chegaram. Acesso em: 12 mar. 2024. Fim!\nItem dois");
    expect(sentences.map((s) => s.text)).toEqual(["O Sr. Silva e J. A. Souza chegaram.", "Acesso em: 12 mar. 2024.", "Fim!", "Item dois"]);
  });

  it("aspas de fechamento ficam na frase; minúscula depois do ponto não abre frase", () => {
    const { sentences } = tokenize("Ele disse: “Está pronto.” Depois saiu. Ver p. ex. o anexo.");
    expect(sentences.map((s) => s.text)).toEqual(["Ele disse: “Está pronto.”", "Depois saiu.", "Ver p. ex. o anexo."]);
  });

  it("texto vazio não gera token nem frase", () => {
    expect(tokenize("")).toEqual({ tokens: [], sentences: [] });
    expect(tokenize("   \n ").sentences).toEqual([]);
  });
});

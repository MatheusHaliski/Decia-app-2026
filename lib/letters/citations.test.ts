import { describe, expect, it } from "vitest";
import { analyzeCitations, authorKey, parseCitations, parseReference, referenceLines } from "./citations";
import type { LetterBlock } from "./types";

const para = (id: string, text: string): LetterBlock => ({ id, kind: "PARAGRAFO", text });
const refs = (id: string, ...lines: string[]): LetterBlock => ({ id, kind: "REFERENCIAS", text: lines.join("\n") });
const rules = (blocks: LetterBlock[]) => analyzeCitations(blocks).findings.map((f) => f.raw.ruleId);

describe("chamadas no texto (NBR 10520 e numérico)", () => {
  it("autor-data entre parênteses, com página, vários autores, várias obras e apud", () => {
    const c = parseCitations(para("p", "Conforme a norma (SILVA, 2020, p. 12) e outros (SOUZA; LIMA, 2019). Ver também (COSTA, 2018; ROCHA et al., 2021, p. 3-5) e (FREIRE, 1987 apud MELO, 2015)."));
    expect(c.map((x) => [x.authors.join("+"), x.year, x.page, x.apud])).toEqual([
      ["SILVA", "2020", "12", false],
      ["SOUZA+LIMA", "2019", null, false],
      ["COSTA", "2018", null, false],
      ["ROCHA", "2021", "3-5", false],
      ["MELO", "2015", null, true],
    ]);
    for (const x of c) expect(x.style).toBe("AUTOR_DATA");
  });

  it("narrativa: «Silva (2020)», «Silva e Souza (2019, p. 4)», sigla «IBGE (2022)»", () => {
    const c = parseCitations(para("p", "Segundo Silva (2020), há falhas. Silva e Souza (2019, p. 4) discordam; o IBGE (2022) confirma."));
    expect(c.map((x) => [x.form, x.authors.join("+"), x.year, x.page])).toEqual([
      ["NARRATIVA", "SILVA", "2020", null],
      ["NARRATIVA", "SILVA+SOUZA", "2019", "4"],
      ["NARRATIVA", "IBGE", "2022", null],
    ]);
    // a chamada começa no autor: posição exata no texto
    const text = "Segundo Silva (2020), há falhas.";
    const [first] = parseCitations(para("p", text));
    expect(text.slice(first!.start, first!.end)).toBe("Silva (2020)");
  });

  it("numérico com faixas e listas; parêntese comum não é citação", () => {
    const c = parseCitations(para("p", "Como visto [1], [2-4] e [5, 7]. O índice subiu (em 2020) e (veja a tabela)."));
    expect(c.map((x) => x.numbers)).toEqual([[1], [2, 3, 4], [5, 7]]);
  });

  it("chave de autor ignora acento, caixa e «et al.»", () => {
    expect(authorKey("Conceição et al.")).toBe("CONCEICAO");
    expect(authorKey("SILVA,")).toBe("SILVA");
  });
});

describe("lista de referências (NBR 6023 e Vancouver)", () => {
  it("livro ABNT completo: autor, título, local: editora, ano", () => {
    const r = parseReference("r", "SILVA, João A. Gestão documental. 2. ed. São Paulo: Atlas, 2020.", 0);
    expect(r).toMatchObject({ style: "ABNT", authors: ["SILVA"], year: "2020", hasTitle: true, hasPublisher: true, periodical: false });
  });

  it("artigo com DOI: o ano não vem dos dígitos do DOI", () => {
    const r = parseReference("r", "SOUZA, Maria. Tempo de tramitação. Revista X, v. 55, n. 2, p. 30-52, 2021. DOI: 10.1590/0034-761220200123.", 0);
    expect(r).toMatchObject({ year: "2021", periodical: true, doi: "10.1590/0034-761220200123", doiValid: true });
  });

  it("Vancouver numerado", () => {
    const r = parseReference("r", "[2] Silva JA, Souza B. Tramitação eletrônica. Rev Adm. 2019;10(2):1-10.", 0);
    expect(r).toMatchObject({ style: "VANCOUVER", number: 2, authors: ["SILVA", "SOUZA"], year: "2019" });
  });

  it("linhas da lista vêm do bloco Referências ou dos blocos sob o título «Referências»", () => {
    const blocks: LetterBlock[] = [{ id: "t", kind: "TITULO", text: "Referências" }, { id: "l", kind: "LISTA", text: "SILVA, J. Título. São Paulo: Atlas, 2020.\nCOSTA, M. Outro. Rio de Janeiro: FGV, 2018." }];
    expect(referenceLines(blocks).map((l) => l.line.slice(0, 5))).toEqual(["SILVA", "COSTA"]);
  });
});

describe("cruzamento e formato (sem inventar dado)", () => {
  const base = (text: string, ...lines: string[]) => [para("p", text), refs("r", ...lines)];

  it("citação sem referência, ano divergente e referência nunca citada", () => {
    const blocks = base("Segundo Silva (2020) e (SOUZA, 2019) e (COSTA, 2018).", "SILVA, João. Gestão. São Paulo: Atlas, 2020.", "SOUZA, Maria. Tramitação. Brasília: Enap, 2021.", "LIMA, Ana. Protocolo. Curitiba: UFPR, 2017.");
    const r = analyzeCitations(blocks);
    expect(r.citations.map((c) => c.status)).toEqual(["REFERENCIADA", "ANO_DIVERGENTE", "SEM_REFERENCIA"]);
    const byRule = Object.fromEntries(r.findings.map((f) => [f.raw.ruleId, f.raw]));
    expect(byRule.CITACAO_ANO_DIVERGENTE!.vars).toMatchObject({ author: "SOUZA", year: "2019", refYear: "2021" });
    expect(byRule.CITACAO_ANO_DIVERGENTE!.related?.[0]?.excerpt).toContain("SOUZA");
    expect(byRule.CITACAO_SEM_REFERENCIA!.vars).toMatchObject({ author: "COSTA", noList: 0 });
    expect(byRule.REFERENCIA_NAO_CITADA!.vars).toMatchObject({ author: "LIMA" });
    expect(r.citations.every((c) => c.source === "NAO_VERIFICADA")).toBe(true);
  });

  it("tudo citado e completo: nenhum achado", () => {
    expect(rules(base("Segundo Silva (2020, p. 3), “o prazo é curto”.", "SILVA, João. Gestão. São Paulo: Atlas, 2020."))).toEqual([]);
  });

  it("citação direta entre aspas sem página; citação longa sem fonte", () => {
    expect(rules(base("Segundo Silva (2020), “o prazo é sempre curto demais”.", "SILVA, João. Gestão. São Paulo: Atlas, 2020."))).toEqual(["CITACAO_DIRETA_SEM_PAGINA"]);
    expect(analyzeCitations([{ id: "c", kind: "CITACAO", text: "O prazo é sempre curto demais para quem precisa." }]).findings.map((f) => f.raw.ruleId)).toEqual(["CITACAO_LONGA_SEM_FONTE"]);
  });

  it("numérico: número inexistente, ordem de primeira citação e sistema misto", () => {
    const blocks = base("Primeiro [2], depois [1] e [9]. Também (SILVA, 2020).", "[1] SILVA, J. Gestão. São Paulo: Atlas, 2020.", "[2] COSTA, M. Outro. Rio de Janeiro: FGV, 2018.");
    const list = rules(blocks);
    expect(list).toContain("CITACAO_NUMERICA_INEXISTENTE");
    expect(list).toContain("CITACAO_NUMERICA_ORDEM");
    expect(list).toContain("SISTEMA_CHAMADA_MISTO");
  });

  it("formato: sem ano, sem local/editora, URL sem «Acesso em», DOI inválido e sobrenome em caixa baixa", () => {
    const blocks = base(
      "Segundo Lima (s.d.), Rocha (2019), Brasil (2011) e Melo (2020) e Pereira (2019).",
      "LIMA, Ana. Protocolo eletrônico. Curitiba: UFPR, [s.d.].",
      "ROCHA, Beatriz. Arquivo digital, 2019.",
      "BRASIL. Lei nº 12.527, de 18 de novembro de 2011. Disponível em: https://www.planalto.gov.br/lei.htm.",
      "MELO, Caio. Dados abertos. Revista Y, v. 3, n. 1, p. 1-9, 2020. DOI: 10.12/abc.",
      "Pereira, Ana. Protocolo. Brasília: Enap, 2019.",
    );
    const list = rules(blocks);
    expect(list).not.toContain("REFERENCIA_SEM_ANO"); // [s.d.] é a forma correta de "sem data"
    expect(list).toContain("REFERENCIA_SEM_LOCAL_EDITORA"); // ROCHA
    expect(list).toContain("REFERENCIA_URL_SEM_ACESSO"); // BRASIL
    expect(list).toContain("REFERENCIA_DOI_INVALIDO"); // 10.12/abc
    const caixa = analyzeCitations(blocks).findings.find((f) => f.raw.ruleId === "REFERENCIA_CAIXA_AUTOR")!;
    expect(caixa.raw.replacement).toBe("PEREIRA");
    expect(list).not.toContain("CITACAO_SEM_REFERENCIA");
  });

  it("URL com «Acesso em» e DOI válido passam; sem lista de referências a citação aponta noList", () => {
    expect(rules(base("Brasil (2011) define.", "BRASIL. Lei nº 12.527, de 18 de novembro de 2011. Disponível em: https://www.planalto.gov.br/lei.htm. Acesso em: 12 mar. 2026."))).toEqual([]);
    const solo = analyzeCitations([para("p", "Segundo Silva (2020), há falhas.")]);
    expect(solo.findings[0]!.raw).toMatchObject({ ruleId: "CITACAO_SEM_REFERENCIA", vars: { noList: 1 } });
  });
});

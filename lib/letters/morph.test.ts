import { describe, expect, it } from "vitest";
import { analyzeMorphology } from "./morph";
import { ASSERT_THRESHOLD, type TaggedToken } from "./types";

const tag = (text: string) => analyzeMorphology(text).tokens;
const word = (tokens: TaggedToken[], w: string, nth = 0) => tokens.filter((t) => t.text === w)[nth]!;

describe("morfossintaxe — as dez classes com posição e confiança (RF53.CA01)", () => {
  it("distingue as dez classes num texto real", () => {
    const t = tag("Ah, o relatório técnico apresenta dois resultados importantes e muito claramente define o prazo para nós.");
    expect(word(t, "Ah").pos).toBe("INTERJEICAO");
    expect(word(t, "o").pos).toBe("ARTIGO");
    expect(word(t, "relatório").pos).toBe("SUBSTANTIVO");
    expect(word(t, "técnico").pos).toBe("ADJETIVO");
    expect(word(t, "apresenta").pos).toBe("VERBO");
    expect(word(t, "dois").pos).toBe("NUMERAL");
    expect(word(t, "e").pos).toBe("CONJUNCAO");
    expect(word(t, "claramente").pos).toBe("ADVERBIO");
    expect(word(t, "para").pos).toBe("PREPOSICAO");
    expect(word(t, "nós").pos).toBe("PRONOME");
    for (const x of t) if (x.pos) expect(x.confidence).toBeGreaterThanOrEqual(ASSERT_THRESHOLD);
  });

  it("marca 'ambíguo' abaixo do limiar, com as hipóteses em ordem", () => {
    const como = word(tag("Eu como pouco."), "como");
    expect(como.pos).toBeNull();
    expect(como.ambiguous).toBe(true);
    expect(como.candidates.map((c) => c.pos)).toEqual(["CONJUNCAO", "ADVERBIO"]);
    expect(como.confidence).toBeLessThan(ASSERT_THRESHOLD);
  });

  it("'a' é preposição antes de infinitivo e artigo antes de nome; 'o' é pronome antes de verbo", () => {
    const t = tag("A equipe começou a trabalhar. Não o encontrei.");
    expect(word(t, "A").pos).toBe("ARTIGO");
    expect(word(t, "a").pos).toBe("PREPOSICAO");
    expect(word(t, "trabalhar").verb?.forma).toBe("INFINITIVO");
    expect(word(t, "o").pos).toBe("PRONOME");
    expect(word(t, "encontrei").pos).toBe("VERBO");
  });

  it("homógrafos nome/verbo seguem o contexto: 'o controle' × 'ele controla'", () => {
    expect(word(tag("O controle falhou."), "controle").pos).toBe("SUBSTANTIVO");
    expect(word(tag("Ele controle"), "controle").pos).toBe("VERBO");
    expect(word(tag("Os resultados saíram."), "resultados").pos).toBe("SUBSTANTIVO");
  });

  it("tempo e modo só quando dá para afirmar", () => {
    const t = tag("O servidor participou e os gestores analisaram quando for possível que ele apresente o plano.");
    expect(word(t, "participou").verb).toMatchObject({ tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "SG" });
    const an = word(t, "analisaram").verb!;
    expect(an.tempo).toBeUndefined();
    expect(an.tempos).toContain("PRETERITO_MAIS_QUE_PERFEITO");
    expect(word(t, "for").verb).toMatchObject({ tempo: "FUTURO", modo: "SUBJUNTIVO" });
    expect(word(t, "apresente").verb).toMatchObject({ tempo: "PRESENTE", modo: "SUBJUNTIVO" });
  });

  it("infinitivo × futuro do subjuntivo: só depois de conjunção vira subjuntivo", () => {
    expect(word(tag("Para realizar a análise."), "realizar").verb?.forma).toBe("INFINITIVO");
    expect(word(tag("Quando o gestor realizar a análise."), "realizar").verb).toMatchObject({ modo: "SUBJUNTIVO", tempo: "FUTURO" });
  });

  it("locuções recebem a classe da expressão; contrações são preposição", () => {
    const t = tag("No entanto, a partir de março o setor atua por meio de contratos.");
    expect(word(t, "No")).toMatchObject({ pos: "CONJUNCAO", locution: "no entanto" });
    expect(word(t, "partir")).toMatchObject({ pos: "PREPOSICAO", locution: "a partir de" });
    expect(word(tag("O prazo do contrato."), "do")).toMatchObject({ pos: "PREPOSICAO", sub: "contração (de + o)" });
  });

  it("nome próprio, sigla e numeral; título não vira nome próprio pela maiúscula", () => {
    const t = tag("O parecer da ABNT citado por Marta tem 12 páginas.");
    expect(word(t, "ABNT")).toMatchObject({ pos: "SUBSTANTIVO", sub: "sigla" });
    expect(word(t, "Marta")).toMatchObject({ pos: "SUBSTANTIVO", sub: "próprio" });
    expect(word(t, "12").pos).toBe("NUMERAL");
    const title = analyzeMorphology("Relatório Técnico de Auditoria", { inTitle: true }).tokens;
    expect(word(title, "Técnico").sub).not.toBe("próprio");
  });

  it("interjeição × possessivo: 'Nossa!' no início e 'nossa equipe'", () => {
    expect(word(tag("Nossa, que prazo!"), "Nossa").pos).toBe("INTERJEICAO");
    expect(word(tag("A nossa equipe entregou."), "nossa").pos).toBe("PRONOME");
  });

  it("'que' relativo depois de nome e conjunção depois de verbo", () => {
    expect(word(tag("O documento que enviei chegou."), "que").pos).toBe("PRONOME");
    expect(word(tag("Ele disse que viria."), "que").pos).toBe("CONJUNCAO");
  });
});

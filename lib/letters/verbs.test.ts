import { describe, expect, it } from "vitest";
import { generate, regularReadings, swapThirdPersonNumber, verbFeatures, verbReadings } from "./verbs";

describe("verbos — irregulares, regulares e traços afirmados", () => {
  it("irregulares: ser/ir compartilham formas; tempo e pessoa vêm da tabela", () => {
    const foi = verbFeatures(verbReadings("foi"))!;
    expect(foi).toMatchObject({ lemma: "ser|ir", tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "SG" });
    expect(verbFeatures(verbReadings("haja"))).toMatchObject({ lemma: "haver", tempo: "PRESENTE", modo: "SUBJUNTIVO" });
    expect(verbFeatures(verbReadings("têm"))).toMatchObject({ lemma: "ter", pessoa: 3, numero: "PL" });
  });

  it("compostos de ter, pôr, ver e vir mantêm a acentuação própria", () => {
    expect(verbReadings("mantém")[0]).toMatchObject({ lemma: "manter", pessoa: 3, numero: "SG" });
    expect(verbReadings("obtêm")[0]).toMatchObject({ lemma: "obter", numero: "PL" });
    expect(verbReadings("propõe")[0]).toMatchObject({ lemma: "propor" });
    expect(verbReadings("previu")[0]).toMatchObject({ lemma: "prever", tempo: "PRETERITO_PERFEITO" });
    expect(verbReadings("intervém")[0]).toMatchObject({ lemma: "intervir" });
  });

  it("regulares pelas terminações e pelo radical conhecido (com ortografia c/qu, g/gu, ç, j)", () => {
    expect(regularReadings("participou")[0]).toMatchObject({ lemma: "participar", tempo: "PRETERITO_PERFEITO", pessoa: 3 });
    expect(regularReadings("verifiquei")[0]).toMatchObject({ lemma: "verificar", pessoa: 1 });
    expect(regularReadings("cheguei")[0]).toMatchObject({ lemma: "chegar" });
    expect(regularReadings("estabeleço")[0]).toMatchObject({ lemma: "estabelecer", tempo: "PRESENTE", pessoa: 1 });
    expect(regularReadings("exijo")[0]).toMatchObject({ lemma: "exigir" });
    expect(regularReadings("possuem")[0]).toMatchObject({ lemma: "possuir", numero: "PL" });
    expect(regularReadings("produz")[0]).toMatchObject({ lemma: "produzir", pessoa: 3 });
    expect(regularReadings("xablau")).toEqual([]);
  });

  it("não afirma o que é ambíguo: -aram é perfeito OU mais-que-perfeito; -amos é presente OU perfeito", () => {
    const aram = verbFeatures(verbReadings("analisaram"))!;
    expect(aram.tempo).toBeUndefined();
    expect(aram.tempos).toEqual(["PRETERITO_PERFEITO", "PRETERITO_MAIS_QUE_PERFEITO"]);
    expect(aram.modo).toBe("INDICATIVO");
    expect(aram.pessoa).toBe(3);
    const amos = verbFeatures(verbReadings("analisamos"))!;
    expect(amos.tempo).toBeUndefined();
    expect(amos.pessoa).toBe(1);
    const ia = verbFeatures(verbReadings("dependia"))!;
    expect(ia.tempo).toBe("PRETERITO_IMPERFEITO");
    expect(ia.pessoa).toBeUndefined(); // 1ª ou 3ª do singular
  });

  it("troca o número da 3ª pessoa (concordância) e gera formas", () => {
    expect(swapThirdPersonNumber("participou")).toBe("participaram");
    expect(swapThirdPersonNumber("participaram")).toBe("participou");
    expect(swapThirdPersonNumber("é")).toBe("são");
    expect(swapThirdPersonNumber("foi")).toBe("foram");
    expect(swapThirdPersonNumber("haviam")).toBe("havia");
    expect(swapThirdPersonNumber("apresenta")).toBe("apresentam");
    expect(swapThirdPersonNumber("documento")).toBeNull();
    expect(generate("ter", { tempo: "PRESENTE", modo: "SUBJUNTIVO", pessoa: 3, numero: "SG" })).toBe("tenha");
    expect(generate("verificar", { tempo: "PRESENTE", modo: "SUBJUNTIVO", pessoa: 3, numero: "SG" })).toBe("verifique");
  });
});

import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import type { DocType, LetterBlock, TextGenre } from "./types";

let seq = 0;
const P = (text: string): LetterBlock => ({ id: `p${++seq}`, kind: "PARAGRAFO", text });
const H = (text: string): LetterBlock => ({ id: `h${++seq}`, kind: "TITULO", level: 2, text });
const run = (blocks: LetterBlock[], docType: DocType = "LIVRE", genre: TextGenre = "TECNICO") =>
  analyzeDocument(blocks, { revision: 1, policyVersion: 1, genre, docType, language: "pt-BR" });
const rules = (r: ReturnType<typeof run>) => r.findings.map((f) => f.ruleId);

describe("conectivos e coesão", () => {
  it("classifica os conectivos por relação", () => {
    const r = run([P("Além disso, o prazo venceu. No entanto, a equipe entregou porque houve reforço. Portanto, o resultado foi bom, ou seja, aceitável. Para que o fluxo melhore, quando houver demanda, o setor atuará conforme o manual.")]);
    expect(r.coherence!.connectives.map((c) => [c.canonical, c.relation])).toEqual([
      ["além disso", "ADICAO"],
      ["no entanto", "OPOSICAO"],
      ["porque", "CAUSA"],
      ["portanto", "CONCLUSAO"],
      ["ou seja", "EXPLICACAO"],
      ["para que", "FINALIDADE"],
      ["quando", "TEMPO"],
      ["conforme", "CONFORMIDADE"],
    ]);
    expect(r.coherence!.byRelation.ADICAO).toBe(1);
  });

  it("parágrafo de 3+ frases sem conectivo é sugestão; com conectivo, não", () => {
    expect(rules(run([P("O prazo venceu. A equipe trabalhou. O resultado saiu.")]))).toContain("PARAGRAFO_SEM_CONECTIVO");
    expect(rules(run([P("O prazo venceu. Ainda assim, a equipe trabalhou. Por fim, o resultado saiu.")]))).not.toContain("PARAGRAFO_SEM_CONECTIVO");
  });

  it("conectivo repetido (4+ vezes) sugere alternativas da mesma relação", () => {
    const r = run([P("Além disso, A. Além disso, B. Além disso, C. Além disso, D.")]);
    const f = r.findings.find((x) => x.ruleId === "CONECTIVO_REPETIDO")!;
    expect(f.vars).toMatchObject({ connective: "além disso", count: 4 });
    expect(f.suggestions.length).toBeGreaterThan(0);
    expect(f.suggestions).not.toContain("além disso");
  });

  it("coesão entre parágrafos: termos compartilhados (lematização leve) × parágrafo sem retomada", () => {
    const linked = run([P("O sistema de protocolo registra os processos administrativos da secretaria."), P("Os processos registrados pelo sistema chegam ao protocolo com atraso.")]);
    expect(linked.coherence!.cohesion[0]!.shared.length).toBeGreaterThan(0);
    expect(rules(linked)).not.toContain("COESAO_BAIXA");
    const broken = run([P("O sistema de protocolo registra os processos administrativos da secretaria."), P("A merenda escolar melhorou muito nas escolas rurais este ano.")]);
    expect(broken.coherence!.cohesion[0]!.shared).toEqual([]);
    const f = broken.findings.find((x) => x.ruleId === "COESAO_BAIXA")!;
    expect(f.related?.[0]?.blockId).toBe(broken.blocks[0]!.blockId);
  });

  it("progressão temática: ruptura só em parágrafo de 4+ frases e uma vez", () => {
    const r = run([P("O sistema registra os processos. Esses processos seguem para a análise técnica. A análise técnica usa o manual vigente. Os pinguins migram para o sul durante o inverno austral todos os anos.")]);
    const stat = r.coherence!.progression[0]!;
    expect(stat.anafora + stat.linear + stat.constante).toBeGreaterThanOrEqual(2);
    expect(r.findings.filter((f) => f.ruleId === "PROGRESSAO_RUPTURA")).toHaveLength(1);
    expect(rules(run([P("O sistema registra. A equipe confere. O pinguim migra.")]))).not.toContain("PROGRESSAO_RUPTURA");
  });

  it("tempo verbal: minoria num parágrafo dominado por um tempo vira hipótese", () => {
    const r = run([P("O setor analisa os pedidos. A equipe confere os dados. O sistema registra tudo. O gestor aprova o fluxo. O servidor publicou o resultado.")]);
    const f = r.findings.find((x) => x.ruleId === "TEMPO_VERBAL_MISTO")!;
    expect(f).toMatchObject({ excerpt: "publicou", certainty: "HIPOTESE" });
    expect(f.vars).toMatchObject({ dominant: "presente", found: "passado" });
    expect(rules(run([P("O setor analisa os pedidos. A equipe confere os dados. O sistema registra tudo. O gestor aprova o fluxo. O servidor publica o resultado.")]))).not.toContain("TEMPO_VERBAL_MISTO");
  });
});

describe("gênero e seções esperadas", () => {
  it("relatório técnico: seção ausente, vazia e fora de ordem", () => {
    const blocks = [H("1 Introdução"), P("Texto da introdução sobre o contexto do trabalho."), H("2 Resultados"), P("Os resultados mostram melhora."), H("3 Metodologia"), P(""), H("4 Conclusão"), P("Conclui-se que melhorou.")];
    const r = run(blocks, "RELATORIO_TECNICO");
    const missing = r.findings.filter((f) => f.ruleId === "SECAO_AUSENTE").map((f) => f.vars.section);
    expect(missing).toEqual(["objetivo", "referencias"]);
    expect(r.findings.find((f) => f.ruleId === "SECAO_VAZIA")!.vars.section).toBe("metodologia");
    expect(r.findings.find((f) => f.ruleId === "SECAO_FORA_DE_ORDEM")!.vars).toMatchObject({ section: "metodologia", after: "resultados" });
    expect(r.summary.missingSections).toEqual(["objetivo", "referencias"]);
  });

  it("relatório completo, com bloco de referências, não tem achado de estrutura", () => {
    const blocks = [H("Introdução"), P("a"), H("Objetivos"), P("b"), H("Materiais e métodos"), P("c"), H("Resultados e discussão"), P("d"), H("Considerações finais"), P("e"), { id: "rf", kind: "REFERENCIAS" as const, text: "SILVA, J. Título. São Paulo: Atlas, 2020." }];
    expect(rules(run(blocks, "RELATORIO_TECNICO")).filter((r) => r.startsWith("SECAO"))).toEqual([]);
  });

  it("ofício: elementos do padrão ofício; ADR: seções de Nygard", () => {
    const of = run([P("Ofício nº 1/2026 – DTI"), P("Curitiba, 3 de maio de 2026."), P("Senhor Diretor,"), P("Encaminho o relatório."), P("Atenciosamente,")], "OFICIO");
    expect(of.findings.filter((f) => f.ruleId === "ELEMENTO_OFICIO_AUSENTE").map((f) => f.vars.element)).toEqual(["assunto"]);
    const adr = run([H("Status"), P("Aceita."), H("Contexto"), P("Fila lenta."), H("Decisão"), P("Usar fila.")], "ADR");
    expect(adr.findings.filter((f) => f.ruleId === "SECAO_ADR_AUSENTE").map((f) => f.vars.section)).toEqual(["consequencias"]);
  });

  it("notícia neutra: primeira pessoa é hipótese de subjetividade, nunca erro obrigatório (RF54.CA02)", () => {
    const r = run([P("A prefeitura anunciou o plano. Eu acredito que o plano vai falhar, e nós vimos isso antes. O secretário disse: “nós vamos cumprir”.")], "LIVRE", "JORNALISTICO");
    const subj = r.findings.filter((f) => f.ruleId === "SUBJETIVIDADE");
    expect(subj.map((f) => f.excerpt)).toEqual(["Eu", "acredito", "nós", "vimos"]);
    for (const f of subj) expect(f).toMatchObject({ severity: "SUGESTAO", certainty: "HIPOTESE" });
    expect(rules(run([P("A prefeitura anunciou o plano. O secretário disse: “nós vamos cumprir”.")], "LIVRE", "JORNALISTICO"))).not.toContain("SUBJETIVIDADE");
  });

  it("texto técnico pede impessoalidade (1ª do singular); ofício não", () => {
    expect(rules(run([P("Eu verifiquei os dados.")], "RELATORIO_TECNICO"))).toContain("IMPESSOALIDADE");
    expect(rules(run([P("Eu verifiquei os dados.")], "OFICIO"))).not.toContain("IMPESSOALIDADE");
  });

  it("acadêmico sem citação em texto longo", () => {
    const long = P(Array.from({ length: 160 }, () => "palavra").join(" ") + ".");
    expect(rules(run([long], "LIVRE", "ACADEMICO"))).toContain("TEXTO_SEM_CITACAO");
    expect(rules(run([long], "LIVRE", "TECNICO"))).not.toContain("TEXTO_SEM_CITACAO");
  });
});

describe("continuidade narrativa (RF54.CA03/CA04)", () => {
  it("personagem morto que volta a agir: aponta as duas passagens como hipótese", () => {
    const r = run([P("Marta morreu na primavera de 1998."), P("Anos depois, Marta abriu a porta da sala e sorriu.")], "LIVRE", "NARRATIVO");
    const f = r.findings.find((x) => x.ruleId === "CONTINUIDADE_PERSONAGEM")!;
    expect(f).toMatchObject({ certainty: "HIPOTESE", vars: { name: "Marta" } });
    expect(f.related?.[0]?.excerpt).toContain("morreu");
  });

  it("afirmação de que está vivo é contradição demonstrável", () => {
    const r = run([P("Marta morreu na primavera de 1998."), P("Hoje Marta está viva e trabalha na seção.")], "LIVRE", "NARRATIVO");
    expect(r.findings.find((x) => x.ruleId === "CONTINUIDADE_PERSONAGEM")!.certainty).toBe("DEMONSTRAVEL");
  });

  it("lembrança ou flashback não é contradição; fora do gênero narrativo não se analisa", () => {
    expect(rules(run([P("Marta morreu na primavera de 1998."), P("Ana lembrou de quando Marta abriu a porta da sala.")], "LIVRE", "NARRATIVO"))).not.toContain("CONTINUIDADE_PERSONAGEM");
    expect(rules(run([P("Marta morreu na primavera de 1998."), P("Anos depois, Marta abriu a porta da sala.")], "LIVRE", "TECNICO"))).not.toContain("CONTINUIDADE_PERSONAGEM");
  });
});

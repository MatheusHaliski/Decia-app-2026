import { describe, expect, it } from "vitest";
import { ANSWER_MAX_SOURCES, composeAnswer, isAnswerable } from "./answer";
import { DEMO_MEMORY_DOCS } from "./corpus";
import { buildIndex, searchIndex } from "./engine";

const index = buildIndex(DEMO_MEMORY_DOCS);
const bodyOf = (id: string) => DEMO_MEMORY_DOCS.find((d) => d.id === id)!.body;

describe("Perguntar à IA ✦ — resposta só com os trechos recuperados", () => {
  it("cita com números [1], [2]… frases EXATAS dos trechos, na ordem de relevância", () => {
    const q = "quem já fez convênio de pavimentação com a Caixa?";
    const hits = searchIndex(index, q).hits;
    const a = composeAnswer(q, hits);
    expect(a.status).toBe("COM_FONTES");
    expect(a.items.map((i) => i.n)).toEqual(a.items.map((_, i) => i + 1));
    expect(a.items.length).toBeLessThanOrEqual(ANSWER_MAX_SOURCES);
    expect(a.items[0]!.docId).toBe("mem-relatorio-gestao-2024");
    for (const item of a.items) {
      const hit = hits[item.hitIndex]!;
      // a frase citada está dentro do trecho do resultado e confere com o documento
      expect(bodyOf(item.docId).slice(item.quote.start, item.quote.end)).toBe(item.quote.text);
      expect(item.quote.start).toBeGreaterThanOrEqual(hit.passage.start);
      expect(item.quote.end).toBeLessThanOrEqual(hit.passage.end);
      expect(hit.passage.text).toContain(item.quote.text);
      expect(item.citation).toBe(hit.citation);
    }
    expect(a.items[0]!.quote.text).toBe("Em 2024 foram assinados 14 convênios de pavimentação com municípios do interior, todos com a Caixa como agente operador.");
  });

  it("sem trecho relevante, diz que não encontrou fonte (nunca responde de memória)", () => {
    expect(composeAnswer("receita de bolo", searchIndex(index, "receita de bolo").hits)).toEqual({ status: "SEM_FONTE", question: "receita de bolo", items: [] });
    expect(composeAnswer("qualquer coisa", []).status).toBe("SEM_FONTE");
    // há resultados, mas nenhum cobre a pergunta (o documento certo é SIGILOSO e fica de fora)
    const hits = searchIndex(index, "processo disciplinar").hits;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => !isAnswerable(h))).toBe(true);
    expect(composeAnswer("processo disciplinar", hits).status).toBe("SEM_FONTE");
  });

  it("só entram trechos com nota e cobertura mínimas", () => {
    const q = "backup dos bancos de dados";
    const hits = searchIndex(index, q).hits;
    expect(hits.length).toBeGreaterThan(1);
    const a = composeAnswer(q, hits);
    expect(a.items.map((i) => i.docId)).toEqual(["mem-norma-01-2024"]);
  });
});

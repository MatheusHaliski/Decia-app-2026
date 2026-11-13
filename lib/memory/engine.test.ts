import { describe, expect, it } from "vitest";
import { DEMO_MEMORY_DOCS } from "./corpus";
import { buildIndex, DEFAULT_MIN_SCORE, passagesOf, searchIndex } from "./engine";
import { memoryFacets } from "./explore";
import { memoryAccessFor, withAccess } from "./access";
import type { MemoryDocument } from "./types";

const index = buildIndex(DEMO_MEMORY_DOCS);
const docOf = (id: string) => DEMO_MEMORY_DOCS.find((d) => d.id === id)!;
const ids = (q: string, o: Parameters<typeof searchIndex>[2] = {}) => searchIndex(index, q, o).hits.map((h) => h.docId);

const QUESTIONS = [
  "quem já fez convênio de pavimentação com a Caixa?",
  "prazo para responder ofício",
  "metas do teletrabalho",
  "designação de fiscal de contrato",
  "backup dos bancos de dados",
  "rampas fora do padrão de acessibilidade",
  "lições da migração para a nuvem",
];

describe("índice: trechos com posição exata", () => {
  it("todo trecho indexado é fatia exata do documento e não começa nem termina em espaço", () => {
    for (const p of index.passages) {
      const body = docOf(p.docId).body;
      const text = body.slice(p.start, p.end);
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("janelas de frases com sobreposição dentro da seção; título do documento não vira trecho", () => {
    const doc = docOf("mem-in-03-2025");
    const ps = passagesOf(doc).map((p) => ({ section: p.section, text: doc.body.slice(p.start, p.end) }));
    expect(ps.some((p) => p.text.startsWith("#"))).toBe(false);
    const prazos = ps.filter((p) => p.section === "2. Prazos de resposta");
    expect(prazos).toHaveLength(2);
    // a 2ª frase da seção aparece nas duas janelas (sobreposição)
    expect(prazos[0]!.text).toContain("Pedidos de informação do cidadão");
    expect(prazos[1]!.text.startsWith("Pedidos de informação do cidadão")).toBe(true);
  });

  it("cada resultado traz o trecho exato: body.slice(start, end) === text", () => {
    for (const q of QUESTIONS) {
      const r = searchIndex(index, q, { readable: ["PUBLICO", "INTERNO", "RESTRITO"] });
      expect(r.hits.length).toBeGreaterThan(0);
      for (const h of r.hits) {
        expect(docOf(h.docId).body.slice(h.passage.start, h.passage.end)).toBe(h.passage.text);
        for (const m of h.explanation.highlights) expect(m.end).toBeLessThanOrEqual(h.passage.text.length);
      }
    }
  });
});

describe("busca: relevância, flexão, acento, erro de digitação e sinônimo", () => {
  it("pergunta conhecida: convênio de pavimentação com a Caixa → relatório de gestão e manual de convênios no topo", () => {
    const r = searchIndex(index, "quem já fez convênio de pavimentação com a Caixa?");
    expect(r.hits.slice(0, 2).map((h) => h.docId)).toEqual(["mem-relatorio-gestao-2024", "mem-manual-convenios-2025"]);
    expect(r.hits[0]!.explanation.coverage).toEqual({ matched: 3, total: 3 });
    expect(r.hits[0]!.score).toBeGreaterThan(r.hits[1]!.score);
    // ordenação decrescente e citação curta com unidade e seção
    for (let i = 1; i < r.hits.length; i++) expect(r.hits[i - 1]!.score).toBeGreaterThanOrEqual(r.hits[i]!.score);
    expect(r.hits[0]!.citation).toBe("Relatório de Gestão 2024 — SECID, Convênios de pavimentação");
  });

  it("flexão e acento: singular/plural, verbo/substantivo e texto sem acento acham o mesmo documento", () => {
    expect(ids("convênios de pavimentação")[0]).toBe(ids("convenio pavimentacao")[0]);
    expect(ids("pavimentar")).toContain("mem-relatorio-gestao-2024");
    const lic = searchIndex(index, "licitacao");
    expect(lic.hits[0]!.docId).toBe("mem-matriz-riscos-ti");
    expect(lic.hits[0]!.passage.text).toContain("licitação");
  });

  it("erro de digitação: 'teletrabaho' acha a Portaria 12/2025 por grafia aproximada", () => {
    const r = searchIndex(index, "teletrabaho");
    expect(r.hits[0]!.docId).toBe("mem-portaria-12-2025");
    expect(r.hits[0]!.explanation.matched[0]).toMatchObject({ via: "APROXIMADO", surface: "teletrabalho" });
  });

  it("sinônimo do serviço público: 'ofício' acha a norma que só fala em 'expediente'", () => {
    expect(DEMO_MEMORY_DOCS.some((d) => /of[ií]cio/i.test(d.body))).toBe(false);
    const r = searchIndex(index, "prazo para responder ofício");
    expect(r.hits[0]!.docId).toBe("mem-in-03-2025");
    const syn = r.hits[0]!.explanation.matched.find((m) => m.via === "SINONIMO");
    expect(syn).toMatchObject({ query: "ofício", synonym: { from: "ofício", to: "expediente" } });
    expect(r.hits[0]!.citation).toBe("Instrução Normativa 3/2025 — SECID, 2. Prazos de resposta");
  });

  it("sinônimo de várias palavras só casa com a expressão inteira", () => {
    const r = searchIndex(index, "transferência voluntária para pavimentação");
    expect(r.hits[0]!.explanation.matched.some((m) => m.via === "SINONIMO" && m.term === "conveni")).toBe(true);
  });
});

describe("filtros e acesso: nunca devolve o que a pessoa não pode ler", () => {
  it("padrão do contrato = PÚBLICO e INTERNO: auditoria RESTRITA não aparece", () => {
    expect(ids("ateste do fiscal técnico")).not.toContain("mem-auditoria-02-2025");
    expect(ids("ateste do fiscal técnico", { readable: ["PUBLICO", "INTERNO", "RESTRITO"] })).toContain("mem-auditoria-02-2025");
  });

  it("RESTRITO só da própria unidade; SIGILOSO nunca sem concessão explícita", () => {
    const empregado = withAccess(memoryAccessFor("EMPREGADO", { departmentAcronym: "SECID-UTS" }));
    expect(ids("tentativa de acesso indevido", empregado)).toContain("mem-incidente-01-2025");
    expect(ids("aditivo de prazo da obra da sede", empregado)).not.toContain("mem-fiscalizacao-03-2026");
    const chefe = withAccess(memoryAccessFor("CHEFE", { departmentAcronym: "CPOE" }));
    expect(ids("aditivo de prazo da obra da sede", chefe)).toContain("mem-fiscalizacao-03-2026");
    expect(ids("tentativa de acesso indevido", chefe)).not.toContain("mem-incidente-01-2025");
    expect(ids("processo disciplinar", withAccess(memoryAccessFor("EMPRESA")))).not.toContain("mem-parecer-31-2025");
    expect(ids("processo disciplinar", { readable: ["SIGILOSO"] })).toEqual(["mem-parecer-31-2025"]);
    expect(ids("convênios", withAccess(memoryAccessFor("VISITANTE"))).every((id) => docOf(id).accessClass === "PUBLICO")).toBe(true);
  });

  it("documento com público restrito (decisão PRIVADA) só aparece para quem está nele", () => {
    const priv: MemoryDocument = { id: "x-priv", kind: "SESSAO", origin: "DECIA", title: "Decisão privada", department: null, year: 2026, accessClass: "INTERNO", href: null, body: "Escolhemos o fornecedor zeta para o suporte noturno.", audience: ["u-ana"] };
    const idx = buildIndex([...DEMO_MEMORY_DOCS, priv]);
    expect(searchIndex(idx, "fornecedor zeta").hits.map((h) => h.docId)).not.toContain("x-priv");
    expect(searchIndex(idx, "fornecedor zeta", { viewerId: "u-pessoa" }).hits.map((h) => h.docId)).not.toContain("x-priv");
    expect(searchIndex(idx, "fornecedor zeta", { viewerId: "u-ana" }).hits[0]!.docId).toBe("x-priv");
  });

  it("filtros por tipo, unidade e exercício", () => {
    const all = searchIndex(index, "convênios", { k: 20 }).hits;
    expect(new Set(all.map((h) => h.kind)).size).toBeGreaterThan(1);
    expect(searchIndex(index, "convênios", { k: 20, kinds: ["ATA"] }).hits.every((h) => h.kind === "ATA")).toBe(true);
    expect(searchIndex(index, "convênios", { k: 20, department: "GOF" }).hits.every((h) => h.department === "GOF")).toBe(true);
    expect(searchIndex(index, "convênios", { k: 20, year: 2024 }).hits.map((h) => h.docId)).toEqual(["mem-relatorio-gestao-2024"]);
  });
});

describe("limites: mínimo de relevância, k e fontes distintas", () => {
  it("pergunta sem relação com o acervo não devolve nada; nada abaixo do mínimo", () => {
    expect(searchIndex(index, "receita de bolo de chocolate").hits).toEqual([]);
    expect(searchIndex(index, "xyzzy quântico unicórnio").hits).toEqual([]);
    expect(searchIndex(index, "   ").hits).toEqual([]);
    for (const q of QUESTIONS) for (const h of searchIndex(index, q).hits) expect(h.score).toBeGreaterThanOrEqual(DEFAULT_MIN_SCORE);
    const top = searchIndex(index, "convênios de pavimentação").hits[0]!.score;
    const strict = searchIndex(index, "convênios de pavimentação", { minScore: top + 0.001 }).hits;
    expect(strict).toEqual([]);
  });

  it("k limita; por padrão uma fonte por documento; perDoc 2 traz trechos que não se sobrepõem", () => {
    expect(searchIndex(index, "convênios", { k: 2 }).hits).toHaveLength(2);
    const one = searchIndex(index, "teletrabalho metas servidor", { k: 10 }).hits;
    expect(new Set(one.map((h) => h.docId)).size).toBe(one.length);
    const two = searchIndex(index, "teletrabalho metas servidor", { k: 10, perDoc: 2 }).hits.filter((h) => h.docId === "mem-portaria-12-2025");
    expect(two).toHaveLength(2);
    expect(two[0]!.passage.end <= two[1]!.passage.start || two[1]!.passage.end <= two[0]!.passage.start).toBe(true);
  });

  it("explicação: componentes, pesos e cobertura batem com a nota", () => {
    const h = searchIndex(index, "backup dos bancos de dados").hits[0]!;
    const { components: c, weights: w } = h.explanation;
    expect(h.score).toBeCloseTo(w.words * c.cosineWords + w.chars * c.cosineChars + w.bm25 * c.bm25Normalized, 10);
    expect(h.score).toBeLessThanOrEqual(1);
    expect(h.explanation.matched.map((m) => m.via)).toEqual(["EXATO", "EXATO", "EXATO"]);
    const unknown = searchIndex(index, "backup dos bancos de dados xyzzy").hits[0]!;
    expect(unknown.explanation.unmatched).toEqual(["xyzzy"]);
    expect(unknown.score).toBeLessThan(h.score);
  });
});

describe("determinismo", () => {
  it("mesmo acervo (em qualquer ordem) e mesma pergunta → mesmo resultado, bit a bit", () => {
    const shuffled = buildIndex([...DEMO_MEMORY_DOCS].reverse());
    for (const q of QUESTIONS) {
      const a = JSON.stringify(searchIndex(index, q, { k: 10 }));
      const b = JSON.stringify(searchIndex(shuffled, q, { k: 10 }));
      const c = JSON.stringify(searchIndex(buildIndex(DEMO_MEMORY_DOCS), q, { k: 10 }));
      expect(b).toBe(a);
      expect(c).toBe(a);
    }
  });
});

describe("explorador: contagens só do que a pessoa lê", () => {
  it("unidade × exercício × tipo, sem revelar restritos de outras unidades nem sigilosos", () => {
    const access = withAccess(memoryAccessFor("EMPREGADO", { departmentAcronym: "SECID-UTS" }));
    const f = memoryFacets(DEMO_MEMORY_DOCS, access);
    const readable = DEMO_MEMORY_DOCS.filter((d) => d.accessClass === "PUBLICO" || d.accessClass === "INTERNO" || (d.accessClass === "RESTRITO" && d.department === "SECID-UTS"));
    expect(f.total).toBe(readable.length);
    expect(f.byKind.reduce((a, k) => a + k.count, 0)).toBe(readable.length);
    expect(f.byDepartment.find((d) => d.department === "AJUR")).toBeUndefined();
    expect(f.grid.count("GOF", 2025)).toBe(readable.filter((d) => d.department === "GOF" && d.year === 2025).length);
    const atas = memoryFacets(DEMO_MEMORY_DOCS, access, { kind: "ATA" });
    expect(atas.total).toBe(readable.filter((d) => d.kind === "ATA").length);
    // a faceta de tipo continua mostrando os outros tipos (conta sem o próprio filtro)
    expect(atas.byKind.length).toBe(f.byKind.length);
  });
});

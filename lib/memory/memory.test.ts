import { afterEach, describe, expect, it } from "vitest";
import { buildDemoDecisions, DEMO_DECISION_IDS } from "@/lib/decia/fixtures";
import { createMemoryRepository as createDeciaRepository } from "@/lib/decia/repository";
import { closedDecisionDocs, decisionToMemoryDoc } from "./adapters";
import { citationOf, parseSpan, readerHref } from "./citation";
import { DEMO_MEMORY_DOCS } from "./corpus";
import { createMemoryRepository, searchMemory, setDemoMemoryRepository } from "./index";
import { buildIngestedDoc, normalizeIngestText, validateIngest, type IngestInput } from "./ingest";

const NOW = new Date("2026-11-12T12:00:00Z");

afterEach(() => setDemoMemoryRepository(null));

describe("decisões encerradas do DECIA viram documentos (somente leitura)", () => {
  const decisions = buildDemoDecisions(NOW);

  it("só as decididas entram; em andamento ficam de fora", () => {
    const docs = closedDecisionDocs(decisions);
    expect(docs.map((d) => d.id).sort()).toEqual([`decia-${DEMO_DECISION_IDS.fornecedor}`, `decia-${DEMO_DECISION_IDS.lancamento}`]);
    expect(decisionToMemoryDoc(decisions.find((d) => d.decision.id === DEMO_DECISION_IDS.arquitetura)!)).toBeNull();
  });

  it("texto montado só com o registrado; PRIVADA fica restrita aos participantes, salvo lição compartilhada", () => {
    const fornecedor = decisionToMemoryDoc(decisions.find((d) => d.decision.id === DEMO_DECISION_IDS.fornecedor)!)!;
    expect(fornecedor).toMatchObject({ kind: "SESSAO", origin: "DECIA", href: `/decia/decisoes/${DEMO_DECISION_IDS.fornecedor}`, year: 2026 });
    expect(fornecedor.audience).toEqual(["u-ana", "u-elisa", "u-pessoa"]);
    expect(fornecedor.body).toContain("Alternativa escolhida: B — Fornecedor Beta (demo).");
    expect(fornecedor.body).toContain("Justificativa: B cobre o horário estendido e tem SLA verificado; o custo maior foi aceito pelo financeiro.");
    const lancamento = decisionToMemoryDoc(decisions.find((d) => d.decision.id === DEMO_DECISION_IDS.lancamento)!)!;
    expect(lancamento.audience).toBeUndefined();
    expect(lancamento.body).toContain("## Lições");
  });

  it("repositório da Memória acompanha o DECIA: decisão nova decidida aparece na busca", () => {
    const decia = createDeciaRepository(decisions);
    const repo = createMemoryRepository({ base: DEMO_MEMORY_DOCS, decisions: decia });
    const v1 = repo.snapshot();
    expect(repo.search("lançamento com escopo reduzido").hits[0]!.docId).toBe(`decia-${DEMO_DECISION_IDS.lancamento}`);
    const arq = decisions.find((d) => d.decision.id === DEMO_DECISION_IDS.arquitetura)!;
    decia.save({ ...arq, decision: { ...arq.decision, status: "DECIDIDA", visibility: "EMPRESA", selectedAlternativeId: "arq-b", decidedAt: NOW.toISOString(), rationale: "Escala comprovada com hospedagem no Brasil." } });
    expect(repo.snapshot()).toBe(v1 + 1);
    expect(repo.search("infraestrutura escala comprovada hospedagem").hits.map((h) => h.docId)).toContain(`decia-${DEMO_DECISION_IDS.arquitetura}`);
  });
});

describe("ingestão local (.txt/.md) com classe de acesso", () => {
  const base: IngestInput = { title: "Nota técnica de drenagem", kind: "RELATORIO", department: "cpoe", year: 2026, accessClass: "INTERNO", body: "﻿A galeria da rua 7 transborda com chuva forte.\r\nRecomenda-se ampliar a seção." };

  it("valida campos, extensão e classe permitida", () => {
    expect(validateIngest(base, ["PUBLICO", "INTERNO"])).toEqual({});
    expect(validateIngest({ ...base, title: " a ", body: "  ", year: 1800, accessClass: "RESTRITO", fileName: "planilha.xlsx" }, ["PUBLICO", "INTERNO"])).toEqual({
      title: "CURTO", body: "OBRIGATORIO", year: "INVALIDO", accessClass: "CLASSE_NAO_PERMITIDA", file: "FORMATO",
    });
    expect(validateIngest({ ...base, fileName: "ata.MD" }, ["INTERNO"])).toEqual({});
  });

  it("guarda o texto como veio (sem BOM, quebras unificadas) e entra no índice da aba", () => {
    expect(normalizeIngestText("﻿a\r\nb\rc")).toBe("a\nb\nc");
    const r = buildIngestedDoc(base, { id: "ing-1", addedBy: "u-pessoa", now: NOW, allowedClasses: ["INTERNO"] });
    expect(r.ok && r.doc).toMatchObject({ id: "ing-1", origin: "INGESTAO", department: "CPOE", href: "/memory?doc=ing-1", date: "2026-11-12" });
    const repo = createMemoryRepository({ base: DEMO_MEMORY_DOCS });
    const v = repo.snapshot();
    const res = repo.ingest(base, { addedBy: "u-pessoa", allowedClasses: ["PUBLICO", "INTERNO"], now: NOW });
    expect(res.ok).toBe(true);
    expect(repo.snapshot()).toBe(v + 1);
    const hit = repo.search("galeria transborda chuva").hits[0]!;
    expect(hit.docId).toBe(res.ok ? res.doc.id : "");
    expect(repo.get(hit.docId)!.body.slice(hit.passage.start, hit.passage.end)).toBe(hit.passage.text);
    // classe acima do permitido não entra
    expect(repo.ingest({ ...base, accessClass: "RESTRITO" }, { addedBy: "u-pessoa", allowedClasses: ["PUBLICO", "INTERNO"] }).ok).toBe(false);
    // só o ingerido sai; o de exemplo fica
    expect(repo.remove("mem-portaria-12-2025")).toBe(false);
    expect(repo.remove(hit.docId)).toBe(true);
    expect(repo.search("galeria transborda chuva").hits.map((h) => h.docId)).not.toContain(hit.docId);
  });
});

describe("contrato searchMemory ligado pelo lib/memory/index.ts", () => {
  it("devolve MemoryHit com trecho exato, citação e link, nos padrões do contrato", () => {
    setDemoMemoryRepository(createMemoryRepository({ base: DEMO_MEMORY_DOCS }));
    const hits = searchMemory("prazo para responder ofício");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(5);
    const h = hits[0]!;
    expect(Object.keys(h).sort()).toEqual(["citation", "department", "docId", "href", "kind", "passage", "score", "title", "year"]);
    const doc = DEMO_MEMORY_DOCS.find((d) => d.id === h.docId)!;
    expect(doc.body.slice(h.passage.start, h.passage.end)).toBe(h.passage.text);
    expect(h.href).toBe(readerHref(h.docId));
    // padrão: nada RESTRITO nem SIGILOSO
    expect(searchMemory("ateste do fiscal técnico", { k: 10 }).map((x) => x.docId)).not.toContain("mem-auditoria-02-2025");
  });
});

describe("citação e leitor", () => {
  it("referência curta com unidade e seção; endereço do leitor com o trecho", () => {
    expect(citationOf({ ref: "Portaria 12/2025", title: "x", department: "SECID" }, "art. 3º")).toBe("Portaria 12/2025 — SECID, art. 3º");
    expect(citationOf({ title: "Documento sem referência", department: null }, null)).toBe("Documento sem referência");
    expect(readerHref("mem-in-03-2025", { start: 10, end: 20 })).toBe("/memory?doc=mem-in-03-2025&trecho=10-20");
    expect(parseSpan("10-20", 100)).toEqual({ start: 10, end: 20 });
    expect(parseSpan("20-10", 100)).toBeNull();
    expect(parseSpan("10-200", 100)).toBeNull();
    expect(parseSpan("x", 100)).toBeNull();
  });
});

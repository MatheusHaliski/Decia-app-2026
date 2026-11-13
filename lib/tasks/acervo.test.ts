import { describe, expect, it } from "vitest";
import {
  acervoSearch, activeFilters, DEFAULT_ORDER, effectiveDueOf, EMPTY_PARAMS, isOpenState, listQuery, PAGE_SIZE, parseAcervoParams, summaryQuery,
  totalPages, withParams,
} from "./acervo";

describe("Acervo na URL (RF41.CA09)", () => {
  it("lê os filtros da URL em minúsculas com hífen e ignora valor desconhecido", () => {
    const p = parseAcervoParams(new URLSearchParams("filtro=em-andamento&categoria=vistoria-relatorio-fotografico&prioridade=alta&prazo=vence-7-dias&ordem=prazo&page=3"));
    expect(p).toEqual({ filtro: "EM_ANDAMENTO", categoria: "VISTORIA_RELATORIO_FOTOGRAFICO", prioridade: "ALTA", prazo: "VENCE_7_DIAS", ordem: "PRAZO", page: 3 });
    expect(parseAcervoParams(new URLSearchParams("filtro=favoritas&prioridade=urgente&ordem=nome&page=-2&prazo=hoje"))).toEqual(EMPTY_PARAMS);
    expect(parseAcervoParams(new URLSearchParams("page=1.5")).page).toBe(1);
  });

  it("monta a URL compartilhável sem os padrões e volta à página 1 quando um filtro muda", () => {
    expect(acervoSearch(EMPTY_PARAMS)).toBe("");
    const p = withParams(EMPTY_PARAMS, { filtro: "BLOQUEADO", prioridade: "CRITICA" });
    expect(acervoSearch({ ...p, page: 2 })).toBe("?filtro=bloqueado&prioridade=critica&page=2");
    expect(withParams({ ...p, page: 4 }, { prazo: "ATRASADAS" }).page).toBe(1);
    expect(withParams({ ...p, page: 4 }, { page: 5 }).page).toBe(5);
    expect(acervoSearch({ ...EMPTY_PARAMS, ordem: "CRIACAO" })).toBe("?ordem=criacao");
    expect(parseAcervoParams(new URLSearchParams(acervoSearch({ ...p, categoria: "ETP", ordem: "PRIORIDADE", page: 2 }).slice(1))))
      .toEqual({ ...p, categoria: "ETP", ordem: "PRIORIDADE", page: 2 });
    expect(activeFilters(p)).toBe(2);
    expect(DEFAULT_ORDER).toBe("ATUALIZACAO");
  });

  it("chama a API com o enum em maiúsculas, a página e 20 por página", () => {
    const p = { ...EMPTY_PARAMS, filtro: "A_REALIZAR" as const, prazo: "COM_PRAZO_LEGAL" as const, page: 2 };
    expect(listQuery(p)).toEqual({ filtro: "A_REALIZAR", prazo: "COM_PRAZO_LEGAL", ordem: "ATUALIZACAO", page: 2, size: PAGE_SIZE });
    expect(summaryQuery(p)).toEqual({ filtro: "A_REALIZAR", prazo: "COM_PRAZO_LEGAL" });
    expect(totalPages(0)).toBe(1);
    expect(totalPages(41)).toBe(3);
  });

  it("prazo efetivo é o mais próximo; só tarefas abertas cobram prazo (como AcervoQueries.java)", () => {
    expect(effectiveDueOf("2026-11-20", "2026-11-18")).toBe("2026-11-18");
    expect(effectiveDueOf("2026-11-10", "2026-11-18")).toBe("2026-11-10");
    expect(effectiveDueOf(null, "2026-11-18")).toBe("2026-11-18");
    expect(effectiveDueOf(undefined, null)).toBeNull();
    expect(["RASCUNHO", "DISPONIVEL", "EM_USO", "BLOQUEADA"].every((s) => isOpenState(s as never))).toBe(true);
    expect(["CONCLUIDA", "ARQUIVADA", "MODELO_PUBLICO", "OFERECIDA"].some((s) => isOpenState(s as never))).toBe(false);
  });
});

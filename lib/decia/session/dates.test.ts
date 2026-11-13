import { describe, expect, it } from "vitest";
import { addBusinessDays, easter, findDueDates, foldWithMap, nationalHolidays, parseDateOnly, parseDue, toDateOnly, todayLocal } from "./dates";

// data-base fixa: quinta-feira, 12/11/2026 (20/11/2026, sexta, é feriado nacional — Consciência Negra)
const BASE = "2026-11-12";
const due = (text: string, base = BASE) => parseDue(text, base);

describe("prazos absolutos", () => {
  it("dd/mm, dd/mm/aaaa e dd/mm/aa, com o trecho exato de origem", () => {
    expect(due("Carla revisa o contrato até 20/11.")).toEqual({ date: "2026-11-20", raw: "20/11", kind: "ABSOLUTA" });
    expect(due("prazo: 05/03/2027")).toMatchObject({ date: "2027-03-05", kind: "ABSOLUTA" });
    expect(due("entregar até 30/12/26")).toMatchObject({ date: "2026-12-30" });
  });
  it("dia/mês sem ano já bem no passado vira o ano seguinte; data inválida é ignorada", () => {
    expect(due("até 05/01")?.date).toBe("2027-01-05");
    expect(due("até 31/02")).toBeNull();
  });
  it("por extenso e 'dia N' sem mês", () => {
    expect(due("até 3 de dezembro")?.date).toBe("2026-12-03");
    expect(due("até 1º de dez. de 2027")?.date).toBe("2027-12-01");
    expect(due("até o dia 25")?.date).toBe("2026-11-25");
    expect(due("até o dia 5")?.date).toBe("2026-12-05");
  });
  it("data sem marca de prazo e no passado é só referência (não vira prazo)", () => {
    expect(due("Na reunião de 10/11 ninguém falou de prazo.")).toBeNull();
    expect(due("Na reunião de 10/11 Ana prometeu entregar até 20/11.")?.date).toBe("2026-11-20");
  });
});

describe("prazos relativos à data-base", () => {
  it("hoje, amanhã, depois de amanhã", () => {
    expect(due("ainda hoje")?.date).toBe(BASE);
    expect(due("até amanhã")).toMatchObject({ date: "2026-11-13", raw: "amanhã", kind: "RELATIVA" });
    expect(due("depois de amanhã")?.date).toBe("2026-11-14");
  });
  it("dia da semana = a primeira ocorrência DEPOIS da data-base (inclusive 'próxima' e 'que vem')", () => {
    expect(due("até sexta")).toEqual({ date: "2026-11-13", raw: "até sexta", kind: "RELATIVA" });
    expect(due("até sexta-feira")?.date).toBe("2026-11-13");
    expect(due("na próxima terça")?.date).toBe("2026-11-17");
    expect(due("até quinta")?.date).toBe("2026-11-19"); // mesma quinta da reunião não conta
    expect(due("segunda que vem")?.date).toBe("2026-11-16");
  });
  it("ordinal não é dia da semana: 'a sexta reunião', 'segunda proposta'", () => {
    expect(due("Isso fica para a sexta reunião do comitê.")).toBeNull();
    expect(due("A segunda proposta é mais cara.")).toBeNull();
  });
  it("em N dias, N semanas, N meses (número ou por extenso)", () => {
    expect(due("em 5 dias")?.date).toBe("2026-11-17");
    expect(due("dentro de duas semanas")?.date).toBe("2026-11-26");
    expect(due("em 1 mês")?.date).toBe("2026-12-12");
    expect(due("daqui a dez dias")?.date).toBe("2026-11-22");
  });
  it("dias úteis pulam fim de semana e feriado nacional (20/11)", () => {
    expect(due("em 5 dias úteis")).toEqual({ date: "2026-11-19", raw: "em 5 dias úteis", kind: "RELATIVA" });
    expect(due("em 6 dias úteis")?.date).toBe("2026-11-23");
    expect(due("no prazo de cinco dias úteis")?.date).toBe("2026-11-19");
  });
  it("fim da semana, do mês e do ano; semana que vem", () => {
    expect(due("até o fim da semana")?.date).toBe("2026-11-13");
    expect(due("até o fim do mês")?.date).toBe("2026-11-30");
    expect(due("até o final do ano")?.date).toBe("2026-12-31");
    expect(due("até a semana que vem")?.date).toBe("2026-11-20");
  });
  it("'5 dias atrás' não é prazo (prefixo obrigatório)", () => {
    expect(due("O teste rodou 5 dias atrás.")).toBeNull();
  });
});

describe("calendário", () => {
  it("Páscoa e Sexta-feira Santa; feriados nacionais fixos", () => {
    expect(toDateOnly(easter(2026))).toBe("2026-04-05");
    const h = nationalHolidays(2026);
    expect(h.has("2026-04-03")).toBe(true);
    expect(h.has("2026-11-20")).toBe(true);
    expect(nationalHolidays(2023).has("2023-11-20")).toBe(false);
  });
  it("dias úteis a partir de uma sexta pulam o fim de semana", () => {
    expect(toDateOnly(addBusinessDays(parseDateOnly("2026-11-13")!, 1))).toBe("2026-11-16");
  });
  it("data local de hoje e mapa de dobra de acentos", () => {
    expect(todayLocal(new Date(2026, 10, 12, 23, 30))).toBe("2026-11-12");
    const { folded, map } = foldWithMap("até Sexta");
    expect(folded).toBe("ate sexta");
    expect("até Sexta".slice(map[4], map[9])).toBe("Sexta");
  });
  it("vários prazos na frase: escolhe o que tem marca de prazo", () => {
    expect(findDueDates("De 10/11 até 20/11", BASE).map((c) => c.cue)).toEqual([false, true]);
  });
});

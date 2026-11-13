import { describe, expect, it } from "vitest";
import {
  addBusinessDays, addMonths, easter, findDates, findDeadlines, findReferenceDate, isBusinessDay, isoOf, nationalHolidays, parseNumberWords, parseRfc2822Date,
} from "./dates";

const REF = "2026-11-10";
const deadlinesOf = (text: string, ref = REF) => findDeadlines(text, ref).map((d) => ({ date: d.date, kind: d.kind, match: text.slice(d.start, d.end) }));

describe("datas em pt-BR", () => {
  it("datas absolutas: barra, ponto, ano com 2 dígitos, por extenso, 1º e mês sem dia; data impossível não conta", () => {
    expect(isoOf(2026, 2, 31)).toBeNull();
    const text = "Entregas em 30/11/2026, 05.12.26, 1º de dezembro de 2026 e dezembro de 2027. Inválida: 31/02/2026.";
    expect(findDates(text, REF).map((d) => [d.date, d.precision, text.slice(d.start, d.end)])).toEqual([
      ["2026-11-30", "DIA", "30/11/2026"],
      ["2026-12-05", "DIA", "05.12.26"],
      ["2026-12-01", "DIA", "1º de dezembro de 2026"],
      ["2027-12-31", "MES", "dezembro de 2027"],
    ]);
  });

  it("número do processo e Lei 14.133 não viram data", () => {
    expect(findDates("Processo SEI 23075.012345/2026-11, Lei nº 14.133/2021, protocolo 21.345.678-9")).toEqual([]);
  });

  it("número por extenso (até 599) e recusas", () => {
    expect(parseNumberWords("sessenta")).toBe(60);
    expect(parseNumberWords("quarenta e cinco")).toBe(45);
    expect(parseNumberWords("cento e vinte")).toBe(120);
    expect(parseNumberWords("vinte e um")).toBe(21);
    expect(parseNumberWords("cinco e quarenta")).toBeNull();
    expect(parseNumberWords("alguns")).toBeNull();
  });
});

describe("prazos com deixa", () => {
  it("'até 30/11/2026', 'prazo: 15/12/2026', 'concluída até 30 de junho de 2027' — e só com deixa", () => {
    expect(deadlinesOf("Solicitamos que o sistema esteja concluído até 30/11/2026.")).toEqual([{ date: "2026-11-30", kind: "DATA", match: "30/11/2026" }]);
    expect(deadlinesOf("Prazo final: 15/12/2026")).toEqual([{ date: "2026-12-15", kind: "DATA", match: "15/12/2026" }]);
    expect(deadlinesOf("A implantação deverá estar concluída até 30 de junho de 2027.")[0]).toMatchObject({ date: "2027-06-30" });
    expect(deadlinesOf("Curitiba, 10 de novembro de 2026. Reunião em 20/11/2026.")).toEqual([]);
    expect(deadlinesOf("Vigência a partir de 01/12/2026.")).toEqual([]);
  });

  it("'em 45 dias', 'no prazo de 60 (sessenta) dias corridos', por extenso, semanas e meses", () => {
    expect(deadlinesOf("Apresentar o ETP em 45 dias.")).toEqual([{ date: "2026-12-25", kind: "DIAS_CORRIDOS", match: "em 45 dias" }]);
    expect(deadlinesOf("no prazo de 60 (sessenta) dias corridos")[0]).toMatchObject({ date: "2027-01-09", kind: "DIAS_CORRIDOS" });
    expect(deadlinesOf("no prazo de sessenta dias")[0]).toMatchObject({ date: "2027-01-09", kind: "DIAS_CORRIDOS" });
    expect(deadlinesOf("dentro de duas semanas")[0]).toMatchObject({ date: "2026-11-24", kind: "SEMANAS" });
    expect(deadlinesOf("em 3 meses", "2026-11-30")[0]).toMatchObject({ date: "2027-02-28", kind: "MESES" });
    expect(deadlinesOf("em alguns dias")).toEqual([]);
  });

  it("'até dezembro' sem ano é o próximo dezembro; 'até março' já passou neste ano → ano que vem", () => {
    expect(deadlinesOf("Concluir até dezembro.")[0]).toMatchObject({ date: "2026-12-31", kind: "MES" });
    expect(deadlinesOf("Concluir até março.")[0]).toMatchObject({ date: "2027-03-31", kind: "MES" });
  });

  it("dias úteis pulam fim de semana e feriados nacionais (20/11 e Sexta-feira Santa)", () => {
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
    expect(nationalHolidays(2026).has("2026-04-03")).toBe(true);
    expect(isBusinessDay("2026-11-20")).toBe(false);
    expect(addBusinessDays("2026-11-19", 1)).toBe("2026-11-23");
    expect(addBusinessDays("2026-11-13", 1)).toBe("2026-11-16");
    const d = deadlinesOf("no prazo de 60 (sessenta) dias úteis")[0]!;
    expect(d.kind).toBe("DIAS_UTEIS");
    // conferência independente: 60 dias úteis contados um a um
    let count = 0;
    for (let x = "2026-11-10"; x < d.date; ) {
      x = new Date(Date.parse(`${x}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      if (isBusinessDay(x)) count++;
    }
    expect(count).toBe(60);
    expect(isBusinessDay(d.date)).toBe(true);
  });

  it("meses somados respeitam o último dia do mês", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
  });
});

describe("data do documento", () => {
  it("'Curitiba, 10 de novembro de 2026' à direita do cabeçalho, 'Data:' e cabeçalho de e-mail", () => {
    const oficio = "Ofício nº 123/2026 – SECID/DTI                    Curitiba, 10 de novembro de 2026.";
    expect(findReferenceDate(oficio)).toMatchObject({ date: "2026-11-10" });
    expect(findReferenceDate("Assunto: x\nData: 05/11/2026\n\nTexto")).toMatchObject({ date: "2026-11-05" });
    expect(findReferenceDate("Date: Tue, 10 Nov 2026 14:00:00 -0300")).toMatchObject({ date: "2026-11-10" });
    expect(findReferenceDate("Sem data aqui")).toBeNull();
    expect(parseRfc2822Date("Mon, 1 Feb 2027 09:00:00 +0000")).toBe("2027-02-01");
  });
});

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  addDays, daysBetween, deadlineStatus, easterSunday, isBusinessDay, isIsoDate, legalDueDate, localTodayIso, MAX_LEGAL_DAYS, nationalHolidays,
} from "./legalDeadline";

// Os MESMOS casos de LegalDeadlineCalendarTest (Java): as duas contas não podem divergir.
const RES = "../../ws-domain/src/test/resources/acervo/";
const rows = (name: string) => fs.readFileSync(fileURLToPath(new URL(RES + name, import.meta.url)), "utf8")
  .split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split(";"));

describe("prazo legal — mesmo cálculo do Java (Lei 9.784/1999, art. 66)", () => {
  it("casos compartilhados com LegalDeadlineCalendarTest", () => {
    const cases = rows("prazos-legais-casos.csv");
    expect(cases.length).toBeGreaterThan(20);
    for (const [start, days, business, due, note] of cases) {
      expect(legalDueDate(start!, Number(days), business === "true"), note).toBe(due);
    }
  });

  it("feriados nacionais fixos, Paixão pela Páscoa e 20/11 só desde 2024", () => {
    for (const [year, dates] of rows("feriados-nacionais.csv")) expect(nationalHolidays(Number(year)), year).toEqual(dates!.split(","));
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2038)).toBe("2038-04-25");
    expect(easterSunday(2285)).toBe("2285-03-22");
    expect(isBusinessDay("2026-02-16")).toBe(true); // Carnaval: ponto facultativo
    expect(isBusinessDay("2026-11-20")).toBe(false);
    expect(isBusinessDay("2023-11-20")).toBe(true);
    expect(isBusinessDay("2026-11-14")).toBe(false); // sábado
  });

  it("recusa dias fora da faixa e data inválida", () => {
    expect(() => legalDueDate("2026-11-12", 0, false)).toThrow(RangeError);
    expect(() => legalDueDate("2026-11-12", MAX_LEGAL_DAYS + 1, true)).toThrow(RangeError);
    expect(() => legalDueDate("2026-02-30", 5, false)).toThrow(RangeError);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-11-12")).toBe(true);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("estado do prazo (vence em X dias · vence hoje · vencida há X dias)", () => {
  it("cores e marcas por distância", () => {
    expect(deadlineStatus("2026-11-10", "2026-11-12")).toEqual({ kind: "VENCIDA", days: -2, tone: "danger" });
    expect(deadlineStatus("2026-11-12", "2026-11-12")).toEqual({ kind: "HOJE", days: 0, tone: "warning" });
    expect(deadlineStatus("2026-11-15", "2026-11-12")).toEqual({ kind: "PROXIMA", days: 3, tone: "warning" });
    expect(deadlineStatus("2026-11-19", "2026-11-12")).toEqual({ kind: "PROXIMA", days: 7, tone: "info" });
    expect(deadlineStatus("2026-11-20", "2026-11-12")).toEqual({ kind: "EM_DIA", days: 8, tone: "neutral" });
  });

  it("datas em dia civil, sem fuso; hoje é o dia local de quem olha", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(localTodayIso(new Date(2026, 10, 12, 23, 30))).toBe("2026-11-12");
  });
});

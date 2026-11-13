import { describe, expect, it } from "vitest";
import { budgetCsv, buildBudget, csvOptionsFor, examplePriceTable, priceItemFor, toCsv, type BudgetCsvLabels } from "./budget";
import { readDwgHeader } from "./dwg";
import { parseCad } from "./read";
import { addWorkdays, buildSchedule, firstWorkday, nextMonday } from "./schedule";
import { applyEdits, builtAreaM2, crossChecks, takeoffOf } from "./takeoff";
import type { ItemKind, QtyUnit, TakeoffRow } from "./types";

const row = (id: string, kind: ItemKind, unit: QtyUnit, quantity: number, included = true, label = id): TakeoffRow => ({
  id, kind, unit, quantity, included, label, confidence: "ALTA", alerts: [], source: { format: "DXF", what: "CAMADA", ref: label },
});

describe("DWG: só a versão, sem fingir leitura", () => {
  it("AC1032 = AutoCAD 2018 em diante; AC1027 = 2013–2017; nenhum quantitativo sai do DWG", () => {
    const head = new Uint8Array([0x41, 0x43, 0x31, 0x30, 0x33, 0x32, 0, 0, 0, 0, 0, 0x1f]);
    expect(readDwgHeader(head)).toEqual({ code: "AC1032", first: "2018", last: null });
    expect(readDwgHeader(new TextEncoder().encode("AC1027\u0000\u0000"))).toEqual({ code: "AC1027", first: "2013", last: "2017" });
    const parsed = parseCad("planta.dwg", head, 2_500_000);
    expect(parsed).toEqual({ ok: true, value: { format: "DWG", fileName: "planta.dwg", sizeBytes: 2_500_000, dwg: { code: "AC1032", first: "2018", last: null } } });
    if (!parsed.ok) throw new Error("x");
    expect(takeoffOf(parsed.value).rows).toEqual([]);
    expect(parseCad("planta.dxf", head)).toEqual({ ok: false, error: { code: "TIPO_DIVERGENTE", vars: { detected: "DWG", ext: "dxf" } } });
  });

  it("teto de tamanho conferido antes de ler: DXF acima de 50 MB é recusado", () => {
    const dxfHead = new TextEncoder().encode("  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nEOF\n");
    expect(parseCad("grande.dxf", dxfHead, 60 * 1024 * 1024)).toEqual({ ok: false, error: { code: "ARQUIVO_GRANDE", vars: { format: "DXF", maxMb: 50 } } });
  });
});

describe("planilha orçamentária (valores de exemplo)", () => {
  const rows = [
    row("parede", "PAREDE", "m2", 25.2),
    row("sala", "AMBIENTE", "m2", 20),
    row("porta", "PORTA", "un", 3),
    row("mesa", "MOBILIARIO", "un", 4, false),
    row("??", "OUTRO", "m", 7.5),
  ];

  it("linha = quantidade × preço; subtotais por etapa; BDI sobre o custo direto; canteiro e limpeza fixos", () => {
    const b = buildBudget(rows, examplePriceTable(), 25, builtAreaM2(rows));
    const line = (id: string) => b.lines.find((l) => l.id === id)!;
    expect(line("fixa:canteiro")).toMatchObject({ code: "EX-01", quantity: 1, unitPriceCents: 1_500_000, totalCents: 1_500_000, group: "CANTEIRO" });
    expect(line("linha:parede")).toMatchObject({ code: "EX-06", service: "ALVENARIA", quantity: 25.2, unitPriceCents: 9_500, totalCents: 239_400, group: "ALVENARIA" });
    expect(line("linha:sala")).toMatchObject({ code: "EX-16", service: "PISO", totalCents: 240_000, group: "REVESTIMENTOS" });
    expect(line("linha:porta")).toMatchObject({ code: "EX-14", totalCents: 285_000 });
    expect(line("fixa:limpeza")).toMatchObject({ code: "EX-20", quantity: 20, totalCents: 16_000, group: "LIMPEZA" });
    // fora da planilha (não incluída) não entra; item sem preço de exemplo entra com preço a informar
    expect(b.lines.some((l) => l.rowId === "mesa")).toBe(false);
    expect(line("linha:??")).toMatchObject({ code: null, unitPriceCents: 0, totalCents: 0, group: "OUTROS" });
    expect(b.unpriced).toBe(1);
    expect(b.groups.map((g) => g.group)).toEqual(["CANTEIRO", "ALVENARIA", "REVESTIMENTOS", "LIMPEZA", "OUTROS"]);
    expect(b.groups.find((g) => g.group === "REVESTIMENTOS")!.subtotalCents).toBe(525_000);
    expect(b.directCents).toBe(1_500_000 + 239_400 + 240_000 + 285_000 + 16_000);
    expect(b.bdiCents).toBe(570_100);
    expect(b.totalCents).toBe(2_850_500);
  });

  it("preço editado vale para o código; BDI fora de 0–100 é limitado; preço do item sem código pela linha", () => {
    const prices = { ...examplePriceTable(), "EX-06": 10_000, "row:??": 2_000 };
    const b = buildBudget(rows, prices, 150, null);
    expect(b.lines.find((l) => l.id === "linha:parede")!.totalCents).toBe(252_000);
    expect(b.lines.find((l) => l.id === "linha:??")!.totalCents).toBe(15_000);
    expect(b.unpriced).toBe(0);
    expect(b.bdiPercent).toBe(100);
    expect(b.totalCents).toBe(b.directCents * 2);
    expect(b.lines.some((l) => l.id === "fixa:limpeza")).toBe(false);
    expect(priceItemFor("LAJE", "m3")!.code).toBe("EX-03");
    expect(priceItemFor("LAJE", "m2")!.code).toBe("EX-04");
    expect(priceItemFor("MOBILIARIO", "un")).toBeNull();
  });

  it("quantidade com 2 casas: o total da linha bate com o que está impresso", () => {
    const b = buildBudget([row("x", "PAREDE", "m2", 10.005)], examplePriceTable(), 0, null);
    expect(b.lines.find((l) => l.id === "linha:x")).toMatchObject({ quantity: 10.01, totalCents: 95_095 });
  });

  it("CSV: BOM, ; e vírgula decimal (pt-BR), aspas quando precisa e texto do arquivo sem virar fórmula", () => {
    expect(toCsv([["a;b", 'diz "oi"', 1.5, null]], csvOptionsFor("pt-BR"))).toBe('﻿"a;b";"diz ""oi""";1,50;\r\n');
    expect(toCsv([["=HYPERLINK(\"x\")", "-1", 2]], csvOptionsFor("en"))).toBe('﻿"\'=HYPERLINK(""x"")",\'-1,2.00\r\n');
    const labels: BudgetCsvLabels = {
      header: ["Código", "Etapa", "Serviço", "Origem", "Unidade", "Quantidade", "Preço unitário", "Total"],
      group: (g) => g, service: (l) => l.service ?? "?", unit: (u) => u, subtotal: (g) => `Subtotal ${g}`,
      direct: "Custo direto", bdi: "BDI", total: "Total", note: "Valores de exemplo",
    };
    const b = buildBudget([row("parede", "PAREDE", "m2", 25.2, true, "=ARQ;PAREDE")], examplePriceTable(), 25, null);
    const csv = budgetCsv(b, labels, csvOptionsFor("pt-BR"));
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Código;Etapa;Serviço;Origem;Unidade;Quantidade;Preço unitário;Total");
    expect(lines).toContain(`EX-06;ALVENARIA;ALVENARIA;"'=ARQ;PAREDE";m2;25,20;95,00;2394,00`);
    expect(lines).toContain(";;BDI;;;25,00;;4348,50");
    expect(lines).toContain(";;Total;;;;;21742,50");
    expect(lines.at(-1)).toBe("Valores de exemplo");
  });
});

describe("conferências e correções (RF34.CA04)", () => {
  it("correção de quantidade guarda o valor original; excluir tira da planilha; ambiente + hachura de piso = dupla contagem", () => {
    const rows = [row("sala", "AMBIENTE", "m2", 20), row("piso", "PISO", "m2", 18)];
    expect(crossChecks(rows)).toEqual([{ code: "DUPLA_CONTAGEM_PISO", vars: { rooms: 20, floors: 18 } }]);
    const edited = applyEdits(rows, { piso: { included: false }, sala: { quantity: 21.5 } });
    expect(edited[0]).toMatchObject({ quantity: 21.5, corrected: { from: 20 } });
    expect(edited[1]!.included).toBe(false);
    expect(crossChecks(edited)).toEqual([]);
    // quantidade igual à original não marca correção; negativa é ignorada
    expect(applyEdits(rows, { sala: { quantity: 20 } })[0]!.corrected).toBeUndefined();
    expect(applyEdits(rows, { sala: { quantity: -3 } })[0]!.quantity).toBe(20);
    expect(builtAreaM2(rows)).toBe(20);
    expect(builtAreaM2([row("l", "LAJE", "m2", 80, false)])).toBe(80);
    expect(builtAreaM2([row("p", "PORTA", "un", 2)])).toBeNull();
  });
});

describe("cronograma pré-preenchido (produtividades de exemplo)", () => {
  it("calendário: dias úteis, sábado vira segunda, próxima segunda a partir de quinta", () => {
    expect(firstWorkday("2026-11-14")).toBe("2026-11-16");
    expect(addWorkdays("2026-11-20", 1)).toBe("2026-11-23");
    expect(addWorkdays("2026-11-16", 17)).toBe("2026-12-09");
    expect(nextMonday(new Date(2026, 10, 12, 15, 0))).toBe("2026-11-16");
  });

  it("sequência canteiro → … → limpeza com dependências fim-início; quantidade, área construída como estimativa e duração fixa", () => {
    const rows = [row("parede", "PAREDE", "m2", 24), row("sala", "AMBIENTE", "m2", 30), row("porta", "PORTA", "un", 4)];
    const s = buildSchedule(rows, { start: "2026-11-16", builtAreaM2: builtAreaM2(rows) });
    expect(s.items.map((i) => [i.stage, i.days, i.status])).toEqual([
      ["CANTEIRO", 5, "FIXA"],
      ["FUNDACAO", 1, "ESTIMADA"],
      ["ESTRUTURA", 2, "ESTIMADA"],
      ["ALVENARIA", 2, "CALCULADA"],
      ["COBERTURA", 2, "ESTIMADA"],
      ["INSTALACOES", 2, "ESTIMADA"],
      ["REVESTIMENTOS", 3, "CALCULADA"],
      ["LIMPEZA", 1, "ESTIMADA"],
    ]);
    expect(s.items[3]!.dependsOn).toEqual(["ESTRUTURA"]);
    expect(s.items[0]!.dependsOn).toEqual([]);
    expect(s.items[3]).toMatchObject({ start: "2026-11-26", end: "2026-11-27", basis: { type: "QUANTIDADE", parts: [{ kinds: ["PAREDE"], unit: "m2", quantity: 24, perDay: 12 }] } });
    expect(s.items[6]!.basis).toMatchObject({ type: "QUANTIDADE", parts: [{ unit: "m2", quantity: 30 }, { unit: "un", quantity: 4 }] });
    expect(s).toMatchObject({ start: "2026-11-16", totalDays: 18, end: "2026-12-09", undefinedStages: [] });
    // duas equipes na alvenaria: 24 ÷ 12 ÷ 2 = 1 dia; a cadeia anda junto
    const two = buildSchedule(rows, { start: "2026-11-16", builtAreaM2: 30, teams: { ALVENARIA: 2 } });
    expect(two.items[3]).toMatchObject({ teams: 2, days: 1 });
    expect(two.totalDays).toBe(17);
  });

  it("sem quantidade nem área construída: etapas A_DEFINIR (0 dia), nunca inventadas", () => {
    const s = buildSchedule([row("porta", "PORTA", "un", 2)], { start: "2026-11-16", builtAreaM2: null });
    expect(s.undefinedStages).toEqual(["FUNDACAO", "ESTRUTURA", "ALVENARIA", "COBERTURA", "INSTALACOES", "LIMPEZA"]);
    expect(s.items.find((i) => i.stage === "FUNDACAO")).toMatchObject({ days: 0, start: null, end: null, basis: { type: "NENHUMA" } });
    expect(s.totalDays).toBe(5 + 1);
  });
});

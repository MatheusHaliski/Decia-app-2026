import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OccupationPack } from "@/lib/career/occupationPack";
import { assessTask, type QualityCheck } from "./quality";
import { applyTemplate, packTemplates, type TaskDraft } from "./templates";

const pack = (code: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "contracts/career/occupation-packs", `${code}.json`), "utf8")) as OccupationPack;
const EMPTY: TaskDraft = {
  title: "", type: "", area: "", objective: "", descriptionMd: "", priority: "MEDIA", dueAt: "", accessClass: "INTERNO", visibility: "PRIVADA",
  deliverables: [], criteria: [], references: [], extensions: {},
};
const GOOD: TaskDraft = {
  ...EMPTY,
  title: "Relatório de satisfação do atendimento",
  type: "DOCUMENTO",
  objective: "Entregar à diretoria, até 30/11, o relatório com a satisfação de 200 atendimentos do trimestre",
  deliverables: ["Relatório em PDF com gráficos"],
  criteria: ["Amostra de 200 atendimentos descrita na seção de método", "Índice de satisfação calculado com intervalo de confiança de 95%"],
  dueAt: "2026-11-30",
};
const byId = (checks: QualityCheck[], id: string) => checks.find((c) => c.id === id);

describe("checagem de qualidade da tarefa", () => {
  it("rascunho vazio: falta o essencial (título, tipo, objetivo, entregas, critérios)", () => {
    const r = assessTask(EMPTY);
    expect(r.readiness).toBe("INCOMPLETA");
    for (const id of ["titulo", "tipo", "objetivo", "entregas", "criterios"]) expect(byId(r.checks, id)!.status).toBe("FALTA");
    expect(byId(r.checks, "prazo")!.status).toBe("AVISO");
  });

  it("tarefa bem definida: objetivo tangível, entrega substantiva, critérios verificáveis e prazo", () => {
    const r = assessTask(GOOD);
    expect(r.counts.FALTA).toBe(0);
    expect(r.checks.filter((c) => c.group === "ESSENCIAL").every((c) => c.status === "OK")).toBe(true);
    expect(r.readiness).toBe("PRONTA");
  });

  it("entrega com cara de atividade e critério vago pedem atenção; marcador de modelo não preenchido é apontado", () => {
    const r = assessTask({ ...GOOD, deliverables: ["Testar o sistema"], criteria: ["Ficar de boa qualidade", "Relatório adequado"], objective: "Entregar até [data] o relatório" });
    expect(byId(r.checks, "entregas")).toMatchObject({ status: "AVISO", vars: { text: "Testar o sistema" } });
    expect(byId(r.checks, "criterios")).toMatchObject({ status: "AVISO", vars: { vague: 2 } });
    expect(byId(r.checks, "marcadores")).toMatchObject({ status: "AVISO", vars: { n: 1 } });
  });

  it("privacidade incoerente (sigiloso e público) falta corrigir", () => {
    expect(byId(assessTask({ ...GOOD, accessClass: "SIGILOSO", visibility: "PUBLICA" }).checks, "privacidade")!.status).toBe("FALTA");
  });

  it("Jurídico: número CNJ, base legal, prazo obrigatório e classe de acesso", () => {
    const base: TaskDraft = { ...GOOD, area: "JURIDICO", accessClass: "PUBLICO", dueAt: "", extensions: { caseNumber: "123-45", legalBasis: "conforme combinado" } };
    const r = assessTask(base);
    expect(byId(r.checks, "jurNumero")!.status).toBe("AVISO");
    expect(byId(r.checks, "jurBase")!.status).toBe("AVISO");
    expect(byId(r.checks, "jurPrazo")!.status).toBe("FALTA");
    expect(byId(r.checks, "jurSigilo")!.fixes).toEqual([{ kind: "SET_ACCESS", accessClass: "RESTRITO" }]);
    const ok = assessTask({ ...base, dueAt: "2026-12-01", accessClass: "RESTRITO", extensions: { caseNumber: "0001234-56.2026.8.16.0001", legalBasis: "Lei 14.133/2021, art. 75" } });
    for (const id of ["jurNumero", "jurBase", "jurPrazo"]) expect(byId(ok.checks, id)!.status).toBe("OK");
    expect(byId(ok.checks, "jurSigilo")).toBeUndefined();
  });

  it("Pesquisa com pessoas exige consentimento; a correção sugerida resolve", () => {
    const d: TaskDraft = { ...GOOD, area: "PESQUISA", extensions: { question: "O atendimento melhorou?", method: "survey", sample: "200 servidores entrevistados" } };
    const r = assessTask(d);
    const etica = byId(r.checks, "pqEtica")!;
    expect(etica.status).toBe("AVISO");
    const fix = etica.fixes!.find((f) => f.kind === "ADD_CRITERION")!;
    const fixed = assessTask({ ...d, criteria: [...d.criteria, (fix as { text: string }).text] });
    expect(byId(fixed.checks, "pqEtica")!.status).toBe("OK");
    expect(byId(r.checks, "pqAmostra")!.status).toBe("OK");
  });

  it("campo de estudo: rubrica do pacote, entregas típicas, fontes do campo e dados sensíveis", () => {
    const p = pack("engenharia-de-software");
    const r = assessTask({ ...GOOD, area: "SOFTWARE", accessClass: "PUBLICO", visibility: "PUBLICA" }, p);
    const rubrica = byId(r.checks, "campoRubrica")!;
    expect(rubrica.group).toBe("CAMPO");
    expect(rubrica.status).toBe("AVISO");
    const criteria = [...GOOD.criteria, ...rubrica.fixes!.map((f) => (f as { text: string }).text)];
    expect(byId(assessTask({ ...GOOD, area: "SOFTWARE", criteria }, p).checks, "campoRubrica")!.status).toBe("OK");
    expect(byId(r.checks, "campoFontes")!.fixes![0]).toMatchObject({ kind: "ADD_REFERENCE" });
    expect(byId(r.checks, "campoEntregas")!.status).toBe("AVISO");
  });

  it("modelos do campo saem do pacote (tarefas-guia e próprias) e aplicar preserva prazo e privacidade da pessoa", () => {
    const p = pack("direito");
    const tpls = packTemplates(p, "JURIDICO");
    expect(tpls.length).toBeGreaterThan(3);
    expect(tpls.every((t) => t.id.startsWith("campo.direito.") && t.criteria.length > 0 && t.area === "JURIDICO")).toBe(true);
    const applied = applyTemplate({ ...EMPTY, dueAt: "2026-12-10", accessClass: "SIGILOSO" }, tpls[0]!);
    expect(applied).toMatchObject({ title: tpls[0]!.title, area: "JURIDICO", dueAt: "2026-12-10", accessClass: "SIGILOSO" });
    expect(applied.criteria).toEqual(tpls[0]!.criteria);
  });
});

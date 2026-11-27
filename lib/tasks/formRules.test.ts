import { describe, expect, it } from "vitest";
import { emptyFormat } from "./formats";
import {
  emptyExtra, emptyLegal, firstErrorField, packExtra, parseAmount, sectionProgress, suggestEffort, unpackExtra, validateTaskForm,
  type TaskFormValues,
} from "./formRules";

const base = (over: Partial<TaskFormValues> = {}): TaskFormValues => ({
  title: "Parecer sobre o contrato", type: "DOCUMENTO", category: "", objective: "", descriptionMd: "", dueAt: "", accessClass: "INTERNO",
  visibility: "PRIVADA", deliverables: [], criteria: [], references: [], otherExtensions: {}, extra: emptyExtra(), legal: emptyLegal(), format: emptyFormat(),
  ...over,
});
const today = "2026-11-12";

describe("campos do Acervo em extensions (chaves reservadas)", () => {
  it("vazio não gera chave nenhuma; ida e volta preserva tudo e não mistura com as extensões da área", () => {
    expect(packExtra(emptyExtra())).toEqual({});
    const extra = {
      ...emptyExtra(), subcategory: "Pedido LAI", natures: ["JURIDICA", "ADMINISTRATIVA"] as const, processes: ["LICITACAO"] as const, startAt: "2026-11-01",
      effortSize: "M" as const, estimatedHours: "12", amount: "1.500,00", origin: "ORGAO_EXTERNO" as const, sender: "TCE-PR", document: "Ofício nº 12/2026 & anexos",
      protocol: "SEI 123", receivedAt: "2026-11-10", docSituation: "MINUTA" as const, participants: ["Ana; jurídico", "Bruno"], accessReason: "",
    };
    const packed = packExtra({ ...extra, natures: [...extra.natures], processes: [...extra.processes] });
    expect(Object.keys(packed).sort()).toEqual(["effort", "origin", "participants", "subcategory", "taxonomy"]);
    const { extra: back, rest } = unpackExtra({ ...packed, standard: "NBR 12721", studyField: "direito" });
    expect(rest).toEqual({ standard: "NBR 12721", studyField: "direito" });
    expect(back).toMatchObject({ subcategory: "Pedido LAI", natures: ["JURIDICA", "ADMINISTRATIVA"], processes: ["LICITACAO"], document: "Ofício nº 12/2026 & anexos", sender: "TCE-PR", amount: "1.500,00" });
    expect(back.participants).toEqual(["Ana, jurídico", "Bruno"]);
  });

  it("origem interna não grava remetente nem documento; valores fora do enum são ignorados ao ler", () => {
    const packed = packExtra({ ...emptyExtra(), sender: "esquecido", document: "x", protocol: "P-1" });
    expect(packed.origin).toBe("protocol=P-1");
    const { extra } = unpackExtra({ taxonomy: "nature=HACK,TECNICA,JURIDICA,SOCIAL", effort: "size=XL", origin: "kind=MARTE" });
    expect(extra.natures).toEqual(["TECNICA", "JURIDICA"]);
    expect(extra.effortSize).toBe("");
    expect(extra.origin).toBe("INTERNA");
  });

  it("sugestão de esforço e leitura de valores", () => {
    expect(suggestEffort("8")).toBe("P");
    expect(suggestEffort("40")).toBe("M");
    expect(suggestEffort("41,5")).toBe("G");
    expect(suggestEffort("")).toBeNull();
    expect(parseAmount("1.500,50")).toBe(1500.5);
    expect(parseAmount("R$ 1500.5")).toBe(1500.5);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBeNaN();
  });
});

describe("validação por campo e regras condicionais", () => {
  it("título e tipo obrigatórios, na ordem da tela", () => {
    const e = validateTaskForm(base({ title: " ", type: "" }), { today });
    expect(Object.keys(e)).toEqual(["title", "type"]);
    expect(e.title).toBe("tasks.form.errTitle");
    expect(firstErrorField(e)).toBe("title");
  });

  it("sigiloso exige justificativa; restrito/sigiloso não podem ser públicos", () => {
    expect(validateTaskForm(base({ accessClass: "SIGILOSO" }), { today }).accessReason).toBe("taskForm.err.accessReason");
    expect(validateTaskForm(base({ accessClass: "SIGILOSO", extra: { ...emptyExtra(), accessReason: "LAI art. 23" } }), { today })).toEqual({});
    expect(validateTaskForm(base({ accessClass: "RESTRITO", visibility: "PUBLICA" }), { today }).visibility).toBe("taskForm.err.visibilityPublic");
  });

  it("origem externa exige remetente e documento; recebimento não pode estar no futuro", () => {
    const e = validateTaskForm(base({ extra: { ...emptyExtra(), origin: "CIDADAO", receivedAt: "2026-12-01" } }), { today });
    expect(e).toMatchObject({ sender: "taskForm.err.sender", document: "taskForm.err.document", receivedAt: "taskForm.err.receivedFuture" });
    expect(validateTaskForm(base({ extra: { ...emptyExtra(), origin: "CIDADAO", sender: "Maria", document: "Requerimento 7" } }), { today })).toEqual({});
  });

  it("rascunho dispensa os obrigatórios condicionais, mas não o formato", () => {
    const v = base({ accessClass: "SIGILOSO", extra: { ...emptyExtra(), origin: "FORNECEDOR", estimatedHours: "-1" } });
    const e = validateTaskForm(v, { today, draft: true });
    expect(e.accessReason).toBeUndefined();
    expect(e.sender).toBeUndefined();
    expect(e.estimatedHours).toBe("taskForm.err.hours");
  });

  it("datas, subcategoria, prazo legal, referências e limite de extensões", () => {
    const e = validateTaskForm(base({
      dueAt: "2026-11-01", extra: { ...emptyExtra(), startAt: "2026-11-05", subcategory: "x" }, legal: { enabled: true, ruleId: "", baseDate: "" },
      references: [{ label: "", url: "ftp://x" }], otherExtensions: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}a`, "v"])),
    }), { today });
    expect(e).toMatchObject({
      dueAt: "taskForm.err.dueBeforeStart", subcategory: "taskForm.err.subcategoryNeedsCategory", legalRule: "taskForm.err.legalRule",
      legalBase: "taskForm.err.legalBase", references: "taskForm.err.url", extensions: "taskForm.err.tooManyExtensions",
    });
  });

  it("formato com detalhe inválido é erro do campo de formato", () => {
    const e = validateTaskForm(base({ format: { family: "DOCUMENTO", variant: "PDF", details: { pages: "0" } } }), { today });
    expect(e.format).toBe("taskForm.err.formatField");
  });
});

describe("preenchimento por seção", () => {
  it("conta seções completas e marca erro na seção do campo", () => {
    const v = { ...base({ objective: "Responder ao TCE" }), area: "", responsibleId: "", hasAreaFields: false, files: 0 };
    const p = sectionProgress(v);
    expect(p.total).toBe(9);
    expect(p.states.ident).toBe("done");
    expect(p.states.goal).toBe("done");
    expect(p.states.access).toBe("done");
    expect(p.states.deliver).toBe("empty");
    const withErr = sectionProgress(v, { sender: "x" });
    expect(withErr.states.origin).toBe("error");
    expect(withErr.done).toBe(p.done - 1);
  });
});

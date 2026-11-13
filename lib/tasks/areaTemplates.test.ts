import { describe, expect, it } from "vitest";
import { looksLikeActivity } from "@/lib/projects/engine/methods";
import { AREA_EXTENSIONS, PRIORITIES, TASK_TYPE_NAMES, WORK_AREAS } from "./client";
import { AREA_TEMPLATES } from "./areaTemplates";
import { applyTemplate, type TaskDraft } from "./templates";

/** Sem acento e em minúsculas, para comparar palavras. */
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Palavras vagas: só valem acompanhadas de número (mesma régua da checagem de qualidade do criador). */
const VAGUE = /\b(adequad\w*|de qualidade|bom|boa|bons|boas|melhor(ar|ia)?|otimizar|eficiente|satisfatori[oa]s?|corret[oa]s?)\b/;
/** Limites do servidor (TaskController / TaskService / TaskBriefJson). */
const MAX = { title: 200, objective: 500, description: 20_000, item: 300, url: 500, extension: 500 };

const DRAFT: TaskDraft = {
  title: "", type: "", area: "", objective: "", descriptionMd: "", priority: "MEDIA", dueAt: "2026-12-01", accessClass: "INTERNO",
  visibility: "DEPARTAMENTO", deliverables: [], criteria: [], references: [], extensions: {},
};

describe("modelos iniciais por área (AREA_TEMPLATES)", () => {
  it("51 modelos: 6 em cada área de trabalho e 3 genéricos em OUTRA", () => {
    expect(AREA_TEMPLATES).toHaveLength(51);
    for (const area of WORK_AREAS) expect(AREA_TEMPLATES.filter((t) => t.area === area), area).toHaveLength(area === "OUTRA" ? 3 : 6);
  });

  it("ids únicos no formato area.<área>.<slug-kebab>, origem AREA e títulos únicos", () => {
    const ids = AREA_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(AREA_TEMPLATES.map((t) => t.title)).size).toBe(ids.length);
    for (const t of AREA_TEMPLATES) {
      expect(t.id, t.id).toMatch(new RegExp(`^area\\.${t.area.toLowerCase()}\\.[a-z0-9]+(-[a-z0-9]+)*$`));
      expect(t.origin, t.id).toBe("AREA");
      expect(t.fieldCode, t.id).toBeUndefined();
    }
  });

  it("tipo, prioridade, esforço, nível e etiquetas válidos", () => {
    for (const t of AREA_TEMPLATES) {
      expect(TASK_TYPE_NAMES, t.id).toContain(t.type);
      if (t.priority !== undefined) expect(PRIORITIES, t.id).toContain(t.priority);
      expect(t.effort ?? "", t.id).toMatch(/^\d+ (min|h|dias?|semanas?)$/);
      expect([1, 2, 3], t.id).toContain(t.level);
      expect(t.tags?.length ?? 0, t.id).toBeGreaterThanOrEqual(2);
      expect(t.tags?.length ?? 0, t.id).toBeLessThanOrEqual(4);
    }
  });

  it("campos da área só com as chaves permitidas em AREA_EXTENSIONS", () => {
    for (const t of AREA_TEMPLATES) {
      const allowed = AREA_EXTENSIONS[t.area];
      for (const [key, value] of Object.entries(t.extensions)) {
        expect(allowed, `${t.id}: ${key}`).toContain(key);
        expect(typeof value, `${t.id}: ${key}`).toBe("string");
      }
    }
    expect(AREA_TEMPLATES.filter((t) => t.area === "OUTRA").every((t) => Object.keys(t.extensions).length === 0)).toBe(true);
  });

  it("objetivo tangível: marcador [entre colchetes] para completar e prazo ou medida", () => {
    for (const t of AREA_TEMPLATES) {
      expect(t.objective, t.id).toMatch(/\[[^\]]+\]/);
      expect(/\bate\b/.test(norm(t.objective)) || /\d/.test(t.objective), t.id).toBe(true);
    }
  });

  it("roteiro com 3 a 7 seções '## ', cada uma com 1 linha de orientação", () => {
    for (const t of AREA_TEMPLATES) {
      const lines = t.descriptionMd.split("\n");
      const headings = lines.filter((l) => l.startsWith("## "));
      expect(headings.length, t.id).toBeGreaterThanOrEqual(3);
      expect(headings.length, t.id).toBeLessThanOrEqual(7);
      for (const block of t.descriptionMd.split("\n\n")) {
        const [heading, guidance, ...rest] = block.split("\n");
        expect(heading, t.id).toMatch(/^## \S/);
        expect(guidance?.trim(), `${t.id}: ${heading}`).toBeTruthy();
        expect(guidance, `${t.id}: ${heading}`).not.toMatch(/^#/);
        expect(rest, `${t.id}: ${heading}`).toEqual([]);
      }
    }
  });

  it("entregas: de 1 a 3, substantivos (nenhuma parece atividade)", () => {
    for (const t of AREA_TEMPLATES) {
      expect(t.deliverables.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.deliverables.length, t.id).toBeLessThanOrEqual(3);
      for (const d of t.deliverables) expect(looksLikeActivity(d), `${t.id}: ${d}`).toBe(false);
    }
  });

  it("critérios de aceite: de 3 a 6, sem palavra vaga desacompanhada de número", () => {
    for (const t of AREA_TEMPLATES) {
      expect(t.criteria.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.criteria.length, t.id).toBeLessThanOrEqual(6);
      expect(new Set(t.criteria).size, t.id).toBe(t.criteria.length);
      for (const c of t.criteria) if (VAGUE.test(norm(c))) expect(c, `${t.id}: critério vago`).toMatch(/\d/);
    }
  });

  it("referências: até 3, com rótulo e endereço https válido, sem repetição nem objeto compartilhado", () => {
    for (const t of AREA_TEMPLATES) {
      expect(t.references.length, t.id).toBeLessThanOrEqual(3);
      expect(new Set(t.references.map((r) => r.url)).size, t.id).toBe(t.references.length);
      for (const r of t.references) {
        expect(r.label.trim(), t.id).toBeTruthy();
        expect(r.url, t.id).toMatch(/^https:\/\//);
        expect(() => new URL(r.url), r.url).not.toThrow();
      }
    }
    const all = AREA_TEMPLATES.flatMap((t) => t.references);
    expect(new Set(all).size).toBe(all.length);
  });

  it("cabem nos limites de tamanho do servidor", () => {
    for (const t of AREA_TEMPLATES) {
      expect(t.title.length, t.id).toBeLessThanOrEqual(MAX.title);
      expect(t.objective.length, t.id).toBeLessThanOrEqual(MAX.objective);
      expect(t.descriptionMd.length, t.id).toBeLessThanOrEqual(MAX.description);
      for (const x of [...t.deliverables, ...t.criteria, ...t.references.map((r) => r.label)]) expect(x.length, `${t.id}: ${x}`).toBeLessThanOrEqual(MAX.item);
      for (const r of t.references) expect(r.url.length, r.url).toBeLessThanOrEqual(MAX.url);
      for (const v of Object.values(t.extensions)) expect((v ?? "").length, t.id).toBeLessThanOrEqual(MAX.extension);
    }
  });

  it("applyTemplate leva o modelo ao rascunho e preserva prazo e privacidade", () => {
    for (const t of AREA_TEMPLATES) {
      const d = applyTemplate(DRAFT, t);
      expect(d, t.id).toMatchObject({ title: t.title, type: t.type, area: t.area, objective: t.objective, descriptionMd: t.descriptionMd });
      expect(d.deliverables, t.id).toEqual(t.deliverables);
      expect(d.criteria, t.id).toEqual(t.criteria);
      expect(d.references, t.id).toEqual(t.references);
      expect(d.priority, t.id).toBe(t.priority ?? DRAFT.priority);
      expect({ dueAt: d.dueAt, accessClass: d.accessClass, visibility: d.visibility }, t.id).toEqual({ dueAt: DRAFT.dueAt, accessClass: DRAFT.accessClass, visibility: DRAFT.visibility });
      for (const key of Object.keys(d.extensions)) expect(AREA_EXTENSIONS[t.area], `${t.id}: ${key}`).toContain(key);
      expect(Object.values(d.extensions).every((v) => v.trim().length > 0), t.id).toBe(true);
    }
  });
});

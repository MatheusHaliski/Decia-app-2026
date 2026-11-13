/**
 * D-153 — escada de status do pacote nas telas de produto (`packFor(code, minStatus)`), categorias do criador (TI, Engenharia, Design,
 * Pesquisa, Administração = `WorkArea` existentes), busca da profissão no idioma da tela e plano de desenvolvimento por profissão.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD_INDEX } from "@/lib/tasks/fieldIndex.gen";
import { searchOccupations } from "./academicFields";
import { AREA_ORDER, CAREER_CATEGORIES, groupFieldsByArea, occupationArea } from "./categories";
import { GENERIC_PACK_CODE, type OccupationPack } from "./occupationPack";
import { INTERNAL_TASK_CODE, guidedTaskTitle, meetsStatus, packFor, selectPack } from "./packs";
import { developmentPlan, nextPlanItem } from "./plan";

const ROOT = path.resolve(__dirname, "..", "..");
const readPack = (code: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "contracts/career/occupation-packs", `${code}.json`), "utf8")) as OccupationPack;
const generic = readPack(GENERIC_PACK_CODE);
const law = readPack("direito");

describe("D-153: packFor aplica a escada de status (pesquisa → revisado → ativo)", () => {
  it("a escada: ativo alcança tudo, revisado alcança revisado e pesquisa, pesquisa só pesquisa", () => {
    expect(meetsStatus("ativo", "revisado")).toBe(true);
    expect(meetsStatus("revisado", "pesquisa")).toBe(true);
    expect(meetsStatus("pesquisa", "revisado")).toBe(false);
    expect(meetsStatus("revisado", "ativo")).toBe(false);
  });

  it("selectPack: pacote do ramo quando alcança o mínimo; senão o genérico; senão nenhum", () => {
    expect(law.status).toBe("pesquisa");
    expect(generic.status).toBe("revisado");
    const packs = [law, generic];
    expect(selectPack("direito", "pesquisa", packs)).toMatchObject({ own: true, inReview: true, fieldCode: "direito" });
    expect(selectPack("direito", "pesquisa", packs)!.pack.code).toBe("direito");
    // modelos e rubricas pedem `revisado`: o pacote em pesquisa não serve, vale o genérico
    expect(selectPack("direito", "revisado", packs)).toMatchObject({ own: false, inReview: false });
    expect(selectPack("direito", "revisado", packs)!.pack.code).toBe(GENERIC_PACK_CODE);
    // IA por profissão, ranking, Memória: só `ativo` — nenhum pacote está ativo
    expect(selectPack("direito", "ativo", packs)).toBeNull();
    expect(selectPack(null, "pesquisa", packs)!.pack.code).toBe(GENERIC_PACK_CODE);
    expect(selectPack("ramo-inexistente", "revisado", packs)!.own).toBe(false);
    expect(selectPack("direito", "pesquisa", [law])).toMatchObject({ own: true });
    expect(selectPack("direito", "revisado", [law])).toBeNull();
  });

  it("packFor carrega o pacote real sob demanda e só baixa o genérico quando precisa", async () => {
    const loaded: string[] = [];
    const loaders = {
      direito: async () => { loaded.push("direito"); return law; },
      [GENERIC_PACK_CODE]: async () => { loaded.push(GENERIC_PACK_CODE); return generic; },
    };
    expect((await packFor("direito", "pesquisa", loaders))!.inReview).toBe(true);
    expect(loaded).toEqual(["direito"]);
    expect((await packFor("direito", "revisado", loaders))!.pack.code).toBe(GENERIC_PACK_CODE);
    expect(await packFor("direito", "ativo", loaders)).toBeNull();
    // com os carregadores de verdade (índice gerado)
    const real = await packFor("engenharia-civil", "pesquisa");
    expect(real?.own).toBe(true);
    expect(real?.pack.fields).toContain("engenharia-civil");
    expect((await packFor(null, "pesquisa"))?.pack.code).toBe(GENERIC_PACK_CODE);
  });

  it("título da tarefa-guia sem o código interno (L/D/X fica fora das telas de produto)", () => {
    const code = law.guidedTasks.priority.find((c) => law.guidedTasks.parameters[c])!;
    const title = guidedTaskTitle(law, code)!;
    expect(title).toBe(law.guidedTasks.parameters[code]!.title);
    expect(INTERNAL_TASK_CODE.test(title)).toBe(false);
    expect(guidedTaskTitle(law, "ZZ")).toBeNull();
    expect(guidedTaskTitle(null, "L1")).toBeNull();
    for (const c of ["L1", "L10", "D4", "D10", "X1", "X12"]) expect(INTERNAL_TASK_CODE.test(c), c).toBe(true);
    for (const c of ["L11", "D0", "Lei", "X"]) expect(INTERNAL_TASK_CODE.test(c), c).toBe(false);
  });
});

describe("categorias do criador: TI, Engenharia, Design, Pesquisa, Administração (sem vocabulário novo)", () => {
  it("as cinco categorias são WorkArea existentes e vêm primeiro; os 79 ramos aparecem uma vez cada", () => {
    expect(CAREER_CATEGORIES).toEqual(["SOFTWARE", "ENGENHARIA", "DESIGN", "PESQUISA", "ADMINISTRACAO"]);
    expect(AREA_ORDER.slice(0, 5)).toEqual([...CAREER_CATEGORIES]);
    const groups = groupFieldsByArea("pt-BR");
    expect(groups.slice(0, 5).map((g) => g.area)).toEqual([...CAREER_CATEGORIES]);
    expect(groups.slice(0, 5).every((g) => g.requested)).toBe(true);
    expect(groups.slice(5).every((g) => !g.requested)).toBe(true);
    const codes = groups.flatMap((g) => g.fields.map((f) => f.code));
    expect(codes).toHaveLength(FIELD_INDEX.length);
    expect(new Set(codes).size).toBe(FIELD_INDEX.length);
    const eng = groups.find((g) => g.area === "ENGENHARIA")!.fields.map((f) => f.label["pt-BR"]);
    expect([...eng].sort((a, b) => a.localeCompare(b, "pt-BR"))).toEqual(eng);
  });

  it("área de cada profissão vem do índice gerado do catálogo", () => {
    expect(occupationArea("engenharia-de-software")).toBe("SOFTWARE");
    expect(occupationArea("engenharia-civil")).toBe("ENGENHARIA");
    expect(occupationArea("design")).toBe("DESIGN");
    expect(occupationArea("medicina")).toBe("PESQUISA");
    expect(occupationArea("administracao")).toBe("ADMINISTRACAO");
    expect(occupationArea("nao-existe")).toBeNull();
    expect(occupationArea(null)).toBeNull();
  });

  it("busca da profissão no idioma da tela, sem caixa nem acento, com os aliases em pt-BR", () => {
    expect(searchOccupations("advogada", "pt-BR").map((f) => f.code)).toEqual(["direito"]);
    expect(searchOccupations("law", "en")[0]!.code).toBe("direito");
    expect(searchOccupations("software", "en")[0]!.code).toBe("engenharia-de-software");
    expect(searchOccupations("ingenieria civil", "es")[0]!.code).toBe("engenharia-civil");
    expect(searchOccupations("advogada", "en").map((f) => f.code)).toContain("direito");
    expect(searchOccupations("e", "en")).toEqual([]);
    expect(searchOccupations("engenharia", "pt-BR").length).toBeLessThanOrEqual(8);
  });
});

describe("plano de desenvolvimento da profissão", () => {
  const sw = readPack("engenharia-de-software");

  it("segue a prioridade do pacote, sem as excluídas, com as próprias do campo no fim, e conta o feito por evidência", () => {
    const withParams = sw.guidedTasks.priority.filter((c) => sw.guidedTasks.parameters[c] && !sw.guidedTasks.excluded.some((e) => e.code === c));
    const [first, second, third] = withParams;
    const plan = developmentPlan(sw, "engenharia-de-software", "SOFTWARE", [
      { id: "a", state: "CONCLUIDA", extensions: { guidedTask: first!, studyField: "engenharia-de-software" } },
      { id: "b", state: "EM_USO", extensions: { guidedTask: second!, studyField: "engenharia-de-software" } },
      { id: "c", state: "CONCLUIDA", extensions: { guidedTask: third!, studyField: "direito" } }, // outra profissão: não conta
      { id: "d", state: "ARQUIVADA", extensions: { guidedTask: third!, studyField: "engenharia-de-software" } }, // arquivada: não conta
    ]);
    expect(plan.items.slice(0, withParams.length).map((i) => i.code)).toEqual(withParams);
    expect(plan.items.slice(withParams.length).map((i) => i.code)).toEqual(sw.guidedTasks.custom.map((c) => c.id));
    expect(plan.items.find((i) => i.code === first)).toMatchObject({ status: "CONCLUIDA", taskId: "a" });
    expect(plan.items.find((i) => i.code === second)).toMatchObject({ status: "EM_ANDAMENTO", taskId: "b" });
    expect(plan.items.find((i) => i.code === third)!.status).toBe("A_FAZER");
    expect(plan).toMatchObject({ done: 1, started: 1, total: plan.items.length });
    expect(plan.withoutModel).toBe(sw.guidedTasks.priority.filter((c) => !sw.guidedTasks.parameters[c] && !sw.guidedTasks.excluded.some((e) => e.code === c)).length);
    expect(nextPlanItem(plan)!.code).toBe(second);
    // cada item abre o criador com o modelo do campo (o mesmo id que `?modelo=` aplica)
    expect(plan.items[0]!.template.id).toBe(`campo.${sw.code}.${first}`);
    // nenhum título de item carrega o código interno
    expect(plan.items.every((i) => !INTERNAL_TASK_CODE.test(i.template.title))).toBe(true);
  });

  it("sem tarefas, tudo a fazer; desenho marcado como Drawings e 3D como exige computador", () => {
    const plan = developmentPlan(readPack("design"), "design", "DESIGN");
    expect(plan.done).toBe(0);
    expect(plan.items.every((i) => i.status === "A_FAZER")).toBe(true);
    expect(plan.items.find((i) => i.code.startsWith("D"))!.editor).toBe("drawings");
    expect(plan.items.find((i) => i.code === "D3")?.computerOnly).toBe(true);
    expect(nextPlanItem(plan)!.status).toBe("A_FAZER");
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DRAFT_TTL_MS, discardTaskDraft, draftHref, loadTaskDraft, saveTaskDraft } from "./drafts";

beforeEach(() => window.sessionStorage.clear());

describe("rascunho de tarefa entregue ao criador", () => {
  it("guarda, lê pelo id e apaga; o endereço leva ao criador", () => {
    const id = saveTaskDraft({ draft: { title: "Quantitativo da planta baixa", type: "DESENHO_TECNICO" }, origin: { kind: "CAD", label: "planta.dxf" } }, 1_000);
    expect(id).toMatch(/^[a-z0-9]{8,32}$/);
    const back = loadTaskDraft(id, 2_000)!;
    expect(back.draft.title).toBe("Quantitativo da planta baixa");
    expect(back.origin).toEqual({ kind: "CAD", label: "planta.dxf" });
    expect(draftHref(id)).toBe(`/tasks/new?rascunho=${id}`);
    discardTaskDraft(id);
    expect(loadTaskDraft(id, 2_000)).toBeNull();
  });

  it("vencido, id fora do formato, origem desconhecida ou conteúdo corrompido não abrem", () => {
    const id = saveTaskDraft({ draft: { title: "x" }, origin: { kind: "ATA", label: "Reunião" } }, 0);
    expect(loadTaskDraft(id, DRAFT_TTL_MS + 1)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
    expect(loadTaskDraft("../../etc", 0)).toBeNull();
    expect(loadTaskDraft(null, 0)).toBeNull();
    window.sessionStorage.setItem("ws.tasks.draft:abcdefgh12", "{nao-json");
    expect(loadTaskDraft("abcdefgh12", 0)).toBeNull();
    window.sessionStorage.setItem("ws.tasks.draft:abcdefgh13", JSON.stringify({ draft: {}, origin: { kind: "HACK", label: "x" }, createdAt: 0 }));
    expect(loadTaskDraft("abcdefgh13", 0)).toBeNull();
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { tokenStore } from "@/lib/api/client";
import { DRAFT_TTL_MS, clearTaskDrafts, discardTaskDraft, draftHref, loadTaskDraft, saveTaskDraft } from "./drafts";

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

  it("fim da sessão apaga os rascunhos da aba: quem entrar depois não abre o conteúdo de quem saiu", () => {
    const a = saveTaskDraft({ draft: { title: "Ata da reunião" }, origin: { kind: "ATA", label: "Reunião" } });
    const b = saveTaskDraft({ draft: { title: "Planta" }, origin: { kind: "CAD", label: "planta.dxf" } });
    window.sessionStorage.setItem("outra.chave", "fica");
    tokenStore.set("x.eyJleHAiOjk5OTk5OTk5OTl9.y");
    tokenStore.clear();
    expect(loadTaskDraft(a)).toBeNull();
    expect(loadTaskDraft(b)).toBeNull();
    expect(window.sessionStorage.getItem("outra.chave")).toBe("fica");
    const c = saveTaskDraft({ draft: { title: "z" }, origin: { kind: "OUTRO", label: "z" } });
    clearTaskDrafts();
    expect(loadTaskDraft(c)).toBeNull();
  });
});

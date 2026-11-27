import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, fromServer, sanitizeOnboarding, sanitizePreferences, toServer } from "@/lib/preferences/types";
import { STEPS, dismiss, isAutoDone, isStepDone, progressOf, toggleStep } from "./steps";

const base = DEFAULT_PREFERENCES;

describe("primeiros passos: regras puras", () => {
  it("quatro passos na ordem: perfil, profissão, primeira tarefa pelo modelo, Melhorias de um card", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["perfil", "profissao", "primeira-tarefa", "melhorias"]);
    expect(STEPS.map((s) => s.href)).toEqual(["/profile", "/settings?tab=trabalho", "/tasks/new", "/tasks"]);
  });

  it("marcar/desmarcar sem repetição e na ordem do catálogo; progresso conta os feitos", () => {
    let onb = toggleStep(base.onboarding, "melhorias", true);
    onb = toggleStep(onb, "perfil", true);
    onb = toggleStep(onb, "perfil", true);
    expect(onb.done).toEqual(["perfil", "melhorias"]);
    expect(progressOf({ ...base, onboarding: onb })).toEqual({ done: 2, total: 4 });
    expect(toggleStep(onb, "perfil", false).done).toEqual(["melhorias"]);
  });

  it("profissão escolhida conta como feita sozinha (sem marcar)", () => {
    const prefs = { ...base, preferredOccupation: "direito" };
    expect(isAutoDone("profissao", prefs)).toBe(true);
    expect(isAutoDone("perfil", prefs)).toBe(false);
    expect(isStepDone("profissao", prefs)).toBe(true);
    expect(progressOf(prefs).done).toBe(1);
  });

  it("dispensar e mostrar de novo", () => {
    expect(dismiss(base.onboarding).dismissed).toBe(true);
    expect(dismiss(dismiss(base.onboarding), false).dismissed).toBe(false);
  });
});

describe("primeiros passos nas preferências (blob notificationPrefsJson, sem coluna nova)", () => {
  it("padrão vazio; valores desconhecidos ou malformados são descartados", () => {
    expect(base.onboarding).toEqual({ done: [], dismissed: false });
    expect(sanitizeOnboarding({ done: ["melhorias", "x", "perfil", "perfil"], dismissed: "sim" })).toEqual({ done: ["perfil", "melhorias"], dismissed: false });
    expect(sanitizeOnboarding("lixo")).toEqual({ done: [], dismissed: false });
    expect(sanitizePreferences({}).onboarding).toEqual({ done: [], dismissed: false });
  });

  it("ida e volta pelo servidor dentro do notificationPrefsJson, sem tocar nos outros campos", () => {
    const body = toServer({ ...base, onboarding: { done: ["perfil"], dismissed: true } });
    expect(Object.keys(body)).not.toContain("onboarding");
    expect(JSON.parse(body.notificationPrefsJson)).toMatchObject({ onboarding: { done: ["perfil"], dismissed: true }, dailyTaskAt: "08:00" });
    expect(fromServer(body).onboarding).toEqual({ done: ["perfil"], dismissed: true });
    // servidor antigo (sem o campo) continua válido
    expect(fromServer({ notificationPrefsJson: JSON.stringify({ dailyTaskAt: "09:00" }) }).onboarding).toEqual({ done: [], dismissed: false });
  });
});

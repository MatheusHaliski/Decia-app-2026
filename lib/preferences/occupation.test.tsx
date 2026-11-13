// @vitest-environment jsdom
/**
 * Profissão preferida nas preferências (RF81, D-147/D-148): validação contra o catálogo, ida e volta pelo `notificationPrefsJson`
 * (sem backend novo), fora do armazenamento compartilhado do navegador e esquecida ao sair da conta.
 */
import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { tokenStore } from "@/lib/api/client";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { usePreferences } from "./PreferencesProvider";
import { OCCUPATION_SESSION_KEY, PREFS_STORAGE_KEY, localAdapter } from "./storage";
import { DEFAULT_PREFERENCES, fromServer, isOccupationCode, sanitizePreferences, toServer } from "./types";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("preferredOccupation: validação e contrato do servidor", () => {
  it("só aceita código de um dos 79 ramos do catálogo; o resto vira null (ainda não sei)", () => {
    expect(DEFAULT_PREFERENCES.preferredOccupation).toBeNull();
    expect(isOccupationCode("engenharia-civil")).toBe(true);
    expect(isOccupationCode("Engenharia Civil")).toBe(false);
    expect(isOccupationCode("ramo-inventado")).toBe(false);
    expect(isOccupationCode(42)).toBe(false);
    expect(sanitizePreferences({ preferredOccupation: "direito" }).preferredOccupation).toBe("direito");
    expect(sanitizePreferences({ preferredOccupation: "<script>" }).preferredOccupation).toBeNull();
    expect(sanitizePreferences({}).preferredOccupation).toBeNull();
  });

  it("ida e volta: viaja dentro do notificationPrefsJson, como a autonomia da IA, sem tocar nos outros campos", () => {
    const body = toServer({ ...DEFAULT_PREFERENCES, preferredOccupation: "design", aiAutonomyDefault: "ASSISTIDO" });
    const json = JSON.parse(body.notificationPrefsJson);
    expect(json).toMatchObject({ preferredOccupation: "design", aiAutonomyDefault: "ASSISTIDO", dailyTaskAt: "08:00" });
    expect(Object.keys(body)).not.toContain("preferredOccupation"); // nenhuma coluna nova no servidor
    expect(fromServer(body)).toMatchObject({ preferredOccupation: "design", aiAutonomyDefault: "ASSISTIDO" });
    // valor adulterado no servidor não entra
    expect(fromServer({ notificationPrefsJson: JSON.stringify({ preferredOccupation: "nao-existe" }) }).preferredOccupation).toBeNull();
    expect(fromServer({ notificationPrefsJson: "{quebrado" }).preferredOccupation).toBeNull();
    expect(toServer(DEFAULT_PREFERENCES).notificationPrefsJson).toContain("\"preferredOccupation\":null");
  });

  it("o adaptador local guarda a profissão só na aba (sessionStorage), nunca no ws.prefs compartilhado do navegador", async () => {
    await localAdapter.save({ ...DEFAULT_PREFERENCES, theme: "escuro", preferredOccupation: "medicina" });
    const shared = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY)!);
    expect(shared.theme).toBe("escuro");
    expect(shared).not.toHaveProperty("preferredOccupation");
    expect(sessionStorage.getItem(OCCUPATION_SESSION_KEY)).toBe("medicina");
    expect((await localAdapter.load())!.preferredOccupation).toBe("medicina");
    // outra aba (sessionStorage vazio) ou alguém que escreva o código no localStorage não recupera a profissão
    sessionStorage.clear();
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ ...shared, preferredOccupation: "direito" }));
    expect((await localAdapter.load())!.preferredOccupation).toBeNull();
    await localAdapter.save({ ...DEFAULT_PREFERENCES, preferredOccupation: null });
    expect(sessionStorage.getItem(OCCUPATION_SESSION_KEY)).toBeNull();
  });
});

function Probe() {
  const { prefs, update } = usePreferences();
  return (
    <div>
      <output data-testid="occupation">{prefs.preferredOccupation ?? "nenhuma"}</output>
      <button type="button" onClick={() => update({ preferredOccupation: "historia" })}>mudar</button>
    </div>
  );
}

describe("PreferencesProvider e a profissão preferida", () => {
  afterEach(() => act(() => tokenStore.clear()));

  it("persiste a troca pelos adaptadores e esquece a profissão ao sair da conta (a próxima pessoa não a herda)", async () => {
    const adapter = memoryAdapter({ ...DEFAULT_PREFERENCES, preferredOccupation: "direito" });
    renderWithProviders(<Probe />, { adapters: [adapter] });
    await waitFor(() => expect(screen.getByTestId("occupation").textContent).toBe("direito"));
    await act(async () => { screen.getByRole("button", { name: "mudar" }).click(); });
    expect(screen.getByTestId("occupation").textContent).toBe("historia");
    expect(adapter.saved.at(-1)!.preferredOccupation).toBe("historia");
    sessionStorage.setItem(OCCUPATION_SESSION_KEY, "historia");
    act(() => tokenStore.set("jwt-de-teste")); // entrar não mexe na profissão
    expect(screen.getByTestId("occupation").textContent).toBe("historia");
    act(() => tokenStore.clear());
    await waitFor(() => expect(screen.getByTestId("occupation").textContent).toBe("nenhuma"));
    expect(sessionStorage.getItem(OCCUPATION_SESSION_KEY)).toBeNull();
  });
});

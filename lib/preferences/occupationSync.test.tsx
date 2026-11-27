// @vitest-environment jsdom
/**
 * Profissão preferida persistente (auditoria 27/11/2026): com sessão, sincronizada com `/api/me/preferences` (a da conta vence; sem
 * ela, a escolhida antes de entrar sobe); sem sessão, só na aba — ou no navegador com consentimento explícito, apagado ao sair. E o
 * "plano fechado" lembrado nas preferências.
 */
import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { tokenStore } from "@/lib/api/client";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { mergeOnSignIn, usePreferences } from "./PreferencesProvider";
import {
  OCCUPATION_CONSENT_KEY, OCCUPATION_DEVICE_KEY, OCCUPATION_SESSION_KEY, PREFS_STORAGE_KEY, bootScript, forgetSessionOccupation, localAdapter,
  occupationDeviceConsent, setOccupationDeviceConsent, type PreferencesAdapter,
} from "./storage";
import { DEFAULT_PREFERENCES, fromServer, toServer, type UserPreferences } from "./types";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("sem sessão: aba por padrão, navegador só com consentimento", () => {
  it("padrão: nada da profissão no localStorage", async () => {
    expect(occupationDeviceConsent()).toBe(false);
    await localAdapter.save({ ...DEFAULT_PREFERENCES, preferredOccupation: "direito" });
    expect(localStorage.getItem(OCCUPATION_DEVICE_KEY)).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toContain("direito");
  });

  it("com consentimento, sobrevive ao fechar a aba (chave própria, fora do ws.prefs e do script do <head>)", async () => {
    expect(setOccupationDeviceConsent(true, "engenharia-civil")).toBe(true);
    expect(localStorage.getItem(OCCUPATION_CONSENT_KEY)).toBe("1");
    expect(localStorage.getItem(OCCUPATION_DEVICE_KEY)).toBe("engenharia-civil");
    await localAdapter.save({ ...DEFAULT_PREFERENCES, preferredOccupation: "direito" });
    expect(localStorage.getItem(OCCUPATION_DEVICE_KEY)).toBe("direito");
    expect(JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY)!)).not.toHaveProperty("preferredOccupation");
    expect(bootScript).not.toContain(OCCUPATION_DEVICE_KEY);
    sessionStorage.clear(); // nova aba
    expect((await localAdapter.load())!.preferredOccupation).toBe("direito");
    // valor fora do catálogo não entra
    localStorage.setItem(OCCUPATION_DEVICE_KEY, "<script>");
    expect((await localAdapter.load())!.preferredOccupation).toBeNull();
  });

  it("retirar o consentimento apaga a cópia; sair da conta apaga a cópia e a aba", async () => {
    setOccupationDeviceConsent(true, "medicina");
    expect(setOccupationDeviceConsent(false, "medicina")).toBe(false);
    expect(localStorage.getItem(OCCUPATION_DEVICE_KEY)).toBeNull();
    setOccupationDeviceConsent(true, "medicina");
    sessionStorage.setItem(OCCUPATION_SESSION_KEY, "medicina");
    forgetSessionOccupation();
    expect(localStorage.getItem(OCCUPATION_DEVICE_KEY)).toBeNull();
    expect(sessionStorage.getItem(OCCUPATION_SESSION_KEY)).toBeNull();
    sessionStorage.clear();
    expect(await localAdapter.load()).toBeNull();
  });
});

describe("com sessão: sincronizada com /api/me/preferences", () => {
  afterEach(() => act(() => tokenStore.clear()));

  it("mergeOnSignIn: a profissão da conta vence; sem ela, a escolhida antes de entrar sobe", () => {
    const local = { ...DEFAULT_PREFERENCES, preferredOccupation: "design", theme: "escuro" as const };
    const server = { ...DEFAULT_PREFERENCES, preferredOccupation: "direito" };
    expect(mergeOnSignIn(local, server)).toBe(server);
    expect(mergeOnSignIn(local, { ...server, preferredOccupation: null })).toMatchObject({ preferredOccupation: "design", theme: "auto" });
    expect(mergeOnSignIn({ ...local, preferredOccupation: null }, server)).toBe(server);
  });

  function Probe() {
    const { prefs } = usePreferences();
    return <output data-testid="occ">{prefs.preferredOccupation ?? "nenhuma"}</output>;
  }

  it("ao entrar, relê o servidor; a escolha do cadastro sobe quando a conta não tem profissão", async () => {
    const saved: UserPreferences[] = [];
    let server: UserPreferences = { ...DEFAULT_PREFERENCES, preferredOccupation: null };
    const api: PreferencesAdapter = { syncOnSignIn: true, async load() { return tokenStore.access ? server : null; }, async save(p) { saved.push(p); server = p; } };
    const local = memoryAdapter({ ...DEFAULT_PREFERENCES, preferredOccupation: "arquitetura-e-urbanismo" });
    renderWithProviders(<Probe />, { adapters: [local, api] });
    await waitFor(() => expect(screen.getByTestId("occ").textContent).toBe("arquitetura-e-urbanismo"));
    act(() => tokenStore.set("jwt"));
    await waitFor(() => expect(saved.at(-1)?.preferredOccupation).toBe("arquitetura-e-urbanismo"));
    expect(screen.getByTestId("occ").textContent).toBe("arquitetura-e-urbanismo");
    // a conta já tem outra profissão: ela vence
    act(() => tokenStore.clear());
    await waitFor(() => expect(screen.getByTestId("occ").textContent).toBe("nenhuma"));
    server = { ...DEFAULT_PREFERENCES, preferredOccupation: "direito" };
    act(() => tokenStore.set("jwt"));
    await waitFor(() => expect(screen.getByTestId("occ").textContent).toBe("direito"));
  });

  it("vai só no corpo do PUT /api/me/preferences (dado do dono) e o plano fechado faz ida e volta", () => {
    const body = toServer({ ...DEFAULT_PREFERENCES, preferredOccupation: "direito", careerPlanCollapsed: true });
    expect(JSON.parse(body.notificationPrefsJson)).toMatchObject({ preferredOccupation: "direito", careerPlanCollapsed: true });
    expect(fromServer(body)).toMatchObject({ preferredOccupation: "direito", careerPlanCollapsed: true });
    expect(DEFAULT_PREFERENCES.careerPlanCollapsed).toBe(false);
    expect(fromServer({}).careerPlanCollapsed).toBe(false);
  });
});

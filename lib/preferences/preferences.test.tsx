// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { useI18n } from "@/lib/i18n/useI18n";
import { getCurrentLocale } from "@/lib/i18n/state";
import { usePreferences } from "./PreferencesProvider";
import { PREFS_STORAGE_KEY, bootScript, htmlAttributes, localAdapter } from "./storage";
import { DEFAULT_PREFERENCES, fromServer, sanitizePreferences, toServer } from "./types";

describe("preferências: tipos e contrato do servidor (RF3.CA03)", () => {
  it("sanitize descarta valores inválidos e mantém os válidos", () => {
    const p = sanitizePreferences({ theme: "neon", language: "es", density: "compacta", fontScale: "112", reduceMotion: true, wipLimit: 99, timezone: "Mars/Base;drop", notificationPrefs: { dailyTaskAt: "7:00", email: false } });
    expect(p.theme).toBe("auto");
    expect(p.language).toBe("es");
    expect(p.density).toBe("compacta");
    expect(p.fontScale).toBe(112);
    expect(p.reduceMotion).toBe(true);
    expect(p.wipLimit).toBe(3);
    expect(p.timezone).toBe("America/Sao_Paulo");
    expect(p.notificationPrefs.dailyTaskAt).toBe("08:00");
    expect(p.notificationPrefs.email).toBe(false);
  });

  it("toServer/fromServer seguem MeController.PreferencesRequest (fontScale decimal, enum maiúsculo, JSON em texto)", () => {
    const body = toServer({ ...DEFAULT_PREFERENCES, theme: "contraste", language: "en", fontScale: 125, deskSkin: "papel-timbrado", backgroundId: "aura-geometry-01" });
    expect(body).toMatchObject({ theme: "ALTO_CONTRASTE", language: "EN", density: "NORMAL", fontScale: 1.25, deskSkin: "PAPEL_TIMBRADO", aiModeDefault: "ECONOMIA", wipLimit: 3 });
    expect(JSON.parse(body.notificationPrefsJson)).toMatchObject({ dailyTaskAt: "08:00", backgroundId: "aura-geometry-01" });
    expect(toServer({ ...DEFAULT_PREFERENCES, theme: "terminal" }).theme).toBe("BLUEPRINT");
    const back = fromServer({ theme: "BLUEPRINT", language: "ES", density: "CONFORTAVEL", fontScale: "1.13", deskSkin: "CORTICA", notificationPrefsJson: body.notificationPrefsJson, wipLimit: 5, aiModeDefault: "AVANCADO" });
    expect(back).toMatchObject({ theme: "terminal", language: "es", density: "confortavel", fontScale: 112, deskSkin: "cortica", backgroundId: "aura-geometry-01", wipLimit: 5, aiModeDefault: "avancado" });
  });

  it("htmlAttributes e o script inline do <head> aplicam os mesmos atributos (sem flash)", () => {
    const prefs = sanitizePreferences({ theme: "escuro", density: "compacta", fontScale: 112, reduceMotion: true, language: "en" });
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    const html = document.documentElement;
    for (const a of ["data-theme", "data-density", "data-font-scale", "data-reduce-motion", "lang"]) html.removeAttribute(a);
    new Function(bootScript)();
    const expected = htmlAttributes(prefs);
    for (const [k, v] of Object.entries(expected)) expect(html.getAttribute(k), k).toBe(v);
    expect(htmlAttributes(DEFAULT_PREFERENCES)["data-theme"]).toBeNull();
    localStorage.removeItem(PREFS_STORAGE_KEY);
  });

  it("adaptador local sobrevive a storage quebrado", async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("quota"); };
    await expect(localAdapter.save(DEFAULT_PREFERENCES)).resolves.toBeUndefined();
    Storage.prototype.setItem = original;
  });
});

function Probe() {
  const { prefs, update, resolvedTheme } = usePreferences();
  const { t, locale } = useI18n();
  return (
    <div>
      <output data-testid="theme">{prefs.theme}/{resolvedTheme}</output>
      <output data-testid="locale">{locale}:{t("nav.search")}</output>
      <button type="button" onClick={() => update({ theme: "terminal", language: "en", density: "confortavel", fontScale: 125, reduceMotion: true })}>mudar</button>
    </div>
  );
}

describe("PreferencesProvider", () => {
  it("carrega do adaptador, aplica no <html>, muda idioma do tr()/t() na hora e persiste", async () => {
    const adapter = memoryAdapter({ theme: "escuro", language: "es" });
    renderWithProviders(<Probe />, { adapters: [adapter] });
    await waitFor(() => expect(screen.getByTestId("theme").textContent).toBe("escuro/escuro"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("escuro");
    expect(document.documentElement.getAttribute("lang")).toBe("es");
    expect(screen.getByTestId("locale").textContent).toBe("es:Buscar");
    expect(getCurrentLocale()).toBe("es");
    await act(async () => { screen.getByRole("button", { name: "mudar" }).click(); });
    expect(document.documentElement.getAttribute("data-theme")).toBe("terminal");
    expect(document.documentElement.getAttribute("data-density")).toBe("confortavel");
    expect(document.documentElement.getAttribute("data-font-scale")).toBe("125");
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true");
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(screen.getByTestId("locale").textContent).toBe("en:Search");
    expect(adapter.saved.at(-1)).toMatchObject({ theme: "terminal", language: "en" });
  });
});

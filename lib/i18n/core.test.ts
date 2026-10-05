import { afterEach, describe, expect, it } from "vitest";
import { MESSAGES, interpolate, missingKeys, resolveMessage, tr, translate, untranslatedKeys } from "./core";
import { pseudo } from "./pseudo";
import { LOCALES, baseLocale, detectLocale, fromServerLanguage, isLocale, setCurrentLocale, toServerLanguage } from "./state";

afterEach(() => setCurrentLocale("pt-BR"));

describe("i18n core", () => {
  it("os três catálogos têm exatamente as mesmas chaves (paridade, também conferida por scripts/i18n/check.js)", () => {
    const pt = Object.keys(MESSAGES["pt-BR"]).sort();
    expect(Object.keys(MESSAGES.en).sort()).toEqual(pt);
    expect(Object.keys(MESSAGES.es).sort()).toEqual(pt);
    expect(pt.length).toBeGreaterThan(0);
  });

  it("traduz por idioma com fallback para pt-BR e para a própria chave", () => {
    expect(translate("en", "home.cta.docs")).toBe("Documentation");
    expect(translate("es", "home.cta.docs")).toBe("Documentación");
    expect(resolveMessage("en", "chave.inexistente")).toBe("chave.inexistente");
    expect(missingKeys.has("chave.inexistente")).toBe(true);
    expect(untranslatedKeys.size).toBe(0);
  });

  it("interpola {variáveis} com formatação do idioma e preserva variável ausente", () => {
    expect(interpolate("Código {correlationId}", { correlationId: "abc-123" })).toBe("Código abc-123");
    expect(interpolate("Total {n}", { n: 1234.5 }, "pt-BR")).toBe("Total 1.234,5");
    expect(interpolate("Total {n}", { n: 1234.5 }, "en-US")).toBe("Total 1,234.5");
    expect(interpolate("Falta {x}", {})).toBe("Falta {x}");
    expect(interpolate("L''aqua", {})).toBe("L'aqua");
    expect(translate("en", "error.generic", { correlationId: "c-1" })).toContain("c-1");
  });

  it("pseudo-locale marca todo texto do catálogo e tr() segue o idioma corrente", () => {
    setCurrentLocale("qps-ploc");
    const out = tr("home.cta.docs");
    expect(out.startsWith("[")).toBe(true);
    expect(out.endsWith("]")).toBe(true);
    expect(out).not.toBe("Documentação");
    expect(pseudo("ok")).toMatch(/^\[.*\]$/);
    expect(pseudo("1")).toBe("1");
    setCurrentLocale("en");
    expect(tr("common.retry")).toBe("Try again");
  });

  it("estado do idioma: detecção, enum do servidor e locales", () => {
    expect(detectLocale("es-AR")).toBe("es");
    expect(detectLocale("en-GB")).toBe("en");
    expect(detectLocale("fr")).toBe("pt-BR");
    expect(detectLocale(null)).toBe("pt-BR");
    expect(toServerLanguage("qps-ploc")).toBe("PT_BR");
    expect(fromServerLanguage("ES")).toBe("es");
    expect(fromServerLanguage("xx")).toBeNull();
    expect(baseLocale("qps-ploc")).toBe("pt-BR");
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(LOCALES.filter((l) => !l.qa).map((l) => l.code)).toEqual(["pt-BR", "en", "es"]);
  });
});

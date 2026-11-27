import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import en from "./messages/en.json";
import es from "./messages/es.json";
import { MESSAGES, hasMessage, tr, translate, untranslatedKeys } from "./core";
import {
  __resetCatalogsForTests,
  catalogsVersion,
  displayLocale,
  isCatalogLoaded,
  loadCatalog,
  prefetchSavedLocale,
  registerCatalog,
  requestLocale,
  subscribeCatalogs,
  type Catalog,
} from "./loader";
import { setCurrentLocale } from "./state";

/** Importador controlado: a promessa só resolve quando o teste mandar (simula a rede). */
function deferredImporter(catalog: Catalog) {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const fn = vi.fn(() => new Promise<{ default: unknown }>((res, rej) => {
    resolve = () => res({ default: catalog });
    reject = rej;
  }));
  return { fn, resolve: () => resolve(), reject: (e: unknown) => reject(e) };
}

afterEach(() => {
  setCurrentLocale("pt-BR");
  untranslatedKeys.clear();
});
// o setup do Vitest registra en/es (caminho síncrono); devolve o estado para os demais testes do arquivo/worker
afterAll(() => {
  __resetCatalogsForTests();
  registerCatalog("en", en as Catalog);
  registerCatalog("es", es as Catalog);
});

describe("catálogos sob demanda (lib/i18n/loader)", () => {
  it("só o pt-BR vem no bundle; en é baixado por import() quando pedido, uma vez só", async () => {
    __resetCatalogsForTests();
    expect(isCatalogLoaded("pt-BR")).toBe(true);
    expect(isCatalogLoaded("qps-ploc")).toBe(true);
    expect(isCatalogLoaded("en")).toBe(false);
    expect(MESSAGES.en).toBeUndefined();

    const p1 = loadCatalog("en");
    const p2 = loadCatalog("en");
    expect(p2).toBe(p1); // pedido em voo é compartilhado
    const cat = await p1;
    expect(cat["home.cta.docs"]).toBe("Documentation");
    expect(isCatalogLoaded("en")).toBe(true);
    expect(translate("en", "home.cta.docs")).toBe("Documentation");
    expect(isCatalogLoaded("es")).toBe(false); // es não veio junto
  });

  it("enquanto o catálogo não chega: texto em pt-BR (fallback) sem marcar a chave como 'sem tradução'", () => {
    __resetCatalogsForTests({ en: deferredImporter({}).fn });
    expect(translate("en", "home.cta.docs")).toBe(translate("pt-BR", "home.cta.docs"));
    expect(untranslatedKeys.size).toBe(0);
    expect(hasMessage("en", "home.cta.docs")).toBe(true); // vale o pt-BR enquanto isso
    expect(hasMessage("en", "chave.que.nao.existe")).toBe(false);
  });

  it("chave ausente num catálogo carregado continua caindo no pt-BR e é reportada", async () => {
    __resetCatalogsForTests({ en: () => Promise.resolve({ default: { "home.cta.docs": "Docs!" } }) });
    await loadCatalog("en");
    expect(translate("en", "home.cta.docs")).toBe("Docs!");
    expect(translate("en", "common.retry")).toBe(translate("pt-BR", "common.retry"));
    expect(untranslatedKeys.has("common.retry")).toBe(true);
  });

  it("troca de idioma: segue no idioma anterior até o novo chegar, depois troca e avisa os assinantes", async () => {
    const enNet = deferredImporter(en as Catalog);
    const esNet = deferredImporter(es as Catalog);
    __resetCatalogsForTests({ en: enNet.fn, es: esNet.fn });
    const listener = vi.fn();
    const off = subscribeCatalogs(listener);

    const toEn = requestLocale("en");
    expect(displayLocale("en")).toBe("pt-BR"); // sem tela em branco: o pt-BR continua
    setCurrentLocale("en");
    expect(tr("home.cta.docs")).toBe(translate("pt-BR", "home.cta.docs"));
    const v = catalogsVersion();
    enNet.resolve();
    await toEn;
    expect(displayLocale("en")).toBe("en");
    expect(tr("home.cta.docs")).toBe("Documentation");
    expect(catalogsVersion()).toBeGreaterThan(v);
    expect(listener).toHaveBeenCalled();

    // en → es: enquanto o es baixa, a tela fica em inglês (último pronto), não volta ao pt-BR
    const toEs = requestLocale("es");
    expect(displayLocale("es")).toBe("en");
    esNet.resolve();
    await toEs;
    expect(displayLocale("es")).toBe("es");
    expect(translate(displayLocale("es"), "home.cta.docs")).toBe("Documentación");

    // volta a um idioma já carregado: imediato, sem novo download
    await requestLocale("en");
    expect(displayLocale("en")).toBe("en");
    expect(enNet.fn).toHaveBeenCalledTimes(1);
    off();
  });

  it("pedido ultrapassado não sequestra a tela: en → es rápido termina em es", async () => {
    const enNet = deferredImporter(en as Catalog);
    const esNet = deferredImporter(es as Catalog);
    __resetCatalogsForTests({ en: enNet.fn, es: esNet.fn });
    const toEn = requestLocale("en");
    const toEs = requestLocale("es");
    esNet.resolve();
    await toEs;
    enNet.resolve();
    await toEn;
    expect(displayLocale("es")).toBe("es");
    expect(displayLocale("en")).toBe("en"); // en também está pronto agora
  });

  it("falha de rede: fica no idioma anterior e um novo pedido tenta de novo", async () => {
    const first = deferredImporter(en as Catalog);
    __resetCatalogsForTests({ en: first.fn });
    const p = requestLocale("en");
    first.reject(new Error("offline"));
    await p; // requestLocale nunca rejeita
    expect(isCatalogLoaded("en")).toBe(false);
    expect(displayLocale("en")).toBe("pt-BR");
    // a promessa rejeitada não ficou em cache: o próximo pedido vai à rede de novo e, desta vez, chega
    const retry = loadCatalog("en");
    expect(first.fn).toHaveBeenCalledTimes(2);
    first.resolve();
    await retry;
    expect(isCatalogLoaded("en")).toBe(true);
  });

  it("pseudo-idioma usa o pt-BR (sempre carregado) e não baixa nada", async () => {
    const enNet = deferredImporter(en as Catalog);
    __resetCatalogsForTests({ en: enNet.fn });
    await requestLocale("qps-ploc");
    expect(displayLocale("qps-ploc")).toBe("qps-ploc");
    expect(translate("qps-ploc", "common.retry")).not.toBe(translate("pt-BR", "common.retry"));
    expect(enNet.fn).not.toHaveBeenCalled();
  });

  it("caminho síncrono (testes/SSR): registerCatalog deixa o idioma pronto na hora", () => {
    __resetCatalogsForTests();
    registerCatalog("es", es as Catalog);
    expect(isCatalogLoaded("es")).toBe(true);
    expect(translate("es", "home.cta.docs")).toBe("Documentación");
  });

  it("prefetch do idioma salvo (ws.prefs) começa o download antes do provider pedir", async () => {
    const enNet = deferredImporter(en as Catalog);
    __resetCatalogsForTests({ en: enNet.fn });
    prefetchSavedLocale({ getItem: () => JSON.stringify({ language: "en" }) });
    expect(enNet.fn).toHaveBeenCalledTimes(1);
    prefetchSavedLocale({ getItem: () => JSON.stringify({ language: "pt-BR" }) });
    prefetchSavedLocale({ getItem: () => "{inválido" });
    prefetchSavedLocale(undefined);
    expect(enNet.fn).toHaveBeenCalledTimes(1);
  });
});

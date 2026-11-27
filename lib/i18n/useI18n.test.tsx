// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterAll, describe, expect, it } from "vitest";
import en from "./messages/en.json";
import es from "./messages/es.json";
import { __resetCatalogsForTests, isCatalogLoaded, registerCatalog, type Catalog } from "./loader";
import { useI18n } from "./useI18n";
import { Button } from "@/components/ui";
import { Providers } from "@/test-utils/render";

/** Troca de idioma com catálogo sob demanda: a tela nunca fica em branco e mostra o idioma novo quando ele chega. */
function Probe() {
  const { t, locale, requestedLocale, loading, setLocale } = useI18n();
  return (
    <div>
      <p data-testid="text">{t("home.cta.docs")}</p>
      <p data-testid="state">{`${locale}|${requestedLocale}|${loading ? "loading" : "ready"}`}</p>
      <Button data-testid="to-en" onClick={() => setLocale("en")}>en</Button>
      <Button data-testid="to-es" onClick={() => setLocale("es")}>es</Button>
    </div>
  );
}

function deferred(catalog: Catalog) {
  const resolvers: Array<() => void> = [];
  const fn = () => new Promise<{ default: unknown }>((res) => resolvers.push(() => res({ default: catalog })));
  return { fn, release: () => resolvers.splice(0).forEach((r) => r()) };
}

afterAll(() => {
  __resetCatalogsForTests();
  registerCatalog("en", en as Catalog);
  registerCatalog("es", es as Catalog);
});

describe("useI18n com catálogos sob demanda", () => {
  it("pt-BR → en: segue em pt-BR enquanto baixa (sem tela em branco) e troca quando o catálogo chega", async () => {
    const enNet = deferred(en as Catalog);
    __resetCatalogsForTests({ en: enNet.fn });
    render(<Providers><Probe /></Providers>);
    const ptText = screen.getByTestId("text").textContent;
    expect(ptText).toBeTruthy();
    expect(ptText).not.toBe("home.cta.docs");

    act(() => screen.getByTestId("to-en").click());
    expect(screen.getByTestId("state").textContent).toBe("pt-BR|en|loading");
    expect(screen.getByTestId("text").textContent).toBe(ptText);

    await act(async () => {
      enNet.release();
      await Promise.resolve();
    });
    expect(await screen.findByText("Documentation")).toBeTruthy();
    expect(screen.getByTestId("state").textContent).toBe("en|en|ready");
  });

  it("en → es: o inglês continua na tela até o espanhol chegar", async () => {
    const esNet = deferred(es as Catalog);
    __resetCatalogsForTests({ es: esNet.fn });
    registerCatalog("en", en as Catalog);
    render(<Providers prefs={{ language: "en" }}><Probe /></Providers>);
    expect(screen.getByTestId("text").textContent).toBe("Documentation");

    act(() => screen.getByTestId("to-es").click());
    expect(screen.getByTestId("text").textContent).toBe("Documentation");
    expect(isCatalogLoaded("es")).toBe(false);
    await act(async () => {
      esNet.release();
      await Promise.resolve();
    });
    expect(await screen.findByText("Documentación")).toBeTruthy();
  });

  it("idioma salvo já carregado (caminho síncrono dos testes/SSR): primeiro render já no idioma, sem estado de carga", () => {
    __resetCatalogsForTests();
    registerCatalog("es", es as Catalog);
    render(<Providers prefs={{ language: "es" }}><Probe /></Providers>);
    expect(screen.getByTestId("text").textContent).toBe("Documentación");
    expect(screen.getByTestId("state").textContent).toBe("es|es|ready");
  });
});

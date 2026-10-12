/**
 * Preparação comum dos testes (vitest). APIs de navegador que o jsdom não tem e os componentes usam; só valem nos
 * testes com `// @vitest-environment jsdom` — no ambiente node não há window.
 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL só limpa sozinho com globals do vitest; aqui a limpeza é explícita para os testes jsdom não acumularem renders.
afterEach(() => { if (typeof window !== "undefined") cleanup(); });

if (typeof window !== "undefined") {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function scrollIntoView() {};
  if (!("ResizeObserver" in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {},
        removeEventListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  }
}

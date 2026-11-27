import { describe, expect, it, vi } from "vitest";
import { findRf, loadRfCatalog, rfCatalogSnapshot, subscribeRfCatalog } from "./load";

describe("catálogo de RFs sob demanda (lib/rf/load)", () => {
  it("começa vazio, baixa uma vez por import(), avisa os assinantes e acha RF por id", async () => {
    expect(rfCatalogSnapshot()).toBeNull();
    const listener = vi.fn();
    const off = subscribeRfCatalog(listener);
    const p1 = loadRfCatalog();
    expect(loadRfCatalog()).toBe(p1);
    const catalog = await p1;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(rfCatalogSnapshot()).toBe(catalog);
    expect(await loadRfCatalog()).toBe(catalog);
    expect(findRf(catalog, "RF27")?.id).toBe("RF27");
    expect(findRf(catalog, "RF999")).toBeUndefined();
    expect(findRf(null, "RF27")).toBeUndefined();
    off();
  });
});

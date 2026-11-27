import { describe, expect, it } from "vitest";
import { boundaryReference } from "./boundary";

describe("boundaryReference", () => {
  it("prefere o correlationId da API, depois o digest do servidor; nada para valores sem código", () => {
    expect(boundaryReference(Object.assign(new Error("x"), { correlationId: "c-1", digest: "d-1" }))).toBe("c-1");
    expect(boundaryReference(Object.assign(new Error("x"), { digest: "d-1" }))).toBe("d-1");
    expect(boundaryReference(new Error("x"))).toBeUndefined();
    expect(boundaryReference("falhou")).toBeUndefined();
    expect(boundaryReference(null)).toBeUndefined();
  });
});

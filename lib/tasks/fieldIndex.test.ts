import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { FIELD_INDEX, PACK_LOADERS } from "./fieldIndex.gen";
import { WORK_AREAS } from "./client";

describe("índice de campos de estudo (gerado dos contratos de carreira)", () => {
  it("está em dia com contracts/career (gerador em modo --check)", () => {
    expect(() => execFileSync(process.execPath, ["scripts/career/gerar-indice-campos.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
  it("todo ramo tem área de trabalho válida e um pacote carregável", async () => {
    expect(FIELD_INDEX.length).toBe(79);
    for (const f of FIELD_INDEX) {
      expect(WORK_AREAS).toContain(f.area);
      expect(PACK_LOADERS[f.pack]).toBeTypeOf("function");
    }
    const law = FIELD_INDEX.find((f) => f.code === "direito")!;
    expect(law.area).toBe("JURIDICO");
    const pack = await PACK_LOADERS[law.pack]!();
    expect(pack.fields).toContain("direito");
  });
});

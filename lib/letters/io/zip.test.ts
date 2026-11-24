import { describe, expect, it } from "vitest";
import { crc32, openZip, writeZip, ZipError, ZIP_LIMITS } from "./zip";

const enc = new TextEncoder();
const code = async (p: Promise<unknown> | (() => unknown)) => {
  try {
    await (typeof p === "function" ? p() : p);
    return null;
  } catch (e) {
    return e instanceof ZipError ? e.code : String(e);
  }
};

describe("ZIP mínimo (leitura e escrita no navegador)", () => {
  it("CRC-32 confere com o valor de referência", () => {
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
  });

  it("escreve e lê de volta (deflate e armazenado), com nomes UTF-8", async () => {
    const text = "Ação — ".repeat(500);
    for (const compress of [true, false]) {
      const zip = openZip(await writeZip([{ name: "pasta/ação.txt", data: text }, { name: "b.bin", data: new Uint8Array([0, 1, 2]) }], new Date("2026-11-13T12:00:00"), { compress }));
      expect(await zip.readText("pasta/ação.txt")).toBe(text);
      expect([...(await zip.read("b.bin"))!]).toEqual([0, 1, 2]);
      expect(zip.entries.get("pasta/ação.txt")!.method).toBe(compress ? 8 : 0);
      expect(await zip.read("nao-existe")).toBeUndefined();
    }
  });

  it("CRC divergente (conteúdo adulterado) é recusado", async () => {
    const bytes = await writeZip([{ name: "a.txt", data: "conteúdo original" }], new Date(), { compress: false });
    const i = bytes.indexOf(enc.encode("original")[0]!, 40);
    bytes[i] = bytes[i]! ^ 1;
    expect(await code(openZip(bytes).read("a.txt"))).toBe("ZIP_CORROMPIDO");
  });

  it("entrada criptografada é recusada", async () => {
    const bytes = await writeZip([{ name: "a.txt", data: "x" }], new Date(), { compress: false });
    const cd = bytes.length - 22 - (46 + 5);
    bytes[cd + 8] = bytes[cd + 8]! | 1;
    expect(await code(() => openZip(bytes))).toBe("ZIP_CRIPTOGRAFADO");
  });

  it("bomba de descompressão (razão acima do teto) é recusada antes de descomprimir", async () => {
    const zeros = new Uint8Array(2 * 1024 * 1024);
    const zip = openZip(await writeZip([{ name: "bomba.xml", data: zeros }]));
    const e = zip.entries.get("bomba.xml")!;
    expect(e.uncompressedSize / e.compressedSize).toBeGreaterThan(ZIP_LIMITS.maxRatio);
    expect(await code(zip.read("bomba.xml"))).toBe("ZIP_GRANDE_DEMAIS");
  });

  it("tamanho declarado menor que o real é pego ao descomprimir (teto pelo declarado)", async () => {
    const bytes = await writeZip([{ name: "a.txt", data: "abc".repeat(1000) }]);
    const view = new DataView(bytes.buffer);
    const cd = bytes.length - 22 - (46 + 5);
    view.setUint32(cd + 24, 10, true);
    expect(await code(openZip(bytes).read("a.txt"))).toBe("ZIP_GRANDE_DEMAIS");
  });

  it("lixo, truncado e sem diretório central são ZIP_INVALIDO", async () => {
    expect(await code(() => openZip(enc.encode("PK\u0003\u0004 mas não é zip de verdade, só texto")))).toBe("ZIP_INVALIDO");
    const ok = await writeZip([{ name: "a.txt", data: "x" }]);
    expect(await code(() => openZip(ok.subarray(0, ok.length - 10)))).toBe("ZIP_INVALIDO");
    expect(await code(() => openZip(enc.encode("abc")))).toBe("ZIP_INVALIDO");
  });
});

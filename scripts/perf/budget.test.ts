import { describe, expect, it } from "vitest";
import { limitFor, measure, parseArgs, toBytes } from "./budget.mjs";

describe("orçamento de bundle (scripts/perf/budget.mjs)", () => {
  it("lê tetos em KB/MB/bytes e escolhe o da rota (exato, prefixo com *, padrão)", () => {
    expect(toBytes("2 KB")).toBe(2048);
    expect(toBytes("1mb")).toBe(1048576);
    expect(toBytes(10)).toBe(10);
    expect(() => toBytes("muito")).toThrow();
    const config = { default: "100 KB", routes: { "/drawings/3d": "300 KB", "/admin*": "120 KB" } };
    expect(limitFor("/drawings/3d", config)).toBe(300 * 1024);
    expect(limitFor("/admin/users", config)).toBe(120 * 1024);
    expect(limitFor("/today", config)).toBe(100 * 1024);
  });

  it("soma o gzip dos chunks de cada rota, aponta o compartilhado e as violações", () => {
    const rows = [
      { route: "/a", firstLoadUncompressedJsBytes: 999, firstLoadChunkPaths: ["s.js", "a.js", "a.css"] },
      { route: "/b", firstLoadUncompressedJsBytes: 999, firstLoadChunkPaths: ["s.js", "b.js", "b2.js"] },
      { route: "/_not-found", firstLoadUncompressedJsBytes: 1, firstLoadChunkPaths: ["s.js"] },
    ];
    const sizes: Record<string, number> = { "s.js": 50 * 1024, "a.js": 10 * 1024, "b.js": 40 * 1024, "b2.js": 20 * 1024 };
    const r = measure(rows, { default: "100 KB", ignore: ["^/_not-found$"] }, (f: string) => sizes[f] ?? 0);
    expect(r.routes.map((x: { route: string }) => x.route)).toEqual(["/b", "/a"]);
    expect(r.routes[0].gzip).toBe(110 * 1024);
    expect(r.shared).toEqual({ chunks: 1, gzip: 50 * 1024 });
    expect(r.violations.map((v: { route: string }) => v.route)).toEqual(["/b"]);
  });

  it("argumentos", () => {
    expect(parseArgs(["--dir", "out", "--json", "--top", "5"])).toMatchObject({ dir: "out", json: true, top: 5 });
  });
});

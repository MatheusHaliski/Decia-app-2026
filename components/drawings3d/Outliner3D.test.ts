import { describe, expect, it } from "vitest";
import { createObject, type Scene3D } from "@/lib/drawings3d/model";
import { outlineRows } from "./Outliner3D";

describe("lista de objetos 3D", () => {
  it("mostra pais antes dos filhos com recuo; pai ausente e ciclo caem na raiz sem sumir", () => {
    const scene: Scene3D = {
      objects: [
        { ...createObject("cone", "Filho", {}, "f"), parentId: "p" },
        createObject("caixa", "Pai", {}, "p"),
        { ...createObject("toro", "Órfão", {}, "o"), parentId: "sumiu" },
        { ...createObject("esfera", "X", {}, "x"), parentId: "y" },
        { ...createObject("esfera", "Y", {}, "y"), parentId: "x" },
      ],
    };
    const rows = outlineRows(scene).map((r) => `${r.object.id}:${r.depth}`);
    expect(rows.slice(0, 3)).toEqual(["p:0", "f:1", "o:0"]);
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.split(":")[0])).size).toBe(5);
  });
});

import { describe, expect, it } from "vitest";
import { pageForPath } from "./currentPage";
import { helpOf } from "./help";

describe("pageForPath: caminho real → entrada do registro", () => {
  it("estática vence dinâmica, parâmetros casam por segmento e query/barra final são ignoradas", () => {
    expect(pageForPath("/tasks/new")!.route).toBe("/tasks/new");
    expect(pageForPath("/tasks/abc-123")!.route).toBe("/tasks/[id]");
    expect(pageForPath("/projects/exemplo/mirror")!.route).toBe("/projects/[id]/mirror");
    expect(pageForPath("/companies/cpoe/manage/departments")!.status).toBe("skeleton");
    expect(pageForPath("/profile?tab=reconhecimentos")!.route).toBe("/profile");
    expect(pageForPath("/mural/")!.route).toBe("/mural");
  });

  it("caminho abaixo de uma rota registrada herda dela; fora do registro, nada", () => {
    expect(pageForPath("/settings/qualquer")!.route).toBe("/settings");
    expect(pageForPath("/nao-existe")).toBeUndefined();
    expect(pageForPath(null)).toBeUndefined();
    expect(pageForPath("relativo")).toBeUndefined();
  });

  it("ajuda só para rotas com texto", () => {
    expect(helpOf("/tasks")!.id).toBe("tasks");
    expect(helpOf("/tasks/[id]")).toBeUndefined();
    expect(helpOf(undefined)).toBeUndefined();
  });
});

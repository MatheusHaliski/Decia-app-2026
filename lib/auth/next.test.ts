import { describe, expect, it } from "vitest";
import { requiresSession } from "./guard";
import { DEFAULT_AFTER_LOGIN, loginUrl, safeNext } from "./next";

/** Bloco 4 (D-60) — teste-guarda: `next` externo é ignorado em todas as formas que um navegador resolveria para outra origem. */
describe("safeNext (sem open redirect)", () => {
  it("aceita caminho relativo da própria origem, com query e âncora", () => {
    expect(safeNext("/tasks")).toBe("/tasks");
    expect(safeNext("/settings?tab=sessoes")).toBe("/settings?tab=sessoes");
    expect(safeNext("/decia/decisoes/d-1?secao=comparar#topo")).toBe("/decia/decisoes/d-1?secao=comparar#topo");
    expect(safeNext("/u/ana.exemplo")).toBe("/u/ana.exemplo");
  });

  it.each([
    "//evil.example", "//evil.example/tasks", "/\\evil.example", "\\\\evil.example", "/\\/evil.example",
    "https://evil.example", "http://localhost:3000.evil.example/x", "javascript:alert(1)", "data:text/html,x", "evil.example",
    "%2F%2Fevil.example", "/%2F/evil.example", "/%5Cevil.example", "%5C%5Cevil.example", "%252F%252Fevil.example",
    "/%09/evil.example", "/\t/evil.example", "/\n/evil.example", "https:%2F%2Fevil.example", "%E0%A4%A", "",
  ])("recusa %j e cai no padrão", (raw) => {
    expect(safeNext(raw)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("não devolve rota de entrada (laço) nem valor gigante; nulo vira o padrão", () => {
    expect(safeNext("/login?next=/tasks")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("/register")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(`/${"a".repeat(3000)}`)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(undefined, "/x")).toBe("/x");
  });

  it("loginUrl leva o next saneado e o motivo", () => {
    expect(loginUrl("/tasks?x=1")).toBe("/login?next=%2Ftasks%3Fx%3D1");
    expect(loginUrl("//evil.example")).toBe("/login");
    expect(loginUrl("/settings", "signed-out")).toBe("/login?next=%2Fsettings&reason=signed-out");
  });
});

describe("requiresSession (matriz de lib/pages/registry.ts)", () => {
  it("segue a célula VISITANTE da matriz; estática vence dinâmica; ancestral herda", () => {
    expect(requiresSession("/tasks")).toBe(true);
    expect(requiresSession("/tasks/new")).toBe(true);
    expect(requiresSession("/tasks/t-1")).toBe(false);          // D-93: visitante lê tarefa PUBLICA
    expect(requiresSession("/tasks/t-1/edit")).toBe(true);
    expect(requiresSession("/settings/")).toBe(true);
    expect(requiresSession("/admin/qualquer/coisa")).toBe(true);
    expect(requiresSession("/mural")).toBe(false);
    expect(requiresSession("/nao-existe")).toBe(false);          // 404 do app
    expect(requiresSession("/bff/auth/refresh")).toBe(false);
  });
});

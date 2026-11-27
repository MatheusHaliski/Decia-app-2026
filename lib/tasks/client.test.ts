import { describe, expect, it } from "vitest";
import { requestFromView, type TaskView } from "./client";

describe("requestFromView (corpo de PUT a partir da versão atual)", () => {
  it("mantém o formato salvo quando outra coisa muda (marcar critério, aplicar sugestão)", () => {
    const view = {
      id: "11111111-1111-4111-8111-111111111111", version: 3, title: "Base de imóveis", extensions: { subcategory: "x" },
      formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: '{"encoding":"UTF8"}',
      acceptanceCriteria: [{ text: "Cabeçalho na linha 1", done: false }],
    } as TaskView;
    const body = requestFromView(view, { acceptanceCriteria: [{ text: "Cabeçalho na linha 1", done: true }] });
    expect(body).toMatchObject({ formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: '{"encoding":"UTF8"}', version: 3 });
    expect(body.acceptanceCriteria).toEqual([{ text: "Cabeçalho na linha 1", done: true }]);
    expect(body.extensions).toEqual({ subcategory: "x" });
  });
});

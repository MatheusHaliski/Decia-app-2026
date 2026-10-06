// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { DossierLink, dossierFrom, dossierHref } from "./DossierLink";

let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/find",
  useSearchParams: () => new URLSearchParams(query),
  useParams: () => ({}),
}));

/** RF47.CA14 / RF48.CA19 (Codex, PR #42): a navegação entre Encontrar e Agentes leva o dossiê junto. */
describe("DossierLink — navegação RF47 ↔ RF48 com o dossiê", () => {
  beforeEach(() => { query = ""; });

  it("só aceita identificador simples; caminho, consulta ou vazio viram null", () => {
    expect(dossierFrom(new URLSearchParams("dossie=contrato-041_2026"))).toBe("contrato-041_2026");
    for (const bad of ["dossie=", "dossie=../x", "dossie=a%2Fb", "dossie=a?b=1", "dossie=" + "x".repeat(65), ""]) {
      expect(dossierFrom(new URLSearchParams(bad))).toBeNull();
    }
    expect(dossierHref("/agents", "c-41")).toBe("/agents?dossie=c-41");
    expect(dossierHref("/find", null)).toBe("/find");
  });

  it("com dossiê, \"Testar esta contratação\" abre /agents com o mesmo dossiê", async () => {
    query = "dossie=c-041";
    renderWithProviders(<DossierLink to="/agents" labelKey="find.testContract" testId="go" requiresDossierHintKey="find.testContractNeedsDossier" />);
    const link = await screen.findByTestId("go");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/agents?dossie=c-041");
  });

  it("sem dossiê, \"Testar esta contratação\" fica desativado com a explicação (não há contratação a testar)", async () => {
    renderWithProviders(<DossierLink to="/agents" labelKey="find.testContract" testId="go" requiresDossierHintKey="find.testContractNeedsDossier" />);
    const el = await screen.findByTestId("go");
    expect(el.tagName).not.toBe("A");
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(el.textContent).toMatch(/Licitação\/Contrato/);
  });

  it("\"Abrir no Encontrar\" leva o dossiê quando há e abre /find sem escopo quando não há", async () => {
    query = "dossie=c-041";
    const { unmount } = renderWithProviders(<DossierLink to="/find" labelKey="agents.openInFind" testId="back" />);
    expect((await screen.findByTestId("back")).getAttribute("href")).toBe("/find?dossie=c-041");
    unmount();
    query = "";
    renderWithProviders(<DossierLink to="/find" labelKey="agents.openInFind" testId="back" />);
    expect((await screen.findByTestId("back")).getAttribute("href")).toBe("/find");
  });
});

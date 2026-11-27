// @vitest-environment jsdom
/** Balcão de Modelos pré-filtrado pela área da profissão preferida (só a própria pessoa vê o ajuste), com "Ver todas as áreas". */
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoModelsRepository } from "@/lib/models/useModels";
import { pageByRoute } from "@/lib/pages/registry";
import { seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger } from "@/lib/points/ledger";
import { setPointsLedger } from "@/lib/points/usePoints";
import { renderWithProviders } from "@/test-utils/render";
import { ModelsPage } from "./ModelsPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/models",
  useSearchParams: () => new URLSearchParams("tab=comunidade"),
  useParams: () => ({}),
}));

const PAGE = pageByRoute("/models")!;
const cards = () => within(screen.getByTestId("models-grid")).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"));

beforeEach(() => {
  const ledger = createMemoryLedger();
  seedLabPersonas(ledger, new Date());
  setPointsLedger(ledger);
  setDemoModelsRepository(null);
});
afterEach(() => { setPointsLedger(null); setDemoModelsRepository(null); });

describe("Balcão filtrado pela profissão", () => {
  it("com profissão de Direito, só modelos Jurídicos; 'Ver todas as áreas' tira o filtro", async () => {
    renderWithProviders(<ModelsPage page={PAGE} />, { prefs: { preferredOccupation: "direito" } });
    const note = await screen.findByTestId("models-occupation-filter");
    expect(note.textContent).toContain("Mostrando modelos de Jurídico, a área da sua profissão.");
    expect(note.textContent).toContain("só você vê");
    expect(cards()).toEqual(["model-card-mo-parecer"]);
    await act(async () => { fireEvent.click(screen.getByTestId("models-see-all")); });
    expect(screen.queryByTestId("models-occupation-filter")).toBeNull();
    expect(cards().length).toBeGreaterThan(1);
  });

  it("sem profissão, nenhuma área pré-filtrada", async () => {
    renderWithProviders(<ModelsPage page={PAGE} />);
    await screen.findByTestId("models-grid");
    expect(screen.queryByTestId("models-occupation-filter")).toBeNull();
    expect(cards().length).toBeGreaterThan(1);
  });
});

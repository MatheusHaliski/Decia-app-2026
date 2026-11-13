// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoModelsRepository } from "@/lib/models/useModels";
import { pageByRoute } from "@/lib/pages/registry";
import { seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger, type PointsLedger } from "@/lib/points/ledger";
import { setPointsLedger } from "@/lib/points/usePoints";
import { demoStoreRepository, setDemoStoreRepository } from "@/lib/store/useStore";
import { renderWithProviders } from "@/test-utils/render";
import { useDeskSkinLock } from "./SkinLock";
import { StorePage } from "./StorePage";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/store",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const PAGE = pageByRoute("/store")!;
let ledger: PointsLedger;

function useLedger(seed: boolean) {
  ledger = createMemoryLedger();
  if (seed) seedLabPersonas(ledger, new Date());
  setPointsLedger(ledger);
  setDemoStoreRepository(null);
  setDemoModelsRepository(null);
}

/** Estado das skins no seletor das preferências (o mesmo gancho que a página de Configurações usa). */
function SkinProbe() {
  const lock = useDeskSkinLock();
  return <output data-testid="skin-probe">{JSON.stringify({ blueprint: lock("blueprint", "papel"), papel: lock("papel", "papel"), timbrado: lock("papel-timbrado", "papel-timbrado") })}</output>;
}

beforeEach(() => {
  nav.search = "";
  useLedger(true);
});
afterEach(() => {
  setPointsLedger(null);
  setDemoStoreRepository(null);
  setDemoModelsRepository(null);
});

/** Loja Work AI (`/store`, RF42.CA04–CA06). */
describe("Loja Work AI", () => {
  it("lista as seções com preço, disponibilidade e estoque; carteira com saldo, créditos de IA e histórico da compra de exemplo", async () => {
    renderWithProviders(<StorePage page={PAGE} />);
    expect((await screen.findByTestId("store-balance")).textContent).toContain("1.240");
    expect(screen.getByTestId("store-ai-credits").textContent).toBe("10");
    for (const name of ["Skins da Mesa", "Créditos de IA", "Impulso no Mural", "Modelos do Balcão", "Kits"]) expect(screen.getByRole("heading", { name })).toBeTruthy();
    const limited = screen.getByTestId("store-item-creditos-ia-25");
    expect(limited.textContent).toContain("Restam 3");
    expect(within(screen.getByTestId("store-item-impulso-72h")).getByText(/Em breve: a partir de/)).toBeTruthy();
    expect(within(screen.getByTestId("store-item-impulso-72h")).getByRole("button", { name: /Comprar/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByTestId("store-model-mo-tr").textContent).toContain("Termo de referência");
    expect(within(screen.getByTestId("store-history")).getByText("10 créditos de IA")).toBeTruthy();
    expect(screen.getByText(/não há cartão, Pix nem pagamento real/)).toBeTruthy();
  });

  it("compra com saldo: confirma, debita o razão, desbloqueia a skin (o seletor das preferências reflete) e registra no histórico", async () => {
    renderWithProviders(<><StorePage page={PAGE} /><SkinProbe /></>);
    await screen.findByTestId("store-wallet");
    expect(JSON.parse(screen.getByTestId("skin-probe").textContent!)).toEqual({ blueprint: { disabled: true, hint: "À venda na Loja por 200 DP" }, papel: {}, timbrado: { hint: "Em uso; à venda na Loja" } });
    fireEvent.click(screen.getByRole("button", { name: "Comprar Skin Blueprint" }));
    const dialog = await screen.findByTestId("purchase-dialog");
    expect(dialog.textContent).toContain("1.040 DP");
    fireEvent.click(within(dialog).getByTestId("purchase-confirm"));
    expect((await within(dialog).findByText(/Skin Blueprint desbloqueada/)).textContent).toContain("Configurações › Aparência");
    expect(ledger.balance("u-pessoa")).toBe(1040);
    expect(ledger.entries("u-pessoa")[0]).toMatchObject({ event: "COMPRA_LOJA", delta: -200 });
    await waitFor(() => expect(screen.getByTestId("store-balance").textContent).toContain("1.040"));
    expect(JSON.parse(screen.getByTestId("skin-probe").textContent!).blueprint).toEqual({ hint: "Desbloqueada na Loja" });
    expect(demoStoreRepository().ownedSkins("u-pessoa")).toEqual(["blueprint"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByTestId("purchase-dialog")).toBeNull());
    expect(within(screen.getByTestId("store-item-skin-blueprint")).getByText("Já é sua")).toBeTruthy();
    expect(within(screen.getByTestId("store-history")).getByText("Skin Blueprint desbloqueada")).toBeTruthy();
  });

  it("sem saldo: SALDO_INSUFICIENTE explica quanto falta e de onde vêm os pontos; nada é debitado", async () => {
    useLedger(false);
    renderWithProviders(<StorePage page={PAGE} />);
    await screen.findByTestId("store-wallet");
    fireEvent.click(screen.getByRole("button", { name: "Comprar 10 créditos de IA" }));
    const dialog = await screen.findByTestId("purchase-dialog");
    fireEvent.click(within(dialog).getByTestId("purchase-confirm"));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain("SALDO_INSUFICIENTE");
    expect(alert.textContent).toContain("faltam 50 DP");
    expect(alert.textContent).toContain("participação de qualidade nas sessões do DECIA");
    expect(within(alert).getByRole("link", { name: "Ir ao DECIA" }).getAttribute("href")).toBe("/decia");
    expect(ledger.entries("u-pessoa")).toEqual([]);
  });

  it("impulso no Mural só confirma com o item escolhido e fica ativo na carteira", async () => {
    renderWithProviders(<StorePage page={PAGE} />);
    await screen.findByTestId("store-wallet");
    fireEvent.click(screen.getByRole("button", { name: "Comprar Impulso de 24 h no Mural" }));
    const dialog = await screen.findByTestId("purchase-dialog");
    expect(within(dialog).getByTestId("purchase-confirm").hasAttribute("disabled")).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("O que impulsionar"), { target: { value: "decia-v1" } });
    fireEvent.click(within(dialog).getByTestId("purchase-confirm"));
    expect(await within(dialog).findByText(/Plataforma DECIA v1.0 fica em destaque no Mural até/)).toBeTruthy();
    expect(ledger.balance("u-pessoa")).toBe(1120);
    expect(screen.getByTestId("store-wallet").textContent).toContain("Plataforma DECIA v1.0 até");
  });

  it("modelo do Balcão na Loja: compra a licença e o preço vai ao autor no mesmo fluxo", async () => {
    renderWithProviders(<StorePage page={PAGE} />);
    const card = await screen.findByTestId("store-model-mo-tr");
    fireEvent.click(within(card).getByRole("button", { name: "Comprar Termo de referência" }));
    const dialog = await screen.findByTestId("purchase-dialog");
    expect(dialog.textContent).toContain("O preço vai para Bruno Exemplo");
    fireEvent.click(within(dialog).getByTestId("purchase-confirm"));
    expect(await within(dialog).findByText(/Bruno Exemplo recebeu o crédito/)).toBeTruthy();
    expect(ledger.balance("u-pessoa")).toBe(1220);
    expect(ledger.balance("u-bruno")).toBe(20);
    expect(ledger.entries("u-bruno")[0]!.event).toBe("CREDITO_AUTOR_MODELO");
    await waitFor(() => expect(within(screen.getByTestId("store-model-mo-tr")).getByText("Licença sua")).toBeTruthy());
  });

  it("EMPRESA vê o catálogo sem saldo e sem comprar", async () => {
    renderWithProviders(<StorePage page={PAGE} />, { profile: "EMPRESA" });
    expect(await screen.findByTestId("store-no-balance")).toBeTruthy();
    expect(screen.queryByTestId("store-wallet")).toBeNull();
    expect(within(screen.getByTestId("store-item-creditos-ia-10")).getByRole("button", { name: /Comprar/ }).hasAttribute("disabled")).toBe(true);
  });
});

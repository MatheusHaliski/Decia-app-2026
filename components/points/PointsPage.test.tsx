// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pageByRoute } from "@/lib/pages/registry";
import { seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger, type PointsLedger } from "@/lib/points/ledger";
import { setPointsLedger } from "@/lib/points/usePoints";
import { renderWithProviders } from "@/test-utils/render";
import { PointsPage } from "./PointsPage";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/points",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const PAGE = pageByRoute("/points")!;
let ledger: PointsLedger;

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  ledger = createMemoryLedger();
  seedLabPersonas(ledger, new Date());
  setPointsLedger(ledger);
});
afterEach(() => setPointsLedger(null));

/** DECIA Points (`/points`, RF42.CA03, CA08, CA09). */
describe("DECIA Points", () => {
  it("Saldo: saldo do razão, resumo, gráfico mensal com tabela equivalente e como se ganha (sem volume, sem dinheiro)", async () => {
    renderWithProviders(<PointsPage page={PAGE} />);
    expect((await screen.findByTestId("points-balance")).textContent).toContain("1.240");
    const chart = screen.getByTestId("points-chart");
    expect(within(chart).getByRole("img").getAttribute("aria-label")).toMatch(/últimos 6 meses/);
    expect(within(screen.getByTestId("points-chart-table")).getAllByRole("row")).toHaveLength(7);
    const how = screen.getByTestId("points-how");
    expect(how.textContent).toContain("só participando bem das sessões do DECIA");
    expect(how.textContent).toContain("Volume não conta");
    expect(how.textContent).toContain("Não há dinheiro");
    expect(screen.getAllByText("RF42").length).toBeGreaterThan(0);
  });

  it("doação a colega: doa dentro do limite mensal, atualiza saldo e limite e recusa o que passa do limite", async () => {
    renderWithProviders(<PointsPage page={PAGE} />);
    const card = await screen.findByTestId("points-donate");
    expect(screen.getByTestId("donate-allowance").textContent).toContain("50 DP");
    fireEvent.change(within(card).getByLabelText("Colega"), { target: { value: "u-ana" } });
    fireEvent.change(within(card).getByLabelText("Pontos"), { target: { value: "40" } });
    fireEvent.change(within(card).getByLabelText("Mensagem"), { target: { value: "Obrigado pela ata" } });
    fireEvent.click(screen.getByTestId("donate-submit"));
    await waitFor(() => expect(screen.getByTestId("donate-allowance").textContent).toContain("10 DP"));
    expect(ledger.balance("u-pessoa")).toBe(1200);
    expect(ledger.balance("u-ana")).toBe(40);
    expect(screen.getByTestId("points-balance").textContent).toContain("1.200");
    expect(within(card).getByText(/Você doou 40 DP a Ana Exemplo/)).toBeTruthy();
    fireEvent.change(within(card).getByLabelText("Pontos"), { target: { value: "20" } });
    fireEvent.click(screen.getByTestId("donate-submit"));
    expect((await within(card).findByRole("alert")).textContent).toContain("ainda pode doar 10 DP");
    expect(ledger.balance("u-pessoa")).toBe(1200);
  });

  it("Extrato: filtra por evento e período; a compra de exemplo aparece como débito", async () => {
    nav.search = "tab=extrato";
    renderWithProviders(<PointsPage page={PAGE} />);
    const table = await screen.findByTestId("statement-table");
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
    fireEvent.change(screen.getByTestId("statement-event"), { target: { value: "COMPRA_LOJA" } });
    fireEvent.change(screen.getByTestId("statement-period"), { target: { value: "tudo" } });
    await waitFor(() => expect(screen.getByTestId("statement-count").textContent).toMatch(/^1 lançamentos/));
    const rows = within(screen.getByTestId("statement-table")).getAllByRole("row");
    expect(rows[1]!.textContent).toContain("Compra na Loja");
    expect(rows[1]!.textContent).toContain("débito");
    expect(rows[1]!.textContent).toContain("-50");
    fireEvent.change(screen.getByTestId("statement-event"), { target: { value: "ESTORNO" } });
    expect(await screen.findByText("Nenhum lançamento neste filtro")).toBeTruthy();
  });

  it("Regras: valores, tetos e multiplicador explicados", async () => {
    nav.search = "tab=regras";
    renderWithProviders(<PointsPage page={PAGE} />);
    const table = await screen.findByTestId("rules-table");
    const arg = within(table).getByRole("row", { name: /Argumento com evidência/ });
    expect(arg.textContent).toContain("até 10 por sessão");
    expect(within(table).getByRole("row", { name: /Reação de qualidade/ }).textContent).toContain("até 20 por dia");
    expect(within(table).getByRole("row", { name: /Decisão validada/ }).textContent).toContain("perfil deliberativo");
    expect(within(table).getByRole("row", { name: /Crédito de autor/ }).textContent).toContain("não é participação no DECIA");
  });

  it("EMPRESA não tem saldo: abre nas regras e vê pontos por departamento com grupos pequenos ocultos", async () => {
    renderWithProviders(<PointsPage page={PAGE} />, { profile: "EMPRESA" });
    expect(await screen.findByTestId("rules-table")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Saldo" })).toBeNull();
    nav.search = "tab=departamentos";
    renderWithProviders(<PointsPage page={PAGE} />, { profile: "EMPRESA" });
    const table = await screen.findByTestId("departments-table");
    expect(within(table).getByRole("row", { name: /ASCOM/ }).textContent).toContain("Menos de 5 pessoas");
    expect(within(table).getByRole("row", { name: /SECID-UTS/ }).textContent).toContain("12");
    expect(within(table).getByRole("row", { name: /Empresa/ }).textContent).toContain("32");
  });

  it("visitante recebe 403", () => {
    renderWithProviders(<PointsPage page={PAGE} />, { profile: "VISITANTE" });
    expect(screen.getByText("403 ACESSO_NEGADO")).toBeTruthy();
  });
});

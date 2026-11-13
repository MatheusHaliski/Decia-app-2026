// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoModelsRepository } from "@/lib/models/useModels";
import { pageByRoute } from "@/lib/pages/registry";
import { seedLabPersonas } from "@/lib/points/demo";
import { createMemoryLedger, type PointsLedger } from "@/lib/points/ledger";
import { setPointsLedger } from "@/lib/points/usePoints";
import { demoSealsRepository, setDemoSealsRepository } from "@/lib/seals/useSeals";
import { demoStoreRepository, setDemoStoreRepository } from "@/lib/store/useStore";
import { renderWithProviders } from "@/test-utils/render";
import { BenefitsPage } from "./BenefitsPage";
import { ReviewQueuePage } from "./ReviewQueue";
import { SealsPage } from "./SealsPage";

const nav = vi.hoisted(() => ({ search: "", path: "/seals", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

let ledger: PointsLedger;
const reset = () => {
  setDemoSealsRepository(null);
  setDemoStoreRepository(null);
  setDemoModelsRepository(null);
};

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  ledger = createMemoryLedger();
  seedLabPersonas(ledger, new Date());
  setPointsLedger(ledger);
  reset();
});
afterEach(() => {
  setPointsLedger(null);
  reset();
});

/** Chancelas & políticas (`/seals`, RF39.CA01–CA05, CA08). */
describe("Chancelas & políticas", () => {
  it("CHEFE vê as próprias chancelas com política, ciclo, uso e benefícios", async () => {
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "CHEFE" });
    const list = await screen.findByTestId("my-seals");
    expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["seal-ch-referencia-tecnica", "seal-ch-projeto-conforme"]);
    const seal = screen.getByTestId("seal-ch-projeto-conforme");
    expect(seal.textContent).toContain("Chefia Exemplo · CPOE");
    expect(seal.textContent).toContain("3 de 12 no ciclo");
    expect(seal.textContent).toContain("Com revisão");
    expect(seal.textContent).toContain("Conformidade mínima ≥ 80");
    expect(seal.textContent).toContain("Créditos de IA");
  });

  it("criador: ciclo invertido dá PERIODO_INVALIDO no campo; corrigido, cria a chancela com política e benefícios", async () => {
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "CHEFE" });
    fireEvent.click(await screen.findByTestId("seal-new"));
    const form = await screen.findByTestId("seal-creator");
    fireEvent.change(within(form).getByTestId("seal-name"), { target: { value: "Ata exemplar" } });
    fireEvent.change(within(form).getByTestId("seal-until"), { target: { value: "2000-01-01" } });
    fireEvent.submit(form);
    expect((await within(form).findByRole("alert")).textContent).toContain("O período termina antes de começar");
    fireEvent.change(within(form).getByTestId("seal-until"), { target: { value: "" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByTestId("seal-creator")).toBeNull());
    const created = demoSealsRepository().seals().find((s) => s.name === "Ata exemplar")!;
    expect(created).toMatchObject({ issuerKind: "CHEFE", issuerId: "chefe.exemplo", department: "CPOE", availableUntil: null, policy: { mode: "REVISAO" } });
    expect(created.policy.criteria.map((c) => c.criterion).sort()).toEqual(["CONFORMIDADE_MIN", "PRAZO_CUMPRIDO"]);
    expect(demoSealsRepository().benefitsOf(created.id).map((b) => b.type)).toEqual(["PONTOS_BONUS"]);
    expect(await screen.findByTestId(`seal-${created.id}`)).toBeTruthy();
  });

  it("a folha + Criar abre o criador por ?acao=nova; EMPREGADO recebe 403", async () => {
    nav.search = "acao=nova";
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "EMPRESA" });
    expect(await screen.findByTestId("seal-creator")).toBeTruthy();
    expect(screen.getByText(/Secretaria Exemplo — chancela da empresa/)).toBeTruthy();
    nav.search = "";
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "EMPREGADO" });
    expect(screen.getByText("403 ACESSO_NEGADO")).toBeTruthy();
  });

  it("conceder por vínculo sugerido ✦: o relatório vem do sistema e o vínculo vai para a fila; política exige todos os critérios", async () => {
    nav.search = "tab=conceder";
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "CHEFE" });
    const card = await screen.findByTestId("grant-ch-projeto-conforme");
    expect(card.textContent).toContain("✦ confiança 33%");
    expect(card.textContent).toContain("71% (mínimo 80%)");
    expect(card.textContent).toContain("faltam: Conformidade mínima, Rastro completo");
    fireEvent.click(within(card).getByRole("button", { name: "Conceder Projeto conforme pelo vínculo sugerido" }));
    await waitFor(() => expect(demoSealsRepository().reviewQueue({ id: "chefe.exemplo", profile: "CHEFE", name: "", department: "CPOE" }).map((b) => b.targetId)).toContain("decia-v1"));
    expect(await screen.findByText(/Projeto conforme para Plataforma DECIA v1.0 foi para a fila de revisão/)).toBeTruthy();
    expect(within(screen.getByTestId("grant-ch-projeto-conforme")).getByText(/já tem um vínculo com o item \(Em revisão\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Política de critérios/ }));
    const policy = await screen.findByTestId("grant-ch-projeto-conforme");
    expect(within(policy).getByText("A política só concede com todos os critérios atendidos.")).toBeTruthy();
  });

  it("Recusadas: vínculos recusados na revisão com o motivo", async () => {
    nav.search = "tab=recusadas";
    renderWithProviders(<SealsPage page={pageByRoute("/seals")!} />, { profile: "CHEFE" });
    const table = await screen.findByTestId("rejected-table");
    expect(table.textContent).toContain("Plataforma DECIA v1.0");
    expect(table.textContent).toContain("Rastro incompleto: os portões do projeto não têm decisão registrada no DECIA.");
  });
});

/** Fila de chancelas (`/seals/review`, RF39.CA04, CA07; RF28.CA03). */
describe("Fila de chancelas", () => {
  beforeEach(() => {
    nav.path = "/seals/review";
  });
  afterEach(() => {
    nav.path = "/seals";
  });

  it("CURADOR recusa com motivo obrigatório; a fila esvazia", async () => {
    renderWithProviders(<ReviewQueuePage page={pageByRoute("/seals/review")!} />, { profile: "CURADOR" });
    const item = await screen.findByTestId("review-bd-tarefa-tp");
    expect(item.textContent).toContain("Indicação de colega");
    expect(item.textContent).toContain("Pedido por Ana Exemplo");
    expect(item.textContent).toContain("Rastro completo");
    fireEvent.click(within(item).getByRole("button", { name: /^Recusar a chancela de/ }));
    fireEvent.click(within(item).getByRole("button", { name: /^Confirmar a recusa de/ }));
    expect((await within(item).findByRole("alert")).textContent).toContain("Escreva o motivo da recusa.");
    fireEvent.change(within(item).getByLabelText(/Motivo da recusa/), { target: { value: "Revisada pela própria responsável" } });
    fireEvent.click(within(item).getByRole("button", { name: /^Confirmar a recusa de/ }));
    expect(await screen.findByText("Fila vazia")).toBeTruthy();
    expect(demoSealsRepository().bond("bd-tarefa-tp")).toMatchObject({ status: "REJEITADA", reviewNote: "Revisada pela própria responsável", reviewedBy: "curadoria.exemplo" });
  });

  it("EMPRESA aprova e libera os benefícios aos envolvidos; ADMIN só lê; EMPREGADO recebe 403", async () => {
    renderWithProviders(<ReviewQueuePage page={pageByRoute("/seals/review")!} />, { profile: "EMPRESA" });
    const item = await screen.findByTestId("review-bd-plano");
    expect(item.textContent).toContain("Ao aprovar, libera Prioridade na revisão para 3 colaboradores envolvidos.");
    fireEvent.click(within(item).getByRole("button", { name: /^Aprovar a chancela de/ }));
    await waitFor(() => expect(demoSealsRepository().bond("bd-plano")!.status).toBe("APROVADA"));
    expect(demoSealsRepository().benefitsFor("u-pessoa").map((o) => o.benefit.type)).toContain("PRIORIDADE_REVISAO");

    renderWithProviders(<ReviewQueuePage page={pageByRoute("/seals/review")!} />, { profile: "ADMIN" });
    const admin = await screen.findByTestId("review-bd-tarefa-tp");
    expect(within(admin).queryByRole("button", { name: /^Aprovar/ })).toBeNull();
    expect(admin.textContent).toContain("Somente leitura");

    renderWithProviders(<ReviewQueuePage page={pageByRoute("/seals/review")!} />, { profile: "EMPREGADO" });
    expect(screen.getByText("403 ACESSO_NEGADO")).toBeTruthy();
  });
});

/** Benefícios (`/benefits`, RF39.CA09, CA10). */
describe("Benefícios", () => {
  beforeEach(() => {
    nav.path = "/benefits";
  });
  afterEach(() => {
    nav.path = "/seals";
  });

  it("EMPREGADO resgata o bônus (award BENEFICIO_BONUS) e os créditos de IA; o resgate não se repete", async () => {
    renderWithProviders(<BenefitsPage page={pageByRoute("/benefits")!} />);
    const bonus = await screen.findByTestId("benefit-bf-bonus-tarefa");
    expect(bonus.textContent).toContain("Chancela Tarefa exemplar · T01 · Termo de abertura e requisitos");
    fireEvent.click(within(bonus).getByRole("button", { name: "Resgatar Bônus de DECIA Points da chancela Tarefa exemplar" }));
    const dialog = await screen.findByTestId("redeem-dialog");
    fireEvent.click(within(dialog).getByTestId("redeem-confirm"));
    expect(await within(dialog).findByText("+10 DP creditados no seu saldo.")).toBeTruthy();
    expect(within(dialog).getByText(/Código do resgate: CH-/)).toBeTruthy();
    expect(ledger.entries("u-pessoa")[0]).toMatchObject({ event: "BENEFICIO_BONUS", delta: 10 });
    expect(ledger.balance("u-pessoa")).toBe(1250);
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(within(screen.getByTestId("benefit-bf-bonus-tarefa")).getByText("Resgatado")).toBeTruthy());
    expect(within(screen.getByTestId("benefit-bf-bonus-tarefa")).getByRole("button", { name: /Resgatar/ }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(within(screen.getByTestId("benefit-bf-ia-tarefa")).getByRole("button", { name: /Resgatar Créditos de IA/ }));
    fireEvent.click(within(await screen.findByTestId("redeem-dialog")).getByTestId("redeem-confirm"));
    expect(await screen.findByText("+10 créditos de IA no seu saldo da Loja.")).toBeTruthy();
    expect(demoStoreRepository().aiCredits("u-pessoa")).toBe(20);
    fireEvent.click(within(screen.getByTestId("redeem-dialog")).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByTestId("redeem-dialog")).toBeNull());
    expect(within(screen.getByTestId("redemptions-table")).getAllByRole("row")).toHaveLength(3);
  });

  it("EMPRESA vê os benefícios das próprias chancelas e publica um novo; não resgata", async () => {
    renderWithProviders(<BenefitsPage page={pageByRoute("/benefits")!} />, { profile: "EMPRESA" });
    const table = await screen.findByTestId("issuer-benefits-table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.queryByTestId("my-benefits")).toBeNull();
    fireEvent.click(screen.getByTestId("publish-open"));
    const form = await screen.findByTestId("publish-form");
    fireEvent.change(within(form).getByLabelText("Benefício"), { target: { value: "MENCAO_RELATORIO" } });
    fireEvent.submit(form);
    await waitFor(() => expect(within(screen.getByTestId("issuer-benefits-table")).getAllByRole("row")).toHaveLength(7));
    expect(demoSealsRepository().allBenefits().some((b) => b.type === "MENCAO_RELATORIO" && b.sealId === "ch-tarefa-exemplar")).toBe(true);
  });
});

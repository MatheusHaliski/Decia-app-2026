// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PACT_IDS, buildDemoPacts } from "@/lib/pacts/fixtures";
import { localDay } from "@/lib/pacts/rules";
import { createPactRepository, setDemoPactRepository } from "@/lib/pacts/store";
import { renderWithProviders } from "@/test-utils/render";
import GoalsPage from "@/app/(shell)/goals/page";
import { PactsWorkspace } from "./PactsWorkspace";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/goals",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const P = DEMO_PACT_IDS;
const repo = () => createPactRepository(buildDemoPacts(new Date()));
const detail = () => screen.getByTestId("pact-detail");
const inDays = (n: number) => localDay(new Date(Date.now() + n * 86_400_000));

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  setDemoPactRepository(null);
});

describe("/goals › Pactos de desbloqueio (RF49)", () => {
  it("“Quem eu posso destravar hoje?”: a pessoa responde ao pedido com uma proposta de compromissos", () => {
    const r = repo();
    renderWithProviders(<PactsWorkspace repo={r} />, { profile: "EMPREGADO" });
    const today = screen.getByTestId("pacts-unblock-today");
    expect(within(today).getByText("Cronograma de obras atualizado para o estudo técnico de calçadas")).toBeTruthy();
    expect(within(today).getByText("Responder ao pedido")).toBeTruthy();
    fireEvent.click(within(today).getByRole("button", { name: "Abrir" }));
    expect(detail().getAttribute("data-pact")).toBe(P.cronograma);
    expect(nav.replace).toHaveBeenCalledWith(`/goals?pacto=${P.cronograma}`, { scroll: false });
    fireEvent.click(within(detail()).getByTestId("pact-propose"));
    const editor = within(detail()).getByTestId("pact-proposal-editor");
    fireEvent.change(within(editor).getByLabelText("Compromisso"), { target: { value: "Enviar o cronograma por quadra" } });
    fireEvent.change(within(editor).getByLabelText("Data (obrigatória)"), { target: { value: inDays(3) } });
    fireEvent.click(within(editor).getByRole("button", { name: "Enviar proposta" }));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toBe("Proposta enviada à outra parte.");
    expect(within(detail()).getByText("Em negociação")).toBeTruthy();
    const proposal = within(detail()).getByTestId("pact-proposal");
    expect(proposal.getAttribute("data-status")).toBe("ABERTA");
    expect(within(proposal).getByText("Rodada 1")).toBeTruthy();
    // quem entrega propôs e executa: falta só o aceite de quem pede
    expect(within(proposal).getAllByText(/aceita por Pessoa Exemplo/)).toHaveLength(2);
    expect(within(proposal).getByText("aguardando aceite")).toBeTruthy();
  });

  it("aceite de um lado não fecha o acordo; o executor nomeado ainda precisa aceitar", () => {
    nav.search = `pacto=${P.parecer}`;
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    expect(within(detail()).getByText("Contraproposta")).toBeTruthy();
    fireEvent.click(within(detail()).getByTestId("pact-accept-SOLICITANTE"));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toBe("Aceite registrado.");
    expect(within(detail()).getAllByText("Em negociação").length).toBeGreaterThan(0);
    expect(within(detail()).queryByTestId("pact-agreement")).toBeNull();
    expect(within(detail()).getByTestId("pact-mediate").getAttribute("href")).toBe(`/decia/mediacao-${P.parecer}?pacto=${P.parecer}`);
  });

  it("chefia: o limite de compromissos bloqueia o aceite com explicação; exceção justificada libera", () => {
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "CHEFE" });
    const today = screen.getByTestId("pacts-unblock-today");
    expect(within(today).getByText("Parecer de acessibilidade sobre o projeto de rampas da escola")).toBeTruthy();
    expect(screen.getByTestId("pacts-ledger").textContent).toContain("Precisamos receber: 1");
    fireEvent.click(within(today).getByRole("button", { name: "Abrir" }));
    fireEvent.click(within(detail()).getByTestId("pact-accept-DESTINATARIO"));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toContain("já tem 1 compromissos ativos (limite 1)");
    fireEvent.click(within(detail()).getByTestId("pact-exception"));
    const form = within(detail()).getByTestId("pact-form-exception");
    fireEvent.change(within(form).getByLabelText(/^Motivo/), { target: { value: "Parecer exigido pela fiscalização da escola." } });
    fireEvent.click(within(form).getByRole("button", { name: "Registrar exceção" }));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toBe("Exceção ao limite registrada.");
    fireEvent.click(within(detail()).getByTestId("pact-accept-DESTINATARIO"));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toBe("Aceite registrado.");
    expect(within(detail()).getAllByText("Comprometido").length).toBeGreaterThan(0);
    expect(within(detail()).getByTestId("pact-agreement")).toBeTruthy();
  });

  it("empresa: decide o conflito escalonado (registro humano, sem decisão automática)", () => {
    nav.search = `pacto=${P.planilha}`;
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPRESA" });
    const esc = within(detail()).getByTestId("pact-escalations");
    expect(esc.textContent).toContain("Diego Exemplo, Secretaria Exemplo (demo)");
    fireEvent.click(within(detail()).getByTestId("pact-resolve"));
    const form = within(detail()).getByTestId("pact-form-resolve");
    fireEvent.change(within(form).getByLabelText(/^Decisão e encaminhamento/), { target: { value: "A planilha tem prioridade nesta semana; a GOF entrega até sexta." } });
    fireEvent.click(within(form).getByRole("button", { name: "Registrar decisão" }));
    expect(within(detail()).getByTestId("pact-feedback").textContent).toBe("Decisão registrada.");
    expect(within(detail()).getByTestId("pact-escalations").textContent).toContain("Decisão de Secretaria Exemplo (demo)");
  });

  it("acompanhamento: prazo vencido aparece com texto; renegociação aberta não troca o acordo vigente", () => {
    nav.search = `pacto=${P.planilha}`;
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    expect(within(detail()).getAllByText("Vencido").length).toBeGreaterThan(0);
    const agreement = within(detail()).getByTestId("pact-agreement");
    expect(within(agreement).getByText("Descumprido")).toBeTruthy();
    expect(within(detail()).getByText("Renegociação")).toBeTruthy();
    fireEvent.click(within(detail()).getByTestId("pact-accept-SOLICITANTE"));
    // falta o aceite do executor (Rui): o acordo v1 continua valendo
    expect(within(within(detail()).getByTestId("pact-agreement")).getByText(/Acordo v1/)).toBeTruthy();
  });

  it("fila de cooperação: só pactos autorizados, filtro por caixa e estado vazio", () => {
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    expect(screen.getByTestId("pact-queue-status").textContent).toContain("Pactos na fila: 4");
    fireEvent.change(screen.getByLabelText("Caixa"), { target: { value: "RECEBIDOS" } });
    expect(screen.getAllByTestId("pact-row").map((r) => r.getAttribute("data-pact"))).toEqual([P.cronograma]);
    fireEvent.change(screen.getByLabelText("Unidade"), { target: { value: "d-gof" } });
    expect(screen.getByText("Nenhum pacto com estes filtros.")).toBeTruthy();
  });

  it("pacto fora do acesso não aparece (RESTRITO só para envolvidos)", () => {
    nav.search = `pacto=${P.parecer}`;
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "CHEFE" });
    expect(screen.queryByTestId("pact-detail")).toBeNull();
    expect(screen.getByText("Pacto não encontrado ou fora do seu acesso.")).toBeTruthy();
  });

  it("impedimentos: Acervo, Mesa e manual; abrir pacto a partir do impedimento já sugere com quem", () => {
    nav.search = "vista=impedimentos";
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    const list = screen.getByTestId("impediments-list");
    expect(within(list).getByText("Acervo: tarefa bloqueada")).toBeTruthy();
    const mesa = within(list).getAllByTestId("impediment-card").find((c) => c.getAttribute("data-impediment") === "imp-mesa-decia-v1-d5")!;
    expect(mesa.textContent).toContain("T04 Análise de riscos e LGPD — ainda não iniciada (Diego Exemplo)");
    fireEvent.click(within(mesa).getByTestId("impediment-start-pact"));
    const form = screen.getByTestId("pact-open-form");
    expect((within(form).getByLabelText("Pessoa") as HTMLSelectElement).value).toBe("u-diego");
    fireEvent.change(within(form).getByLabelText(/^Critério de aceite/), { target: { value: "Análise de riscos e LGPD concluída e anexada ao portão." } });
    fireEvent.click(within(form).getByTestId("pact-open-submit"));
    expect(detail().textContent).toContain("Resolver: T04 Análise de riscos e LGPD");
    expect(within(detail()).getAllByText("Solicitado").length).toBeGreaterThan(0);
  });

  it("registro manual exige o que trava, desde quando e quem depende", () => {
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    fireEvent.click(screen.getByTestId("impediment-new"));
    const form = screen.getByTestId("impediment-form");
    fireEvent.click(within(form).getByTestId("impediment-submit"));
    expect(within(form).getAllByText("preencha este campo.").length).toBeGreaterThanOrEqual(3);
  });

  it("métricas agregadas com amostra; avisos genéricos e agrupados", () => {
    nav.search = "vista=metricas";
    const { unmount } = renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPRESA" });
    const m = screen.getByTestId("pact-metrics");
    expect(within(m).getByTestId("pact-metric-validation").textContent).toContain("13,5 d (p90 15 d)");
    expect(within(m).getByTestId("pact-metric-validation").textContent).toContain("amostra: 2");
    expect(m.textContent).toContain("Recusado");
    unmount();
    nav.search = "vista=avisos";
    renderWithProviders(<PactsWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    const list = screen.getByTestId("pact-notifications");
    const first = within(list).getAllByRole("listitem")[0]!;
    expect(first.textContent).toMatch(/Um pacto de desbloqueio em que você participa foi atualizado\. Novidades: \d+/);
    fireEvent.click(within(first).getByRole("button", { name: "Marcar como lido" }));
    expect(within(within(list).getAllByRole("listitem")[0]!).queryByRole("button", { name: "Marcar como lido" })).toBeNull();
  });
});

describe("/goals — página", () => {
  it("abas Pactos de desbloqueio (padrão) e Metas coletivas (RF35 ainda não implementado)", () => {
    setDemoPactRepository(repo());
    const { unmount } = renderWithProviders(<GoalsPage />, { profile: "EMPREGADO" });
    expect(screen.getByRole("tab", { name: "Pactos de desbloqueio" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("pacts-workspace")).toBeTruthy();
    unmount();
    nav.search = "tab=metas";
    renderWithProviders(<GoalsPage />, { profile: "EMPREGADO" });
    expect(screen.getByText("As metas coletivas chegam com o RF35")).toBeTruthy();
    expect(screen.queryByTestId("pacts-workspace")).toBeNull();
  });
});

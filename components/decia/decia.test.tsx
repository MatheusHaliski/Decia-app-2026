// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { setScore, setWeight } from "@/lib/decia/commands";
import { buildDemoDecisions, buildEdgeCases, DEMO_DECISION_IDS, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import type { DecisionAggregate } from "@/lib/decia/types";
import { toDecisionCardViewModel } from "@/lib/decia/view-model";
import { setAnalyticsSink, type AnalyticsRecord } from "@/lib/decia/analytics";
import { ChallengeDialog, CriteriaMatrix, DecideDialog, DecisionCard, DecisionWorkspace, inboxGroups } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/decia",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-10-06T12:00:00Z");
const demo = () => Object.fromEntries(buildDemoDecisions(NOW).map((a) => [a.decision.id, a])) as Record<string, DecisionAggregate>;
const vmOf = (a: DecisionAggregate, includeBack = true) => toDecisionCardViewModel(a, NOW, { people: DEMO_PEOPLE, includeBack });

describe("DecisionCard — estados (04 §10)", () => {
  const e = buildEdgeCases(NOW);
  const card = (a: DecisionAggregate, mode: "STANDARD" | "COMPACT" | "DETAIL" = "STANDARD") => renderWithProviders(<DecisionCard vm={vmOf(a, mode === "DETAIL")} mode={mode} href="/x" />);

  it("título longo: pergunta inteira no DOM, limitada a 3 linhas (line-clamp) e com quebra segura", () => {
    card(e.longTitle);
    const h = screen.getByRole("heading", { level: 3 });
    expect(h.textContent).toContain("dezoito meses?");
    expect(h.className).toContain("line-clamp-3");
    expect(h.className).toContain("[overflow-wrap:break-word]");
  });
  it("sem opção ainda; muitas alternativas com líder", () => {
    card(e.noOption);
    expect(screen.getByTestId("option-line").textContent).toBe("Sem opção ainda");
  });
  it("risco ALTO e risco CRÍTICO (faixa + texto, nunca só cor)", () => {
    const { unmount } = card(e.riskHigh);
    expect(screen.getByText("Risco alto")).toBeTruthy();
    unmount();
    card(e.riskCritical);
    expect(screen.getAllByText("Risco crítico").length).toBeGreaterThan(0);
    expect(document.querySelector("article")!.getAttribute("data-critical")).toBe("true");
  });
  it("confiança BAIXA (faixa sem % no STANDARD); % só no DETAIL, em passos de 5", () => {
    const { unmount } = card(e.lowConfidence);
    expect(screen.getByTestId("confidence").textContent).toContain("Confiança baixa");
    expect(screen.queryByTestId("confidence-pct")).toBeNull();
    unmount();
    card(e.lowConfidence, "DETAIL");
    expect(screen.getByTestId("confidence-pct").textContent).toContain("25");
  });
  it("sem evidência e confiança ALTA × evidência FRACA geram o alerta textual", () => {
    const { unmount } = card(e.noEvidence);
    expect(screen.getByText(/sem evidência/)).toBeTruthy();
    unmount();
    card(e.highConfWeakEvidence);
    expect(screen.getByText("Confiança acima do que o registro sustenta")).toBeTruthy();
  });
  it("muitas alternativas: o card mostra só a líder", () => {
    card(e.many);
    expect(screen.getByTestId("option-line").textContent).toMatch(/Lidera no modelo/);
  });
  it("atrasada, resolvida e arquivada", () => {
    const a = card(e.overdue);
    expect(screen.getByText("Atrasada")).toBeTruthy();
    a.unmount();
    const b = card(e.resolved);
    expect(screen.getByText("Resultado: sucesso")).toBeTruthy();
    expect(screen.getByTestId("status-label").textContent).toBe("Resolvida");
    b.unmount();
    card(e.archived);
    expect(screen.getByTestId("status-label").textContent).toBe("Arquivada");
    expect(document.querySelector("article")!.className).toContain("opacity-80");
  });
  it("RASCUNHO com borda tracejada; COMPACT tem 1 linha e não tem flip", () => {
    const ux = demo()[DEMO_DECISION_IDS.navegacao]!;
    const { unmount } = card({ ...ux, decision: { ...ux.decision, status: "RASCUNHO" } });
    expect(document.querySelector("article")!.className).toContain("border-dashed");
    unmount();
    card(demo()[DEMO_DECISION_IDS.arquitetura]!, "COMPACT");
    expect(screen.getByRole("heading", { level: 3 }).className).toContain("truncate");
    expect(screen.queryByTestId("flip")).toBeNull();
  });
  it("STANDARD não vira: 'Por quê?' abre o DETAIL", () => {
    const open = vi.fn();
    renderWithProviders(<DecisionCard vm={vmOf(demo()[DEMO_DECISION_IDS.arquitetura]!, false)} mode="STANDARD" onOpenDetails={open} />);
    expect(screen.queryByTestId("flip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Por quê?" }));
    expect(open).toHaveBeenCalled();
  });
});

describe("DecisionCard — flip (04 §7)", () => {
  const arq = () => vmOf(demo()[DEMO_DECISION_IDS.arquitetura]!);

  it("botão com aria-pressed/aria-controls; clique vira e desvira; foco no título da face nova; inert na oculta; aria-live", () => {
    const got: AnalyticsRecord[] = [];
    setAnalyticsSink((r) => got.push(r));
    renderWithProviders(<DecisionCard vm={arq()} mode="DETAIL" />);
    const btn = screen.getByTestId("flip");
    const front = document.querySelector("[data-face='front']")!;
    const back = document.querySelector("[data-face='back']")!;
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).toBeTruthy();
    expect(back.hasAttribute("inert")).toBe(true);
    expect(back.getAttribute("aria-hidden")).toBe("true");
    expect(front.hasAttribute("inert")).toBe(false);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(front.hasAttribute("inert")).toBe(true);
    expect(back.hasAttribute("inert")).toBe(false);
    expect(document.activeElement?.textContent).toBe("Por que esta opção?");
    expect(screen.getByTestId("flip-live").textContent).toBe("Mostrando a lógica da decisão");
    expect(within(back as HTMLElement).getByText(/Custo 20→17 % faz B liderar/)).toBeTruthy();
    fireEvent.click(btn);
    expect(document.activeElement?.tagName).toBe("H3");
    expect(document.activeElement?.textContent).toContain("Qual infraestrutura");
    expect(got.map((r) => (r.props as { to: string }).to)).toEqual(["back", "front"]);
    setAnalyticsSink(null);
  });

  it("teclado: F com o card focado vira; F dentro de campo de texto é ignorado", () => {
    renderWithProviders(<DecisionCard vm={arq()} mode="HERO" />);
    const article = document.querySelector("article")!;
    expect(article.getAttribute("tabindex")).toBe("0");
    expect(article.getAttribute("aria-keyshortcuts")).toBe("F");
    article.focus();
    fireEvent.keyDown(article, { key: "f" });
    expect(screen.getByTestId("flip").getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(article, { key: "F" });
    expect(screen.getByTestId("flip").getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(article, { key: "f", ctrlKey: true });
    expect(screen.getByTestId("flip").getAttribute("aria-pressed")).toBe("false");
  });

  it("altura fixa: as duas faces na mesma célula (sem layout shift); 3D só sem redução de movimento", () => {
    const { unmount } = renderWithProviders(<DecisionCard vm={arq()} mode="DETAIL" />);
    const flip = document.querySelector(".ws-decision-flip")!;
    expect(flip.getAttribute("data-motion")).toBe("3d");
    expect(flip.querySelectorAll(".ws-decision-face")).toHaveLength(2);
    unmount();
    renderWithProviders(<DecisionCard vm={arq()} mode="DETAIL" />, { prefs: { reduceMotion: true } });
    expect(document.querySelector(".ws-decision-flip")!.getAttribute("data-motion")).toBe("reduced");
  });

  it("prefers-reduced-motion do sistema também desliga o 3D", () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
    renderWithProviders(<DecisionCard vm={arq()} mode="DETAIL" />);
    expect(document.querySelector(".ws-decision-flip")!.getAttribute("data-motion")).toBe("reduced");
    window.matchMedia = orig;
  });
});

describe("CriteriaMatrix", () => {
  function Harness({ initial }: { initial: DecisionAggregate }) {
    const [agg, setAgg] = useState(initial);
    return <CriteriaMatrix aggregate={agg} currentUserId="u-pessoa" onScore={(a, c, s) => setAgg((x) => setScore(x, a, c, "u-pessoa", s, NOW))} onWeight={(c, w) => setAgg((x) => setWeight(x, c, w, "u-pessoa", NOW))} />;
  }

  it("mostra pontuação, contribuições, mediana e divergência; validação da soma dos pesos", () => {
    renderWithProviders(<Harness initial={demo()[DEMO_DECISION_IDS.arquitetura]!} />);
    expect(screen.getByTestId("total-arq-a").textContent).toBe("3,80");
    expect(screen.getByTestId("total-arq-b").textContent).toBe("3,75");
    expect(screen.getByTestId("cell-arq-a-arq-seguranca").textContent).toContain("contribui 0,90");
    expect(screen.getByTestId("cell-arq-b-arq-seguranca").textContent).toContain("mediana 5,0 de 3 avaliações");
    expect(screen.getByTestId("cell-arq-b-arq-seguranca").textContent).toContain("Divergência alta");
    expect(screen.getByTestId("weight-sum").textContent).toBe("Os pesos somam 100 %");
    fireEvent.change(screen.getByLabelText("Peso de Custo (%)"), { target: { value: "25" } });
    expect(screen.getByTestId("weight-sum").textContent).toBe("Os pesos somam 105 % — ajuste para 100 %");
    expect(screen.getByTestId("weight-sum").getAttribute("role")).toBe("alert");
    expect(screen.queryByTestId("total-arq-a")).toBeNull();
    fireEvent.change(screen.getByLabelText("Peso de Custo (%)"), { target: { value: "" } });
    expect(screen.getByTestId("weight-sum").textContent).toMatch(/Peso inválido/);
  });

  it("editar nota recalcula; remover nota deixa a linha incompleta (fora do ranking, sem imputar zero)", () => {
    renderWithProviders(<Harness initial={demo()[DEMO_DECISION_IDS.arquitetura]!} />);
    fireEvent.change(screen.getByLabelText("Nota de A em Segurança"), { target: { value: "5" } });
    expect(screen.getByTestId("total-arq-a").textContent).toBe("4,40");
    fireEvent.change(screen.getByLabelText("Nota de C em Custo"), { target: { value: "" } });
    expect(screen.queryByTestId("total-arq-c")).toBeNull();
    expect(screen.getAllByText("Incompleta — fora do ranking").length).toBeGreaterThan(0);
  });

  it("dominância em pesos iguais: etiquetas 'dominada por' / 'domina' sem remover a alternativa", () => {
    const sprint = demo()[DEMO_DECISION_IDS.sprint]!;
    const dominated = setScore(sprint, "spr-c", "spr-esforco", "u-pessoa", 3, NOW);
    renderWithProviders(<CriteriaMatrix aggregate={dominated} currentUserId="u-pessoa" readOnly />);
    expect(screen.getByText("dominada por B")).toBeTruthy();
    expect(screen.getByText("domina C")).toBeTruthy();
    expect(screen.getByTestId("total-spr-c")).toBeTruthy();
  });
});

describe("Guarda pré-decisão no diálogo Decidir", () => {
  function Harness({ agg, onSave }: { agg: DecisionAggregate; onSave: (a: DecisionAggregate) => void }) {
    const [open, setOpen] = useState(true);
    return <DecideDialog open={open} onOpenChange={setOpen} aggregate={agg} currentUserId="u-pessoa" onSave={onSave} />;
  }

  it("bloqueio por motivo curto (DECISAO_INCOMPLETA); avisos exigem confirmação explícita; confirmar grava DECIDIDA + snapshot", () => {
    const onSave = vi.fn();
    renderWithProviders(<Harness agg={demo()[DEMO_DECISION_IDS.arquitetura]!} onSave={onSave} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("guard-blocking").textContent).toContain("DECISAO_INCOMPLETA");
    expect(within(dialog).getByTestId("guard-blocking").textContent).toContain("Escreva o motivo");
    const confirm = within(dialog).getByTestId("confirm-decision");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/^Motivo/), { target: { value: "Custo e prazo pesam mais agora." } });
    expect(within(dialog).queryByTestId("guard-blocking")).toBeNull();
    const warnings = within(dialog).getByTestId("guard-warnings");
    expect(warnings.textContent).toContain("divergência alta");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(warnings).getByRole("checkbox"));
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    act(() => { fireEvent.click(confirm); });
    const saved = onSave.mock.calls[0]![0] as DecisionAggregate;
    expect(saved.decision.status).toBe("DECIDIDA");
    expect(saved.snapshots).toHaveLength(1);
    expect(saved.snapshots[0]!.contentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("alternativa descartada bloqueia", () => {
    renderWithProviders(<Harness agg={demo()[DEMO_DECISION_IDS.arquitetura]!} onSave={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^Alternativa escolhida/), { target: { value: "arq-d" } });
    expect(within(dialog).getByTestId("guard-blocking").textContent).toContain("está descartada");
  });
});

describe("DecisionWorkspace", () => {
  const ws = (agg: DecisionAggregate, section: Parameters<typeof DecisionWorkspace>[0]["initialSection"] = "visao-geral") =>
    renderWithProviders(<DecisionWorkspace aggregate={agg} now={NOW} currentUserId="u-pessoa" people={DEMO_PEOPLE} onSave={vi.fn()} initialSection={section} />);

  it("cabeçalho, trilha de 9 estágios com estado em texto e 6 seções", () => {
    ws(demo()[DEMO_DECISION_IDS.arquitetura]!);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Qual infraestrutura");
    const stages = within(screen.getByTestId("stages")).getAllByRole("button");
    expect(stages).toHaveLength(9);
    expect(stages[0]!.getAttribute("aria-label")).toBe("1. Problema — concluído");
    expect(stages[2]!.getAttribute("aria-label")).toBe("3. Evidências — precisa de atenção");
    expect(stages[8]!.getAttribute("aria-label")).toBe("9. Aprendizado — vazio");
    for (const s of ["visao-geral", "evidencias", "comparar", "riscos", "decisao", "execucao"]) expect(screen.getByTestId(`section-${s}`)).toBeTruthy();
    expect(screen.getByTestId("saved").textContent).toMatch(/salvo há/);
    expect(screen.getByTestId("overview-card")).toBeTruthy();
    expect(screen.getByTestId("health").querySelectorAll("li")).toHaveLength(5);
  });

  it("navega entre seções e move o foco para o título da seção", () => {
    ws(demo()[DEMO_DECISION_IDS.arquitetura]!);
    fireEvent.click(screen.getByTestId("section-comparar"));
    expect(screen.getByRole("heading", { level: 2, name: "Comparar" })).toBe(document.activeElement);
    expect(screen.getByTestId("sensitivity").textContent).toContain("Recomendação sensível");
    fireEvent.click(screen.getByTestId("section-riscos"));
    expect(screen.getByTestId("risks").textContent).toContain("Limite de região do provedor");
  });

  it("estados vazios com próxima ação (decisão de UX)", () => {
    const ux = demo()[DEMO_DECISION_IDS.navegacao]!;
    const a = ws(ux, "comparar");
    expect(screen.getByText("Uma decisão real compara opções — inclusive não agir.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar alternativa" })).toBeTruthy();
    expect(screen.getByText("Que critérios importam para esta pergunta?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sugerir com IA/ }));
    expect(screen.getByTestId("ai-unavailable").textContent).toBe("Análise de IA indisponível — a matriz continua funcionando");
    a.unmount();
    const b = ws(ux, "evidencias");
    expect(screen.getByText("Nenhuma evidência ainda.")).toBeTruthy();
    b.unmount();
    ws(ux, "execucao");
    expect(screen.getByText("Disponível depois da decisão.")).toBeTruthy();
  });

  it("só o responsável decide (§8); decisão do fornecedor mostra o snapshot separado do estado atual", () => {
    const f = demo()[DEMO_DECISION_IDS.fornecedor]!;
    ws(f, "decisao");
    expect(screen.queryByTestId("decide")).toBeNull();
    expect(screen.getByTestId("snapshot").textContent).toContain("No momento da decisão");
    expect(screen.getByTestId("snapshot-hash").textContent).toBe(f.snapshots[0]!.contentSha256);
    expect(screen.getByText("Hash conferido")).toBeTruthy();
    expect(screen.getByTestId("current-state")).toBeTruthy();
  });

  it("depois de decidida a matriz é somente leitura (sem selects, pesos nem 'Adicionar alternativa')", () => {
    const f = demo()[DEMO_DECISION_IDS.fornecedor]!;
    const a = ws(f, "comparar");
    expect(screen.getByTestId("matrix-locked").textContent).toContain("reabra a decisão");
    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((c) => expect(c.querySelector("select, input")).toBeNull());
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Adicionar alternativa" })).toBeNull();
    a.unmount();
    ws(demo()[DEMO_DECISION_IDS.arquitetura]!, "comparar");
    expect(screen.queryByTestId("matrix-locked")).toBeNull();
    expect(document.querySelector('[data-testid^="cell-"] select')).not.toBeNull();
  });

  it("execução e revisão do lançamento: boa decisão, resultado parcial; Brier com n", () => {
    ws(demo()[DEMO_DECISION_IDS.lancamento]!, "execucao");
    expect(screen.getByTestId("quadrant").textContent).toContain("Boa decisão, resultado parcial");
    expect(screen.getByTestId("brier").textContent).toContain("0,2281");
    expect(screen.getByTestId("brier").textContent).toContain("n = 4");
  });

  it("Decidir abre a guarda; responsável diferente vê o botão desabilitado", () => {
    const arq = demo()[DEMO_DECISION_IDS.arquitetura]!;
    const a = ws(arq);
    fireEvent.click(screen.getByTestId("decide"));
    expect(screen.getByRole("dialog", { name: "Decidir" })).toBeTruthy();
    a.unmount();
    ws({ ...arq, decision: { ...arq.decision, ownerUserId: "u-ana" } });
    expect((screen.getByTestId("decide") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Desafiar e caixa de entrada", () => {
  it("5 modos de desafio; IA indisponível é um estado de erro explícito", () => {
    renderWithProviders(<ChallengeDialog open onOpenChange={() => {}} decisionId="d" />);
    expect(screen.getAllByRole("button", { name: "Pedir análise" })).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("button", { name: "Pedir análise" })[0]!);
    expect(screen.getByTestId("ai-unavailable").textContent).toContain("Análise de IA indisponível");
    expect(screen.getByTestId("ai-state").textContent).toBe("Análise: falhou");
    expect(screen.getByRole("dialog").textContent).not.toMatch(/router|consumer|dead letter|fila/i);
  });

  it("grupos da caixa de entrada", () => {
    const g = inboxGroups(buildDemoDecisions(NOW), NOW, "u-pessoa");
    expect(g.awaitingMe.map((a) => a.decision.id)).toEqual([DEMO_DECISION_IDS.sprint]);
    expect(g.needsEvidence.map((a) => a.decision.id)).toEqual([DEMO_DECISION_IDS.arquitetura]);
    expect(g.reviewsDue.map((a) => a.decision.id)).toEqual([DEMO_DECISION_IDS.fornecedor]);
  });
});

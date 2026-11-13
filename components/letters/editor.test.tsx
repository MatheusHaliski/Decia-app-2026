// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { buildDemoPieces } from "@/lib/letters/fixtures";
import { createMemoryLettersRepository } from "@/lib/letters/repository";
import { PieceEditor } from "./PieceEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/letters/relatorio-auditoria-protocolo",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const NOW = new Date("2026-11-13T12:00:00Z");
const ID = "relatorio-auditoria-protocolo";

async function setup() {
  const repo = createMemoryLettersRepository(buildDemoPieces(NOW));
  renderWithProviders(<PieceEditor pieceId={ID} repo={repo} />);
  const panel = await screen.findByRole("complementary", { name: "Copiloto linguístico e narrativo" });
  return { repo, panel };
}
const textOf = (repo: ReturnType<typeof createMemoryLettersRepository>, blockId: string) => repo.get(ID)!.blocks.find((b) => b.id === blockId)!.text;
const card = (rule: string) => document.querySelector<HTMLElement>(`[data-rule="${rule}"]`)!;
const analyze = () => fireEvent.click(screen.getByRole("button", { name: /Analisar agora|Analisar de novo/ }));

describe("editor do Letters + painel do Copiloto", () => {
  it("abrir a peça não dispara análise (Sob solicitação); analisar lista achados por aba", async () => {
    const { panel } = await setup();
    expect(within(panel).getByText("Nenhuma análise ainda nesta revisão.")).toBeTruthy();
    expect(screen.queryByTestId("letters-summary")).toBeNull();
    analyze();
    expect(screen.getByTestId("letters-summary").textContent).toMatch(/achados .* revisão 1/);
    expect(screen.getByRole("status").textContent).toMatch(/Análise concluída: \d+ achado\(s\) na revisão 1/);
    expect(within(card("CRASE_VERBO")).getByRole("heading", { name: "Crase antes de verbo" })).toBeTruthy();
    expect(within(card("CRASE_VERBO")).getByText(/Referência indicada: CUNHA, Celso; CINTRA, Lindley/)).toBeTruthy();
    expect(within(card("CRASE_VERBO")).getByText(/\(edição e página não conferidas\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Citações/ }));
    expect(screen.getByRole("heading", { name: "Ano da citação diferente da referência" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Chamadas no texto e situação na lista de referências" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Coerência/ }));
    expect(screen.getByRole("list", { name: "Seções esperadas: Relatório técnico" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Morfossintaxe/ }));
    expect(within(screen.getByRole("list", { name: "Legenda das classes de palavras" })).getByText("substantivo")).toBeTruthy();
    expect(screen.getByRole("table", { name: /Classes de palavras de Bloco 1/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Excesso de voz passiva" })).toBeTruthy();
  });

  it("proposta ✦ sob solicitação: diff removido/adicionado, aceite aplica e entra no histórico", async () => {
    const { repo } = await setup();
    analyze();
    fireEvent.click(within(card("CRASE_VERBO")).getByRole("button", { name: "✦ Propor correção" }));
    const proposal = document.querySelector<HTMLElement>('[data-testid^="ai-suggestion-card-"]')!;
    expect(proposal.querySelector("del")!.textContent).toContain("à");
    expect(proposal.querySelector("ins")!.textContent).toContain("a");
    expect(textOf(repo, "b3")).toContain("à partir");
    fireEvent.click(within(proposal).getByTestId("ai-btn-apply"));
    expect(textOf(repo, "b3")).toContain("Tecnologia a partir de reclamações");
    expect(repo.get(ID)!.revision).toBe(2);
    expect(screen.getByRole("status").textContent).toBe("Correção aplicada; a peça está na revisão 2.");
    expect(within(screen.getByRole("list", { name: /Versões da peça/ })).getByText(/proposta ✦ aceita/)).toBeTruthy();
  });

  it("proposta calculada sobre revisão antiga é recusada e o rascunho fica", async () => {
    const { repo } = await setup();
    analyze();
    fireEvent.click(within(card("CRASE_VERBO")).getByRole("button", { name: "✦ Propor correção" }));
    fireEvent.change(screen.getByLabelText("Bloco 5 · §2 Parágrafo"), { target: { value: "O objetivo mudou durante a revisão." } });
    expect(repo.get(ID)!.revision).toBe(2);
    const proposal = document.querySelector<HTMLElement>('[data-testid^="ai-suggestion-card-"]')!;
    expect(within(proposal).getByText("desatualizada")).toBeTruthy();
    fireEvent.click(within(proposal).getByTestId("ai-btn-apply"));
    expect(screen.getByRole("alert").textContent).toBe("Recusada: a proposta foi calculada sobre a revisão 1 e a peça está na revisão 2. Seu texto foi preservado; analise de novo.");
    expect(textOf(repo, "b3")).toContain("à partir");
    expect(textOf(repo, "b5")).toBe("O objetivo mudou durante a revisão.");
    // os achados da revisão antiga somem até nova análise (RF53.CA06)
    expect(screen.getByText(/Os achados eram da revisão 1; a peça está na revisão 2/)).toBeTruthy();
    expect(card("CRASE_VERBO")).toBeNull();
  });

  it("modos: Manual desliga, Agente indisponível, Assistido aplica em lote com prévia e desfazer", async () => {
    const { repo } = await setup();
    expect(screen.getByRole("radio", { name: /Agente automático/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /^Manual/ }));
    expect(screen.getByText(/Copiloto desligado \(modo Manual\)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Analisar agora/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /^Assistido/ }));
    expect(screen.getByRole("status").textContent).toMatch(/Modo alterado para Assistido \(política versão 3\)/);
    // análise automática depois da pausa
    await waitFor(() => expect(screen.getByTestId("letters-summary")).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: /Aplicar em lote/ }));
    const batch = screen.getByTestId("letters-batch");
    expect(within(batch).getAllByRole("checkbox").length).toBeGreaterThan(2);
    fireEvent.click(within(batch).getByTestId("ai-btn-apply"));
    expect(textOf(repo, "b5")).toContain("obedecem ao fluxo");
    expect(textOf(repo, "b5")).toContain("dos processos");
    expect(textOf(repo, "b3")).toContain("a partir de");
    // trocar o modo muda a política, não o texto: a revisão só sobe com o lote
    expect(screen.getByRole("status").textContent).toMatch(/aplicada\(s\) em lote; revisão 2/);
    fireEvent.click(screen.getByTestId("editor-cmd-undo"));
    expect(textOf(repo, "b5")).toContain("obedecem o fluxo");
    expect(textOf(repo, "b3")).toContain("à partir");
  });

  it("Sugestões: correção de um clique aplica direto; alternativa escolhida também", async () => {
    const { repo } = await setup();
    fireEvent.click(screen.getByRole("radio", { name: /^Sugestões/ }));
    await waitFor(() => expect(card("ONDE_TEMPO")).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(within(card("ONDE_TEMPO")).getByRole("button", { name: "✦ Aplicar correção" }));
    expect(textOf(repo, "b7")).toContain("no período em que o sistema");
    await waitFor(() => expect(card("A_NIVEL_DE")).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(within(card("A_NIVEL_DE")).getByRole("button", { name: "Usar «no âmbito de»" }));
    expect(textOf(repo, "b9")).toContain("mas no âmbito de sistema");
  });

  it("ignorar com motivo é reversível", async () => {
    const { repo } = await setup();
    analyze();
    fireEvent.click(within(card("CRASE_VERBO")).getByRole("button", { name: "Ignorar…" }));
    fireEvent.change(within(card("CRASE_VERBO")).getByLabelText("Motivo"), { target: { value: "ESTILO_INTENCIONAL" } });
    fireEvent.click(within(card("CRASE_VERBO")).getByRole("button", { name: "Ignorar com este motivo" }));
    expect(card("CRASE_VERBO")).toBeNull();
    expect(repo.get(ID)!.ignored[0]).toMatchObject({ ruleId: "CRASE_VERBO", reason: "ESTILO_INTENCIONAL" });
    expect(screen.getByText("Ignorados (1)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(card("CRASE_VERBO")).toBeTruthy();
  });

  it("ir até o trecho foca o bloco com o trecho selecionado; realce das classes mostra a legenda no texto", async () => {
    await setup();
    analyze();
    fireEvent.click(within(card("CRASE_VERBO")).getByRole("button", { name: "Ir até o trecho" }));
    const ta = screen.getByLabelText("Bloco 3 · §1 Parágrafo") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(ta);
    expect(ta.value.slice(ta.selectionStart, ta.selectionEnd)).toBe("à");
    fireEvent.click(screen.getByRole("tab", { name: /Morfossintaxe/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Realçar classes gramaticais/ }));
    const gloss = screen.getAllByTestId("letters-gloss");
    expect(gloss.length).toBeGreaterThan(3);
    expect(within(gloss[0]!).getAllByTitle("substantivo").length).toBeGreaterThan(0);
  });

  it("painel retrátil não modal: ocultar devolve o foco ao botão, mostrar foca o título", async () => {
    const { panel } = await setup();
    const toggle = screen.getByTestId("editor-cmd-toggle-ai");
    fireEvent.click(toggle);
    expect(panel.hidden).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(toggle));
    fireEvent.click(toggle);
    expect(panel.hidden).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("heading", { level: 2 })));
    // editor continua visível e editável com o painel aberto
    expect(screen.getByLabelText("Bloco 3 · §1 Parágrafo")).toBeTruthy();
  });

  it("comandos de bloco: inserir, mover e remover com rótulos acessíveis", async () => {
    const { repo } = await setup();
    fireEvent.click(screen.getByRole("button", { name: "Inserir parágrafo abaixo de Bloco 3 · §1 Parágrafo" }));
    expect(repo.get(ID)!.blocks[3]!.kind).toBe("PARAGRAFO");
    fireEvent.click(screen.getByRole("button", { name: "Mover Bloco 4 · §2 Parágrafo para cima" }));
    expect(repo.get(ID)!.blocks[2]!.text).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Remover Bloco 3 · §1 Parágrafo" }));
    expect(repo.get(ID)!.blocks).toHaveLength(13);
  });

  it("peça inexistente: 404 com caminho de volta", async () => {
    const repo = createMemoryLettersRepository([]);
    renderWithProviders(<PieceEditor pieceId="nao-existe" repo={repo} />);
    expect(await screen.findByText("Peça não encontrada")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar para minhas peças" }).getAttribute("href")).toBe("/letters");
  });
});

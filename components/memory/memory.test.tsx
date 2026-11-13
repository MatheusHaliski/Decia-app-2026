// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDemoDecisions } from "@/lib/decia/fixtures";
import { createMemoryRepository as createDeciaRepository } from "@/lib/decia/repository";
import { DEMO_MEMORY_DOCS } from "@/lib/memory/corpus";
import { createMemoryRepository } from "@/lib/memory/store";
import { renderWithProviders } from "@/test-utils/render";
import MemoryPage from "@/app/(shell)/memory/page";
import { setDemoMemoryRepository } from "@/lib/memory/store";
import { MemoryWorkspace } from "./MemoryWorkspace";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/memory",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const NOW = new Date();
const repo = () => createMemoryRepository({ base: DEMO_MEMORY_DOCS, decisions: createDeciaRepository(buildDemoDecisions(NOW)) });
const ask = (q: string) => {
  fireEvent.change(screen.getByLabelText("Pergunta em linguagem natural"), { target: { value: q } });
  fireEvent.click(screen.getByTestId("memory-search"));
};
const hitDocs = () => screen.queryAllByTestId("memory-hit").map((h) => h.getAttribute("data-doc"));

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
});

describe("/memory — busca com citação (RF33)", () => {
  it("pergunta em linguagem natural → trechos com destaque, citação curta, pontuação e o porquê", () => {
    renderWithProviders(<MemoryWorkspace repo={repo()} />);
    ask("quem já fez convênio de pavimentação com a Caixa?");
    expect(screen.getByTestId("memory-results-status").textContent).toContain("quem já fez convênio de pavimentação com a Caixa?");
    expect(hitDocs().slice(0, 2)).toEqual(["mem-relatorio-gestao-2024", "mem-manual-convenios-2025"]);
    const first = screen.getAllByTestId("memory-hit")[0]!;
    expect(within(first).getByTestId("memory-hit-citation").textContent).toBe("Relatório de Gestão 2024 — SECID, Convênios de pavimentação");
    const marks = within(first).getByTestId("memory-hit-passage").querySelectorAll("mark");
    expect([...marks].map((m) => m.textContent)).toEqual(expect.arrayContaining(["convênios", "pavimentação", "Caixa"]));
    expect(within(first).getByTestId("memory-hit-score").textContent).toMatch(/^Pontuação 0,\d\d$/);
    expect(within(first).getByText("Por que este trecho entrou")).toBeTruthy();
    expect(within(first).getByText(/Cobre 3 de 3 termos da pergunta/)).toBeTruthy();
    expect(within(first).getByText("Ver no documento").closest("a")!.getAttribute("href")).toMatch(/^\/memory\?doc=mem-relatorio-gestao-2024&trecho=\d+-\d+$/);
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("/memory?q="), { scroll: false });
  });

  it("Perguntar à IA ✦: resposta só com frases dos trechos e citações [n] que levam ao trecho; sem fonte, diz que não encontrou", () => {
    renderWithProviders(<MemoryWorkspace repo={repo()} />);
    fireEvent.change(screen.getByLabelText("Pergunta em linguagem natural"), { target: { value: "prazo para responder ofício" } });
    fireEvent.click(screen.getByTestId("memory-ask-ai"));
    const answer = screen.getByTestId("memory-answer");
    expect(answer.getAttribute("data-origin")).toBe("IA");
    const items = within(answer).getAllByTestId("memory-answer-item");
    expect(items[0]!.textContent).toContain("O prazo para responder a expediente de outro órgão público é de dez dias úteis, contados da distribuição.");
    const cite = within(items[0]!).getByRole("link", { name: "Ir ao trecho citado 1" });
    expect(cite.getAttribute("href")).toBe("#memoria-trecho-1");
    expect(document.getElementById("memoria-trecho-1")).toBeTruthy();
    // pergunta sem fonte no acervo
    fireEvent.change(screen.getByLabelText("Pergunta em linguagem natural"), { target: { value: "receita de bolo de chocolate" } });
    fireEvent.click(screen.getByTestId("memory-ask-ai"));
    expect(screen.getByTestId("memory-answer-nosource").textContent).toContain("Não vou responder sem fonte");
    expect(screen.getByTestId("memory-results-status").textContent).toContain("Nenhum trecho relevante");
  });

  it("modo de IA Manual: o botão fica desligado e explica por quê", () => {
    renderWithProviders(<MemoryWorkspace repo={repo()} />, { prefs: { aiAutonomyDefault: "MANUAL" } });
    expect((screen.getByTestId("memory-ask-ai") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Seu modo de IA está em Manual/)).toBeTruthy();
  });

  it("pergunta vazia é recusada com mensagem", () => {
    renderWithProviders(<MemoryWorkspace repo={repo()} />);
    ask("   ");
    expect(screen.getByRole("alert").textContent).toBe("Escreva uma pergunta.");
    expect(screen.queryByTestId("memory-hit")).toBeNull();
  });

  it("nunca mostra o que o perfil não pode ler: restrito só da própria unidade; visitante só público", () => {
    const { unmount } = renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    ask("aditivo de prazo da obra da sede");
    expect(hitDocs()).not.toContain("mem-fiscalizacao-03-2026");
    expect(screen.getByTestId("memory-access-note").textContent).toContain("SECID-UTS");
    unmount();
    const chefe = renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "CHEFE" });
    ask("aditivo de prazo da obra da sede");
    expect(hitDocs()).toContain("mem-fiscalizacao-03-2026");
    expect(hitDocs()).not.toContain("mem-parecer-08-2026");
    chefe.unmount();
    renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "VISITANTE" });
    ask("convênios");
    const docs = hitDocs();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((id) => DEMO_MEMORY_DOCS.find((d) => d.id === id)!.accessClass === "PUBLICO")).toBe(true);
    expect(screen.queryByTestId("memory-ingest")).toBeNull();
  });

  it("decisão PRIVADA encerrada do DECIA aparece só para quem participou", () => {
    const { unmount } = renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    ask("fornecedor de suporte com SLA");
    expect(hitDocs()[0]).toBe("decia-d-fornecedor-suporte");
    unmount();
    renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "CHEFE" });
    ask("fornecedor de suporte com SLA");
    expect(hitDocs()).not.toContain("decia-d-fornecedor-suporte");
  });
});

describe("/memory — explorador, leitor e ingestão", () => {
  it("explorador: contagens por tipo e por unidade × exercício; a célula filtra e lista os documentos", () => {
    renderWithProviders(<MemoryWorkspace repo={repo()} />);
    const explorer = screen.getByTestId("memory-explorer");
    expect(within(explorer).getByRole("table", { name: "Documentos por unidade e exercício" })).toBeTruthy();
    // a auditoria RESTRITA da GOF (2025) não entra na contagem de quem é da SECID-UTS
    const cell = within(explorer).getByRole("button", { name: "GOF, 2025: 2 documentos" });
    fireEvent.click(cell);
    expect(cell.getAttribute("aria-pressed")).toBe("true");
    expect(within(explorer).getByTestId("memory-explorer-total").textContent).toBe("Documentos com os filtros atuais: 2");
    expect(within(within(explorer).getByTestId("memory-explorer-docs")).getAllByRole("link").map((a) => a.textContent)).toContain("Manual de Convênios — transferências voluntárias de pavimentação");
    // a busca respeita o filtro escolhido no explorador
    ask("convênios");
    expect(screen.getAllByTestId("memory-hit").every((h) => within(h).getByText("GOF"))).toBe(true);
  });

  it("leitor: abre o documento com o trecho citado destacado; documento restrito de outra unidade não abre", () => {
    const doc = DEMO_MEMORY_DOCS.find((d) => d.id === "mem-in-03-2025")!;
    const start = doc.body.indexOf("O prazo para responder");
    const end = doc.body.indexOf("distribuição.", start) + "distribuição.".length;
    nav.search = `doc=mem-in-03-2025&trecho=${start}-${end}`;
    const { unmount } = renderWithProviders(<MemoryWorkspace repo={repo()} />);
    const reader = screen.getByTestId("memory-reader");
    expect(within(reader).getByTestId("memory-reader-mark").textContent).toBe(doc.body.slice(start, end));
    fireEvent.click(within(reader).getByRole("button", { name: "Fechar o leitor" }));
    expect(nav.replace).toHaveBeenCalledWith("/memory", { scroll: false });
    unmount();
    nav.search = "doc=mem-auditoria-02-2025";
    renderWithProviders(<MemoryWorkspace repo={repo()} />, { profile: "EMPREGADO" });
    expect(screen.getByText("Documento não encontrado ou fora do seu acesso.")).toBeTruthy();
  });

  it("ingestão: texto colado entra no índice da aba com classe de acesso, aparece na busca e pode ser retirado", () => {
    const r = repo();
    renderWithProviders(<MemoryWorkspace repo={r} />);
    const form = screen.getByTestId("memory-ingest");
    fireEvent.click(within(form).getByRole("button", { name: "Acrescentar ao índice" }));
    expect(within(form).getAllByText("Obrigatório.").length).toBeGreaterThan(0);
    fireEvent.change(within(form).getByLabelText(/^Título/), { target: { value: "Nota técnica de galerias pluviais" } });
    fireEvent.change(within(form).getByLabelText(/^Texto do documento/), { target: { value: "As galerias pluviais da rua Sete transbordam com chuva forte.\nRecomenda-se ampliar a seção." } });
    fireEvent.click(within(form).getByRole("button", { name: "Acrescentar ao índice" }));
    expect(within(form).getByText("Documento acrescentado e indexado.")).toBeTruthy();
    expect(within(within(form).getByTestId("memory-ingested")).getByText("Nota técnica de galerias pluviais")).toBeTruthy();
    ask("galerias pluviais transbordam");
    expect(hitDocs()[0]).toMatch(/^ing-1-/);
    fireEvent.click(within(form).getByRole("button", { name: "Retirar “Nota técnica de galerias pluviais” do índice" }));
    ask("galerias pluviais transbordam");
    expect(hitDocs().some((id) => id?.startsWith("ing-"))).toBe(false);
  });
});

describe("/memory — página", () => {
  it("página funcional com selo DEMO, busca e o bloco do RF33 recolhido embaixo", () => {
    setDemoMemoryRepository(repo());
    renderWithProviders(<MemoryPage />, { profile: "EMPREGADO" });
    expect(screen.getByRole("search", { name: "Pergunte à Memória Institucional" })).toBeTruthy();
    expect(screen.getByText("Demonstração")).toBeTruthy();
    expect(screen.getAllByText("RF33").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "O que esta aba vai fazer" })).toBeTruthy();
    ask("teletrabaho");
    expect(hitDocs()[0]).toBe("mem-portaria-12-2025");
    expect(screen.getAllByTestId("memory-hit")[0]!.textContent).toContain("grafia parecida");
    setDemoMemoryRepository(null);
  });
});

// @vitest-environment jsdom
/**
 * Autopiloto (RF30) do colar ao salvar: lê a demanda, mostra de onde veio cada fato, gera o esquema, recalcula o cronograma a
 * cada edição (com o aviso de estouro do prazo) e salva o projeto na Mesa com a versão 1 anotada. Também: arquivo .txt, PDF
 * cifrado, arquivo grande demais e o modo Manual de autonomia (a IA não propõe nada).
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listProposalDrafts } from "@/lib/projects/autopilot/drafts";
import { createMemoryProjectRepository } from "@/lib/projects/repository";
import { renderWithProviders } from "@/test-utils/render";
import { AutopilotWizard } from "./AutopilotWizard";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn() }),
  usePathname: () => "/autopilot",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-11-12T12:00:00");
afterEach(() => {
  sessionStorage.clear();
  nav.push.mockReset();
});

const taskItem = (title: string) => document.querySelector<HTMLElement>(`li[data-task-title="${title}"]`)!;
const feasibility = () => document.querySelector<HTMLElement>("[data-feasibility]")!;

describe("Autopiloto: do colar ao salvar", () => {
  it("lê o ofício, mostra a origem, gera o esquema editável, avisa o estouro do prazo e salva na Mesa", () => {
    const repo = createMemoryProjectRepository([]);
    const saved: string[] = [];
    renderWithProviders(<AutopilotWizard repo={repo} now={() => NOW} onSaved={(id) => saved.push(id)} />);

    // passo 1: colar (o exemplo) e ler
    fireEvent.click(screen.getByRole("button", { name: "Usar um ofício de exemplo" }));
    expect((screen.getByLabelText("Texto da demanda (e-mail, ofício, despacho)") as HTMLTextAreaElement).value).toMatch(/^GOVERNO DO ESTADO/);
    fireEvent.click(screen.getByRole("button", { name: /Ler a demanda/ }));

    // passo 2: fatos com o trecho de origem
    expect(screen.getByRole("heading", { name: "Leitura da demanda" })).toBeTruthy();
    expect((document.querySelector('[data-fact="subject"]') as HTMLInputElement).value).toBe("Implantação do sistema de protocolo digital");
    expect((document.querySelector('[data-fact="reference"]') as HTMLInputElement).value).toBe("Ofício nº 123/2026 – SECID/DTI");
    expect((document.querySelector('[data-fact="deadline"]') as HTMLInputElement).value).toBe("2027-06-30");
    fireEvent.click(screen.getByRole("button", { name: "Ver de onde veio: Prazo da demanda" }));
    expect(document.querySelector("[data-highlight]")!.textContent).toBe("30/06/2027");
    fireEvent.click(screen.getByRole("button", { name: "Ver de onde veio: Elaborar o estudo técnico preliminar (ETP)" }));
    expect(document.querySelector("[data-highlight]")!.textContent).toBe("elaborar o estudo técnico preliminar (ETP)");
    // o que a pessoa corrige deixa de ser proposta (✦ → ✎)
    const subjectField = document.querySelector<HTMLElement>('[data-fact="subject"]')!.closest(".grid")!;
    expect(subjectField.querySelector('[data-mark="ai"]')).toBeTruthy();
    fireEvent.change(document.querySelector('[data-fact="subject"]')!, { target: { value: "Protocolo digital nas regionais" } });
    expect(subjectField.querySelector('[data-mark="edited"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Gerar o esquema do projeto/ }));

    // passo 3: esquema com as 7 fases, cronograma pelo CPM e folga até o prazo
    expect(document.querySelectorAll("[data-phase]").length).toBe(7);
    expect(document.querySelectorAll("[data-gantt-row]").length).toBe(13);
    expect(feasibility().getAttribute("data-feasibility")).toBe("cabe");
    expect(feasibility().textContent).toMatch(/Cabe no prazo: o caminho crítico soma 103,8 dias/);
    expect(feasibility().textContent).toMatch(/sobram 127 dias/);
    expect(within(taskItem("Elaborar o estudo técnico preliminar (ETP)")).getByText(/da demanda: “elaborar o estudo técnico preliminar \(ETP\)”/)).toBeTruthy();
    expect(within(taskItem("Plano de testes e homologação")).getByText(/do modelo da área: Plano de testes de uma funcionalidade/)).toBeTruthy();
    expect(listProposalDrafts()).toHaveLength(1); // rascunho desta aba, nada persistido ainda

    // prazo apertado: o aviso diz quantos dias o caminho crítico estoura
    fireEvent.change(screen.getByTestId("proposal-deadline"), { target: { value: "2026-12-11" } });
    expect(feasibility().getAttribute("data-feasibility")).toBe("estoura");
    expect(feasibility().textContent).toMatch(/estoura em 74 dias/);
    // durações (três pontos) recalculam na hora: pessimista do contrato 75 → 60 ⇒ TE 47,5 → 45
    const contract = taskItem("Contratar a solução de software");
    const pess = within(contract).getByLabelText("Pessimista (P)");
    fireEvent.change(pess, { target: { value: "60" } });
    fireEvent.blur(pess);
    expect(within(taskItem("Contratar a solução de software")).getByText("TE = 45 d")).toBeTruthy();
    expect(feasibility().textContent).toMatch(/estoura em 72 dias/);

    // excluir a fase de Análise, reordenar, excluir e incluir atividades
    fireEvent.click(screen.getByRole("checkbox", { name: "Incluir a fase Análise" }));
    expect(document.querySelectorAll("[data-gantt-row]").length).toBe(12);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Migrar os processos em papel do último exercício" }));
    fireEvent.change(screen.getByLabelText("Nova atividade em Execução"), { target: { value: "Treinar multiplicadores" } });
    fireEvent.click(within(document.querySelector<HTMLElement>('[data-phase="EXECUCAO"]')!).getByRole("button", { name: "Adicionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Subir Capacitar os servidores das unidades regionais" }));
    const execTitles = [...document.querySelectorAll('[data-phase="EXECUCAO"] li[data-task-title]')].map((li) => li.getAttribute("data-task-title"));
    expect(execTitles).toEqual(["Contratar a solução de software", "Plano de testes e homologação", "Capacitar os servidores das unidades regionais", "Implantação do sistema de protocolo digital nas 12 unidades regionais", "Treinar multiplicadores"]);
    // responsável
    fireEvent.change(within(taskItem("Contratar a solução de software")).getByLabelText("Responsável (R)"), { target: { value: "u-bruno" } });

    // salvar: projeto na Mesa com a versão 1 anotada e o rascunho descartado
    fireEvent.click(screen.getByRole("button", { name: "Salvar e abrir na Mesa" }));
    expect(saved).toHaveLength(1);
    const p = repo.get(saved[0]!)!;
    expect(p.title).toBe("Protocolo digital nas regionais");
    expect(p.versions).toEqual([expect.objectContaining({ number: 1, key: "autopilotCreated", vars: { source: "Ofício nº 123/2026 – SECID/DTI" } })]);
    expect(p.origin?.kind).toBe("AUTOPILOTO");
    expect(p.tasks.some((t) => t.title === "Treinar multiplicadores")).toBe(true);
    expect(p.tasks.some((t) => t.title.startsWith("Migrar"))).toBe(false);
    expect(p.tasks.some((t) => t.phase === "ANALISE")).toBe(false);
    expect(p.tasks.find((t) => t.title === "Contratar a solução de software")).toMatchObject({ responsibleId: "u-bruno", pert: { o: 30, m: 45, p: 60 } });
    expect(p.risks.at(-1)!.title).toMatch(/Prazo da demanda menor que o caminho crítico \(\d+ dias a mais\)/);
    expect(listProposalDrafts()).toHaveLength(0);
  });
});

describe("Autopiloto: arquivos", () => {
  it(".txt lido no navegador entra no campo; PDF cifrado e arquivo grande demais pedem para colar", async () => {
    renderWithProviders(<AutopilotWizard repo={createMemoryProjectRepository([])} now={() => NOW} />);
    const input = screen.getByTestId("autopilot-file");
    fireEvent.change(input, { target: { files: [new File(["Assunto: Reforma da sede\nPrazo até 30/11/2026"], "demanda.txt", { type: "text/plain" })] } });
    await waitFor(() => expect(screen.getByTestId("autopilot-loaded").textContent).toMatch(/Lido: demanda\.txt/));
    expect((screen.getByLabelText("Texto da demanda (e-mail, ofício, despacho)") as HTMLTextAreaElement).value).toBe("Assunto: Reforma da sede\nPrazo até 30/11/2026");

    const pdf = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R /Encrypt 2 0 R >>\n%%EOF";
    fireEvent.change(input, { target: { files: [new File([pdf], "oficio.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(screen.getByTestId("autopilot-error").textContent).toMatch(/Não consegui ler o texto: o PDF está protegido \(cifrado\)\. Cole o conteúdo/));

    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.txt", { type: "text/plain" })] } });
    await waitFor(() => expect(screen.getByTestId("autopilot-error").textContent).toBe("Arquivo maior que 5 MB."));
  });

  it("modo Manual de autonomia: o Autopiloto não propõe nada e aponta onde mudar", () => {
    renderWithProviders(<AutopilotWizard repo={createMemoryProjectRepository([])} now={() => NOW} />, { prefs: { aiAutonomyDefault: "MANUAL" } });
    expect(screen.getByRole("note").textContent).toMatch(/modo Manual/);
    expect(screen.getByRole("link", { name: "Mudar a autonomia da IA" }).getAttribute("href")).toBe("/settings?tab=trabalho");
    fireEvent.change(screen.getByLabelText("Texto da demanda (e-mail, ofício, despacho)"), { target: { value: "Elaborar o plano até 30/11/2026" } });
    expect((screen.getByRole("button", { name: /Ler a demanda/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { PersistedTaskCard } from "@/components/tasks/PersistedTasks";
import { buildXlsx } from "@/lib/cardviewer/demo";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import type { TaskView } from "@/lib/tasks/client";
import { CardViewerHost } from "./CardViewerHost";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ID = "22222222-2222-4222-8222-222222222222";
const TODAY = "2026-11-15";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const view = (over: Partial<TaskView> = {}): TaskView => ({
  id: ID, version: 3, ownerId: "11111111-1111-4111-8111-111111111111", title: "Vistoria da obra da escola", type: "DOCUMENTO", category: "VISTORIA_RELATORIO_FOTOGRAFICO",
  priority: "ALTA", state: "EM_USO", accessClass: "INTERNO", visibility: "EMPRESA", objective: "Registrar 12 pontos até 30/11", dueAt: "2026-11-20", area: "SOFTWARE",
  acceptanceCriteria: [{ text: "Fotos com data", done: true }, { text: "Laudo assinado", done: false }], editable: true,
  references: [{ label: "Portal da obra", url: "https://obras.example.org/escola" }], ...over,
});
const att = (id: string, fileName: string, mimeType: string, sizeBytes = 1000) => ({ id, taskId: ID, fileName, mimeType, sizeBytes, available: true, createdAt: "2026-11-12T13:00:00Z" });
const ATTS = [
  att("a1111111-1111-4111-8111-111111111111", "fachada.png", "image/png", 245_760),
  att("a2222222-2222-4222-8222-222222222222", "pagina.html", "text/html", 500),
  att("a3333333-3333-4333-8333-333333333333", "orcamento.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 4000),
  att("a4444444-4444-4444-8444-444444444444", "foto-viga.jpg", "image/jpeg", 2000),
];
const EVS = [{ id: "e1", taskId: ID, attachmentId: ATTS[3]!.id, caption: "Fissura na viga V3", createdAt: "2026-11-12T13:20:00Z" }];

const fetchMock = vi.fn<typeof fetch>();
const calls: { method: string; url: string; body: unknown }[] = [];
let xlsxBytes: Uint8Array;

function serve() {
  fetchMock.mockImplementation(async (url, init) => {
    const u = String(url);
    const method = init?.method ?? "GET";
    calls.push({ method, url: u, body: init?.body });
    if (method === "PUT" && u.endsWith(`/api/tasks/${ID}`)) return json(200, { ...view(), ...JSON.parse(String(init?.body)), version: 4 });
    if (method === "POST" && u.endsWith(`/api/tasks/${ID}/attachments`)) return json(201, att("a5555555-5555-4555-8555-555555555555", "novo.txt", "text/plain"));
    if (u.endsWith(`/api/tasks/${ID}`)) return json(200, view());
    if (u.endsWith(`/api/tasks/${ID}/attachments`)) return json(200, ATTS);
    if (u.endsWith(`/api/tasks/${ID}/evidences`)) return json(200, EVS);
    if (u.includes(`/attachments/${ATTS[0]!.id}/content`)) return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
    if (u.includes(`/attachments/${ATTS[1]!.id}/content`)) return new Response("<p>oi</p>", { status: 200, headers: { "content-type": "text/html" } });
    if (u.includes(`/attachments/${ATTS[2]!.id}/content`)) return new Response(xlsxBytes as BodyInit, { status: 200, headers: { "content-type": "application/octet-stream" } });
    return json(404, {});
  });
}

function go(search: string) {
  window.history.replaceState(null, "", `/tasks${search}`);
}

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  calls.length = 0;
  window.localStorage.clear();
  xlsxBytes = await buildXlsx("Orçamento", [["Item", "Qtd"], ...Array.from({ length: 30 }, (_, i) => [`Item ${i + 1}`, i + 1])], { compress: false });
  serve();
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
});
afterEach(() => {
  vi.unstubAllGlobals();
  go("");
  delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
});

const viewer = () => screen.findByTestId("card-viewer");
const pane = (i: number) => within(document.querySelector(`[data-pane="${i}"]`) as HTMLElement);
const choose = (i: number, label: string) => fireEvent.change(screen.getByLabelText(`Janela do painel ${i + 1}`), { target: { value: label } });

describe("visualizador de card — abrir, fechar e janelas", () => {
  it("abre pela URL ?ver=tarefa:<id> com o resumo preciso (dias restantes calculados e de onde vem)", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    const v = await viewer();
    expect(v.dataset.source).toBe("API");
    expect(await screen.findByRole("dialog", { name: "Vistoria da obra da escola" })).toBeTruthy();
    const due = document.querySelector('[data-fact="due"]') as HTMLElement;
    expect(due.textContent).toContain("faltam 5 dias");
    expect(due.querySelector("[data-from]")?.textContent).toContain("prazo da tarefa");
    expect((document.querySelector('[data-fact="criteria"]') as HTMLElement).textContent).toContain("1 de 2");
  });

  it("abre pelo card (clique e Enter); Escape fecha, limpa a URL e devolve o foco ao card", async () => {
    renderWithProviders(<><PersistedTaskCard task={view()} /><CardViewerHost today={TODAY} /></>);
    const card = screen.getByTestId("persisted-task-card");
    expect(card.getAttribute("data-viewer")).toBe(`tarefa:${ID}`);
    fireEvent.click(screen.getByTestId("task-card-footer"));
    await viewer();
    expect(window.location.search).toBe(`?ver=tarefa:${ID}`);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("card-viewer")).toBeNull());
    expect(window.location.search).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(card));
    // teclado
    fireEvent.keyDown(card, { key: "Enter" });
    await viewer();
  });

  it("clicar no título do card abre o visualizador (não sai da tela); Ctrl+clique segue o link da página", async () => {
    renderWithProviders(<><PersistedTaskCard task={view()} /><CardViewerHost today={TODAY} /></>);
    const link = screen.getByRole("link", { name: "Vistoria da obra da escola" });
    fireEvent.click(link, { ctrlKey: true });
    expect(window.location.search).toBe("");
    fireEvent.click(link);
    await viewer();
    expect(window.location.search).toBe(`?ver=tarefa:${ID}`);
  });

  it("abas de janela sempre visíveis: Melhorias ✦ a um clique, sem procurar no seletor", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "SUGESTOES" } });
    await viewer();
    const tabs = screen.getByTestId("viewer-window-tabs");
    const mel = within(tabs).getByRole("button", { name: "Melhorias ✦" });
    expect(mel.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(mel);
    expect(document.querySelector('[data-pane="1"]')?.getAttribute("data-window")).toBe("melhorias");
    expect(mel.getAttribute("aria-pressed")).toBe("true");
    expect(await pane(1).findByTestId("ci-score")).toBeTruthy();
    // a que já está num painel só ganha o foco
    fireEvent.click(within(tabs).getByRole("button", { name: "Resumo preciso" }));
    expect(document.activeElement).toBe(document.querySelector('[data-pane="0"]'));
  });

  it("responsável: sem designado mostra o autor marcado, igual ao card da página", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    const r = document.querySelector('[data-fact="responsible"]') as HTMLElement;
    expect(r.textContent).toContain("#11111111 (autor; sem responsável designado)");
  });

  it("troca janelas, muda para 3 painéis e lembra o layout por pessoa", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    choose(0, "atividade");
    expect(document.querySelector('[data-pane="0"]')?.getAttribute("data-window")).toBe("atividade");
    expect(screen.getByTestId("viewer-live").textContent).toContain("Painel 1 mostra Atividade e histórico");
    // escolher no painel 1 uma janela que está no 2 troca as duas de lugar
    choose(1, "atividade");
    expect(document.querySelector('[data-pane="0"]')?.getAttribute("data-window")).toBe("previa");
    fireEvent.click(screen.getByRole("button", { name: "3 painéis" }));
    expect(document.querySelectorAll("[data-pane]")).toHaveLength(3);
    const saved = JSON.parse(window.localStorage.getItem("ws.cardviewer.layout.v1.pessoa.exemplo.tarefa") ?? "{}");
    expect(saved.count).toBe(3);
    expect(saved.panes[0]).toBe("previa");
  });

  it("divisor por teclado (role=separator, setas e Home/End)", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    const sep = screen.getByRole("separator");
    expect(sep.getAttribute("aria-valuenow")).toBe("50");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep.getAttribute("aria-valuenow")).toBe("55");
    fireEvent.keyDown(sep, { key: "ArrowLeft", shiftKey: true });
    expect(sep.getAttribute("aria-valuenow")).toBe("45");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep.getAttribute("aria-valuenow")).toBe("18");
    expect(screen.getByTestId("viewer-live").textContent).toContain("18%");
  });
});

describe("janela Arquivos", () => {
  it("árvore da nuvem com anexos e evidências da API (fetch simulado), formato família · variante", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    choose(1, "arquivos");
    const tree = await pane(1).findByTestId("file-tree");
    expect(within(tree).getByText("Imagens")).toBeTruthy();
    expect(within(tree).getByText("Evidências")).toBeTruthy();
    expect(within(tree).getByText("Vínculos externos")).toBeTruthy();
    expect(within(tree).getByText("“Fissura na viga V3”")).toBeTruthy();
    // sem o formato do servidor no anexo: estimado pela extensão, e dito
    expect(tree.querySelector('[data-format="PLANILHA/XLSX"]')?.textContent).toBe("Planilha · XLSX (estimado pela extensão)");
    expect(tree.querySelector('[data-format="PLANILHA/XLSX"]')?.getAttribute("data-estimated")).toBe("true");
    expect(pane(1).getByTestId("cloud-totals").textContent).toContain("5 itens");
  });

  it("pasta local pelo showDirectoryPicker (só com clique), lista sem enviar e envia um arquivo com confirmação", async () => {
    const file = new File(["conteúdo"], "relatorio.txt", { type: "text/plain" });
    const dir = { kind: "directory", name: "Obra", values: async function* () { yield { kind: "file", name: "relatorio.txt", getFile: async () => file }; yield { kind: "file", name: ".oculto", getFile: async () => file }; } };
    const picker = vi.fn(async () => dir);
    Object.assign(window, { showDirectoryPicker: picker });
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    choose(1, "arquivos");
    fireEvent.click(pane(1).getByRole("button", { name: "Este computador" }));
    expect(picker).not.toHaveBeenCalled();
    fireEvent.click(pane(1).getByRole("button", { name: "Escolher pasta…" }));
    expect(await pane(1).findByText("relatorio.txt")).toBeTruthy();
    expect(pane(1).queryByText(".oculto")).toBeNull();
    expect(pane(1).getByTestId("local-status").textContent).toContain("1 itens em “Obra”");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    fireEvent.click(pane(1).getByRole("button", { name: "Enviar relatorio.txt para a tarefa" }));
    expect(pane(1).getByTestId("upload-confirm").textContent).toContain("relatorio.txt");
    fireEvent.click(pane(1).getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith(`/api/tasks/${ID}/attachments`))).toBe(true));
    const body = calls.find((c) => c.method === "POST")!.body as FormData;
    expect((body.get("file") as File).name).toBe("relatorio.txt");
  });

  it("navegador sem a API mostra a explicação e a alternativa (enviar arquivo)", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    choose(1, "arquivos");
    fireEvent.click(pane(1).getByRole("button", { name: "Este computador" }));
    const box = pane(1).getByTestId("local-unsupported");
    expect(box.textContent).toContain("File System Access API");
    expect(within(box).getByLabelText("Enviar um arquivo para a tarefa")).toBeTruthy();
  });
});

describe("janela Prévia do produto", () => {
  it("imagem pelo conteúdo autenticado, com zoom ajustar/100 %/±", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    const img = await pane(1).findByRole("img", { name: "Prévia de fachada.png" });
    expect(img.getAttribute("src")).toBe("blob:mock");
    expect(calls.some((c) => c.url.includes(`/attachments/${ATTS[0]!.id}/content`))).toBe(true);
    fireEvent.click(pane(1).getByRole("button", { name: "100%" }));
    expect(pane(1).getByTestId("zoom-level").textContent).toBe("100%");
    fireEvent.click(pane(1).getByRole("button", { name: "Aproximar" }));
    expect(pane(1).getByTestId("zoom-level").textContent).toBe("125%");
  });

  it("página .html da nuvem em iframe sandbox sem scripts; botão liga só allow-scripts; link externo sempre sem scripts", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    await pane(1).findByRole("img");
    fireEvent.change(pane(1).getByLabelText("Entrega"), { target: { value: `a:${ATTS[1]!.id}` } });
    const frame = await pane(1).findByTestId("preview-iframe");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    fireEvent.click(pane(1).getByRole("button", { name: "Permitir scripts (só conteúdo da nuvem)" }));
    expect(pane(1).getByTestId("preview-iframe").getAttribute("sandbox")).toBe("allow-scripts");
    expect(pane(1).getByTestId("preview-iframe").getAttribute("sandbox")).not.toContain("allow-same-origin");
    fireEvent.change(pane(1).getByLabelText("Entrega"), { target: { value: "u:https://obras.example.org/escola" } });
    const ext = await pane(1).findByTestId("preview-iframe");
    expect(ext.getAttribute("src")).toBe("https://obras.example.org/escola");
    expect(ext.getAttribute("sandbox")).toBe("");
    expect(pane(1).getByRole("note").textContent).toContain("obras.example.org");
    expect(pane(1).queryByRole("button", { name: /Permitir scripts/ })).toBeNull();
  });

  it(".xlsx: fotografia do topo com abas, cabeçalhos A/B e “mostrando 20 de N linhas”", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    await pane(1).findByRole("img");
    fireEvent.change(pane(1).getByLabelText("Entrega"), { target: { value: `a:${ATTS[2]!.id}` } });
    const snap = await pane(1).findByTestId("xlsx-snapshot");
    expect(snap.textContent).toContain("Aba “Orçamento”");
    expect(within(snap).getByTestId("xlsx-rows").textContent).toContain("mostrando 20 de 31 linhas");
    expect(within(snap).getByRole("columnheader", { name: "B" })).toBeTruthy();
    expect(within(snap).getAllByRole("row")).toHaveLength(21);
  });
});

describe("janela Melhorias ✦ (CI)", () => {
  it("modo Sugestões roda sozinho: placar, gravidade e abrir onde corrigir", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "SUGESTOES" } });
    await viewer();
    choose(1, "melhorias");
    const score = await pane(1).findByTestId("ci-score");
    expect(score.textContent).toMatch(/\d+ passaram · \d+ atenção · \d+ falharam/);
    const items = [...document.querySelectorAll("[data-check]")].map((e) => e.getAttribute("data-verdict"));
    const rank = { FALHOU: 0, ATENCAO: 1, PASSOU: 2 } as Record<string, number>;
    expect(items.map((v) => rank[v!])).toEqual([...items.map((v) => rank[v!])].sort((a, b) => a - b));
    const ev = document.querySelector('[data-check="evidencias"]') as HTMLElement;
    expect(ev.getAttribute("data-verdict")).toBe("PASSOU");
    const desc = document.querySelector('[data-check="descricao"]') as HTMLElement;
    expect(within(desc).getByRole("link", { name: "Abrir onde corrigir" }).getAttribute("href")).toBe(`/tasks/${ID}/edit`);
    expect(desc.textContent).toContain("✦");
  });

  it("modo Manual: nada roda sozinho; “rodar verificação” mostra resultados sem sugestões nem aplicar", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "MANUAL" } });
    await viewer();
    choose(1, "melhorias");
    expect(pane(1).getByTestId("ci-idle").textContent).toContain("Modo manual");
    fireEvent.click(pane(1).getByRole("button", { name: "Rodar verificação" }));
    expect(pane(1).getByTestId("ci-score")).toBeTruthy();
    expect(pane(1).queryByRole("button", { name: "Aplicar sugestão ✦" })).toBeNull();
  });

  it("aplicar sugestão cria a proposta e só grava (PUT com a versão) depois de confirmar", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "SOB_SOLICITACAO" } });
    await viewer();
    choose(1, "melhorias");
    fireEvent.click(pane(1).getByRole("button", { name: "Rodar verificação" }));
    const sw = document.querySelector('[data-check="q.swTestes"]') as HTMLElement;
    fireEvent.click(within(sw).getByRole("button", { name: "Aplicar sugestão ✦" }));
    expect(within(sw).getByTestId("ci-proposal").textContent).toContain("versão 3");
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    fireEvent.click(within(sw).getByRole("button", { name: "Confirmar e gravar" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const body = JSON.parse(String(calls.find((c) => c.method === "PUT")!.body));
    expect(body.version).toBe(3);
    expect(body.acceptanceCriteria.at(-1).done).toBe(false);
  });
});

describe("Melhorias ✦ — sugestão concreta e lente", () => {
  it("a sugestão nunca repete o achado: objetivo pré-redigido do título, tipo e prazo; sem o que propor, nada", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith(`/api/tasks/${ID}`)) return json(200, view({ objective: "", area: undefined, descriptionMd: "" }));
      if (u.endsWith("/attachments")) return json(200, []);
      if (u.endsWith("/evidences")) return json(200, []);
      return json(404, {});
    });
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "SUGESTOES" } });
    await viewer();
    fireEvent.click(within(screen.getByTestId("viewer-window-tabs")).getByRole("button", { name: "Melhorias ✦" }));
    await pane(1).findByTestId("ci-score");
    const obj = document.querySelector('[data-check="q.objetivo"]') as HTMLElement;
    expect(obj.textContent).toContain("Proposta de objetivo: “Documento “Vistoria da obra da escola” entregue até 2026-11-20");
    for (const el of document.querySelectorAll<HTMLElement>("[data-check]")) {
      const ps = [...el.querySelectorAll("p")].map((p) => p.textContent?.replace(/^✦\s*(Sugestão da IA:\s*)?/, "").trim());
      expect(new Set(ps).size).toBe(ps.length);
    }
  });

  it("tarefa sem campo de estudo usa a profissão de quem vê como lente, marcada “pela sua profissão”", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { prefs: { aiAutonomyDefault: "SUGESTOES", preferredOccupation: "engenharia-de-software" } });
    await viewer();
    fireEvent.click(within(screen.getByTestId("viewer-window-tabs")).getByRole("button", { name: "Melhorias ✦" }));
    expect((await pane(1).findByTestId("ci-viewer-lens")).textContent).toContain("Rubrica pela sua profissão");
    await waitFor(() => expect(document.querySelector('[data-group="CAMPO"], [data-check^="q.campo"]')).toBeTruthy());
  });

  it("visitante não usa profissão como lente", async () => {
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />, { profile: "VISITANTE", prefs: { aiAutonomyDefault: "SUGESTOES", preferredOccupation: "engenharia-de-software" } });
    await viewer();
    fireEvent.click(within(screen.getByTestId("viewer-window-tabs")).getByRole("button", { name: "Melhorias ✦" }));
    await pane(1).findByTestId("ci-score");
    expect(pane(1).queryByTestId("ci-viewer-lens")).toBeNull();
  });
});

describe("Prévia de PDF", () => {
  it("ficha do PDF com o que o servidor leu (páginas, camada de texto); nada é baixado sem pedir", async () => {
    const pdf = { ...att("a6666666-6666-4666-8666-666666666666", "laudo.pdf", "application/pdf"), formatFamily: "DOCUMENTO", formatVariant: "PDF", formatDetailsJson: JSON.stringify({ pages: "12", textLayer: "false", encrypted: "false" }) };
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      calls.push({ method: "GET", url: u, body: null });
      if (u.endsWith(`/api/tasks/${ID}`)) return json(200, view());
      if (u.endsWith("/attachments")) return json(200, [pdf]);
      if (u.endsWith("/evidences")) return json(200, []);
      return json(404, {});
    });
    go(`?ver=tarefa:${ID}`);
    renderWithProviders(<CardViewerHost today={TODAY} />);
    await viewer();
    const facts = await pane(1).findByTestId("pdf-facts");
    expect(facts.querySelector('[data-fact="pages"]')?.textContent).toBe("12");
    expect(facts.querySelector('[data-fact="textLayer"]')?.textContent).toContain("precisa de OCR");
    expect(calls.some((c) => c.url.includes("/content"))).toBe(false);
    // árvore: formato do servidor, sem "estimado"
    choose(1, "arquivos");
    const tree = await pane(1).findByTestId("file-tree");
    expect(tree.querySelector('[data-format="DOCUMENTO/PDF"]')?.getAttribute("data-estimated")).toBe("false");
  });
});

describe("projeto", () => {
  it("abre o projeto DEMO pela URL com números do motor e o Espelho nas Melhorias", async () => {
    window.history.replaceState(null, "", `/desk?ver=projeto:${DEMO_PROJECT_ID}`);
    renderWithProviders(<CardViewerHost today="2026-11-10" />, { prefs: { aiAutonomyDefault: "SUGESTOES" } });
    const v = await viewer();
    expect(v.dataset.kind).toBe("projeto");
    expect(document.querySelector('[data-fact="cpi"]')?.textContent).toContain("valor agregado ÷ custo real");
    expect(document.querySelector('[data-fact="criticalPath"]')).toBeTruthy();
    await act(async () => { choose(1, "melhorias"); });
    expect(document.querySelector('[data-check="espelho"] a')?.getAttribute("href")).toBe(`/projects/${DEMO_PROJECT_ID}/mirror`);
    choose(1, "previa");
    expect(await pane(1).findByText("DEMO")).toBeTruthy();
  });
});

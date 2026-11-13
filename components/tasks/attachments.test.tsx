// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { MyAttachments, TaskAttachments } from "./Attachments";
import { LegalDeadlinePanel } from "./LegalDeadline";
import { PersistedTaskDetail } from "./PersistedTasks";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const ATT = "44444444-4444-4444-8444-444444444444";
const ATT2 = "55555555-5555-4555-8555-555555555555";
const EV = "66666666-6666-4666-8666-666666666666";
const LAI = "6c0e0069-0000-4000-8000-000000000001";
const ART62 = "6c0e0069-0000-4000-8000-000000000010";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const view = (over: Record<string, unknown> = {}) => ({
  id: ID, version: 3, ownerId: ME, title: "Vistoria da obra", type: "DESENHO_TECNICO", category: "OFICIO_MEMORANDO", priority: "ALTA",
  state: "EM_USO", accessClass: "INTERNO", visibility: "EMPRESA", objective: "Registrar", acceptanceCriteria: [], editable: true, ...over,
});
const attachment = (over: Record<string, unknown> = {}) => ({
  id: ATT, taskId: ID, taskTitle: "Vistoria da obra", fileName: "fachada.jpg", mimeType: "image/jpeg", sizeBytes: 245_760, image: true,
  primary: true, scanStatus: "NAO_VERIFICADO", available: true, createdAt: "2026-11-12T13:00:00Z", ...over,
});
const evidence = { id: EV, taskId: ID, attachmentId: ATT, caption: "Fissura na viga V3", takenAt: "2026-11-12T13:15:00Z", hasLocation: true,
  latitude: "-25.4284", longitude: "-49.2733", ownerId: ME, createdAt: "2026-11-12T13:20:00Z" };
const RULES = [
  { id: ART62, category: "OUTRO", subcategory: "Recurso administrativo — alegações dos demais interessados", days: 5, businessDays: true,
    legalBasis: "Lei nº 9.784/1999, art. 62", companyRule: false },
  { id: LAI, category: "OFICIO_MEMORANDO", subcategory: "Pedido de acesso à informação (LAI) — resposta", days: 20, businessDays: false,
    legalBasis: "Lei nº 12.527/2011 (Lei de Acesso à Informação), art. 11, § 1º", description: "Prorrogável por mais 10 dias.", companyRule: false },
];

describe("Anexos & Evidências no detalhe da tarefa (RF41.CA06)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("lista com antivírus e evidência; envia por multipart; remove só depois de confirmar", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    let items: unknown[] = [attachment({ evidence }), attachment({ id: ATT2, fileName: "planta.pdf", mimeType: "application/pdf", image: false, primary: false, scanStatus: "PENDENTE", available: false })];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      calls.push({ method, url: u, body: init?.body });
      if (method === "POST" && u.endsWith(`/api/tasks/${ID}/attachments`)) return json(201, attachment({ id: "77777777-7777-4777-8777-777777777777", fileName: "laudo.pdf" }));
      if (method === "POST" && u.endsWith(`/api/tasks/${ID}/evidences`)) return json(201, evidence);
      if (method === "DELETE") { items = items.slice(1); return new Response(null, { status: 204 }); }
      if (u.endsWith(`/api/tasks/${ID}/attachments`)) return json(200, items);
      return json(404, {});
    });
    renderWithProviders(<TaskAttachments task={view() as never} />);
    const rows = await screen.findAllByTestId("attachment-item");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("fachada.jpg");
    expect(rows[0]!.textContent).toContain("Sem antivírus neste ambiente");
    const ev = within(rows[0]!).getByTestId("evidence-summary");
    expect(ev.textContent).toContain("Evidência");
    expect(ev.textContent).toContain("Fissura na viga V3");
    expect(ev.textContent).toContain("com localização");
    expect(ev.textContent).toContain("Coordenadas: -25.4284, -49.2733");
    expect(rows[1]!.textContent).toContain("Em verificação");
    const download = within(rows[1]!).getByRole("button", { name: "Baixar" });
    expect(download.hasAttribute("disabled")).toBe(true);

    // envio simples
    const file = new File(["%PDF-1.7"], "laudo.pdf", { type: "application/pdf" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar anexo" }));
    expect(await screen.findByText("Escolha um arquivo.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Arquivo"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar anexo" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/attachments"))).toBe(true));
    const sent = calls.find((c) => c.method === "POST" && c.url.endsWith("/attachments"))!.body as FormData;
    expect((sent.get("file") as File).name).toBe("laudo.pdf");
    expect((await screen.findAllByText("Anexo enviado")).length).toBeGreaterThan(0); // toast + aviso aria-live

    // como evidência, com legenda e localização informadas pela pessoa
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar como evidência/ }));
    fireEvent.change(screen.getByLabelText("Arquivo"), { target: { files: [new File(["x"], "viga.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(screen.getByLabelText("Legenda"), { target: { value: "Fissura na viga V3" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-25.4284" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "-49.2733" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar evidência" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/evidences"))).toBe(true));
    const evBody = calls.find((c) => c.url.endsWith("/evidences"))!.body as FormData;
    expect(evBody.get("caption")).toBe("Fissura na viga V3");
    expect(evBody.get("latitude")).toBe("-25.4284");
    expect(evBody.get("longitude")).toBe("-49.2733");
    expect(evBody.get("takenAt")).toBeNull();

    // remover: nada sai sem confirmar
    fireEvent.click(within((await screen.findAllByTestId("attachment-item"))[0]!).getByRole("button", { name: "Remover" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("“fachada.jpg” sai da tarefa");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(calls.find((c) => c.method === "DELETE")?.url).toMatch(new RegExp(`/api/tasks/${ID}/attachments/${ATT}$`)));
    expect((await screen.findAllByText("Anexo removido")).length).toBeGreaterThan(0);
  });

  it("marca e desmarca evidência; erro do servidor vira mensagem própria; somente leitura não envia", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      calls.push({ method, url: u, body: init?.body });
      if (method === "POST" && u.endsWith(`/attachments/${ATT2}/evidence`)) return json(201, { ...evidence, attachmentId: ATT2 });
      if (method === "POST" && u.endsWith("/attachments")) return json(409, { status: 409, code: "ANEXO_DUPLICADO", message: "Este arquivo já está anexado a esta tarefa." });
      if (method === "DELETE") return new Response(null, { status: 204 });
      if (u.endsWith("/attachments")) return json(200, [attachment({ evidence }), attachment({ id: ATT2, fileName: "planta.pdf", image: false })]);
      return json(404, {});
    });
    const { unmount } = renderWithProviders(<TaskAttachments task={view() as never} />);
    const rows = await screen.findAllByTestId("attachment-item");
    fireEvent.click(within(rows[0]!).getByRole("button", { name: "Desmarcar evidência" }));
    await waitFor(() => expect(calls.find((c) => c.method === "DELETE")?.url).toMatch(new RegExp(`/api/tasks/${ID}/evidences/${EV}$`)));

    fireEvent.click(within(rows[1]!).getByRole("button", { name: "Marcar como evidência" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Legenda"), { target: { value: "Planta conferida em campo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como evidência" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith(`/attachments/${ATT2}/evidence`))).toBe(true));
    expect(JSON.parse(String(calls.find((c) => c.url.endsWith(`/attachments/${ATT2}/evidence`))!.body))).toEqual({ caption: "Planta conferida em campo" });

    fireEvent.change(screen.getByLabelText("Arquivo"), { target: { files: [new File(["x"], "fachada.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar anexo" }));
    expect(await screen.findByText("Este arquivo já está anexado a esta tarefa.")).toBeTruthy();
    unmount();

    renderWithProviders(<TaskAttachments task={view({ editable: false, state: "CONCLUIDA" }) as never} />);
    expect(await screen.findByText(/Somente consulta/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar anexo" })).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Remover" })).toHaveLength(0);
  });
});

describe("prazo legal no detalhe (RF41.CA04)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0));
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("escolhe a regra e a data de início, mostra a prévia calculada e grava pelo servidor com a versão", async () => {
    const puts: unknown[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/legal-deadlines")) return json(200, RULES);
      if (init?.method === "PUT" && u.endsWith("/legal-deadline")) {
        puts.push(JSON.parse(String(init.body)));
        return json(200, view({ version: 4, legalDeadlineRuleId: LAI, legalDeadlineBaseDate: "2026-11-12", legalDueAt: "2026-12-02" }));
      }
      return json(404, {});
    });
    const onSaved = vi.fn();
    renderWithProviders(<LegalDeadlinePanel task={view() as never} onSaved={onSaved} onConflict={vi.fn()} />);
    expect(screen.getByText("Sem prazo legal definido.")).toBeTruthy();
    const select = await screen.findByLabelText("Regra de prazo legal");
    await waitFor(() => expect((select as HTMLSelectElement).options.length).toBe(3));
    // as da categoria da tarefa (Ofício) vêm primeiro
    expect((select as HTMLSelectElement).options[1]!.value).toBe(LAI);
    expect((select as HTMLSelectElement).options[1]!.textContent).toContain("20 dias corridos");
    fireEvent.change(select, { target: { value: LAI } });
    expect(screen.getByText("Prorrogável por mais 10 dias.")).toBeTruthy();
    expect(screen.getByTestId("legal-preview").textContent).toContain("Vencimento calculado: 02/12/2026");
    expect(screen.getByTestId("legal-preview").textContent).toContain("Vence em 20 dias");
    fireEvent.change(screen.getByLabelText("Data de início"), { target: { value: "2026-11-18" } });
    fireEvent.change(select, { target: { value: ART62 } });
    expect(screen.getByTestId("legal-preview").textContent).toContain("26/11/2026"); // 5 úteis, sem o 20/11
    fireEvent.change(select, { target: { value: LAI } });
    fireEvent.change(screen.getByLabelText("Data de início"), { target: { value: "2026-11-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar prazo legal" }));
    await waitFor(() => expect(puts).toEqual([{ ruleId: LAI, startDate: "2026-11-12", version: 3 }]));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByText(/A data é calculada pela regra cadastrada/)).toBeTruthy();
  });

  it("mostra estado, regra e limpa; detalhe traz a faixa e o atalho de quantitativos só para desenho e documento", async () => {
    const puts: unknown[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/legal-deadlines")) return json(200, RULES);
      if (init?.method === "PUT" && u.endsWith("/legal-deadline")) { puts.push(JSON.parse(String(init.body))); return json(200, view({ version: 5 })); }
      if (u.endsWith("/attachments")) return json(200, []);
      if (u.endsWith(`/api/tasks/${ID}`)) return json(200, view({ legalDeadlineRuleId: LAI, legalDeadlineBaseDate: "2026-11-01", legalDueAt: "2026-11-10" }));
      return json(404, {});
    });
    renderWithProviders(<PersistedTaskDetail id={ID} />);
    const panel = await screen.findByTestId("legal-deadline-panel");
    expect(panel.textContent).toContain("Vencida há 2 dias");
    expect(panel.textContent).toContain("Vencimento: 10/11/2026");
    expect(panel.textContent).toContain("Início (ciência ou recebimento): 01/11/2026");
    await waitFor(() => expect(panel.textContent).toContain("Lei nº 12.527/2011"));
    const extract = screen.getByTestId("extract-quantities");
    expect(extract.getAttribute("href")).toBe(`/tasks/${ID}/extrair`);
    expect(extract.textContent).toBe("Extrair quantitativos (RF34)");
    expect(await screen.findByTestId("task-attachments")).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Remover prazo legal" }));
    await waitFor(() => expect(puts).toEqual([{ version: 3 }]));
  });

  it("planilha não oferece extração de quantitativos", async () => {
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/legal-deadlines")) return json(200, []);
      if (u.endsWith("/attachments")) return json(200, []);
      return json(200, view({ type: "PLANILHA" }));
    });
    renderWithProviders(<PersistedTaskDetail id={ID} />);
    await screen.findByTestId("persisted-task-detail");
    expect(screen.queryByTestId("extract-quantities")).toBeNull();
  });
});

describe("/attachments — meus anexos e evidências", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("lista com o link da tarefa e filtra evidências", async () => {
    fetchMock.mockResolvedValue(json(200, [
      attachment({ evidence }),
      attachment({ id: ATT2, taskId: "88888888-8888-4888-8888-888888888888", taskTitle: "Relatório final", fileName: "relatorio.pdf", image: false }),
    ]));
    renderWithProviders(<MyAttachments />);
    const rows = await screen.findAllByTestId("my-attachment-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]!).getByRole("link", { name: "Relatório final" }).getAttribute("href")).toBe("/tasks/88888888-8888-4888-8888-888888888888");
    expect(screen.getByRole("table").querySelector("caption")?.textContent).toBe("Anexos e evidências das minhas tarefas");
    fireEvent.click(screen.getByRole("button", { name: "Evidências (1)" }));
    expect(screen.getAllByTestId("my-attachment-row")).toHaveLength(1);
    expect(screen.getByText("1 arquivo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Documentos e outros (1)" }));
    expect(within(screen.getByTestId("my-attachment-row")).getByText(/relatorio\.pdf/)).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/api/attachments?limit=200");
  });

  it("sem anexos convida a ir ao acervo", async () => {
    fetchMock.mockResolvedValue(json(200, []));
    renderWithProviders(<MyAttachments />);
    expect(await screen.findByText("Nenhum anexo ainda")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para o acervo" }).getAttribute("href")).toBe("/tasks");
  });
});

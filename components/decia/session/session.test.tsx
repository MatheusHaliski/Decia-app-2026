// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "@/lib/decia/session/fixtures";
import { createMemorySessionRepository } from "@/lib/decia/session/repository";
import type { MemorySearch } from "@/lib/memory/search";
import { createMemoryLedger } from "@/lib/points/ledger";
import { loadTaskDraft } from "@/lib/tasks/drafts";
import { SessionList } from "./SessionList";
import { SessionView } from "./SessionView";

const nav = vi.hoisted(() => ({ search: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, prefetch: vi.fn() }),
  usePathname: () => "/decia/s-infraestrutura",
  useSearchParams: () => nav.search,
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

const NOW = new Date();
const S = DEMO_SESSION_IDS.infra;
const PASSAGE = "Os dados de cidadãos devem ser armazenados em território nacional.";
const search: MemorySearch = (q) => (/dados|regi[aã]o|pa[ií]s/i.test(q) ? [{
  docId: "doc-1", kind: "PORTARIA", title: "Portaria 12/2025", department: "SECID", year: 2025, href: null, score: 0.8,
  passage: { text: PASSAGE, start: 0, end: PASSAGE.length }, citation: "Portaria 12/2025 — SECID, §3",
}] : []);
const makeRepo = () => createMemorySessionRepository(buildDemoSessions(NOW), buildDemoOrgPolicy(NOW), { ledger: createMemoryLedger(), audit: createAuditLog(), people: DEMO_PEOPLE, search });
const open = (tab: string | null, repo = makeRepo(), prefs: { aiAutonomyDefault?: "MANUAL" | "SOB_SOLICITACAO" | "SUGESTOES" | "ASSISTIDO" | "AGENTE" } = {}) => {
  nav.search = new URLSearchParams(tab ? `tab=${tab}` : "");
  renderWithProviders(<SessionView sessionId={S} repo={repo} />, { prefs });
  return repo;
};
const log = () => screen.getByTestId("chat-log");

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  window.sessionStorage.clear();
});

describe("sessão: casca, chat e pontos", () => {
  it("faixa de objetivo com estado, fase e autonomia efetiva; chat como log acessível com o tipo de cada mensagem em texto", () => {
    open(null);
    expect(screen.getByTestId("objective").textContent).toContain("dobro de acessos");
    const band = screen.getByTestId("objective-band");
    expect(within(band).getByText("Aberta")).toBeTruthy();
    expect(within(band).getByText("fase Esclarecer")).toBeTruthy();
    expect(within(band).getByText("✦ IA: Sob solicitação")).toBeTruthy(); // preferência pessoal padrão limita a Sugestões da sessão
    expect(log().getAttribute("role")).toBe("log");
    expect(log().getAttribute("aria-live")).toBe("polite");
    expect(within(log()).getAllByText("Evidência").length).toBeGreaterThan(0);
    expect(within(log()).getAllByText("Aviso do sistema").length).toBeGreaterThan(0);
  });

  it("envia mensagem e evidência; a evidência confirmada mostra o ganho discreto só para quem enviou", () => {
    const repo = open(null);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Concordo com o recorte do teste." } });
    fireEvent.click(screen.getByTestId("send"));
    expect(within(log()).getByText("Concordo com o recorte do teste.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "EVIDENCIA" } });
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "A planilha do financeiro mostra R$ 84 mil por ano para a opção C." } });
    fireEvent.change(screen.getByLabelText("Título da fonte"), { target: { value: "Planilha de custos (financeiro)" } });
    fireEvent.click(screen.getByTestId("send"));
    expect(within(log()).getByText("Planilha de custos (financeiro)")).toBeTruthy();
    expect(within(log()).getByText("+5 DECIA Points · argumento com evidência")).toBeTruthy();
    // outra pessoa não vê o ganho de quem enviou
    fireEvent.change(screen.getByTestId("act-as"), { target: { value: "u-bruno" } });
    expect(within(log()).queryByText("+5 DECIA Points · argumento com evidência")).toBeNull();
    expect(repo.get(S)!.messages.at(-1)!.points).toMatchObject([{ status: "CREDITADO", delta: 5 }]);
  });

  it("IA do DECIA: com fonte cita o trecho exato numerado; sem fonte diz que não encontrou", () => {
    open(null);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Os dados podem ficar fora do país?" } });
    fireEvent.click(screen.getByTestId("ask-ai"));
    const cite = within(log()).getByTestId("citation");
    expect(cite.textContent).toContain("[1] Portaria 12/2025 — SECID, §3");
    expect(cite.textContent).toContain(`“${PASSAGE}”`);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Qual o melhor time de futebol?" } });
    fireEvent.click(screen.getByTestId("ask-ai"));
    expect(within(log()).getByTestId("ai-no-source").textContent).toContain("Não encontrei fonte");
  });

  it("modo Manual da pessoa: perguntar à IA fica indisponível e o conteúdo da IA aparece oculto", () => {
    open(null, makeRepo(), { aiAutonomyDefault: "MANUAL" });
    expect((screen.getByTestId("ask-ai") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText(/Perguntar à IA não está disponível: sua autonomia efetiva é Manual/).length).toBeGreaterThan(0);
    expect(within(log()).getAllByTestId("ai-hidden").length).toBeGreaterThan(0);
  });

  it("leitor só lê: sem compositor de envio", () => {
    open(null);
    fireEvent.change(screen.getByTestId("act-as"), { target: { value: "u-elisa" } });
    expect(screen.getByText(/Seu papel nesta sessão é de leitura/)).toBeTruthy();
    expect(screen.queryByTestId("send")).toBeNull();
  });
});

describe("autonomia da IA: troca de modo pela pessoa proprietária", () => {
  it("aviso do sistema para todos, selo de não lido para os outros membros e proposta antiga OBSOLETA", () => {
    const repo = open(null, makeRepo(), { aiAutonomyDefault: "ASSISTIDO" });
    fireEvent.click(screen.getByTestId("change-mode"));
    fireEvent.click(screen.getByRole("radio", { name: /Assistido/ }));
    expect(screen.getByRole("radio", { name: /Agente automático/ }).hasAttribute("disabled") || screen.getByRole("radio", { name: /Agente automático/ }).getAttribute("data-disabled") !== null).toBe(true);
    fireEvent.click(screen.getByTestId("confirm-mode"));
    expect(within(log()).getByText(/Pessoa Exemplo mudou a autonomia da IA nesta sessão de Sugestões para Assistido \(política v3\)\. Propostas calculadas antes ficaram obsoletas: 1\./)).toBeTruthy();
    expect(screen.getByTestId("session-mode").textContent).toBe("Assistido");
    // a pessoa que mudou não recebe o selo; os outros membros, sim
    expect(screen.queryByTestId("unread")).toBeNull();
    fireEvent.change(screen.getByTestId("act-as"), { target: { value: "u-bruno" } });
    expect(screen.getByTestId("unread").textContent).toContain("1 aviso(s) não lido(s)");
    expect(within(log()).getAllByText("Não lido").length).toBe(1);
    fireEvent.click(within(screen.getByTestId("unread")).getByRole("button", { name: "Marcar como lido" }));
    expect(screen.queryByTestId("unread")).toBeNull();
    expect(repo.get(S)!.unread["u-carla"]?.length).toBe(1);
  });

  it("na minuta, a proposta calculada na política anterior aparece obsoleta (não aplicável) com o motivo", () => {
    const repo = makeRepo();
    expect(repo.changeMode(S, "u-pessoa", "ASSISTIDO", null).ok).toBe(true);
    open("minuta", repo, { aiAutonomyDefault: "ASSISTIDO" });
    const cards = screen.getAllByTestId("proposal");
    const obsolete = cards.filter((c) => c.getAttribute("data-state") === "OBSOLETA");
    expect(obsolete).toHaveLength(2);
    expect(within(obsolete[0]!).getByTestId("obsolete-reason").textContent).toContain("a política de IA mudou depois desta proposta");
    expect(within(obsolete[0]!).queryByTestId("accept-proposal")).toBeNull();
  });

  it("aceitar proposta válida grava a revisão nova da minuta e a trilha de auditoria", () => {
    const repo = makeRepo();
    open("minuta", repo, { aiAutonomyDefault: "ASSISTIDO" });
    const pending = screen.getAllByTestId("proposal").find((c) => c.getAttribute("data-state") === "PENDENTE")!;
    expect(within(pending).getByTestId("word-diff")).toBeTruthy();
    fireEvent.click(within(pending).getByTestId("accept-proposal"));
    expect(repo.get(S)!.minuta.revision).toBe(5);
    expect(repo.audit.list().at(-1)).toMatchObject({ action: "ACEITOU", actorId: "u-pessoa", policy: { mode: "SUGESTOES", version: 2 } });
  });
});

describe("Ata Viva: da transcrição colada à ratificação", () => {
  const TRANSCRIPT = [
    "Pauta: custos de saída de dados",
    "Bruno Exemplo: Fica aprovado pedir a cotação de egress a dois provedores.",
    "Carla Exemplo: Eu fico com a cotação da AWS até sexta.",
    "Bruno Exemplo: Fulano deve revisar o contrato até 30/11.",
  ].join("\n");

  it("nova reunião → colar → compilar ✦ → revisar (aceitar, escolher responsável) → ratificar → encaminhamentos → Criar no Acervo", () => {
    const repo = open("artefatos");
    fireEvent.click(screen.getByTestId("new-meeting"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Título da reunião/), { target: { value: "Reunião de custos" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Abrir reunião" }));
    fireEvent.change(screen.getByLabelText("Transcrição"), { target: { value: TRANSCRIPT } });
    fireEvent.click(screen.getByTestId("compile"));

    const review = screen.getByTestId("minutes-review");
    expect(within(review).getByDisplayValue("Fica aprovado pedir a cotação de egress a dois provedores.")).toBeTruthy();
    const editors = within(review).getAllByTestId("followup-editor");
    expect(editors).toHaveLength(2);
    expect(within(editors[0]!).getByDisplayValue("Cotação da AWS")).toBeTruthy();
    expect(within(editors[1]!).getByText(/“Fulano” não é membro desta sessão/)).toBeTruthy();
    const ratify = within(review).getByTestId("ratify") as HTMLButtonElement;
    expect(ratify.disabled).toBe(true);
    expect(within(review).getByText("Falta resolver 2 ponto(s) antes de ratificar.")).toBeTruthy();

    fireEvent.click(within(editors[0]!).getByRole("button", { name: "Aceitar" }));
    fireEvent.change(within(screen.getAllByTestId("followup-editor")[1]!).getByLabelText("Responsável"), { target: { value: "u-diego" } });
    fireEvent.click(within(screen.getAllByTestId("followup-editor")[1]!).getByRole("button", { name: "Aceitar" }));
    expect((screen.getByTestId("ratify") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("ratify"));

    expect(screen.getByTestId("meeting-summary").textContent).toContain("Ratificada por Pessoa Exemplo");
    const followUps = screen.getAllByTestId("followup");
    expect(followUps.map((f) => f.textContent)).toEqual([expect.stringContaining("Cotação da AWS"), expect.stringContaining("Revisar o contrato")]);
    expect(followUps[1]!.textContent).toContain("Diego Exemplo");
    const s = repo.get(S)!;
    expect(s.messages.at(-1)).toMatchObject({ kind: "ATA" });
    expect(repo.audit.list().map((a) => a.action)).toEqual(["EDITOU_E_ACEITOU", "ACEITOU", "EDITOU_E_ACEITOU"]);

    fireEvent.click(within(followUps[0]!).getByRole("button", { name: "Criar no Acervo" }));
    expect(nav.push).toHaveBeenCalledTimes(1);
    const href = nav.push.mock.calls[0]![0] as string;
    expect(href).toMatch(/^\/tasks\/new\?rascunho=[a-z0-9]+$/);
    const draft = loadTaskDraft(href.split("=")[1]!);
    expect(draft).toMatchObject({ origin: { kind: "ATA", label: "Ata Viva — Reunião de custos" }, draft: { title: "Cotação da AWS", priority: "MEDIA" } });
    expect(draft!.draft.dueAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("gravação: sem MediaRecorder o navegador explica e oferece colar/enviar; o consentimento é por participante", () => {
    const repo = makeRepo();
    const m = repo.startMeeting(S, "u-pessoa", { title: "Gravada", baseDate: "2026-11-13", source: "GRAVACAO_NAVEGADOR", participantIds: ["u-bruno"] });
    if (!m.ok) throw new Error(m.reason);
    open("artefatos", repo);
    expect(screen.getByText("Faltam 2 consentimento(s).")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Bruno Exemplo concorda com a gravação" }));
    expect(screen.getByText("Faltam 1 consentimento(s).")).toBeTruthy();
    expect(screen.getByTestId("recorder-blocked").textContent).toContain("Este navegador não grava áudio.");
    expect(screen.getByTestId("recorder-blocked").textContent).toContain("Cole a transcrição ou envie um arquivo");
  });

  it("transcrição ao vivo só com reconhecimento LOCAL: com MediaRecorder e só reconhecimento na nuvem, explica que fica desligada", async () => {
    class FakeRecognition {}
    vi.stubGlobal("MediaRecorder", class {});
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    try {
      const repo = makeRepo();
      const m = repo.startMeeting(S, "u-pessoa", { title: "Gravada", baseDate: "2026-11-13", source: "GRAVACAO_NAVEGADOR", participantIds: [] });
      if (!m.ok) throw new Error(m.reason);
      open("artefatos", repo);
      await act(async () => {});
      expect(screen.getByTestId("recorder")).toBeTruthy();
      expect(screen.getByTestId("speech-explain").textContent).toContain("enviaria o áudio a um serviço do fabricante");
      expect((screen.getByRole("button", { name: "Iniciar gravação" }) as HTMLButtonElement).disabled).toBe(true); // falta consentimento
    } finally {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, "mediaDevices");
    }
  });
});

describe("lista de sessões (/decia › Sessões)", () => {
  it("filtra abertas e encerradas, mostra estado em texto e avisos não lidos de quem vê; cria sessão em rascunho com o padrão da organização", () => {
    const repo = makeRepo();
    renderWithProviders(<SessionList filter="abertas" repo={repo} currentUserId="u-diego" />);
    const cards = screen.getAllByTestId("session-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]!.textContent).toContain("1 aviso(s) não lido(s)");
    expect(within(cards[1]!).getByText("Validada")).toBeTruthy();
    fireEvent.click(screen.getByTestId("new-session"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Tema da sessão/), { target: { value: "Plano de capacitação" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar sessão" }));
    expect(nav.push).toHaveBeenCalledWith(expect.stringMatching(/^\/decia\/s-nova-/));
    const created = repo.list()[0]!;
    expect(created).toMatchObject({ status: "RASCUNHO", policy: { mode: "SOB_SOLICITACAO", version: 1 } });
  });
});

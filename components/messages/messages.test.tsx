// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { charCount, mergeMessages, MESSAGE_MAX, sendable, type ConversationView, type MessageView } from "@/lib/messages/client";
import { setUnread, useMessagesUnread } from "@/lib/messages/unread";
import { toAppNotification, type NotificationView } from "@/lib/notifications/client";
import { MessagesPage } from "./MessagesPage";
import { NEW_CONVERSATION_DEBOUNCE_MS } from "./NewConversationDialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
  usePathname: () => "/messages",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const err = (status: number, code: string) => json(status, { code, message: code, details: {}, correlationId: "c-1" });
const sleep = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
const ANA = { id: "22222222-2222-4222-8222-222222222222", username: "ana.souza", name: "Ana Souza", self: false, active: true };
const SELF = { id: ME.id, username: ME.username, name: "Maria", self: true, active: true };
const CONV = "33333333-3333-4333-8333-333333333333";
const now = new Date().toISOString();

const conversation = (over: Partial<ConversationView> = {}): ConversationView => ({
  id: CONV, kind: "DIRETA", title: null, participants: [SELF, ANA], unread: 2, lastActivityAt: now, canSend: true,
  lastMessage: { id: "m2", authorId: ANA.id, preview: "Pode revisar o parecer?", deleted: false, sentAt: now }, ...over,
});
const message = (id: string, sec: number, over: Partial<MessageView> = {}): MessageView => {
  const at = new Date(Date.UTC(2026, 9, 31, 12, 0, sec)).toISOString();
  return { id, conversationId: CONV, authorId: ANA.id, body: `texto ${id}`, mine: false, edited: false, deleted: false, sentAt: at, changedAt: at, ...over };
};

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response> | undefined;

describe("mensagens diretas reais (RF46)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let handler: Handler = () => undefined;
  const calls = (method: string, path: string) => fetchMock.mock.calls.filter(([u, i]) => {
    const url = new URL(String(u), "http://x");
    return (i?.method ?? "GET") === method && url.pathname === path;
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    push.mockReset();
    fetchMock.mockImplementation(async (u, init) => {
      const url = new URL(String(u), "http://x");
      if (url.pathname.endsWith("/api/me")) return json(200, ME);
      return (await handler(url, init)) ?? json(404, { code: "NAO_ENCONTRADO", message: "x" });
    });
  });
  afterEach(() => {
    act(() => tokenStore.clear());
    vi.unstubAllGlobals();
    document.cookie = "ws_rt_h=; max-age=0; path=/";
    setUnread(null);
  });

  const signedIn = (ui: React.ReactNode) => {
    tokenStore.set("jwt-de-teste");
    return renderWithProviders(<CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>);
  };

  it("no laboratório (sem provider de sessão) continua o esqueleto DEMO, sem chamar a API", () => {
    renderWithProviders(<MessagesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Mensagens/ })).toBeTruthy();
    expect(screen.getByText(/O que esta aba vai fazer/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem sessão pede para entrar, com volta para a conversa", async () => {
    renderWithProviders(<CurrentUserProvider><ViewerProvider><MessagesPage conversationId={CONV} /></ViewerProvider></CurrentUserProvider>);
    const link = await screen.findByTestId("dm-sign-in");
    expect(link.getAttribute("href")).toContain(encodeURIComponent(`/messages/${CONV}`));
  });

  it("lista as conversas por atividade com prévia, hora e não lidas anunciadas; vazio e erro com nova tentativa", async () => {
    handler = (url) => (url.pathname === "/api/conversations" ? json(200, [
      conversation(),
      conversation({ id: "44444444-4444-4444-8444-444444444444", kind: "GRUPO", title: "Obra da ponte", unread: 0,
        participants: [SELF, ANA], lastMessage: { id: "m9", authorId: ME.id, preview: "combinado", deleted: false, sentAt: now } }),
    ]) : undefined);
    signedIn(<MessagesPage />);
    const items = await screen.findAllByTestId("dm-conversation");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("Ana Souza");
    expect(items[0]!.textContent).toContain("Pode revisar o parecer?");
    expect(within(items[0]!).getByText("2 não lidas")).toBeTruthy();
    expect(items[0]!.getAttribute("href")).toBe(`/messages/${CONV}`);
    expect(items[1]!.textContent).toContain("Obra da ponte");
    expect(items[1]!.textContent).toContain("Você: combinado");
    expect(screen.getByText("Escolha uma conversa")).toBeTruthy();
  });

  it("estado vazio e erro com nova tentativa", async () => {
    let fail = true;
    handler = (url) => (url.pathname === "/api/conversations" ? (fail ? err(503, "SERVICO_INDISPONIVEL") : json(200, [])) : undefined);
    signedIn(<MessagesPage />);
    expect(await screen.findByText("Não foi possível carregar as conversas")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("abre a conversa: mensagens em ordem, editada e removida como texto, lida ao abrir e foco no título", async () => {
    handler = (url, init) => {
      if (url.pathname === "/api/conversations") return json(200, [conversation()]);
      if (url.pathname === `/api/conversations/${CONV}`) return json(200, conversation());
      if (url.pathname === `/api/conversations/${CONV}/messages`) {
        return json(200, { items: [message("m3", 3, { body: "<b>não é html</b> https://exemplo.gov.br", edited: true }),
          message("m2", 2, { deleted: true, body: null }), message("m1", 1, { mine: true, authorId: ME.id, body: "Bom dia" })],
        nextCursor: "2026-10-31T12:00:01Z", serverTime: now });
      }
      if (url.pathname === `/api/conversations/${CONV}/read` && init?.method === "POST") return json(200, { conversations: 0, messages: 0 });
      return undefined;
    };
    signedIn(<MessagesPage conversationId={CONV} />);
    const title = await screen.findByTestId("dm-conversation-title");
    expect(title.textContent).toBe("Ana Souza");
    await waitFor(() => expect(document.activeElement).toBe(title));
    const rows = screen.getAllByTestId("dm-message");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Bom dia"), expect.stringContaining("Mensagem removida"), expect.stringContaining("editada"),
    ]);
    expect(screen.getAllByTestId("dm-body")[1]!.textContent).toBe("<b>não é html</b> https://exemplo.gov.br");
    expect(document.querySelector("[data-testid=dm-messages] b")).toBeNull();
    expect(screen.getByRole("region", { name: "Mensagens com Ana Souza" })).toBeTruthy();
    await waitFor(() => expect(calls("POST", `/api/conversations/${CONV}/read`)).toHaveLength(1));
    // a lista zera as não lidas da conversa aberta
    await waitFor(() => expect(within(screen.getByTestId("dm-conversations")).queryByText("2 não lidas")).toBeNull());
    expect(screen.getByTestId("dm-older")).toBeTruthy();
  });

  it("compositor: Enter envia, Shift+Enter não, contador e limite de caracteres", async () => {
    handler = (url, init) => {
      if (url.pathname === "/api/conversations") return json(200, [conversation()]);
      if (url.pathname === `/api/conversations/${CONV}`) return json(200, conversation());
      if (url.pathname === `/api/conversations/${CONV}/messages` && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { body: string };
        return json(201, message("m10", 10, { body: body.body, mine: true, authorId: ME.id }));
      }
      if (url.pathname === `/api/conversations/${CONV}/messages`) return json(200, { items: [], nextCursor: null, serverTime: now });
      if (url.pathname === `/api/conversations/${CONV}/read`) return json(200, { conversations: 0, messages: 0 });
      return undefined;
    };
    signedIn(<MessagesPage conversationId={CONV} />);
    const input = (await screen.findByTestId("dm-input")) as HTMLTextAreaElement;
    expect(screen.getByText("Nenhuma mensagem ainda")).toBeTruthy();
    expect((screen.getByTestId("dm-send") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: "linha 1" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(calls("POST", `/api/conversations/${CONV}/messages`)).toHaveLength(0);
    expect(screen.getByTestId("dm-count").textContent).toBe("7/4.000 caracteres");

    fireEvent.change(input, { target: { value: "x".repeat(MESSAGE_MAX + 1) } });
    expect((screen.getByTestId("dm-send") as HTMLButtonElement).disabled).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(calls("POST", `/api/conversations/${CONV}/messages`)).toHaveLength(0);

    fireEvent.change(input, { target: { value: "  Olá, Ana!\nTudo certo?  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(calls("POST", `/api/conversations/${CONV}/messages`)).toHaveLength(1));
    const sent = JSON.parse(String(calls("POST", `/api/conversations/${CONV}/messages`)[0]![1]!.body)) as { body: string };
    expect(sent.body).toBe("Olá, Ana!\nTudo certo?");
    expect((await screen.findByTestId("dm-body")).textContent).toBe("Olá, Ana!\nTudo certo?");
    await waitFor(() => expect(input.value).toBe(""));
    expect(document.activeElement).toBe(input);
    expect(screen.getAllByTestId("dm-conversation")[0]!.textContent).toContain("Você: Olá, Ana!");
  });

  it("conversa inexistente ou de que não participa: o mesmo 404 vira 'conversa não encontrada'", async () => {
    handler = (url) => (url.pathname === "/api/conversations" ? json(200, []) : err(404, "NAO_ENCONTRADO"));
    signedIn(<MessagesPage conversationId={CONV} />);
    expect(await screen.findByTestId("dm-not-found")).toBeTruthy();
    expect(screen.getByText("Ela não existe ou você não participa dela.")).toBeTruthy();
  });

  it("polling: com a aba visível busca as mudanças desde o serverTime, anuncia com educação e marca como lida; oculta, não busca", async () => {
    let changes = 0;
    handler = (url) => {
      if (url.pathname === "/api/conversations") return json(200, [conversation({ unread: 0 })]);
      if (url.pathname === `/api/conversations/${CONV}`) return json(200, conversation({ unread: 0 }));
      if (url.pathname === `/api/conversations/${CONV}/messages`) return json(200, { items: [message("m1", 1)], nextCursor: null, serverTime: "2026-10-31T12:00:05Z" });
      if (url.pathname === `/api/conversations/${CONV}/messages/changes`) {
        changes++;
        expect(url.searchParams.get("since")).toBe(changes === 1 ? "2026-10-31T12:00:05Z" : "2026-10-31T12:00:20Z");
        return json(200, { items: changes === 1 ? [message("m1", 1, { body: "texto m1 corrigido", edited: true }), message("m2", 15, { body: "chegou agora" })] : [],
          serverTime: "2026-10-31T12:00:20Z", truncated: false });
      }
      if (url.pathname === `/api/conversations/${CONV}/read`) return json(200, { conversations: 0, messages: 0 });
      return undefined;
    };
    signedIn(<MessagesPage conversationId={CONV} />);
    await screen.findByText("texto m1");
    await waitFor(() => expect(calls("POST", `/api/conversations/${CONV}/read`)).toHaveLength(1));

    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(await screen.findByText("chegou agora")).toBeTruthy();
    expect(screen.getByText("texto m1 corrigido")).toBeTruthy();
    expect(screen.getAllByTestId("dm-message")).toHaveLength(2);
    expect(screen.getByTestId("dm-announcer").textContent).toBe("Nova mensagem de Ana Souza");
    expect(screen.getByTestId("dm-announcer").getAttribute("aria-live")).toBe("polite");
    await waitFor(() => expect(calls("POST", `/api/conversations/${CONV}/read`)).toHaveLength(2));

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    try {
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      await sleep(30);
      expect(changes).toBe(1);
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
    }
  });

  it("editar e apagar a própria mensagem (confirmação; fica 'Mensagem removida')", async () => {
    const mine = message("m1", 1, { mine: true, authorId: ME.id, body: "rascunho" });
    handler = (url, init) => {
      if (url.pathname === "/api/conversations") return json(200, [conversation()]);
      if (url.pathname === `/api/conversations/${CONV}`) return json(200, conversation());
      if (url.pathname === `/api/conversations/${CONV}/messages`) return json(200, { items: [mine], nextCursor: null, serverTime: now });
      if (url.pathname === `/api/conversations/${CONV}/messages/m1` && init?.method === "PUT") {
        return json(200, { ...mine, body: JSON.parse(String(init.body)).body, edited: true, changedAt: "2026-10-31T12:01:00Z" });
      }
      if (url.pathname === `/api/conversations/${CONV}/messages/m1` && init?.method === "DELETE") {
        return json(200, { ...mine, body: null, deleted: true, changedAt: "2026-10-31T12:02:00Z" });
      }
      if (url.pathname === `/api/conversations/${CONV}/read`) return json(200, { conversations: 0, messages: 0 });
      return undefined;
    };
    signedIn(<MessagesPage conversationId={CONV} />);
    fireEvent.click(await screen.findByRole("button", { name: /Editar a sua mensagem/ }));
    const box = screen.getByLabelText("Editar a mensagem") as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(box));
    fireEvent.change(box, { target: { value: "versão final" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("versão final")).toBeTruthy();
    expect(screen.getByText("editada")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Apagar a sua mensagem/ }));
    expect(document.activeElement?.textContent).toBe("Cancelar");
    fireEvent.click(screen.getByTestId("dm-confirm-delete"));
    expect(await screen.findByTestId("dm-removed")).toBeTruthy();
    expect(screen.queryByText("versão final")).toBeNull();
    expect(calls("DELETE", `/api/conversations/${CONV}/messages/m1`)).toHaveLength(1);
  });

  it("nova conversa: busca pessoas da empresa, escolhe e abre a conversa; recusa do servidor vira mensagem única", async () => {
    let refuse = true;
    handler = (url, init) => {
      if (url.pathname === "/api/conversations" && init?.method === "POST") {
        return refuse ? err(422, "PARTICIPANTE_INDISPONIVEL") : json(201, conversation({ id: "55555555-5555-4555-8555-555555555555", unread: 0, lastMessage: null }));
      }
      if (url.pathname === "/api/conversations") return json(200, []);
      if (url.pathname === "/api/people") return json(200, [{ id: ANA.id, username: ANA.username, name: ANA.name, jobTitle: "Analista" }]);
      return undefined;
    };
    signedIn(<MessagesPage />);
    fireEvent.click(await screen.findByTestId("dm-new"));
    const dialog = await screen.findByRole("dialog", { name: "Nova conversa" });
    fireEvent.change(within(dialog).getByTestId("new-conversation-search"), { target: { value: "an" } });
    await sleep(NEW_CONVERSATION_DEBOUNCE_MS + 50);
    await waitFor(() => expect(calls("GET", "/api/people")).toHaveLength(1));
    expect(new URL(String(calls("GET", "/api/people")[0]![0]), "http://x").searchParams.get("q")).toBe("an");
    expect((within(dialog).getByTestId("new-conversation-submit") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(await within(dialog).findByRole("checkbox"));
    fireEvent.click(within(dialog).getByTestId("new-conversation-submit"));
    expect((await within(dialog).findByTestId("new-conversation-error")).textContent).toBe("Não é possível conversar com uma ou mais pessoas escolhidas.");

    refuse = false;
    fireEvent.click(within(dialog).getByTestId("new-conversation-submit"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/messages/55555555-5555-4555-8555-555555555555"));
    const body = JSON.parse(String(calls("POST", "/api/conversations").at(-1)![1]!.body)) as { participantIds: string[] };
    expect(body.participantIds).toEqual([ANA.id]);
  });

  it("contador da navegação: conversas com não lidas pela API; null no laboratório (DEMO)", async () => {
    handler = (url) => (url.pathname === "/api/conversations/unread" ? json(200, { conversations: 3, messages: 7 }) : undefined);
    function Probe() { const n = useMessagesUnread(); return <span data-testid="probe">{n === null ? "demo" : n}</span>; }
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("demo");
    unmount();
    signedIn(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("3"));
    act(() => setUnread({ conversations: 0, messages: 0 }));
    expect(screen.getByTestId("probe").textContent).toBe("0");
  });
});

describe("apoio das mensagens", () => {
  it("mergeMessages junta por id, mantém a versão mais nova e ordena por envio", () => {
    const a = message("a", 1);
    const b = message("b", 2);
    const bEdited = { ...b, body: "novo", changedAt: "2026-10-31T13:00:00Z" };
    expect(mergeMessages([b, a], []).map((m) => m.id)).toEqual(["b", "a"]);
    expect(mergeMessages([a], [bEdited, b]).map((m) => m.body)).toEqual(["texto a", "novo"]);
    expect(mergeMessages([a, bEdited], [b]).find((m) => m.id === "b")!.body).toBe("novo");
  });

  it("sendable e charCount contam como o servidor (emoji = 1) e cortam as pontas", () => {
    expect(charCount("👍🏽")).toBe(2);
    expect(charCount("ação")).toBe(4);
    expect(sendable("   ")).toEqual({ text: "", ok: false, over: false });
    expect(sendable(" oi ").text).toBe("oi");
    expect(sendable("😀".repeat(MESSAGE_MAX)).ok).toBe(true);
    expect(sendable("😀".repeat(MESSAGE_MAX + 1)).over).toBe(true);
  });

  it("notificação MENSAGEM_DIRETA leva à conversa e não traz texto da mensagem", () => {
    const base = { id: "n1", type: "MENSAGEM_DIRETA", resourceType: "conversation", resourceId: CONV, actorName: "Ana Souza", read: false, createdAt: now };
    const direct = toAppNotification({ ...base, payload: { conversationKind: "DIRETA" } } as NotificationView, Date.now());
    expect(direct).toMatchObject({ titleKey: "notif.dm.direct", href: `/messages/${CONV}`, vars: { who: "Ana Souza" } });
    const group = toAppNotification({ ...base, payload: { conversationKind: "GRUPO", conversationTitle: "Obra" } } as NotificationView, Date.now());
    expect(group).toMatchObject({ titleKey: "notif.dm.group", vars: { who: "Ana Souza", title: "Obra" } });
    const untitled = toAppNotification({ ...base, payload: { conversationKind: "GRUPO" } } as NotificationView, Date.now());
    expect(untitled.titleKey).toBe("notif.dm.groupUntitled");
  });
});

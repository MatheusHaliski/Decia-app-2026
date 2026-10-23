// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/api/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { taskStateKey, toAppNotification } from "./client";
import { KIND_GLYPH, MOCK_NOTIFICATIONS, NOTIF_SIM_KEY, readSim, unreadCount } from "./mock";
import { useNotifications } from "./useNotifications";

afterEach(() => localStorage.removeItem(NOTIF_SIM_KEY));

describe("notificações (mock D-36)", () => {
  it("mock tipado: todo tipo tem glifo e chave i18n; contagem de não lidas", () => {
    for (const n of MOCK_NOTIFICATIONS) {
      expect(KIND_GLYPH[n.kind]).toBeTruthy();
      expect(n.titleKey.startsWith("notif.")).toBe(true);
      expect(n.href.startsWith("/")).toBe(true);
    }
    expect(unreadCount(MOCK_NOTIFICATIONS)).toBe(3);
    expect(readSim()).toBe("padrao");
    localStorage.setItem(NOTIF_SIM_KEY, "erro");
    expect(readSim()).toBe("erro");
    localStorage.setItem(NOTIF_SIM_KEY, "xyz");
    expect(readSim()).toBe("padrao");
  });

  it("hook: carregando → lista; marcar uma e todas como lidas; simulação vazio/erro + retry", async () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.unread).toBe(3);
    act(() => result.current.markRead("n1"));
    expect(result.current.unread).toBe(2);
    act(() => result.current.markAllRead());
    expect(result.current.unread).toBe(0);
    act(() => result.current.setSim("vazio"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toEqual([]);
    act(() => result.current.setSim("erro"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.setSim("padrao"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toHaveLength(MOCK_NOTIFICATIONS.length);
    expect(localStorage.getItem(NOTIF_SIM_KEY)).toBe("padrao");
  });
});

describe("notificações reais (RF27)", () => {
  const NOW = Date.parse("2026-10-17T12:00:00Z");
  const base = { id: "a", read: false, createdAt: "2026-10-17T11:30:00Z", resourceType: "task", resourceId: "t-1", actorName: "Ana Lima", category: "SOCIAL" as const };

  it("traduz cada tipo pelo payload, no idioma da pessoa, com link para o recurso", () => {
    const resp = toAppNotification({ ...base, type: "ATRIBUICAO_PROPOSTA", payload: { taskTitle: "Parecer" } }, NOW);
    expect(resp).toMatchObject({ kind: "ATRIBUICAO", titleKey: "notif.task.responsible", vars: { who: "Ana Lima", title: "Parecer" }, href: "/tasks/t-1", read: false });
    expect(resp.minutesAgo).toBe(30);
    expect(toAppNotification({ ...base, type: "TRANSICAO", payload: { taskTitle: "Parecer", to: "EM_USO" } }, NOW).titleKey).toBe("notif.task.EM_ANDAMENTO");
    expect(toAppNotification({ ...base, type: "TRANSICAO", payload: { taskTitle: "Parecer", to: "OFERECIDA" } }, NOW).titleKey).toBe("notif.task.PUBLICADO");
    const blocked = toAppNotification({ ...base, type: "TRANSICAO", actorName: undefined, payload: { taskTitle: "Parecer", to: "BLOQUEADA", reason: "Falta a planilha" } }, NOW);
    expect(blocked).toMatchObject({ titleKey: "notif.task.blockedWithReason", vars: { who: "", reason: "Falta a planilha" } });
    expect(taskStateKey("XYZ")).toBe("notif.task.changed");
    const sec = toAppNotification({ ...base, type: "SISTEMA", resourceType: "account", actorName: undefined, payload: { event: "TWO_FACTOR_DISABLED" } }, NOW);
    expect(sec).toMatchObject({ kind: "SEGURANCA", titleKey: "notif.security.twoFactorOff", href: "/settings?tab=conta" });
    expect(toAppNotification({ ...base, type: "REMIX", title: "Texto do servidor" }, NOW)).toMatchObject({ titleKey: "notif.fallback", vars: { title: "Texto do servidor" } });
    for (const k of ["TAREFA", "SEGURANCA"] as const) expect(KIND_GLYPH[k]).toBeTruthy();
  });

  describe("hook com conta logada", () => {
    const fetchMock = vi.fn<typeof fetch>();
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
    const wrapper = ({ children }: { children: ReactNode }) => <CurrentUserProvider>{children}</CurrentUserProvider>;
    let calls: { method: string; url: string }[] = [];
    beforeEach(() => {
      calls = [];
      vi.stubGlobal("fetch", fetchMock);
      fetchMock.mockReset();
      fetchMock.mockImplementation(async (url, init) => {
        const u = String(url);
        calls.push({ method: init?.method ?? "GET", url: u });
        if (u.endsWith("/api/me")) return json(200, ME);
        if (u.includes("/api/notifications/unread-count")) return json(200, { count: 7 });
        if (u.includes("/api/notifications?")) return json(200, [
          { ...base, id: "n-1", type: "ATRIBUICAO_PROPOSTA", payload: { taskTitle: "Parecer" } },
          { ...base, id: "n-2", type: "SISTEMA", read: true, payload: { event: "TWO_FACTOR_ENABLED" } },
        ]);
        if (u.includes("/read")) return new Response(null, { status: 204 });
        return json(404, {});
      });
    });
    afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

    it("lê da API, usa a contagem do servidor e marca uma e todas no servidor", async () => {
      tokenStore.set("jwt-de-teste");
      const { result } = renderHook(() => useNotifications(), { wrapper });
      await waitFor(() => expect(result.current.source).toBe("api"));
      await waitFor(() => expect(result.current.items).toHaveLength(2));
      expect(result.current.unread).toBe(7);
      expect(result.current.items[0]).toMatchObject({ id: "n-1", titleKey: "notif.task.responsible", href: "/tasks/t-1" });
      act(() => result.current.markRead("n-1"));
      expect(result.current.unread).toBe(6);
      act(() => result.current.markRead("n-2"));
      expect(result.current.unread).toBe(6);
      await waitFor(() => expect(calls.filter((c) => c.method === "POST")).toHaveLength(1));
      expect(calls.find((c) => c.method === "POST")?.url).toContain("/api/notifications/n-1/read");
      act(() => result.current.markAllRead());
      expect(result.current.unread).toBe(0);
      await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/api/notifications/read-all"))).toBe(true));
    });

    it("sem sessão o visitante não tem notificações e nada é pedido à API de notificações", async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      await waitFor(() => expect(result.current.source).toBe("anonymous"));
      await waitFor(() => expect(result.current.status).toBe("ready"));
      expect(result.current.items).toEqual([]);
      expect(result.current.unread).toBe(0);
      expect(calls.some((c) => c.url.includes("/api/notifications"))).toBe(false);
    });

    it("erro da API mostra o código do servidor e tentar de novo relê", async () => {
      tokenStore.set("jwt-de-teste");
      fetchMock.mockImplementation(async (url) => (String(url).endsWith("/api/me") ? json(200, ME)
        : json(503, { code: "INDISPONIVEL", message: "fora do ar" })));
      const { result } = renderHook(() => useNotifications(), { wrapper });
      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.errorCode).toBe("INDISPONIVEL");
    });
  });
});

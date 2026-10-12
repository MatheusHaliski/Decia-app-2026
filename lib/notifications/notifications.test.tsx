// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

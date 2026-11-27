import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "ws_rt_h" && state.cookie !== undefined ? { name, value: state.cookie } : undefined) }) }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

import HomePage from "./page";

describe("raiz /: home real", () => {
  beforeEach(() => { redirect.mockReset(); state.cookie = undefined; });

  it("com sessão (cookie-sinal) vai para Hoje", async () => {
    state.cookie = "1";
    await HomePage();
    expect(redirect).toHaveBeenCalledWith("/today");
  });

  it("sem sessão vai para o Mural", async () => {
    await HomePage();
    expect(redirect).toHaveBeenCalledWith("/mural");
    state.cookie = "0";
    await HomePage();
    expect(redirect).toHaveBeenLastCalledWith("/mural");
  });
});

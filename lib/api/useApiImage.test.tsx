// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { tokenStore } from "./client";
import { apiImageKind, clearApiImageCache } from "./useApiImage";

const AVATAR = "/api/people/11111111-1111-4111-8111-111111111111/avatar?v=m1";
const jpeg = () => new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 200, headers: { "content-type": "image/jpeg" } });
const notFound = () => new Response(JSON.stringify({ status: 404, code: "NAO_ENCONTRADO", message: "Não encontrado" }), { status: 404, headers: { "content-type": "application/json" } });

describe("useApiImage / ProfileAvatar (RF3.CA05: foto autenticada)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const createObjectURL = vi.fn((b: Blob) => `blob:test/${b.size}-${createObjectURL.mock.calls.length}`);
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    tokenStore.set("jwt-de-teste");
  });
  afterEach(() => {
    act(() => tokenStore.clear());
    clearApiImageCache();
    vi.unstubAllGlobals();
  });

  it("baixa uma vez só para duas instâncias com a mesma URL, com o Bearer, e exibe por createObjectURL", async () => {
    fetchMock.mockImplementation(async () => jpeg());
    const { container } = render(<><ProfileAvatar name="Maria da Silva" src={AVATAR} size={30} /><ProfileAvatar name="Maria da Silva" src={AVATAR} size={64} /></>);
    // carregando: iniciais
    expect(container.querySelectorAll("[role=img]").length).toBe(2);
    expect(container.textContent).toContain("MS");
    await waitFor(() => expect(container.querySelectorAll("img").length).toBe(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/people\/11111111-1111-4111-8111-111111111111\/avatar\?v=m1$/);
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-de-teste");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs[0]).toMatch(/^blob:test\//);
    expect(srcs[1]).toBe(srcs[0]);
  });

  it("uma nova montagem com a mesma URL usa o cache (não baixa de novo)", async () => {
    fetchMock.mockImplementation(async () => jpeg());
    const first = render(<ProfileAvatar name="Maria" src={AVATAR} />);
    await waitFor(() => expect(first.container.querySelector("img")).toBeTruthy());
    first.unmount();
    const second = render(<ProfileAvatar name="Maria" src={AVATAR} />);
    expect(second.container.querySelector("img")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("em erro (404 NAO_ENCONTRADO) fica nas iniciais", async () => {
    fetchMock.mockImplementation(async () => notFound());
    const { container } = render(<ProfileAvatar name="Ana Souza" src={AVATAR} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[role=img]")?.textContent).toBe("AS");
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("URL https antiga passa direto, sem fetch", () => {
    const { container } = render(<ProfileAvatar name="Ana" src="https://cdn.example/ana.png" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/ana.png");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("descarta a resposta fora de ordem: a foto antiga que chega depois não substitui a atual", async () => {
    const OLD = AVATAR;
    const NEW = AVATAR.replace("v=m1", "v=m2");
    const pending: Record<string, (r: Response) => void> = {};
    fetchMock.mockImplementation((url) => new Promise<Response>((resolve) => { pending[String(url).includes("v=m1") ? "old" : "new"] = resolve; }));
    const { container, rerender } = render(<ProfileAvatar name="Maria" src={OLD} />);
    await waitFor(() => expect(pending.old).toBeTruthy());
    rerender(<ProfileAvatar name="Maria" src={NEW} />);
    await waitFor(() => expect(pending.new).toBeTruthy());
    await act(async () => { pending.new!(new Response(new Uint8Array(7), { status: 200, headers: { "content-type": "image/jpeg" } })); });
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    const current = container.querySelector("img")!.getAttribute("src");
    await act(async () => { pending.old!(jpeg()); });
    await act(async () => { await Promise.resolve(); });
    expect(container.querySelector("img")!.getAttribute("src")).toBe(current);
    expect(current).toMatch(/^blob:test\/7-/);
  });

  it("sem foto, http:, // e outros esquemas não viram imagem", () => {
    expect(apiImageKind(undefined)).toBe("none");
    expect(apiImageKind("")).toBe("none");
    expect(apiImageKind("http://insecure.example/a.png")).toBe("none");
    expect(apiImageKind("//evil.example/a.png")).toBe("none");
    expect(apiImageKind("javascript:alert(1)")).toBe("none");
    expect(apiImageKind("https://cdn.example/a.png")).toBe("direct");
    expect(apiImageKind(AVATAR)).toBe("api");
  });

  it("ao sair da sessão o cache é esvaziado e os object URLs revogados", async () => {
    fetchMock.mockImplementation(async () => jpeg());
    const { container } = render(<ProfileAvatar name="Maria" src={AVATAR} />);
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    act(() => tokenStore.clear());
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(container.querySelector("img")).toBeNull();
  });
});

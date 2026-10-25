// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { tokenStore } from "@/lib/api/client";
import { clearApiImageCache } from "@/lib/api/useApiImage";
import { AVATAR_MAX_BYTES, accountApi } from "@/lib/account/client";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { UserPanel } from "@/components/shell/UserPanel";
import { AccountPanel } from "./AccountPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ID = "11111111-1111-4111-8111-111111111111";
const ME = { id: ID, username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", email: "maria@example.com", profileType: "EMPREGADO", role: "USER", status: "ACTIVE", jobTitle: "Analista" };
const AVATAR = `/api/people/${ID}/avatar?v=m1`;

const withSession = (ui: React.ReactNode) => <CurrentUserProvider><ViewerProvider>{ui}</ViewerProvider></CurrentUserProvider>;
const png = (name = "foto.png", type = "image/png", size?: number) => {
  const f = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });
  if (size !== undefined) Object.defineProperty(f, "size", { value: size });
  return f;
};

interface Call { method: string; url: string; body?: BodyInit | null }

describe("Configurações › Conta › Foto de perfil (RF3.CA05)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let calls: Call[] = [];
  let me: Record<string, unknown> = { ...ME };
  let avatarReply: () => Response = () => json(200, { ...me, avatarUrl: AVATAR });

  beforeEach(() => {
    calls = [];
    me = { ...ME };
    avatarReply = () => { me = { ...me, avatarUrl: AVATAR }; return json(200, me); };
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      calls.push({ method, url: u, body: init?.body });
      if (u.endsWith("/api/me") && method === "GET") return json(200, me);
      if (u.endsWith("/api/me/avatar") && method === "POST") return avatarReply();
      if (u.endsWith("/api/me/avatar") && method === "DELETE") { me = { ...me, avatarUrl: undefined }; return json(200, me); }
      if (u.includes(`/api/people/${ID}/avatar`)) return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 200, headers: { "content-type": "image/jpeg" } });
      return json(404, { status: 404, code: "NAO_ENCONTRADO" });
    });
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:avatar/1"), revokeObjectURL: vi.fn() });
    tokenStore.set("jwt-de-teste");
  });
  afterEach(() => { act(() => tokenStore.clear()); clearApiImageCache(); vi.unstubAllGlobals(); });

  const meLoads = () => calls.filter((c) => c.method === "GET" && c.url.endsWith("/api/me")).length;

  it("envia FormData com `file` para /api/me/avatar, recarrega a conta e a barra mostra a foto; foco e anúncio ao concluir", async () => {
    renderWithProviders(withSession(<><UserPanel /><AccountPanel /></>));
    const section = await screen.findByTestId("avatar-section");
    expect(within(section).getByText("PNG, JPEG ou WEBP até 5 MB. Recortamos ao centro e removemos os dados de localização da imagem.")).toBeTruthy();
    expect(within(section).queryByTestId("avatar-remove")).toBeNull();
    const input = within(section).getByLabelText("Escolher arquivo da foto de perfil") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("image/png,image/jpeg,image/webp");
    expect(screen.queryByLabelText(/URL/i)).toBeNull();
    const before = meLoads();

    const file = png();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByTestId("avatar-status").textContent).toBe("Foto de perfil atualizada."));
    const post = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/me/avatar"))!;
    expect(post.body).toBeInstanceOf(FormData);
    const sent = (post.body as FormData).get("file") as File;
    expect(sent).toBeInstanceOf(File);
    expect({ name: sent.name, type: sent.type, size: sent.size }).toEqual({ name: file.name, type: file.type, size: file.size });
    expect([...(post.body as FormData).keys()]).toEqual(["file"]);
    expect(meLoads()).toBe(before + 1);
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
    // a barra e a seção mostram a foto nova (baixada com o token, uma vez só)
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Maria" }).filter((el) => el.tagName === "IMG").length).toBeGreaterThanOrEqual(2));
    expect(calls.filter((c) => c.url.includes(`/api/people/${ID}/avatar`)).length).toBe(1);
    expect(within(section).getByTestId("avatar-remove")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(within(section).getByTestId("avatar-upload")));
  });

  it("arquivo grande demais ou de tipo errado não chama a API e mostra a mensagem", async () => {
    renderWithProviders(withSession(<AccountPanel />));
    const input = await screen.findByLabelText("Escolher arquivo da foto de perfil");
    const before = calls.length;

    fireEvent.change(input, { target: { files: [png("enorme.png", "image/png", AVATAR_MAX_BYTES + 1)] } });
    expect((await screen.findByTestId("avatar-error")).textContent).toContain("“enorme.png” tem 5,1 MB e o limite é 5 MB");

    fireEvent.change(input, { target: { files: [png("documento.gif", "image/gif")] } });
    await waitFor(() => expect(screen.getByTestId("avatar-error").textContent).toContain("“documento.gif” não é uma imagem PNG, JPEG ou WEBP"));

    fireEvent.change(input, { target: { files: [png("vetor.svg", "image/svg+xml")] } });
    await waitFor(() => expect(screen.getByTestId("avatar-error").textContent).toContain("“vetor.svg”"));
    expect(calls.length).toBe(before);
    expect(screen.getByTestId("avatar-error").getAttribute("role")).toBe("alert");
  });

  it("o cliente também recusa sem enviar quando chamado direto", async () => {
    await expect(accountApi.uploadAvatar(png("x.bmp", "image/bmp"))).rejects.toMatchObject({ name: "AvatarFileError", code: "TIPO_NAO_PERMITIDO" });
    await expect(accountApi.uploadAvatar(png("x.png", "image/png", AVATAR_MAX_BYTES + 1))).rejects.toMatchObject({ code: "ARQUIVO_GRANDE_DEMAIS" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [415, "TIPO_NAO_PERMITIDO", "Formato não aceito. Envie uma imagem PNG, JPEG ou WEBP."],
    [415, "TIPO_DIVERGENTE", "O conteúdo do arquivo não corresponde ao tipo de imagem informado"],
    [413, "ARQUIVO_GRANDE_DEMAIS", "A imagem passa de 5 MB"],
    [413, undefined, "A imagem passa de 5 MB"],
    [422, "IMAGEM_INVALIDA", "Não conseguimos ler esta imagem"],
    [422, "IMAGEM_GRANDE_DEMAIS", "As dimensões da imagem são grandes demais"],
    [422, "ARQUIVO_VAZIO", "O arquivo está vazio"],
    [422, "ARQUIVO_INFECTADO", "bloqueado pela verificação de segurança"],
  ])("erro %i %s do servidor mostra a mensagem certa", async (status, code, text) => {
    avatarReply = () => json(status, code ? { status, code, message: "server", details: {} } : {});
    renderWithProviders(withSession(<AccountPanel />));
    const input = await screen.findByLabelText("Escolher arquivo da foto de perfil");
    const before = meLoads();
    fireEvent.change(input, { target: { files: [png()] } });
    const error = await screen.findByTestId("avatar-error");
    expect(error.textContent).toContain("Não foi possível enviar a foto");
    expect(error.textContent).toContain(text);
    expect(meLoads()).toBe(before);
    expect(screen.getByTestId("avatar-status").textContent).toBe("");
  });

  it("remover pede confirmação, chama DELETE /api/me/avatar, recarrega e volta às iniciais", async () => {
    me = { ...ME, avatarUrl: AVATAR };
    renderWithProviders(withSession(<AccountPanel />));
    const section = await screen.findByTestId("avatar-section");
    await waitFor(() => expect(section.querySelector("img")).toBeTruthy());
    fireEvent.click(within(section).getByTestId("avatar-remove"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Remover a foto de perfil?")).toBeTruthy();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const before = meLoads();
    fireEvent.click(within(dialog).getByTestId("avatar-remove-confirm"));

    await waitFor(() => expect(screen.getByTestId("avatar-status").textContent).toMatch(/^Foto de perfil removida/));
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/api/me/avatar"))).toBe(true);
    expect(meLoads()).toBe(before + 1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(section.querySelector("img")).toBeNull();
    expect(within(section).queryByTestId("avatar-remove")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(within(section).getByTestId("avatar-upload")));
  });

  it("cancelar a confirmação não remove", async () => {
    me = { ...ME, avatarUrl: AVATAR };
    renderWithProviders(withSession(<AccountPanel />));
    fireEvent.click(await screen.findByTestId("avatar-remove"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("com a exclusão agendada, os botões ficam desabilitados", async () => {
    me = { ...ME, status: "DELETION_SCHEDULED", avatarUrl: AVATAR };
    renderWithProviders(withSession(<AccountPanel />));
    expect(((await screen.findByTestId("avatar-upload")) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("avatar-remove") as HTMLButtonElement).disabled).toBe(true);
  });
});

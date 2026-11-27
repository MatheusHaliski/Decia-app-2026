// @vitest-environment jsdom
/**
 * Aba "Carreira" do perfil próprio (auditoria 27/11/2026): profissão, plano e atalho para trocar; sem profissão, escolhe ali mesmo.
 * Cadastro com a pergunta opcional de profissão (D-148) e "ainda não sei".
 */
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnProfile } from "@/components/account/OwnProfile";
import { RegisterForm } from "@/components/auth/AuthForms";
import { tokenStore } from "@/lib/api/client";
import { pageByRoute } from "@/lib/pages/registry";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { memoryAdapter, renderWithProviders } from "@/test-utils/render";
import { CareerTab } from "./CareerTab";

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); nav.push.mockReset(); nav.search = ""; });
afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); document.cookie = "ws_rt_h=; max-age=0; path=/"; });

describe("CareerTab", () => {
  it("com profissão: nome, categoria, aviso de privacidade, atalho para trocar e o plano aberto", async () => {
    fetchMock.mockResolvedValue(json(401, {}));
    renderWithProviders(<CareerTab />, { prefs: { preferredOccupation: "engenharia-civil" } });
    const occ = screen.getByTestId("career-tab-occupation");
    expect(occ.textContent).toContain("Engenharia Civil");
    expect(occ.textContent).toContain("Engenharia");
    expect(screen.getByTestId("career-tab-privacy").textContent).toContain("Só você vê");
    expect(within(occ).getByRole("link", { name: "Trocar profissão" }).getAttribute("href")).toBe("/settings?tab=trabalho");
    expect(within(occ).getByRole("link", { name: /Balcão/ }).getAttribute("href")).toBe("/models");
    expect(screen.getByTestId("development-plan").hasAttribute("open")).toBe(true);
  });

  it("sem profissão: explica e deixa escolher ali mesmo (vai para as preferências)", async () => {
    const adapter = memoryAdapter();
    fetchMock.mockResolvedValue(json(401, {}));
    renderWithProviders(<CareerTab />, { adapters: [adapter] });
    expect(screen.getByTestId("career-tab-empty")).toBeTruthy();
    expect(screen.queryByTestId("development-plan")).toBeNull();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "direito" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    await waitFor(() => expect(adapter.saved.at(-1)?.preferredOccupation).toBe("direito"));
    expect(screen.getByTestId("career-tab-occupation").textContent).toContain("Direito");
  });

  it("registrada só no perfil próprio: ?tab=carreira abre a aba", async () => {
    const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
    fetchMock.mockImplementation(async (url) => (String(url).endsWith("/api/me") ? json(200, ME) : String(url).includes("/api/tasks") ? json(200, []) : json(404, {})));
    nav.search = "tab=carreira";
    tokenStore.set("jwt-de-teste");
    renderWithProviders(<CurrentUserProvider><ViewerProvider><OwnProfile page={pageByRoute("/profile")!} /></ViewerProvider></CurrentUserProvider>, { prefs: { preferredOccupation: "direito" } });
    expect(await screen.findByTestId("career-tab")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Carreira" })).toBeTruthy();
  });
});

describe("cadastro: profissão opcional (D-148)", () => {
  it("pergunta com 'ainda não sei', não vai no corpo do cadastro e fica nas preferências do dono", async () => {
    const adapter = memoryAdapter();
    fetchMock.mockImplementation(async () => json(201, { maskedEmail: "m***@x.com" }));
    renderWithProviders(<RegisterForm />, { adapters: [adapter] });
    const box = screen.getByTestId("register-occupation");
    expect(box.textContent).toContain("Qual profissão você quer desenvolver? (opcional)");
    const combo = within(box).getByRole("combobox");
    fireEvent.keyDown(combo, { key: "ArrowDown" });
    expect(within(screen.getByRole("listbox")).getAllByRole("option")[0]!.textContent).toContain("Ainda não sei");
    fireEvent.keyDown(combo, { key: "Escape" });
    fireEvent.change(combo, { target: { value: "contabeis" } });
    fireEvent.keyDown(combo, { key: "Enter" });
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: "Senha-forte-123" } });
    fireEvent.change(screen.getByLabelText(/^Confirm/), { target: { value: "Senha-forte-123" } });
    await act(async () => { fireEvent.submit(combo.closest("form")!); });
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    const body = String(fetchMock.mock.calls.find(([u]) => String(u).includes("register"))?.[1]?.body ?? "");
    expect(body).not.toContain("ciencias-contabeis");
    expect(body).not.toMatch(/occupation/i);
    expect(adapter.saved.at(-1)?.preferredOccupation).toBe("ciencias-contabeis");
  });

  it("sem escolha ('ainda não sei'), nada é gravado", async () => {
    const adapter = memoryAdapter();
    fetchMock.mockImplementation(async () => json(201, { maskedEmail: "m***@x.com" }));
    renderWithProviders(<RegisterForm />, { adapters: [adapter] });
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: "a" } });
    fireEvent.change(screen.getByLabelText(/^Confirm/), { target: { value: "a" } });
    await act(async () => { fireEvent.submit(screen.getByTestId("register-occupation").closest("form")!); });
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    expect(adapter.saved).toHaveLength(0);
  });
});

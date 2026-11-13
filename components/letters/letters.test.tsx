// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { buildDemoPieces } from "@/lib/letters/fixtures";
import { createMemoryLettersRepository } from "@/lib/letters/repository";
import { LettersHome } from "./LettersHome";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/letters",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const NOW = new Date("2026-11-13T12:00:00Z");

describe("/letters — minhas peças e modelos", () => {
  beforeEach(() => nav.push.mockReset());

  it("lista as peças DEMO com tipo, gênero, revisão e link para abrir", async () => {
    const repo = createMemoryLettersRepository(buildDemoPieces(NOW));
    renderWithProviders(<LettersHome repo={repo} />);
    const list = await screen.findByRole("list", { name: "Minhas peças" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[0]!).getByRole("link", { name: "Relatório técnico — Auditoria do protocolo digital" }).getAttribute("href")).toBe("/letters/relatorio-auditoria-protocolo");
    expect(within(items[0]!).getByText(/Revisão 1 · \d+ palavras/)).toBeTruthy();
    expect(screen.getAllByText("DEMO").length).toBeGreaterThan(0);
  });

  it("cria a partir de modelo com o título digitado e abre a peça nova", async () => {
    const repo = createMemoryLettersRepository([], () => "nova-peca");
    renderWithProviders(<LettersHome repo={repo} />, { prefs: { aiAutonomyDefault: "SUGESTOES" } });
    fireEvent.change(await screen.findByLabelText("Título da nova peça"), { target: { value: "Parecer sobre o contrato" } });
    const templates = screen.getByRole("list", { name: "Modelos" });
    expect(within(templates).getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Criar Parecer" }));
    expect(nav.push).toHaveBeenCalledWith("/letters/nova-peca");
    const piece = repo.get("nova-peca")!;
    expect(piece).toMatchObject({ title: "Parecer sobre o contrato", docType: "PARECER" });
    expect(piece.policy.mode).toBe("SUGESTOES");
    expect(piece.blocks.some((b) => b.text === "2 Análise")).toBe(true);
  });

  it("sem título usa o nome do modelo; o modo padrão Agente começa como Assistido", async () => {
    const repo = createMemoryLettersRepository([], () => "adr");
    renderWithProviders(<LettersHome repo={repo} />, { prefs: { aiAutonomyDefault: "AGENTE" } });
    fireEvent.click(await screen.findByRole("button", { name: "Criar ADR (decisão de arquitetura)" }));
    expect(repo.get("adr")).toMatchObject({ title: "Registro de decisão de arquitetura", policy: { mode: "ASSISTIDO" } });
  });
});

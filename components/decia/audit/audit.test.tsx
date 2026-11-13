// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { buildDemoAudit, buildDemoOrgPolicy, buildDemoSessions } from "@/lib/decia/session/fixtures";
import { createMemorySessionRepository, setDemoSessionRepository } from "@/lib/decia/session/repository";
import { createMemoryLedger } from "@/lib/points/ledger";
import { AuditPanel } from "./AuditPanel";
import { WordDiff } from "./WordDiff";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/decia/review",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

const NOW = new Date();
const makeRepo = (audit = createAuditLog(buildDemoAudit(NOW))) =>
  createMemorySessionRepository(buildDemoSessions(NOW), buildDemoOrgPolicy(NOW), { ledger: createMemoryLedger(), audit, people: DEMO_PEOPLE, search: () => [] });
const rows = () => within(screen.getByTestId("audit-table")).getAllByRole("row").slice(1);

describe("comparação por palavra acessível", () => {
  it("removido em <del> e inserido em <ins>, com marca e rótulo para leitor de tela (não só cor); lado a lado e unificada", () => {
    renderWithProviders(<WordDiff before="Ana revisa até sexta." after="Ana revisa até 20/11." beforeLabel="Antes" afterLabel="Depois" />);
    expect(screen.getByTestId("diff-summary").textContent).toBe("1 palavra(s) removida(s) · 2 inserida(s)");
    const del = within(screen.getByTestId("diff-before")).getByText("sexta", { exact: false }).closest("del")!;
    expect(del.textContent).toBe("removido:−sexta");
    expect(within(del).getByText("removido:").className).toContain("sr-only");
    const ins = screen.getByTestId("diff-after").querySelector("ins")!;
    expect(ins.textContent).toBe("inserido:+20/11");
    expect(screen.getByText("− riscado = removido · + sublinhado = inserido")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unificada" }));
    expect(screen.getByTestId("diff-unified").querySelectorAll("del, ins")).toHaveLength(2);
  });
});

describe("painel de auditoria das revisões", () => {
  beforeEach(() => setDemoSessionRepository(null));
  afterEach(() => vi.restoreAllMocks());

  it("lista a trilha (sessões + revisões das decisões estruturadas), verifica a cadeia e mostra política e motivo", () => {
    renderWithProviders(<AuditPanel repo={makeRepo()} />, { profile: "CHEFE" });
    expect(screen.getByText("✓ Cadeia íntegra (7 registro(s) somente-acréscimo)")).toBeTruthy();
    expect(screen.getByTestId("audit-count").textContent).toBe("8 de 8 registro(s)");
    expect(rows()).toHaveLength(8);
    expect(screen.getAllByText("Decisão estruturada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sob solicitação · v1").length).toBe(7);
    expect(screen.getByText("Já tratado no processo de empenho.")).toBeTruthy();
  });

  it("filtros por tipo, pessoa, sessão e período; limpar volta tudo", () => {
    renderWithProviders(<AuditPanel repo={makeRepo()} />, { profile: "CHEFE" });
    fireEvent.change(screen.getByLabelText("Tipo de intervenção"), { target: { value: "REJEITOU" } });
    expect(rows()).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Pessoa"), { target: { value: "u-pessoa" } });
    expect(rows()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    fireEvent.change(screen.getByLabelText("Sessão"), { target: { value: "DECISOES" } });
    expect(rows()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    const tomorrow = new Date(NOW.getTime() + 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText("De"), { target: { value: tomorrow } });
    expect(screen.getByText("Nenhum registro com esses filtros")).toBeTruthy();
  });

  it("comparar ANTES × DEPOIS: a edição humana da proposta da IA aparece por palavra; dá para trocar a comparação", () => {
    renderWithProviders(<AuditPanel repo={makeRepo()} />, { profile: "CHEFE" });
    fireEvent.change(screen.getByLabelText("Tipo de intervenção"), { target: { value: "EDITOU_E_ACEITOU" } });
    const target = rows().find((r) => r.textContent!.includes("Preparar o termo de referência"))!;
    fireEvent.click(within(target).getByRole("button", { name: /Comparar versões de Preparar o termo de referência/ }));
    const cmp = screen.getByTestId("audit-comparison");
    expect(within(cmp).getByRole("button", { name: "Proposta da IA × aprovado" }).getAttribute("aria-pressed")).toBe("true");
    // "Termo de referência" → "Preparar o termo de referência": a maiúscula muda a palavra (1 removida, 3 inseridas)
    expect(within(cmp).getByTestId("diff-summary").textContent).toBe("1 palavra(s) removida(s) · 3 inserida(s)");
    const inserted = [...within(cmp).getByTestId("diff-after").querySelectorAll("ins")].map((n) => n.textContent!.replace("inserido:+", ""));
    expect(inserted.join(" ").replace(/\s+/g, " ").trim()).toBe("Preparar o termo");
    expect([...within(cmp).getByTestId("diff-before").querySelectorAll("del")].map((n) => n.textContent)).toEqual(["removido:−Termo"]);
    expect(within(cmp).getByText(/livro somente-acréscimo, registro nº 2/)).toBeTruthy();
    fireEvent.click(within(cmp).getByRole("button", { name: "Antes × depois" }));
    expect(within(cmp).getByTestId("diff-before").textContent).toBe("(vazio)");
  });

  it("cadeia adulterada é denunciada na tela", () => {
    const audit = createAuditLog(buildDemoAudit(NOW));
    const tampered = { ...audit, verify: () => ({ ok: false as const, brokenAt: 3 }) };
    renderWithProviders(<AuditPanel repo={makeRepo(tampered)} />, { profile: "CHEFE" });
    expect(screen.getByText("✕ Cadeia quebrada no registro 3")).toBeTruthy();
  });

  it("exporta o que está filtrado em CSV e JSON (arquivo gerado no navegador)", async () => {
    const blobs: Blob[] = [];
    const create = vi.fn((b: Blob) => { blobs.push(b); return "blob:x"; });
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderWithProviders(<AuditPanel repo={makeRepo()} />, { profile: "CHEFE" });
    fireEvent.change(screen.getByLabelText("Tipo de intervenção"), { target: { value: "REVERTEU" } });
    fireEvent.click(screen.getByTestId("export-csv"));
    fireEvent.click(screen.getByTestId("export-json"));
    expect(click).toHaveBeenCalledTimes(2);
    const csv = await blobs[0]!.text();
    expect(csv.split("\r\n").filter(Boolean)[0]).toContain("acao,origem,sessao_id");
    expect(csv).toContain("REVERTEU");
    expect(csv).not.toContain("REJEITOU");
    const json = JSON.parse(await blobs[1]!.text());
    expect(json).toMatchObject({ count: 1, chainOk: true, filters: { action: "REVERTEU" } });
  });
});

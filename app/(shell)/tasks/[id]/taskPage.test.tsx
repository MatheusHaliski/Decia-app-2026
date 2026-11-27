// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { TaskPageClient } from "./TaskPageClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/t-pessoa-relatorio",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

describe("/tasks/[id] (DEMO)", () => {
  it("o título da página é o nome da tarefa, nunca o id técnico t-…", async () => {
    renderWithProviders(<TaskPageClient taskId="t-pessoa-relatorio" />);
    const h = await screen.findByRole("heading", { level: 1, name: /Relatório fotográfico de vistoria da escola/ });
    expect(h.textContent).not.toContain("t-pessoa-relatorio");
  });

  it("tarefa fora da memória da aba: título só “Tarefa”, sem o id", async () => {
    renderWithProviders(<TaskPageClient taskId="t-nao-existe" />);
    const h = await screen.findByRole("heading", { level: 1 });
    expect(h.textContent).not.toContain("t-nao-existe");
  });
});

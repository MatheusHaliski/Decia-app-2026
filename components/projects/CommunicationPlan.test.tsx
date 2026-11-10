// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/projects/metrics";
import { renderPanel } from "@/test-utils/projects";
import { CommunicationPlan } from "./CommunicationPlan";

const metric = (m: Parameters<typeof computeMetrics>[0]) => computeMetrics(m).quality.find((x) => x.id === "Q_COMUNICACAO")!;

describe("plano de comunicação ligado ao mapa poder × interesse", () => {
  it("aponta quem deveria ser comunicado e não é (Secretário e Controle interno no DEMO)", () => {
    const h = renderPanel(CommunicationPlan);
    expect(document.querySelectorAll("[data-comm-item]").length).toBe(2);
    expect(document.querySelector('[data-gap="s1"]')!.textContent).toMatch(/Secretário das Cidades/);
    expect(document.querySelector('[data-gap="s4"]')).toBeTruthy();
    expect(metric(h.state.model)).toMatchObject({ status: "CRITICO", value: "1/3" });
  });

  it("planejar para uma lacuna preenche o público; adicionar fecha a lacuna e melhora o indicador", () => {
    const h = renderPanel(CommunicationPlan);
    fireEvent.click(screen.getByRole("button", { name: "Planejar para Secretário das Cidades" }));
    const form = screen.getByRole("form", { name: "Adicionar comunicação" });
    fireEvent.change(within(form).getByLabelText("O que comunicar"), { target: { value: "Resumo executivo do projeto" } });
    fireEvent.change(within(form).getByLabelText("Frequência"), { target: { value: "MENSAL" } });
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar comunicação" }));
    const added = h.state.model.communications!.at(-1)!;
    expect(added).toMatchObject({ info: "Resumo executivo do projeto", audienceIds: ["s1"], frequency: "MENSAL" });
    expect(document.querySelector('[data-gap="s1"]')).toBeNull();
    expect(metric(h.state.model)).toMatchObject({ status: "ATENCAO", value: "2/3" });
  });

  it("frequência baixa para quem se gerencia de perto vira lacuna; remover parte interessada limpa o público", () => {
    const h = renderPanel(CommunicationPlan);
    const row = document.querySelector<HTMLElement>('[data-comm-item="cm1"]')!;
    fireEvent.change(within(row).getByLabelText("Frequência"), { target: { value: "MENSAL" } });
    expect(document.querySelector('[data-gap="s2"]')!.textContent).toMatch(/ao menos quinzenal/);
    expect(h.results.at(-1)!.ok).toBe(true);
    expect(h.state.model.communications!.find((c) => c.id === "cm1")!.frequency).toBe("MENSAL");
  });

  it("somente leitura: sem formulário nem remoção", () => {
    renderPanel(CommunicationPlan, { readOnly: true });
    expect(screen.queryByRole("form", { name: "Adicionar comunicação" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remover / })).toBeNull();
  });
});

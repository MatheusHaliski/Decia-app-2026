// @vitest-environment jsdom
/**
 * Prévia fantasma no editor 3D (RF74) sem WebGL: a viewport mostra o aviso e a prévia em texto; a lista aceita/rejeita uma a
 * uma ou todas (Enter/Escape no item focado), recusa sozinha quando a cena ou a política muda e respeita os modos de autonomia.
 */
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createObject, starterScene, type Scene3D } from "@/lib/drawings3d/model";
import { DRAFT_KEY } from "@/lib/drawings3d/useEditor3D";
import { GHOST3D_PAUSE_MS } from "@/lib/drawings3d/useGhost3D";
import { renderWithProviders } from "@/test-utils/render";
import Editor3D from "./Editor3D";

/** Cena inicial + uma esfera flutuando 10 cm acima do piso e um cone fora da grade de 5 cm. */
function draft(): Scene3D {
  const s = starterScene();
  return {
    objects: [
      ...s.objects,
      createObject("esfera", "Bola solta", { position: [3, 0.6, 2] }, "o-bola"),
      createObject("cone", "Cone torto", { position: [2.33, 0.5, 2] }, "o-cone"),
    ],
  };
}

const item = () => screen.getByTestId("d3-ghost-item-ASSENTAR:o-bola");
const gridItem = () => screen.getByTestId("d3-ghost-item-ENCAIXAR_GRADE:o-cone");
const rows = () => within(screen.getByTestId("d3-outliner")).getAllByRole("button");
const undo = () => screen.getByTestId("d3-undo");

beforeEach(() => {
  // sem WebGL no jsdom: o editor cai no aviso; o getContext do jsdom só reclama no console
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft()));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("prévia fantasma no editor 3D", () => {
  it("Sob solicitação: só ao pedir; prévia em texto sem WebGL; Enter aceita (um desfazer) e Escape rejeita", () => {
    renderWithProviders(<Editor3D />);
    expect(screen.getByText("Este navegador não oferece WebGL 2")).toBeTruthy();
    expect(screen.queryByTestId("d3-ghost-item-ASSENTAR:o-bola")).toBeNull();
    expect(screen.getByText("Nenhuma proposta. Peça sugestões para ver a prévia.")).toBeTruthy();

    fireEvent.click(screen.getByTestId("d3-ghost-request"));
    expect(item().textContent).toContain("Pousar Bola solta no piso: a base está 10 cm acima.");
    expect(gridItem().textContent).toContain("Encaixar Cone torto na grade de 5 cm (desloca até 2 cm).");
    // a prévia em texto mostra a cópia "depois", com o número da lista; o modelo não mudou
    const text = screen.getByTestId("d3-ghost-text");
    expect(text.textContent).toContain("✦ 1");
    expect(text.textContent).toContain("Bola solta: posição (3; 0,5; 2) m");
    expect(text.textContent).toContain("✦ 2");
    expect(undo()).toHaveProperty("disabled", true);

    // Enter no item focado aceita: o modelo muda por um comando no histórico; a outra sugestão segue pendente
    item().focus();
    fireEvent.keyDown(item(), { key: "Enter" });
    expect(item().getAttribute("data-status")).toBe("ACEITA");
    expect(undo().getAttribute("title")).toBe("Desfazer: aceitar sugestão da IA");
    expect(rows()).toHaveLength(9);
    expect(gridItem().getAttribute("data-status")).toBe("PENDENTE");
    expect(screen.getByTestId("d3-ghost-text").textContent).not.toContain("Bola solta");

    // Escape rejeita sem limpar a seleção do editor
    fireEvent.click(rows().find((b) => b.textContent === "Bola solta")!);
    fireEvent.keyDown(gridItem(), { key: "Escape" });
    expect(gridItem().getAttribute("data-status")).toBe("REJEITADA");
    expect(rows().find((b) => b.textContent === "Bola solta")!.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("d3-ghost-text").textContent).not.toContain("✦");
  });

  it("aceitar todas vira um único desfazer; desfazer devolve a cena", () => {
    renderWithProviders(<Editor3D />);
    fireEvent.click(screen.getByTestId("d3-ghost-request"));
    fireEvent.click(screen.getByTestId("d3-ghost-accept-all"));
    expect(item().getAttribute("data-status")).toBe("ACEITA");
    expect(gridItem().getAttribute("data-status")).toBe("ACEITA");
    expect(undo().getAttribute("title")).toBe("Desfazer: aceitar sugestões da IA");
    fireEvent.click(undo());
    expect(undo()).toHaveProperty("disabled", true);
    // com a cena de volta, pedir de novo encontra as mesmas sugestões
    fireEvent.click(screen.getByTestId("d3-ghost-request"));
    expect(item().getAttribute("data-status")).toBe("PENDENTE");
  });

  it("recusa automática ao editar o objeto e ao trocar a política; opacidade ajustável", () => {
    renderWithProviders(<Editor3D />);
    fireEvent.click(screen.getByTestId("d3-ghost-request"));
    fireEvent.change(screen.getByTestId("d3-ghost-opacity"), { target: { value: "35" } });
    expect(screen.getByText("Opacidade da prévia: 35%")).toBeTruthy();

    fireEvent.click(rows().find((b) => b.textContent === "Bola solta")!);
    const y = within(screen.getByTestId("d3-inspector")).getByLabelText("Posição (m) Y");
    fireEvent.change(y, { target: { value: "1" } });
    fireEvent.keyDown(y, { key: "Enter" });
    expect(item().getAttribute("data-status")).toBe("RECUSADA");
    expect(item().textContent).toContain("a cena mudou no que a sugestão leu");

    fireEvent.click(screen.getByTestId("d3-ghost-request"));
    expect(item().getAttribute("data-status")).toBe("PENDENTE");
    fireEvent.change(screen.getByTestId("d3-ghost-mode"), { target: { value: "SUGESTOES" } });
    expect(item().getAttribute("data-status")).toBe("RECUSADA");
    expect(item().textContent).toContain("a política de autonomia mudou (v1 → v2)");
  });

  it("Manual não sugere; Agente fica indisponível", () => {
    renderWithProviders(<Editor3D />, { prefs: { aiAutonomyDefault: "MANUAL" } });
    expect(screen.getByTestId("d3-ghost-request")).toHaveProperty("disabled", true);
    expect(screen.getByTestId("d3-ghost-unavailable").textContent).toContain("Modo Manual");
    const agent = within(screen.getByTestId("d3-ghost-mode")).getByRole("option", { name: /Agente/ }) as HTMLOptionElement;
    expect(agent.disabled).toBe(true);
  });

  it("Sugestões mostra sozinha depois da pausa; Assistido aplica o lote da seleção com um desfazer", () => {
    vi.useFakeTimers();
    renderWithProviders(<Editor3D />, { prefs: { aiAutonomyDefault: "ASSISTIDO" } });
    expect(screen.queryByTestId("d3-ghost-item-ASSENTAR:o-bola")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(GHOST3D_PAUSE_MS + 10);
    });
    expect(item().getAttribute("data-status")).toBe("PENDENTE");
    expect(screen.getByText("Automático na pausa")).toBeTruthy();

    // sem seleção: o lote não é aplicado e o motivo é anunciado
    fireEvent.click(screen.getByTestId("d3-ghost-assisted"));
    expect(screen.getByTestId("d3-ghost-live").textContent).toBe("Selecione um objeto com sugestões pendentes para aplicar o lote.");

    fireEvent.click(rows().find((b) => b.textContent === "Bola solta")!);
    fireEvent.click(screen.getByTestId("d3-ghost-assisted"));
    expect(item().getAttribute("data-status")).toBe("ACEITA");
    expect(gridItem().getAttribute("data-status")).toBe("PENDENTE"); // fora da seleção
    expect(undo().getAttribute("title")).toBe("Desfazer: aplicar lote da IA (Assistido)");
  });
});

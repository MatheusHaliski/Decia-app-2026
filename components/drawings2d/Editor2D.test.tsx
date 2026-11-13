// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { initialState, join, reserve, type SharedState } from "@/lib/drawings2d/engine";
import { DEMO_BOT, demoDrawing } from "@/lib/drawings2d/fixture";
import { shapeById } from "@/lib/drawings2d/model";
import type { Timers } from "@/lib/drawings2d/session";
import { localMutex, memoryStore } from "@/lib/drawings2d/transport";
import { setCollabEnvForTests } from "@/lib/drawings2d/useCollabDrawing";
import Editor2D from "./Editor2D";
import DrawingsPage from "@/app/(shell)/drawings/page";

/** Navegação simulada que reage a `router.replace` (as abas guardam a vista na URL). */
const nav = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
});
vi.mock("next/navigation", async () => {
  const React = await import("react");
  return {
    useRouter: () => ({ replace: (url: string) => nav.set(url.split("?")[1] ?? ""), push: vi.fn(), refresh: vi.fn() }),
    usePathname: () => "/drawings",
    useSearchParams: () => new URLSearchParams(React.useSyncExternalStore(nav.subscribe, nav.get, nav.get)),
    useParams: () => ({}),
  };
});
// o 3D (three.js) é carregado só quando a aba abre: aqui um marcador no lugar dele
vi.mock("@/components/drawings3d/Editor3D", () => ({ default: () => <div data-testid="editor-3d-stub">3D</div> }));
const capture = vi.hoisted(() => ({ svgToPng: vi.fn(), downloadBlob: vi.fn() }));
vi.mock("./capture", () => ({
  exportColors: () => ({ background: null, tone: { estrutura: "currentColor", esquadria: "currentColor", anotacao: "currentColor", referencia: "currentColor" } }),
  svgToPng: capture.svgToPng,
  downloadBlob: capture.downloadBlob,
}));

const T0 = Date.UTC(2026, 10, 12, 17, 0, 0);
const idleTimers: Timers = { setInterval: () => 0, clearInterval: () => undefined, setTimeout: () => 0, clearTimeout: () => undefined };

/** Peça na memória (uma aba), sem canal, sem colaboradora rodando, relógio parado — determinístico. */
function useDemo(seed?: SharedState) {
  const store = memoryStore(seed ?? null);
  setCollabEnvForTests(() => ({ store, lock: localMutex(), channel: null, bot: false, timers: idleTimers, id: "eu", now: () => T0 }));
  return store;
}

/** Ana (simulada) com o Pavimento superior reservado na camada Esquadrias. */
function withAna(): SharedState {
  let s = initialState(demoDrawing());
  s = join(s, { id: DEMO_BOT.id, name: "Ana", kind: "SIMULADA", color: "green" }, T0).state;
  const r = reserve(s, { actorId: DEMO_BOT.id, layerId: "esquadrias", regionIds: ["fachada/superior"], ttl: 60_000 }, T0);
  if (!r.ok) throw new Error("seed");
  return r.state;
}

const live = () => screen.getByTestId("drw2d-live");
const pickShape = (name: RegExp) => {
  const select = screen.getByTestId("drw2d-pick") as HTMLSelectElement;
  const option = within(select).getByRole("option", { name });
  fireEvent.change(select, { target: { value: (option as HTMLOptionElement).value } });
};

beforeEach(() => {
  nav.set("");
  capture.svgToPng.mockReset();
  capture.downloadBlob.mockReset();
});
afterEach(() => setCollabEnvForTests(null));

describe("/drawings — abas 2D colaborativo e 3D", () => {
  it("abre no 2D colaborativo; o editor 3D só carrega quando a aba 3D é aberta", async () => {
    useDemo();
    renderWithProviders(<DrawingsPage />);
    const tab2d = await screen.findByRole("tab", { name: "2D colaborativo" });
    expect(tab2d.getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByTestId("editor-2d")).toBeTruthy();
    expect(screen.queryByTestId("editor-3d-stub")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "3D" }));
    expect(await screen.findByTestId("editor-3d-stub")).toBeTruthy();
    expect(nav.get()).toBe("vista=3d");
    expect(screen.queryByTestId("editor-2d")).toBeNull();
  });
});

describe("Drawings 2D colaborativo (RF66)", () => {
  it("reserva uma região pelo botão: estado em texto e ícone, prazo, token; renovar e liberar", async () => {
    useDemo();
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    expect(screen.getByText("DEMO")).toBeTruthy();
    const terreo = screen.getByTestId("region-fachada/terreo");
    expect(terreo.getAttribute("data-state")).toBe("LIVRE");
    fireEvent.click(within(terreo).getByRole("button", { name: /Reservar Térreo na camada Esquadrias/ }));
    await waitFor(() => expect(screen.getByTestId("region-fachada/terreo").getAttribute("data-state")).toBe("MINHA"));
    const row = within(screen.getByTestId("region-fachada/terreo")).getByTestId("lock-row");
    expect(row.textContent).toMatch(/Reservada: você · Esquadrias · até \d{2}:\d{2} · faltam 60 s · token 1/);
    expect(live().textContent).toMatch(/Você reservou Térreo \(Esquadrias\) até \d{2}:\d{2} · token 1/);
    // a região reservada aparece na prancheta com o cadeado e o texto
    expect(screen.getByTestId("canvas-2d").querySelector('[data-region="fachada/terreo"]')!.getAttribute("data-reserved")).toBe("eu");
    fireEvent.click(within(row).getByRole("button", { name: "Liberar a reserva de Térreo" }));
    await waitFor(() => expect(screen.getByTestId("region-fachada/terreo").getAttribute("data-state")).toBe("LIVRE"));
    expect(live().textContent).toBe("Você liberou Térreo.");
  });

  it("teclado: escolhe o objeto, move com as setas (reserva automática) e desfaz; R reserva a região do objeto", async () => {
    const store = useDemo();
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    pickShape(/^Porta · Esquadrias$/);
    const canvas = screen.getByTestId("canvas-focus");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByTestId("drw2d-revision").textContent).toBe("revisão 2"));
    expect(live().textContent).toMatch(/^Gravado: moveu Porta \(10; 0 cm\) \(revisão 2\)\. Reserva automática: Térreo até \d{2}:\d{2}\.$/);
    expect(shapeById(store.peek()!.doc, "s-porta")!.geom).toMatchObject({ x: 400 });
    fireEvent.keyDown(canvas, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("drw2d-revision").textContent).toBe("revisão 3"));
    expect(shapeById(store.peek()!.doc, "s-porta")!.geom).toMatchObject({ x: 390 });
    expect(live().textContent).toMatch(/^Desfeito: moveu Porta/);
    // [ ] percorre os objetos; R reserva as regiões do selecionado na camada dele
    fireEvent.keyDown(canvas, { key: "]" });
    expect(live().textContent).toMatch(/^Selecionado: /);
    pickShape(/^Telhado · Estrutura$/);
    fireEvent.keyDown(canvas, { key: "r" });
    await waitFor(() => expect(live().textContent).toMatch(/Você reservou Cobertura \(Estrutura\)/));
  });

  it("edição na região reservada pela colaboradora simulada é recusada com dono e prazo; nada muda", async () => {
    const store = useDemo(withAna());
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    expect(screen.getByTestId("region-fachada/superior").getAttribute("data-state")).toBe("ALHEIA");
    expect(within(screen.getByTestId("region-fachada/superior")).getByTestId("lock-row").textContent).toMatch(/Reservada: Ana · Esquadrias · até \d{2}:\d{2}/);
    pickShape(/^Janela S2 · Esquadrias$/);
    expect(screen.getByTestId("inspector-status").textContent).toMatch(/Região Pavimento superior reservada por Ana até \d{2}:\d{2} \(Esquadrias\)\./);
    fireEvent.keyDown(screen.getByTestId("canvas-focus"), { key: "ArrowUp" });
    await waitFor(() => expect(live().textContent).toMatch(/^Edição recusada: Região Pavimento superior reservada por Ana até \d{2}:\d{2} \(Esquadrias\)\.$/));
    expect(store.peek()!.doc.revision).toBe(1);
    // reservar a região-mãe também é recusado (ancestral de uma reserva alheia)
    fireEvent.click(within(screen.getByTestId("region-fachada")).getByRole("button", { name: /Reservar Fachada/ }));
    await waitFor(() => expect(live().textContent).toMatch(/^Reserva recusada: Região Fachada em conflito com Pavimento superior, reservada por Ana até \d{2}:\d{2} \(Esquadrias\)\.$/));
  });
});

describe("prévia fantasma da IA (RF74)", () => {
  it("Sob solicitação: pede, mostra o fantasma em transparência com ✦, aceita uma (Enter) e rejeita outra (Escape)", async () => {
    const store = useDemo();
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    expect(screen.queryByTestId("ghost-layer")).toBeNull();
    fireEvent.click(screen.getByTestId("ghost-request"));
    await screen.findByTestId("ghost-meta");
    expect(screen.getByTestId("ghost-meta").textContent).toBe("Calculada na revisão 1, política v1 · 9 de 9 pendentes");
    const layer = screen.getByTestId("ghost-layer");
    expect(layer.getAttribute("opacity")).toBe("0.5");
    expect(layer.getAttribute("class")).toContain("pointer-events-none");
    expect(layer.querySelectorAll("[data-ghost]")).toHaveLength(9);
    expect(layer.textContent).toContain("✦ 2");

    const align = screen.getByTestId("ghost-item-ALINHAR:s-js2");
    expect(align.textContent).toContain("Alinhar o topo de Janela S2 com Janela S1, Janela S3 (y 293 → 290)");
    align.focus();
    fireEvent.keyDown(align, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("ghost-item-ALINHAR:s-js2").getAttribute("data-status")).toBe("ACEITA"));
    expect(shapeById(store.peek()!.doc, "s-js2")!.geom).toMatchObject({ y: 290 });
    expect(store.peek()!.log.at(-1)).toMatchObject({ kind: "PATCH", origin: "IA", aiMode: "ACEITA" });
    expect(screen.getByTestId("ghost-layer").querySelector('[data-ghost="ALINHAR:s-js2"]')).toBeNull();

    const grid = screen.getByTestId("ghost-item-ENCAIXAR_GRADE:s-oculo");
    grid.focus();
    fireEvent.keyDown(grid, { key: "Escape" });
    expect(screen.getByTestId("ghost-item-ENCAIXAR_GRADE:s-oculo").getAttribute("data-status")).toBe("REJEITADA");
    expect(shapeById(store.peek()!.doc, "s-oculo")!.geom).toMatchObject({ cy: 204 });
  });

  it("recusa automática: região-alvo reservada pela colaboradora e troca de modo (política v1 → v2)", async () => {
    useDemo(withAna());
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    fireEvent.click(screen.getByTestId("ghost-request"));
    await waitFor(() => expect(screen.getByTestId("ghost-item-ALINHAR:s-js2").getAttribute("data-status")).toBe("RECUSADA"));
    expect(screen.getByTestId("ghost-item-ALINHAR:s-js2").textContent).toMatch(/região Pavimento superior reservada por Ana até \d{2}:\d{2}\./);
    expect(screen.getByTestId("ghost-item-ALINHAR:s-jt1").getAttribute("data-status")).toBe("PENDENTE");
    fireEvent.change(screen.getByTestId("ghost-mode"), { target: { value: "SUGESTOES" } });
    await waitFor(() => expect(screen.getByTestId("ghost-item-ALINHAR:s-jt1").getAttribute("data-status")).toBe("RECUSADA"));
    expect(screen.getByTestId("ghost-item-ALINHAR:s-jt1").textContent).toContain("o modo da IA mudou (política v1 → v2).");
    expect(live().textContent).toBe("Modo da IA: Sugestões (política v2). Propostas antigas foram recusadas.");
  });

  it("Manual não sugere; Agente fica indisponível (exige mandato)", async () => {
    useDemo();
    const { unmount } = renderWithProviders(<Editor2D />, { prefs: { aiAutonomyDefault: "MANUAL" } });
    await screen.findByTestId("editor-2d");
    expect((screen.getByTestId("ghost-request") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("ghost-unavailable").textContent).toContain("Modo Manual: a IA não age.");
    unmount();
    useDemo();
    renderWithProviders(<Editor2D />, { prefs: { aiAutonomyDefault: "AGENTE" } });
    await screen.findByTestId("editor-2d");
    expect((screen.getByTestId("ghost-request") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("ghost-unavailable").textContent).toContain("Agente automático exige mandato");
  });

  it("Assistido: o lote só vale na seleção; com a seleção, aplica de uma vez e um desfazer reverte o lote", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const store = useDemo();
      renderWithProviders(<Editor2D />, { prefs: { aiAutonomyDefault: "ASSISTIDO" } });
      await screen.findByTestId("editor-2d");
      // espontâneo: a prévia aparece depois da pausa de 1,5 s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      await screen.findByTestId("ghost-meta");
      fireEvent.click(screen.getByTestId("ghost-assisted"));
      expect(live().textContent).toBe("Selecione objetos ou uma região: o modo Assistido só aplica na seleção.");
      pickShape(/^Janela T1 · Esquadrias$/);
      fireEvent.click(screen.getByTestId("ghost-assisted"));
      await waitFor(() => expect(shapeById(store.peek()!.doc, "s-jt1")!.geom).toMatchObject({ x: 170 }));
      expect(store.peek()!.log.at(-1)).toMatchObject({ origin: "IA", aiMode: "APLICADA" });
      expect(screen.getByTestId("ghost-item-COMPLETAR_SIMETRIA:s-jt1").getAttribute("data-status")).toBe("RECUSADA");
      fireEvent.click(screen.getByTestId("drw2d-undo"));
      await waitFor(() => expect(shapeById(store.peek()!.doc, "s-jt1")!.geom).toMatchObject({ x: 172 }));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Capturar PNG (RF74)", () => {
  it("gera o PNG da vista 2D (SVG → canvas → blob) com a escala escolhida e baixa o arquivo", async () => {
    capture.svgToPng.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    useDemo();
    renderWithProviders(<Editor2D />);
    await screen.findByTestId("editor-2d");
    fireEvent.change(screen.getByRole("combobox", { name: "Escala do PNG" }), { target: { value: "3" } });
    fireEvent.click(screen.getByTestId("drw2d-capture"));
    await waitFor(() => expect(capture.downloadBlob).toHaveBeenCalledTimes(1));
    const [svg, width, height] = capture.svgToPng.mock.calls[0]!;
    expect(svg).toContain("<svg");
    expect(svg).toContain("Fachada frontal — Bloco B");
    expect([width, height]).toEqual([3300, 2160]);
    expect(capture.downloadBlob.mock.calls[0]![1]).toBe("drawings-2d-demo-fachada-r1.png");
    expect(live().textContent).toBe("PNG gerado (3.300 × 2.160 px).");
  });
});

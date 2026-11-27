"use client";
/**
 * Abrir/fechar o visualizador de card pela URL (`?ver=tarefa:<id>`), sem depender do roteador do Next: `history.pushState` (que o
 * App Router sincroniza com `useSearchParams`) + um evento próprio, para que qualquer card — dentro ou fora de um provedor — possa
 * abrir o visualizador montado uma vez no shell. Fechar remove só o parâmetro (`replaceState`) e devolve o foco ao card de origem.
 */
import { useCallback, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from "react";
import { formatViewerParam, parseViewerParam, VIEWER_PARAM, withViewer, type ViewerTarget } from "@/lib/cardviewer/url";

const EVENT = "ws:cardviewer";
let opener: HTMLElement | null = null;

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

const read = () => new URLSearchParams(window.location.search).get(VIEWER_PARAM) ?? "";

/** Alvo aberto agora (lido da URL). */
export function useViewerTarget(): ViewerTarget | null {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  return parseViewerParam(raw);
}

export function openCardViewer(target: ViewerTarget, from?: HTMLElement | null) {
  opener = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const url = `${window.location.pathname}${withViewer(window.location.search, target)}${window.location.hash}`;
  window.history.pushState(window.history.state, "", url);
  emit();
}

/** Fecha e devolve o foco ao card que abriu (ou ao card do alvo, quando a abertura veio de um link). */
export function closeCardViewer(target: ViewerTarget | null) {
  const url = `${window.location.pathname}${withViewer(window.location.search, null)}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", url);
  emit();
  const back = opener && opener.isConnected ? opener : target ? document.querySelector<HTMLElement>(`[data-viewer="${formatViewerParam(target)}"]`) : null;
  opener = null;
  if (back) window.setTimeout(() => back.focus(), 0);
}

/** Itens interativos dentro do card: clicar neles faz o que eles fazem, não abre o visualizador. */
const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=button],[role=link],[role=menuitem],[role=checkbox],[role=switch],[data-no-viewer]";

/**
 * Props para a raiz de um card: clicar numa área não interativa ou Enter/Espaço com o card em foco abre o visualizador.
 * `enabled: false` (ex.: card ampliado do detalhe) devolve nada.
 */
export function useCardViewerTrigger(target: ViewerTarget | null, enabled = true) {
  const kind = target?.kind;
  const id = target?.id;
  const onClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!kind || !id || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = e.target as HTMLElement;
    const hit = el.closest?.(INTERACTIVE);
    if (hit && hit !== e.currentTarget && e.currentTarget.contains(hit)) return;
    if (typeof window.getSelection === "function" && String(window.getSelection() ?? "").trim()) return;
    openCardViewer({ kind, id }, e.currentTarget);
  }, [kind, id]);
  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (!kind || !id || e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    openCardViewer({ kind, id }, e.currentTarget);
  }, [kind, id]);
  if (!enabled || !kind || !id) return {};
  return {
    onClick, onKeyDown, tabIndex: 0, "aria-haspopup": "dialog" as const, "data-viewer": `${kind}:${id}`,
    className: "cursor-pointer focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
  };
}

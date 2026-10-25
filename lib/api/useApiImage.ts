"use client";
/**
 * Imagem protegida da API (RF3.CA05): `<img src>` não leva o `Authorization` (o access token mora só na memória, `tokenStore`),
 * então caminhos `/api/...` são baixados com `api.get` (Bearer + renovação silenciosa) e exibidos por `URL.createObjectURL`.
 *
 * - Cache por URL no módulo: a mesma foto não é baixada de novo a cada render nem em cada lugar da tela (barra, perfil, busca).
 *   O `?v=` muda a cada troca de foto, então URL nova = download novo; as antigas sem uso saem do cache (e o object URL é revogado).
 * - Resposta fora de ordem é descartada: cada componente lê só a entrada da URL que mostra AGORA; um download antigo que chega
 *   depois não troca a foto, e um download apagado do cache (logout) não volta a ele.
 * - Enquanto carrega ou em erro, `src` é `undefined` (o `Avatar` mostra as iniciais).
 * - `https://` absoluta (fotos antigas) passa direto, como antes. Qualquer outra coisa é ignorada.
 * - Ao sair da sessão o cache é esvaziado: a foto de uma conta não fica disponível para a próxima.
 */
import { useEffect, useSyncExternalStore } from "react";
import { api, onSessionChange } from "./client";

export type ApiImageStatus = "idle" | "loading" | "ready" | "error";

interface Entry { status: "loading" | "ready" | "error"; src?: string }

/** Quantas fotos sem ninguém exibindo ficam guardadas (navegar entre telas não baixa de novo). */
const MAX_IDLE = 48;

const cache = new Map<string, Entry>();
const refs = new Map<string, number>();
const listeners = new Set<() => void>();
let sessionHooked = false;

const emit = () => listeners.forEach((l) => l());

function revoke(entry: Entry | undefined) {
  if (entry?.src && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(entry.src);
}

/** Tira do cache as entradas sem uso: erros na hora (próxima montagem tenta de novo); prontas além do limite, das mais antigas. */
function prune() {
  const idle = [...cache.keys()].filter((k) => !refs.get(k));
  for (const k of idle) {
    if (cache.get(k)?.status === "error") cache.delete(k);
  }
  const ready = idle.filter((k) => cache.get(k)?.status === "ready");
  for (const k of ready.slice(0, Math.max(0, ready.length - MAX_IDLE))) {
    revoke(cache.get(k));
    cache.delete(k);
  }
}

/** Esvazia o cache e revoga os object URLs (logout; também usado pelos testes). */
export function clearApiImageCache() {
  cache.forEach(revoke);
  cache.clear();
  emit();
}

function hookSession() {
  if (sessionHooked) return;
  sessionHooked = true;
  onSessionChange((signedIn) => { if (!signedIn) clearApiImageCache(); });
}

function load(url: string) {
  const entry: Entry = { status: "loading" };
  cache.set(url, entry);
  emit();
  void (async () => {
    let next: Entry;
    try {
      const blob = await api.get<unknown>(url, { headers: { Accept: "image/*" } });
      // `request` devolve Blob para conteúdo não JSON; JSON (ou nada) aqui não é foto
      const isBlob = !!blob && typeof blob === "object" && typeof (blob as Blob).size === "number" && typeof (blob as Blob).type === "string";
      if (!isBlob || typeof URL.createObjectURL !== "function") throw new Error("não é imagem");
      next = { status: "ready", src: URL.createObjectURL(blob as Blob) };
    } catch {
      next = { status: "error" };
    }
    // a entrada foi descartada (logout, nova tentativa) enquanto baixava: este resultado não vale mais
    if (cache.get(url) !== entry) { revoke(next); return; }
    cache.set(url, next);
    if (!refs.get(url)) prune();
    emit();
  })();
}

function acquire(url: string) {
  hookSession();
  refs.set(url, (refs.get(url) ?? 0) + 1);
  if (!cache.has(url)) load(url);
}

function release(url: string) {
  const n = (refs.get(url) ?? 1) - 1;
  if (n > 0) refs.set(url, n);
  else refs.delete(url);
  prune();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export type ApiImageKind = "none" | "direct" | "api";

/** `/api/...` é baixada com o token; `https://` passa direto; o resto (vazio, `http:`, `javascript:`, `//host`) não vira foto. */
export function apiImageKind(url: string | null | undefined): ApiImageKind {
  const u = url?.trim();
  if (!u) return "none";
  if (u.startsWith("/api/")) return "api";
  if (/^https:\/\//i.test(u)) return "direct";
  return "none";
}

/** Fonte exibível para uma foto da API ou externa (`src` indefinido enquanto carrega, em erro ou sem foto). */
export function useApiImage(url: string | null | undefined): { src: string | undefined; status: ApiImageStatus } {
  const kind = apiImageKind(url);
  const key = kind === "api" ? url!.trim() : null;
  const entry = useSyncExternalStore(subscribe, () => (key ? cache.get(key) : undefined), () => undefined);
  useEffect(() => {
    if (!key) return;
    acquire(key);
    return () => release(key);
  }, [key]);
  if (kind === "direct") return { src: url!.trim(), status: "ready" };
  if (!key) return { src: undefined, status: "idle" };
  if (!entry) return { src: undefined, status: "loading" };
  return { src: entry.status === "ready" ? entry.src : undefined, status: entry.status };
}

/**
 * Quais rotas exigem sessão (Bloco 4, D-60). A fonte é a matriz de acesso já existente (`lib/pages/registry.ts`, Matrizes A–E de
 * ABAS_POR_PERFIL.md): rota cuja célula VISITANTE é "O" (oculta) exige sessão; o que o visitante pode ver continua público
 * (Mural, Buscar, Memória, Empresas, `/u/[username]`, `/tasks/[id]` — D-93 —, auth e /lab). Nada é duplicado aqui.
 *
 * Rota fora do registro herda do ancestral registrado mais próximo (`/settings/x` → `/settings`); sem ancestral, é pública
 * (vira o 404 do app). Isto é experiência de uso, não o controle de acesso: a API nega sempre (401/403/404 por recurso, Bloco 5).
 */
import { PAGES } from "@/lib/pages/registry";

interface Compiled { re: RegExp; dynamic: number; route: string; protectedRoute: boolean }

const COMPILED: readonly Compiled[] = PAGES.map((p) => {
  const parts = p.route.split("/").filter(Boolean);
  const re = new RegExp(`^/${parts.map((s) => (/^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`);
  return { re, dynamic: parts.filter((s) => s.startsWith("[")).length, route: p.route, protectedRoute: p.access.VISITANTE === "O" };
});

/** A rota registrada que casa com o caminho (estática vence dinâmica: `/tasks/new` antes de `/tasks/[id]`). */
export function matchRoute(pathname: string): Compiled | undefined {
  return COMPILED.filter((c) => c.re.test(pathname)).sort((a, b) => a.dynamic - b.dynamic)[0];
}

export function requiresSession(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.startsWith("/bff/") || pathname.startsWith("/_next/")) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false; // arquivos de /public (imagens, fontes, manifest)
  for (let cur = path; cur.length > 0; cur = cur.slice(0, cur.lastIndexOf("/"))) {
    const hit = matchRoute(cur);
    if (hit) return hit.protectedRoute;
  }
  return false;
}

/** Cookie-sinal sem segredo gravado pelo BFF junto com o `ws_rt` HttpOnly (que o middleware não enxerga: path=/bff/auth). */
export const SESSION_HINT_COOKIE = "ws_rt_h";

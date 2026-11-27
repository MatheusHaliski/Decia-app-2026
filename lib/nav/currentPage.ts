/**
 * Caminho real → entrada do registro (lib/pages/registry.ts), com a mesma regra do guarda de rotas (`matchRoute`: estática vence
 * dinâmica; caminho abaixo de uma rota registrada herda dela). Usado pelo AppShell (faixa de demonstração, ajuda "?") e pelo menu
 * (selo "Em breve").
 */
import { matchRoute } from "@/lib/auth/guard";
import { pageByRoute, type PageEntry } from "@/lib/pages/registry";

export function pageForPath(pathname: string | null | undefined): PageEntry | undefined {
  if (!pathname || !pathname.startsWith("/")) return undefined;
  const path = (pathname.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  for (let cur = path; cur.length > 0; cur = cur.slice(0, cur.lastIndexOf("/"))) {
    const hit = matchRoute(cur);
    if (hit) return pageByRoute(hit.route);
  }
  return undefined;
}

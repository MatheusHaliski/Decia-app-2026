/**
 * Destino pós-login (`/login?next=…`, Bloco 4, D-60): só caminho RELATIVO da própria origem. Recusa — e cai no padrão — tudo que um
 * navegador poderia resolver para outra origem: `//evil`, `/\evil`, `https://…`, `javascript:`, barra invertida, caractere de
 * controle e as mesmas formas codificadas (`%2F%2F`, `%5C`, dupla codificação). Sem open redirect (OWASP A01).
 */
export const DEFAULT_AFTER_LOGIN = "/mural";
const MAX_NEXT = 2048;
/** Rotas de entrada não são destino (evita laço login → login). */
const AUTH_ROUTES = /^\/(login|register|password-reset|verify-email)(\/|\?|#|$)/;

function decodedForms(raw: string): string[] {
  const forms = [raw];
  let cur = raw;
  for (let i = 0; i < 3; i++) {
    let next: string;
    try { next = decodeURIComponent(cur); } catch { return [...forms, "\u0000"]; } // codificação quebrada é recusada
    if (next === cur) break;
    forms.push(next);
    cur = next;
  }
  return forms;
}

function unsafe(s: string): boolean {
  if (!s.startsWith("/")) return true;                         // relativo à origem: começa com UMA barra
  if (s.startsWith("//") || s.startsWith("/\\")) return true;  // protocol-relative (o navegador trata "\" como "/")
  if (/[\\\u0000-\u001F\u007F]/.test(s)) return true;           // barra invertida, tab/CR/LF (o navegador remove e junta "//")
  return false;
}

export function safeNext(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_NEXT) return fallback;
  if (decodedForms(raw).some(unsafe)) return fallback;
  // última defesa: resolvido contra uma origem fictícia, tem de continuar nela
  let url: URL;
  try { url = new URL(raw, "http://ws.invalid"); } catch { return fallback; }
  if (url.origin !== "http://ws.invalid") return fallback;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return AUTH_ROUTES.test(path) ? fallback : path;
}

/** `/login?next=<caminho atual>` para quem precisa entrar (middleware e logout entre abas). */
export function loginUrl(nextPath: string, reason?: string): string {
  const p = new URLSearchParams();
  const next = safeNext(nextPath, "");
  if (next) p.set("next", next);
  if (reason) p.set("reason", reason);
  const qs = p.toString();
  return qs ? `/login?${qs}` : "/login";
}

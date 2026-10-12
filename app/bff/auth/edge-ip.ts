/**
 * IP do cliente visto pelo BFF (RF2, D-14). Só o cabeçalho que a borda confiável SOBRESCREVE é lido (`WS_EDGE_IP_HEADER`,
 * padrão X-Real-IP, mesmo nome de variável da API); X-Forwarded-For/Forwarded nunca são lidos nem assinados, porque o
 * cliente controla esse valor e escolheria o próprio balde de rate limit (revisão Codex do PR #23).
 */
/** Nome do cabeçalho de IP escrito pela borda (só o nome vem do ambiente; vazio desliga a assinatura). */
export function edgeIpHeader(env: Record<string, string | undefined> = process.env): string | null {
  const name = (env.WS_EDGE_IP_HEADER ?? "X-Real-IP").trim().toLowerCase();
  if (!name || name === "x-forwarded-for" || name === "forwarded") return null;
  return /^[a-z0-9-]{1,64}$/.test(name) ? name : null;
}

/** IP do cliente conforme a borda; X-Forwarded-For é ignorado sempre (o cliente controla esse cabeçalho). */
export function clientIp(req: { headers: Headers }, env: Record<string, string | undefined> = process.env): string | null {
  const header = edgeIpHeader(env);
  if (!header) return null;
  const ip = (req.headers.get(header) ?? "").trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) && !ip.includes(",") ? ip : null;
}

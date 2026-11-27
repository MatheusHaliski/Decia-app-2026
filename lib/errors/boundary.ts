/**
 * Código para o suporte nas fronteiras de erro (app/(shell)/error.tsx, app/global-error.tsx): o `correlationId` de um erro da
 * API (ApiError, lib/api/client.ts) ou, para erro de Server Component, o `digest` que o Next gera e que casa com o log do servidor.
 * O `message` nunca vai para a tela (em produção é genérico e pode vazar detalhe interno). `error` é `unknown`: no Next 16 um
 * valor lançado num Client Component chega como está, nem sempre um Error.
 */
export function boundaryReference(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { correlationId, digest } = error as { correlationId?: unknown; digest?: unknown };
  if (typeof correlationId === "string" && correlationId) return correlationId;
  if (typeof digest === "string" && digest) return digest;
  return undefined;
}

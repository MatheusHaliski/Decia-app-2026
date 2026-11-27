import { LoadingState, Skeleton } from "@/components/ui";

/**
 * Carregamento instantâneo das abas do shell (convenção `loading.tsx`, Suspense do segmento): o AppShell continua interativo e o
 * esqueleto ocupa o conteúdo enquanto a rota chega — nunca uma tela em branco. Server Component; o texto vem do LoadingState.
 */
export default function ShellLoading() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-5)]" data-testid="route-loading">
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton lines={3} />
      <LoadingState />
    </div>
  );
}

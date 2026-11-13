"use client";
import { Suspense } from "react";
import { SessionView } from "@/components/decia/session";
import { LoadingState } from "@/components/ui";

/** As abas da sessão usam `useSearchParams` (`?tab=`): precisam de Suspense na página pré-renderizada. */
export function SessionClient({ sessionId }: { sessionId: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SessionView sessionId={sessionId} />
    </Suspense>
  );
}

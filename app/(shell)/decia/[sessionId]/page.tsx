// /decia/[sessionId] — sessão deliberativa do DECIA (DECIA_SESSAO_E_MESA §B; RF29 ponte, RF37 Ata Viva, RF51 autonomia da IA).
// Id desconhecido → 404 (notFound). Ids "s-nova-*" são sessões criadas nesta aba (DEMO, lib/decia/session/repository.ts).
import { notFound } from "next/navigation";
import { isKnownSessionId } from "@/lib/decia/session/fixtures";
import { SessionClient } from "./SessionClient";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!isKnownSessionId(sessionId)) notFound();
  return <SessionClient sessionId={sessionId} />;
}

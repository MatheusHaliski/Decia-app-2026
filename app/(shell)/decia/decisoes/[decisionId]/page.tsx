// /decia/decisoes/[decisionId] — Decision Workspace (docs/decia/05_WORKSPACE_E_NAVEGACAO.md §3, RF29).
// Id desconhecido → 404 (notFound). Ids "d-nova-*" são decisões criadas pelo fluxo "Nova decisão" nesta aba (DEMO).
import { notFound } from "next/navigation";
import { isKnownDecisionId } from "@/lib/decia/fixtures";
import { WorkspaceClient } from "./WorkspaceClient";

export default async function Page({ params }: { params: Promise<{ decisionId: string }> }) {
  const { decisionId } = await params;
  if (!isKnownDecisionId(decisionId)) notFound();
  return <WorkspaceClient decisionId={decisionId} />;
}

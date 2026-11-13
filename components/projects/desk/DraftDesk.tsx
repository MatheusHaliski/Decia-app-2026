"use client";
/**
 * Mesa em modo rascunho (RF30.CA03, rota `/desk?draft=<id>`): a proposta do Autopiloto aberta para revisão — nada foi salvo ainda.
 * Editar atualiza o rascunho (24 h, só nesta aba); salvar cria o projeto e abre a Mesa dele; descartar apaga o rascunho.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, EmptyState, LoadingState, useToast } from "@/components/ui";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { discardProposalDraft, loadProposalDraft, saveProposalDraft } from "@/lib/projects/autopilot/drafts";
import type { ProjectProposal } from "@/lib/projects/autopilot/proposal";
import { demoProjectRepository, type ProjectRepository } from "@/lib/projects/repository";
import { ProposalEditor } from "../autopilot/ProposalEditor";
import { saveProposal } from "../autopilot/save";

export function DraftDesk({ draftId, repo, actorId = DEMO_CURRENT_USER_ID, now = () => new Date(), onSaved }: {
  draftId: string; repo?: ProjectRepository; actorId?: string; now?: () => Date; onSaved?: (projectId: string) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [state, setState] = useState<{ loaded: boolean; proposal: ProjectProposal | null }>({ loaded: false, proposal: null });
  useEffect(() => setState({ loaded: true, proposal: loadProposalDraft(draftId)?.proposal ?? null }), [draftId]);

  if (!state.loaded) return <LoadingState />;
  const proposal = state.proposal;
  if (!proposal) {
    return <EmptyState title={t("deskHome.draft.notFound")} description={t("deskHome.draft.notFoundDesc")} action={<Button variant="spark" href="/autopilot">{t("deskHome.autopilot")}</Button>} />;
  }
  const change = (p: ProjectProposal) => {
    setState({ loaded: true, proposal: p });
    saveProposalDraft({ proposal: p }, { id: draftId });
  };
  const save = () => {
    const r = saveProposal(repo ?? demoProjectRepository(), proposal, { actorId, now: now() });
    if (!r.ok) {
      toast({ title: t("autopilot.save.error"), description: r.error, tone: "erro" });
      return;
    }
    discardProposalDraft(draftId);
    toast({ title: t("autopilot.save.done", { title: r.model.title }), description: t("pm.v.autopilotCreated", { source: proposal.source.label }), tone: "sucesso" });
    (onSaved ?? ((id: string) => router.push(`/projects/${id}/edit`)))(r.id);
  };
  return (
    <div className="grid gap-[var(--ws-space-3)]" data-draft-desk={draftId}>
      <p role="note" className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-ai-spark bg-ws-ai-spark-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <span className="min-w-0 flex-1">{t("deskHome.draft.banner")}</span>
      </p>
      <ProposalEditor proposal={proposal} onChange={change} people={DEMO_PEOPLE} />
      <div className="flex flex-wrap gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
        <Button variant="primary" icon="mesa" onClick={save}>{t("autopilot.save.cta")}</Button>
        <Button variant="danger" onClick={() => {
          discardProposalDraft(draftId);
          setState({ loaded: true, proposal: null });
          router.replace("/desk");
        }}>{t("autopilot.scheme.discard")}</Button>
      </div>
    </div>
  );
}

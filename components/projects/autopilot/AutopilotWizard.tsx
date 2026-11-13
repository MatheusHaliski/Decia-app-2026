"use client";
/**
 * Autopiloto de Projetos (RF30 + RF43 §7): demanda bruta → leitura (fatos com o trecho de origem) → Esquema de Projeto proposto
 * e editável → salvar e abrir na Mesa. A "IA" é simulada e determinística (regras sobre o texto + receitas por tipo de demanda +
 * CPM do motor) e só age quando a pessoa pede — no modo Manual de autonomia (RF51) o Autopiloto não propõe nada. A proposta
 * fica num rascunho desta aba (24 h) até salvar, e abre também na Mesa em modo rascunho (`/desk?draft=<id>`).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, cn, useToast } from "@/components/ui";
import { MODE_CAPABILITIES } from "@/lib/ai/autonomy";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { discardProposalDraft, proposalDraftHref, saveProposalDraft } from "@/lib/projects/autopilot/drafts";
import { extractDemand, type DemandFacts } from "@/lib/projects/autopilot/extract";
import { proposeScheme, type ProjectProposal } from "@/lib/projects/autopilot/proposal";
import { demoProjectRepository, type ProjectRepository } from "@/lib/projects/repository";
import { DemandInput, type DemandInputValue } from "./DemandInput";
import { FactsEditor } from "./FactsEditor";
import { ProposalEditor } from "./ProposalEditor";
import { saveProposal } from "./save";

export interface AutopilotWizardProps {
  repo?: ProjectRepository;
  actorId?: string;
  now?: () => Date;
  /** depois de salvar (padrão: abre a Mesa do projeto novo) */
  onSaved?: (projectId: string) => void;
}

const STEPS = ["input", "facts", "scheme", "save"] as const;

export function AutopilotWizard({ repo, actorId = DEMO_CURRENT_USER_ID, now = () => new Date(), onSaved }: AutopilotWizardProps) {
  const { t } = useI18n();
  const { prefs } = usePreferences();
  const { toast } = useToast();
  const router = useRouter();
  const allowed = MODE_CAPABILITIES[prefs.aiAutonomyDefault].proposes !== "NUNCA";
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [input, setInput] = useState<DemandInputValue>({ text: "", kind: "COLAR" });
  const [facts, setFacts] = useState<DemandFacts | null>(null);
  const [proposal, setProposal] = useState<ProjectProposal | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const sourceLabel = (f: DemandFacts) => {
    if (f.reference?.value) return f.reference.value;
    const subject = f.subject?.value;
    if (input.kind === "EML" && subject) return t("autopilot.source.email", { subject });
    if (input.fileName) return input.fileName;
    return subject ? t("autopilot.source.quoted", { subject }) : t("autopilot.source.pasted");
  };

  const read = () => {
    if (!allowed || !input.text.trim()) return;
    setFacts(extractDemand(input.text, { now: now() }));
    setStep(1);
  };
  const generate = () => {
    if (!facts) return;
    const p = proposeScheme(facts, { now: now(), sourceLabel: sourceLabel(facts), sourceKind: input.kind });
    setProposal(p);
    setDraftId(saveProposalDraft({ proposal: p, facts }, { id: draftId ?? undefined }));
    setStep(2);
  };
  const change = (p: ProjectProposal) => {
    setProposal(p);
    if (draftId) saveProposalDraft({ proposal: p }, { id: draftId });
  };
  const save = () => {
    if (!proposal) return;
    const r = saveProposal(repo ?? demoProjectRepository(), proposal, { actorId, now: now() });
    if (!r.ok) {
      toast({ title: t("autopilot.save.error"), description: r.error, tone: "erro" });
      return;
    }
    discardProposalDraft(draftId);
    toast({ title: t("autopilot.save.done", { title: r.model.title }), description: t("pm.v.autopilotCreated", { source: proposal.source.label }), tone: "sucesso" });
    (onSaved ?? ((id: string) => router.push(`/projects/${id}/edit`)))(r.id);
  };
  const discard = () => {
    discardProposalDraft(draftId);
    setDraftId(null);
    setProposal(null);
    setStep(1);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]" data-autopilot>
      <ol aria-label={t("autopilot.steps.label")} className="flex flex-wrap gap-2 text-[length:var(--ws-text-body-sm)]">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={cn("rounded-[var(--ws-radius-pill)] border px-3 py-1", i === step ? "border-ws-accent bg-ws-accent-soft font-semibold text-ws-text" : i < step ? "border-ws-border text-ws-text" : "border-ws-border text-ws-text-muted")}>
            <span className="font-[family-name:var(--ws-font-mono)]">{i + 1}</span> · {t(`autopilot.steps.${s}`)}{i < step ? <span className="sr-only"> ({t("autopilot.steps.done")})</span> : null}
          </li>
        ))}
      </ol>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.demoNote")}</p>

      {!allowed ? (
        <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">
          <span>{t("autopilot.manualMode")}</span>
          <Button size="sm" href="/settings?tab=trabalho">{t("autopilot.manualModeLink")}</Button>
        </div>
      ) : null}

      {step === 0 ? (
        <Card padding="md" title={t("autopilot.input.title")} eyebrow={t("autopilot.steps.input")}>
          <DemandInput value={input} onChange={setInput} onRead={read} disabled={!allowed} />
        </Card>
      ) : null}

      {step === 1 && facts ? (
        <section aria-labelledby="ap-facts-title" className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-3)]">
          <h2 id="ap-facts-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("autopilot.facts.title")}</h2>
          <FactsEditor facts={facts} onChange={setFacts} />
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>{t("autopilot.facts.back")}</Button>
            <Button variant="spark" onClick={generate}><span aria-hidden>✦</span> {t("autopilot.facts.generate")}</Button>
          </div>
        </section>
      ) : null}

      {step === 2 && proposal ? (
        <section aria-labelledby="ap-scheme-title" className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-3)]">
          <h2 id="ap-scheme-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("autopilot.scheme.title")}</h2>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("autopilot.scheme.intro")}</p>
          <ProposalEditor proposal={proposal} onChange={change} people={DEMO_PEOPLE} />
          <div className="flex flex-wrap gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
            <Button variant="primary" icon="mesa" onClick={save}>{t("autopilot.save.cta")}</Button>
            {draftId ? <Button href={proposalDraftHref(draftId)}>{t("autopilot.save.openDraft")}</Button> : null}
            <Button variant="ghost" onClick={() => setStep(1)}>{t("autopilot.scheme.back")}</Button>
            <Button variant="danger" onClick={discard}>{t("autopilot.scheme.discard")}</Button>
          </div>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.save.hint")}</p>
        </section>
      ) : null}
    </div>
  );
}

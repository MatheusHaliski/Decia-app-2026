"use client";
/**
 * "Discutir no DECIA" (RF30.CA06): abre uma sessão do DECIA sobre a proposta do Autopiloto ainda em rascunho (passo 3) ou sobre um
 * projeto já salvo (visão geral `/projects/[id]`). A sessão nasce com a proposta anexada (fases, atividades, prazos e o aviso de
 * estouro, que também são a minuta inicial), os responsáveis da proposta como membros sugeridos e um link de volta; abre já
 * ABERTA para a conversa e leva a pessoa a `/decia/<sessão>`. Sessões DEMO (lib/decia/session/repository.ts): vivem nesta aba.
 */
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button, useToast } from "@/components/ui";
import { DEMO_CURRENT_USER_ID } from "@/lib/decia/fixtures";
import { demoSessionRepository, type NewSessionInput, type SessionRepository } from "@/lib/decia/session/repository";
import type { SessionArtifactKind } from "@/lib/decia/session/types";
import { useI18n } from "@/lib/i18n/useI18n";
import type { People, PlanChange, SessionLabels } from "@/lib/projects/autopilot/decia";

/** Data de calendário com o ano, sem deslocar pelo fuso. */
const dayOf = (intl: string, iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`)) : "—";

export function useSessionLabels(): SessionLabels {
  const { t, intl } = useI18n();
  return useMemo<SessionLabels>(() => {
    const num = (n: number) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(n);
    return {
      heading: (kind, title) => t(`autopilot.decia.plan.heading.${kind}`, { title }),
      objective: t("autopilot.decia.plan.objective"),
      deadline: t("autopilot.decia.plan.deadline"),
      finish: (days, date) => t("autopilot.decia.plan.finish", { days: num(days), date: dayOf(intl, date) }),
      overrun: (n, deadline) => (deadline ? t("autopilot.decia.plan.overrun", { n, deadline: dayOf(intl, deadline) }) : t("autopilot.decia.plan.overrunPinned", { n })),
      fits: (slack, deadline) => (slack === null ? t("autopilot.decia.plan.fitsPlain", { deadline: dayOf(intl, deadline) }) : t("autopilot.decia.plan.fits", { slack, deadline: dayOf(intl, deadline) })),
      noDeadline: t("autopilot.decia.plan.noDeadline"),
      criticalPath: (path) => t("autopilot.decia.plan.criticalPath", { path }),
      phase: (n, phase) => t("autopilot.decia.plan.phase", { n, phase: t(`pm.phase.${phase}`) }),
      milestone: t("autopilot.decia.plan.milestone"),
      unassigned: t("autopilot.decia.plan.unassigned"),
      howTo: t("autopilot.decia.plan.howTo"),
      sessionTitle: (kind, title) => t(`autopilot.decia.sessionTitle.${kind}`, { title }),
      sessionObjective: (kind, title) => t(`autopilot.decia.sessionObjective.${kind}`, { title }),
    };
  }, [t, intl]);
}

/** Texto de uma mudança decidida na sessão (também é o título do pedido de mudança no projeto salvo). */
export function useDescribeChange(): (c: PlanChange, people: People) => string {
  const { t, intl } = useI18n();
  return useMemo(() => {
    const num = (n: number) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(n);
    const who = (people: People, id: string | null) => (id ? people[id]?.name ?? id : t("autopilot.decia.plan.unassigned"));
    return (c: PlanChange, people: People) => {
      switch (c.type) {
        case "OBJETIVO": return t("autopilot.decia.change.OBJETIVO", { to: c.to });
        case "PRAZO": return t("autopilot.decia.change.PRAZO", { from: dayOf(intl, c.from), to: dayOf(intl, c.to) });
        case "RENOMEAR": return t("autopilot.decia.change.RENOMEAR", { code: c.code, from: c.from, to: c.to });
        case "DURACAO": return t("autopilot.decia.change.DURACAO", { code: c.code, title: c.title, from: num(c.from), to: num(c.to) });
        case "PRAZO_TAREFA": return t("autopilot.decia.change.PRAZO_TAREFA", { code: c.code, title: c.title, from: dayOf(intl, c.from), to: dayOf(intl, c.to) });
        case "RESPONSAVEL": return t("autopilot.decia.change.RESPONSAVEL", { code: c.code, title: c.title, from: who(people, c.from), to: who(people, c.to) });
        case "FASE": return t("autopilot.decia.change.FASE", { code: c.code, title: c.title, from: t(`pm.phase.${c.from}`), to: t(`pm.phase.${c.to}`) });
        case "REMOVER": return t("autopilot.decia.change.REMOVER", { code: c.code, title: c.title });
        case "INCLUIR": return c.days ? t("autopilot.decia.change.INCLUIR_DIAS", { title: c.title, phase: t(`pm.phase.${c.phase}`), days: num(c.days) }) : t("autopilot.decia.change.INCLUIR", { title: c.title, phase: t(`pm.phase.${c.phase}`) });
      }
    };
  }, [t, intl]);
}

export interface DiscussInDeciaButtonProps {
  kind: SessionArtifactKind;
  /** monta a sessão (função pura de lib/projects/autopilot/decia.ts) com os rótulos traduzidos */
  build: (labels: SessionLabels) => NewSessionInput | null;
  sessions?: SessionRepository;
  actorId?: string;
  /** depois de abrir (padrão: vai para a sessão) */
  onOpened?: (sessionId: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function DiscussInDeciaButton({ kind, build, sessions, actorId = DEMO_CURRENT_USER_ID, onOpened, size = "md", className }: DiscussInDeciaButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const labels = useSessionLabels();
  const open = () => {
    const input = build(labels);
    if (!input) return;
    const repo = sessions ?? demoSessionRepository();
    const r = repo.create(input, actorId);
    if (!r.ok) {
      toast({ title: t("autopilot.decia.error"), description: t(`session.denial.${r.reason}`), tone: "erro" });
      return;
    }
    // a sessão começa aberta: a proposta já é o contexto, a conversa pode começar
    repo.transition(r.session.id, actorId, "ABERTA", null);
    toast({ title: t("autopilot.decia.created", { title: r.session.title }), tone: "sucesso" });
    (onOpened ?? ((id: string) => router.push(`/decia/${encodeURIComponent(id)}`)))(r.session.id);
  };
  return (
    <Button icon="sessao-decia" size={size} className={className} onClick={open} title={t(`autopilot.decia.hint.${kind}`)} data-testid="discuss-in-decia">
      {t("autopilot.decia.cta")}
    </Button>
  );
}

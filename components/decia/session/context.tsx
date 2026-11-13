"use client";
/**
 * Contexto da tela da sessão: a sessão corrente, a política da organização, quem está "vendo como" (DEMO), o modo efetivo dessa
 * pessoa (D-156) e os rótulos traduzidos que as funções puras de lib/decia/session recebem prontos (a lógica não depende do
 * idioma). Evita passar a mesma dúzia de props por todos os componentes da sessão.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AutonomyMode } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { parseDateOnly } from "@/lib/decia/session/dates";
import type { DraftLabels, MinutesTextLabels } from "@/lib/decia/session/meeting";
import type { MinutaLabels } from "@/lib/decia/session/minuta";
import { viewerMode, type ViewerMode } from "@/lib/decia/session/policy";
import type { SessionRepository } from "@/lib/decia/session/repository";
import { memberRole } from "@/lib/decia/session/roles";
import type { DateOnly, DeciaSession, OrgAiPolicy, PeopleDirectory, SessionDenial, SessionRole } from "@/lib/decia/session/types";

export interface SessionContextValue {
  session: DeciaSession;
  org: OrgAiPolicy;
  repo: SessionRepository;
  people: PeopleDirectory;
  /** quem está agindo na tela (DEMO: "ver como" um membro) */
  me: string;
  role: SessionRole | null;
  personal: AutonomyMode;
  viewer: ViewerMode;
  now: Date;
  /** muda a aba da sessão (Conversa, Minuta…) */
  goTo: (tab: string) => void;
}

const Ctx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ value, children }: { value: Omit<SessionContextValue, "role" | "viewer">; children: ReactNode }) {
  const { session, org, personal, me } = value;
  const full = useMemo<SessionContextValue>(
    () => ({ ...value, role: memberRole(session, me), viewer: viewerMode(session, org, personal) }),
    [value, session, org, personal, me],
  );
  return <Ctx.Provider value={full}>{children}</Ctx.Provider>;
}

export function useSessionCtx(): SessionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSessionCtx fora do SessionProvider");
  return ctx;
}

/** Datas de calendário ("AAAA-MM-DD") no idioma da pessoa, sem deslocar pelo fuso. */
export function formatDateOnly(d: DateOnly, intl: string): string {
  const ymd = parseDateOnly(d);
  if (!ymd) return d;
  return new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)));
}

export const formatWhen = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

export const personName = (people: PeopleDirectory, id: string | null | undefined) => (id ? people[id]?.name ?? id : "—");

/** Mensagem traduzida para um motivo de recusa de comando (o código vai junto, para suporte). */
export function useDenial() {
  const { t } = useI18n();
  return (reason: SessionDenial) => t(`session.denial.${reason}`);
}

export function useMinutaLabels(): MinutaLabels {
  const { t, intl } = useI18n();
  return useMemo(() => ({
    heading: t("session.minuta.compose.heading"),
    evidence: (n: number) => t("session.minuta.compose.evidence", { n }),
    questions: (n: number) => t("session.minuta.compose.questions", { n }),
    decisions: (n: number) => t("session.minuta.compose.decisions", { n }),
    followUps: (open: number, done: number) => t("session.minuta.compose.followUps", { open, done }),
    none: t("session.minuta.compose.none"),
    formatDate: (d: DateOnly) => formatDateOnly(d, intl),
  }), [t, intl]);
}

export function useMinutesTextLabels(): MinutesTextLabels & DraftLabels {
  const { t, intl } = useI18n();
  return useMemo(() => ({
    title: (title: string, date: string) => t("ata.text.title", { title, date }),
    participants: t("ata.text.participants"),
    agenda: t("ata.text.agenda"),
    decisions: t("ata.text.decisions"),
    followUps: t("ata.text.followUps"),
    pending: t("ata.text.pending"),
    toDefine: t("ata.toDefine"),
    none: t("ata.text.none"),
    refused: t("ata.text.refused"),
    formatDate: (d: DateOnly) => formatDateOnly(d, intl),
    followUpDescription: (meeting: string, session: string, source: string) => t("ata.draft.description", { meeting, session, source }),
    minutesTitle: (meeting: string) => t("ata.draft.minutesTitle", { meeting }),
    criterion: t("ata.draft.criterion"),
  }), [t, intl]);
}

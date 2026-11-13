"use client";
/**
 * Tela da sessão do DECIA (`/decia/[sessionId]`, DECIA_SESSAO_E_MESA §B.2): casca fixa com a Faixa de Objetivo (objetivo,
 * estado/fase, autonomia efetiva da IA, avisos não lidos, "Nova reunião") e as abas da sessão — Conversa (chat + painel lateral
 * com autonomia e perguntas abertas), Minuta coletiva (propostas da IA ✦), Artefatos (Ata Viva e encaminhamentos), Decisão
 * (decisão ligada e estados) e Participantes. Dados DEMO (lib/decia/session/repository.ts): vivem só nesta aba.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, LoadingState, Select } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useMounted, useNow } from "@/components/decia/hooks";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { pageByRoute } from "@/lib/pages/registry";
import { DEMO_CURRENT_USER_ID } from "@/lib/decia/fixtures";
import { acceptsMeetings } from "@/lib/decia/session/machine";
import { demoSessionRepository, useOrgPolicy, useSession, type SessionRepository } from "@/lib/decia/session/repository";
import { can, memberRole, ownerOf } from "@/lib/decia/session/roles";
import { AtaVivaPanel } from "./AtaViva";
import { AutonomyPanel } from "./AutonomyPanel";
import { Chat, OpenQuestions } from "./Chat";
import { personName, SessionProvider, useSessionCtx } from "./context";
import { MinutaPanel } from "./MinutaPanel";
import { Participants } from "./Participants";
import { SessionStatusTag, StatePanel } from "./StatePanel";

const PAGE = pageByRoute("/decia/[sessionId]")!;

function ObjectiveBand({ onNewMeeting }: { onNewMeeting: () => void }) {
  const { t } = useI18n();
  const { session, repo, me, viewer } = useSessionCtx();
  const unread = session.unread[me]?.length ?? 0;
  const canMeet = can(session, me, "NOVA_REUNIAO") && acceptsMeetings(session.status);
  return (
    <Card padding="sm" className="grid gap-2 lg:sticky lg:top-[var(--ws-shell-header)] lg:z-[var(--ws-z-sticky)]" data-testid="objective-band">
      <div className="flex flex-wrap items-center gap-2">
        <SessionStatusTag status={session.status} />
        <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.state.phase", { phase: t(`session.phase.${session.phase}`) })}</span>
        <Badge tone="spark" title={t("aiPolicy.limitedBy", { layers: viewer.limitedBy.map((l) => t(`aiPolicy.layer.${l}`)).join(", ") })}>✦ {t("session.band.ai", { mode: t(`aiAutonomy.${viewer.mode}`) })}</Badge>
        {unread ? (
          <span className="flex items-center gap-1" data-testid="unread">
            <Badge count>{unread}</Badge>
            <span className="text-[length:var(--ws-text-body-sm)]">{t("session.band.unread", { n: unread })}</span>
            <Button size="sm" variant="ghost" onClick={() => repo.markRead(session.id, me)}>{t("session.band.markRead")}</Button>
          </span>
        ) : null}
        <Button variant="primary" size="sm" icon="sessao-decia" onClick={onNewMeeting} disabled={!canMeet} title={canMeet ? undefined : t("ata.cannotStartRole")} className="ml-auto" data-testid="band-new-meeting">
          {t("ata.newMeeting")}
        </Button>
      </div>
      <p className="max-w-prose text-[length:var(--ws-text-body)] font-semibold" data-testid="objective">{session.objective || t("session.band.noObjective")}</p>
    </Card>
  );
}

/** DEMO: agir como outro membro para ver papéis, avisos não lidos e o que cada um pode fazer (não existe no produto real). */
function ActAs({ onActAs }: { onActAs: (id: string) => void }) {
  const { t } = useI18n();
  const { session, me, role, people } = useSessionCtx();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-[var(--ws-space-3)]">
      <Field label={t("session.band.actAs")} hint={t("session.band.actAsHint")} className="min-w-[14rem]">
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={me}
            onChange={(e) => onActAs(e.target.value)}
            options={session.participants.map((p) => ({ value: p.userId, label: `${personName(people, p.userId)} — ${t(`session.role.${p.role}`)}` }))}
            data-testid="act-as"
          />
        )}
      </Field>
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{role ? t("session.band.youAre", { role: t(`session.role.${role}`) }) : t("session.band.notMember")}</p>
    </div>
  );
}

function ConversationTab() {
  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Chat />
      <aside className="grid content-start gap-[var(--ws-space-4)]">
        <AutonomyPanel />
        <OpenQuestions />
      </aside>
    </div>
  );
}

function Inner({ sessionId, repo }: { sessionId: string; repo: SessionRepository }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mounted = useMounted();
  const now = useNow(30_000);
  const { prefs } = usePreferences();
  const session = useSession(sessionId, repo);
  const org = useOrgPolicy(repo);
  const [actingId, setActingId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState(false);
  const me = useMemo(() => {
    if (!session) return DEMO_CURRENT_USER_ID;
    if (actingId && memberRole(session, actingId)) return actingId;
    return memberRole(session, DEMO_CURRENT_USER_ID) ? DEMO_CURRENT_USER_ID : ownerOf(session) ?? DEMO_CURRENT_USER_ID;
  }, [session, actingId]);
  const goTo = (tab: string) => {
    const next = new URLSearchParams(search.toString());
    if (tab === "conversa") next.delete("tab");
    else next.set("tab", tab);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  if (!mounted) return <LoadingState />;
  if (!session) {
    return (
      <EmptyState
        title={t("session.notFound")}
        description={t("session.notFoundHint")}
        action={<Button variant="primary" href="/decia?tab=sessoes">{t("session.backToList")}</Button>}
      />
    );
  }
  return (
    <SessionProvider value={{ session, org, repo, people: repo.people, me, personal: prefs.aiAutonomyDefault, now, goTo }}>
      <RfPage
        page={PAGE}
        subtitle={session.title}
        noEmpty
        actions={<Badge tone="neutral" title={t("session.demoHint")}>{t("session.demo")}</Badge>}
        renderTab={(slug) => {
          if (slug === "minuta") return <MinutaPanel key={me} />;
          if (slug === "artefatos") return <AtaVivaPanel key={me} newOpen={newMeeting} onNewOpenChange={setNewMeeting} />;
          if (slug === "decisao") return <StatePanel key={me} />;
          if (slug === "participantes") return <Participants />;
          return <ConversationTab key={me} />;
        }}
      >
        <ObjectiveBand onNewMeeting={() => { setNewMeeting(true); goTo("artefatos"); }} />
        <ActAs onActAs={setActingId} />
      </RfPage>
    </SessionProvider>
  );
}

export function SessionView({ sessionId, repo = demoSessionRepository() }: { sessionId: string; repo?: SessionRepository }) {
  return <Inner sessionId={sessionId} repo={repo} />;
}

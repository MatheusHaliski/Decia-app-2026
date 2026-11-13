"use client";
/**
 * Sessões do DECIA na página /decia (aba Sessões: abertas · minhas · encerradas). Card por sessão com estado e fase (texto, não
 * só cor), objetivo, autonomia da IA, decisão ligada, avisos não lidos de quem vê e encaminhamentos abertos. "Nova sessão" cria
 * em RASCUNHO com o modo de IA padrão da organização (nunca acima do teto). DEMO: vive só nesta aba.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, EmptyState, Field, Input, Link, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { demoRepository, useDecisions } from "@/lib/decia/repository";
import { effectivePolicy } from "@/lib/decia/session/policy";
import { demoSessionRepository, useOrgPolicy, useSessions, type SessionRepository } from "@/lib/decia/session/repository";
import type { DeciaSession, SessionStatus } from "@/lib/decia/session/types";
import { useDenial } from "./context";
import { SessionStatusTag } from "./StatePanel";

export type SessionListFilter = "abertas" | "minhas" | "encerradas";
const CLOSED: readonly SessionStatus[] = ["ENCERRADA", "ARQUIVADA", "CANCELADA"];

export function filterSessions(sessions: readonly DeciaSession[], filter: string, me: string): DeciaSession[] {
  if (filter === "minhas") return sessions.filter((s) => s.participants.some((p) => p.userId === me));
  if (filter === "encerradas") return sessions.filter((s) => CLOSED.includes(s.status));
  return sessions.filter((s) => !CLOSED.includes(s.status));
}

export const sessionHref = (id: string) => `/decia/${id}`;

function NewSessionDialog({ open, onOpenChange, repo, me }: { open: boolean; onOpenChange: (o: boolean) => void; repo: SessionRepository; me: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const denial = useDenial();
  const decisions = useDecisions(demoRepository());
  const org = useOrgPolicy(repo);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const r = repo.create({ title, objective, decisionId: decisionId || null, participants: members.map((userId) => ({ userId, role: "EDITOR" as const })) }, me);
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    onOpenChange(false);
    router.push(sessionHref(r.session.id));
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("session.new.title")} description={t("session.new.description", { mode: t(`aiAutonomy.${org.defaultMode}`), ceiling: t(`aiAutonomy.${org.ceiling}`) })}>
      <form className="grid gap-[var(--ws-space-3)]" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t("session.new.name")} required>{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <Field label={t("session.new.objective")} hint={t("session.new.objectiveHint")}>{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} maxLength={200} value={objective} onChange={(e) => setObjective(e.target.value)} className="min-h-16" />}</Field>
        <Field label={t("session.new.decision")}>
          {({ id }) => <Select id={id} value={decisionId} onChange={(e) => setDecisionId(e.target.value)} options={[{ value: "", label: t("session.new.noDecision") }, ...decisions.map((d) => ({ value: d.decision.id, label: d.decision.title }))]} />}
        </Field>
        <fieldset className="grid gap-1">
          <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("session.new.members")}</legend>
          {Object.entries(DEMO_PEOPLE).filter(([id]) => id !== me).map(([id, p]) => (
            <Checkbox key={id} label={p.name} checked={members.includes(id)} onCheckedChange={(v) => setMembers((cur) => (v ? [...cur, id] : cur.filter((x) => x !== id)))} />
          ))}
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.new.membersHint")}</p>
        </fieldset>
        {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>{t("session.new.create")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SessionList({ filter, repo = demoSessionRepository(), currentUserId = DEMO_CURRENT_USER_ID }: { filter: string; repo?: SessionRepository; currentUserId?: string }) {
  const { t } = useI18n();
  const sessions = useSessions(repo);
  const org = useOrgPolicy(repo);
  const decisions = useDecisions(demoRepository());
  const [creating, setCreating] = useState(false);
  const items = filterSessions(sessions, filter, currentUserId);
  return (
    <div className="grid gap-[var(--ws-space-3)]" data-testid="session-list">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" aria-live="polite">{t("session.list.count", { n: items.length })}</p>
        <Button size="sm" variant="primary" onClick={() => setCreating(true)} data-testid="new-session">+ {t("session.new.open")}</Button>
      </div>
      {items.length ? (
        <ul className="grid gap-[var(--ws-space-3)] md:grid-cols-2">
          {items.map((s) => {
            const unread = s.unread[currentUserId]?.length ?? 0;
            const decision = decisions.find((d) => d.decision.id === s.decisionId);
            const openFollowUps = s.followUps.filter((f) => f.status === "ABERTO").length;
            return (
              <Card as="li" key={s.id} padding="md" className="grid content-start gap-2" data-testid="session-card">
                <div className="flex flex-wrap items-center gap-2">
                  <SessionStatusTag status={s.status} />
                  <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.state.phase", { phase: t(`session.phase.${s.phase}`) })}</span>
                  {unread ? <Badge tone="danger">{t("session.band.unread", { n: unread })}</Badge> : null}
                </div>
                <h3 className="text-[length:var(--ws-text-body)] font-semibold"><Link href={sessionHref(s.id)}>{s.title}</Link></h3>
                <p className="line-clamp-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{s.objective}</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  <span>✦ {t("session.list.ai", { mode: t(`aiAutonomy.${effectivePolicy(s, org).mode}`) })}</span>
                  <span>{t("session.list.members", { n: s.participants.length })}</span>
                  {openFollowUps ? <span>{t("session.list.followUps", { n: openFollowUps })}</span> : null}
                  {decision ? <span>{t("session.list.decision", { title: decision.decision.title })}</span> : null}
                </p>
              </Card>
            );
          })}
        </ul>
      ) : <EmptyState compact title={t("session.list.empty")} description={t("session.list.emptyHint")} />}
      <NewSessionDialog open={creating} onOpenChange={setCreating} repo={repo} me={currentUserId} />
    </div>
  );
}

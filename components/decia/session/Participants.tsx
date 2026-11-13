"use client";
/**
 * Participantes e papéis (§E.1, com os papéis de lib/ai/autonomy): quem está na sessão e o que cada papel pode fazer — a mesma
 * matriz que habilita os botões da tela (lib/decia/session/roles.ts). Nada de contador de mensagens nem ranking de pessoas.
 */
import { Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { ROLE_ACTIONS, SESSION_ACTIONS } from "@/lib/decia/session/roles";
import { SESSION_ROLES } from "@/lib/decia/session/types";
import { formatWhen, personName, useSessionCtx } from "./context";

export function Participants() {
  const { t, intl } = useI18n();
  const { session, people, me } = useSessionCtx();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <section aria-labelledby="members-title" className="grid gap-[var(--ws-space-3)]">
        <h2 id="members-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.members.title", { n: session.participants.length })}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {session.participants.map((p) => (
            <li key={p.userId} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]">
              <span className="min-w-0 flex-1 font-semibold">{personName(people, p.userId)}{p.userId === me ? ` (${t("session.members.you")})` : ""}</span>
              <Tag tone={p.role === "PROPRIETARIO" ? "accent" : p.role === "LEITOR" ? "neutral" : "info"}>{t(`session.role.${p.role}`)}</Tag>
              <span className="w-full text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.members.since", { when: formatWhen(p.joinedAt, intl) })}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="roles-title" className="grid gap-[var(--ws-space-3)]">
        <h2 id="roles-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.roles.title")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-[length:var(--ws-text-body-sm)]">
            <caption className="sr-only">{t("session.roles.caption")}</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-ws-border p-2 text-left">{t("session.roles.action")}</th>
                {SESSION_ROLES.map((r) => <th key={r} scope="col" className="border-b border-ws-border p-2 text-left">{t(`session.role.${r}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {SESSION_ACTIONS.map((a) => (
                <tr key={a}>
                  <th scope="row" className="border-b border-ws-border p-2 text-left font-normal">{t(`session.action.${a}`)}</th>
                  {SESSION_ROLES.map((r) => {
                    const on = ROLE_ACTIONS[r].includes(a);
                    return <td key={r} className={on ? "border-b border-ws-border p-2 font-semibold" : "border-b border-ws-border p-2 text-ws-text-muted"}>{on ? `✓ ${t("session.roles.yes")}` : `— ${t("session.roles.no")}`}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

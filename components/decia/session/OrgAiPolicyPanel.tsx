"use client";
/**
 * Política de IA da organização (/admin › IA do sistema; RF51 + D-136/D-156): TETO de autonomia de todas as sessões e o PADRÃO
 * das sessões novas. Editam: ADMIN e EMPRESA. Mudar o teto avisa todos os membros de cada sessão e deixa obsoletas as propostas
 * pendentes (a versão da política de cada sessão sobe); antes de confirmar, a tela mostra o impacto sessão a sessão.
 */
import { useState } from "react";
import { Badge, Button, Card, Dialog, Field, RadioCards, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { AUTONOMY_MODES, type AutonomyMode } from "@/lib/ai/autonomy";
import { canEditOrgPolicy, exceeds, mostRestrictive, pendingValid, validateOrgPolicy } from "@/lib/decia/session/policy";
import { demoSessionRepository, useOrgPolicy, useSessions, type SessionRepository } from "@/lib/decia/session/repository";
import { ModeCapabilities } from "./AutonomyPanel";
import { formatWhen, useDenial } from "./context";

export function OrgAiPolicyPanel({ repo = demoSessionRepository() }: { repo?: SessionRepository }) {
  const { t, intl } = useI18n();
  const { profile } = useViewer();
  const denial = useDenial();
  const org = useOrgPolicy(repo);
  const sessions = useSessions(repo);
  const editable = canEditOrgPolicy(profile);
  const [ceiling, setCeiling] = useState<AutonomyMode>(org.ceiling);
  const [defaultMode, setDefaultMode] = useState<AutonomyMode>(org.defaultMode);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const valid = validateOrgPolicy({ ceiling, defaultMode });
  const changed = ceiling !== org.ceiling || defaultMode !== org.defaultMode;
  const active = sessions.filter((s) => s.status !== "ARQUIVADA" && s.status !== "CANCELADA");
  const impact = active.map((s) => ({ s, before: mostRestrictive(s.policy.mode, org.ceiling), after: mostRestrictive(s.policy.mode, ceiling), pending: pendingValid(s, org).length }));
  const ceilingChanged = ceiling !== org.ceiling;
  const byLabel = (by: string) => (by.startsWith("org:") ? t(`profile.${by.slice(4)}`) : by);
  const save = () => {
    const r = repo.setOrgPolicy(profile, { ceiling, defaultMode });
    setConfirming(false);
    setStatus(r.ok ? t("aiPolicy.org.saved", { version: r.org.version, members: r.notified, n: r.invalidated }) : denial(r.reason));
  };
  return (
    <div className="grid gap-[var(--ws-space-5)]" data-testid="org-ai-policy">
      <Card padding="md" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold"><span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{t("aiPolicy.org.title")}</h2>
          <Badge tone="neutral">{t("aiPolicy.version", { version: org.version })}</Badge>
          <Badge tone="neutral" title={t("session.demoHint")}>{t("session.demo")}</Badge>
        </div>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("aiPolicy.org.intro")}</p>
        <p className="text-[length:var(--ws-text-body-sm)]">{t("aiPolicy.org.current", { ceiling: t(`aiAutonomy.${org.ceiling}`), mode: t(`aiAutonomy.${org.defaultMode}`), by: byLabel(org.changedBy), when: formatWhen(org.changedAt, intl) })}</p>
        {!editable ? <p role="note" className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]">{t("aiPolicy.org.readOnly")}</p> : null}
        <RadioCards
          label={t("aiPolicy.org.ceiling")}
          value={ceiling}
          onValueChange={(v) => { if (!editable) return; setCeiling(v as AutonomyMode); if (exceeds(defaultMode, v as AutonomyMode)) setDefaultMode(v === "AGENTE" ? "ASSISTIDO" : (v as AutonomyMode)); }}
          columns={1}
          options={AUTONOMY_MODES.map((m) => ({ value: m, label: t(`aiAutonomy.${m}`), hint: <span className="grid gap-1"><span>{t(`aiPolicy.mode.${m}`)}</span><ModeCapabilities mode={m} /></span>, disabled: !editable }))}
        />
        <Field label={t("aiPolicy.org.default")} hint={t("aiPolicy.org.defaultHint")} error={valid.ok ? undefined : t(`session.denial.${valid.reason}`)}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              disabled={!editable}
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value as AutonomyMode)}
              options={AUTONOMY_MODES.map((m) => ({ value: m, label: t(`aiAutonomy.${m}`), disabled: m === "AGENTE" || exceeds(m, ceiling) }))}
            />
          )}
        </Field>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!changed || !valid.ok} onClick={() => setConfirming(true)} data-testid="save-org-policy">{t("aiPolicy.org.save")}</Button>
            <span aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{status}</span>
          </div>
        ) : null}
      </Card>
      <section aria-labelledby="org-sessions" className="grid gap-2">
        <h2 id="org-sessions" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("aiPolicy.org.sessions")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-[length:var(--ws-text-body-sm)]">
            <caption className="sr-only">{t("aiPolicy.org.sessionsCaption")}</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-ws-border p-2 text-left">{t("aiPolicy.org.colSession")}</th>
                <th scope="col" className="border-b border-ws-border p-2 text-left">{t("aiPolicy.org.colMode")}</th>
                <th scope="col" className="border-b border-ws-border p-2 text-left">{t("aiPolicy.org.colEffective")}</th>
                <th scope="col" className="border-b border-ws-border p-2 text-left">{t("aiPolicy.org.colVersion")}</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className="border-b border-ws-border p-2 text-left font-normal">{s.title}</th>
                  <td className="border-b border-ws-border p-2">{t(`aiAutonomy.${s.policy.mode}`)}</td>
                  <td className="border-b border-ws-border p-2">{t(`aiAutonomy.${mostRestrictive(s.policy.mode, org.ceiling)}`)}{exceeds(s.policy.mode, org.ceiling) ? ` (${t("aiPolicy.org.limited")})` : ""}</td>
                  <td className="border-b border-ws-border p-2 tabular-nums">{s.policy.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-3)]">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("aiPolicy.org.history", { n: org.history.length })}</summary>
        <ol className="mt-2 grid gap-1 text-[length:var(--ws-text-body-sm)]">
          {[...org.history].reverse().map((h) => (
            <li key={h.version}>{t("aiPolicy.org.historyLine", { version: h.version, ceiling: t(`aiAutonomy.${h.ceiling}`), mode: t(`aiAutonomy.${h.defaultMode}`), by: byLabel(h.changedBy), when: formatWhen(h.changedAt, intl) })}</li>
          ))}
        </ol>
      </details>
      <Dialog open={confirming} onOpenChange={setConfirming} title={t("aiPolicy.org.confirmTitle")} description={ceilingChanged ? t("aiPolicy.org.confirmCeiling") : t("aiPolicy.org.confirmDefault")} className="w-[min(94vw,40rem)]">
        <div className="grid gap-[var(--ws-space-3)]">
          {ceilingChanged ? (
            <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]" data-testid="org-impact">
              {impact.map(({ s, before, after, pending }) => (
                <li key={s.id}>{t("aiPolicy.org.impactLine", { title: s.title, before: t(`aiAutonomy.${before}`), after: t(`aiAutonomy.${after}`), members: s.participants.length, n: pending })}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={save} data-testid="confirm-org-policy">{t("aiPolicy.org.confirm")}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

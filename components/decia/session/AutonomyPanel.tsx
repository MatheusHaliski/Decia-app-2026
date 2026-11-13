"use client";
/**
 * Autonomia da IA na sessão (RF51): o modo da sessão, o teto da organização, a preferência pessoal e o modo EFETIVO de quem vê
 * (o mais restritivo, D-156), com o que a IA pode fazer em cada modo — de "só lê" (Manual) a "agente com mandato e limites".
 * A pessoa proprietária troca o modo: todos os membros são avisados e as propostas calculadas antes ficam obsoletas.
 */
import { useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, Field, Input, Link, RadioCards, Tag, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { AGENT_LIMITS, AUTONOMY_MODES, MODE_CAPABILITIES, type AgentCharter, type AutonomyMode } from "@/lib/ai/autonomy";
import { MINUTA_TARGET, exceeds, pendingValid } from "@/lib/decia/session/policy";
import { can } from "@/lib/decia/session/roles";
import { formatWhen, useDenial, useSessionCtx } from "./context";
import { useByLabel } from "./Chat";

/** Ferramentas que um agente pode receber na sessão (o mandato escolhe um subconjunto). */
export const AGENT_TOOLS = ["propor_minuta", "organizar_encaminhamentos", "citar_memoria"] as const;

export function ModeCapabilities({ mode }: { mode: AutonomyMode }) {
  const { t } = useI18n();
  const caps = MODE_CAPABILITIES[mode];
  const rows: [string, string, boolean][] = [
    [t("aiPolicy.cap.reads"), t("aiPolicy.yes"), true],
    [t("aiPolicy.cap.spontaneous"), caps.spontaneous ? t("aiPolicy.yes") : t("aiPolicy.no"), caps.spontaneous],
    [t("aiPolicy.cap.answers"), caps.answers ? t("aiPolicy.onRequest") : t("aiPolicy.no"), caps.answers],
    [t("aiPolicy.cap.proposes"), t(`aiPolicy.proposes.${caps.proposes}`), caps.proposes !== "NUNCA"],
    [t("aiPolicy.cap.applies"), t(`aiPolicy.applies.${caps.applies}`), caps.applies !== "NUNCA"],
  ];
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)]" aria-label={t("aiPolicy.capsOf", { mode: t(`aiAutonomy.${mode}`) })}>
      {rows.map(([k, v, on]) => (
        <div key={k} className="contents">
          <dt className="text-ws-text-muted">{k}</dt>
          <dd className={on ? "font-semibold text-ws-text" : "text-ws-text-muted"}><span aria-hidden>{on ? "✓ " : "— "}</span>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function CharterForm({ value, onChange }: { value: AgentCharter; onChange: (c: AgentCharter) => void }) {
  const { t } = useI18n();
  const hours = Math.max(1, Math.round((Date.parse(value.expiresAt) - Date.now()) / 3_600_000));
  return (
    <fieldset className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-3)]" data-testid="charter-form">
      <legend className="px-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("aiPolicy.charter.title")}</legend>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("aiPolicy.charter.intro", { steps: AGENT_LIMITS.maxSteps, tokens: AGENT_LIMITS.maxTokens, hours: AGENT_LIMITS.maxHours })}</p>
      <Field label={t("aiPolicy.charter.goal")} hint={t("aiPolicy.charter.goalHint")}>
        {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={value.goal} onChange={(e) => onChange({ ...value, goal: e.target.value })} className="min-h-16" />}
      </Field>
      <fieldset className="grid gap-1">
        <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("aiPolicy.charter.tools")}</legend>
        {AGENT_TOOLS.map((tool) => (
          <Checkbox
            key={tool}
            label={t(`aiPolicy.tool.${tool}`)}
            checked={value.allowedTools.includes(tool)}
            onCheckedChange={(on) => onChange({ ...value, allowedTools: on ? [...value.allowedTools, tool] : value.allowedTools.filter((x) => x !== tool) })}
          />
        ))}
      </fieldset>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("aiPolicy.charter.scope")}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label={t("aiPolicy.charter.maxSteps")}>{({ id }) => <Input id={id} type="number" min={1} max={AGENT_LIMITS.maxSteps} value={value.maxSteps} onChange={(e) => onChange({ ...value, maxSteps: Number(e.target.value) })} />}</Field>
        <Field label={t("aiPolicy.charter.maxTokens")}>{({ id }) => <Input id={id} type="number" min={1} max={AGENT_LIMITS.maxTokens} step={1000} value={value.maxTokens} onChange={(e) => onChange({ ...value, maxTokens: Number(e.target.value) })} />}</Field>
        <Field label={t("aiPolicy.charter.hours")}>{({ id }) => <Input id={id} type="number" min={1} max={AGENT_LIMITS.maxHours} value={hours} onChange={(e) => onChange({ ...value, expiresAt: new Date(Date.now() + Number(e.target.value) * 3_600_000).toISOString() })} />}</Field>
      </div>
    </fieldset>
  );
}

function ChangeModeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const { session, org, repo, me } = useSessionCtx();
  const denial = useDenial();
  const [to, setTo] = useState<AutonomyMode>(session.policy.mode);
  const [charter, setCharter] = useState<AgentCharter>(() => session.policy.charter ?? {
    goal: "", authorizedBy: me, scopeTargetIds: [MINUTA_TARGET], allowedTools: ["propor_minuta"], maxSteps: 10, maxTokens: 20_000,
    expiresAt: new Date(Date.now() + 2 * 3_600_000).toISOString(), connectorIds: [],
  });
  const [error, setError] = useState<string | null>(null);
  const affected = pendingValid(session, org).length;
  const submit = () => {
    const r = repo.changeMode(session.id, me, to, to === "AGENTE" ? { ...charter, authorizedBy: me } : null);
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    setError(null);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("aiPolicy.change.title")} description={t("aiPolicy.change.description")} className="w-[min(94vw,44rem)]">
      <form className="grid gap-[var(--ws-space-3)]" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <RadioCards
          label={t("aiPolicy.change.modes")}
          value={to}
          onValueChange={(v) => setTo(v as AutonomyMode)}
          columns={1}
          options={AUTONOMY_MODES.map((m) => ({
            value: m,
            label: <span className="flex flex-wrap items-center gap-2">{t(`aiAutonomy.${m}`)}{m === session.policy.mode ? <Badge tone="accent">{t("aiPolicy.current")}</Badge> : null}{exceeds(m, org.ceiling) ? <Badge tone="neutral">{t("aiPolicy.aboveCeiling")}</Badge> : null}</span>,
            hint: <span className="grid gap-1"><span>{t(`aiPolicy.mode.${m}`)}</span><ModeCapabilities mode={m} /></span>,
            disabled: exceeds(m, org.ceiling),
          }))}
        />
        {to === "AGENTE" ? <CharterForm value={charter} onChange={setCharter} /> : null}
        <p role="note" className="rounded-[var(--ws-radius-md)] bg-ws-info-soft p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]">
          {t("aiPolicy.change.effects", { members: session.participants.length - 1, n: affected })}
        </p>
        {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" disabled={to === session.policy.mode && to !== "AGENTE"} data-testid="confirm-mode">{t("aiPolicy.change.confirm")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function AutonomyPanel() {
  const { t, intl } = useI18n();
  const { session, org, me, viewer, personal } = useSessionCtx();
  const byLabel = useByLabel();
  const [open, setOpen] = useState(false);
  const owner = can(session, me, "TROCAR_MODO");
  const charter = session.policy.charter;
  return (
    <Card padding="md" className="grid gap-[var(--ws-space-3)]" data-testid="autonomy-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold"><span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{t("aiPolicy.title")}</h3>
        <Badge tone="neutral">{t("aiPolicy.version", { version: session.policy.version })}</Badge>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[length:var(--ws-text-body-sm)]">
        <dt className="text-ws-text-muted">{t("aiPolicy.sessionMode")}</dt><dd className="font-semibold" data-testid="session-mode">{t(`aiAutonomy.${session.policy.mode}`)}</dd>
        <dt className="text-ws-text-muted">{t("aiPolicy.orgCeiling")}</dt><dd>{t(`aiAutonomy.${org.ceiling}`)}</dd>
        <dt className="text-ws-text-muted">{t("aiPolicy.personal")}</dt><dd>{t(`aiAutonomy.${personal}`)} <Link href="/settings?tab=trabalho" className="text-[length:var(--ws-text-caption)]">{t("aiPolicy.changePersonal")}</Link></dd>
        <dt className="text-ws-text-muted">{t("aiPolicy.effective")}</dt>
        <dd><Tag tone="spark">{t(`aiAutonomy.${viewer.mode}`)}</Tag> <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("aiPolicy.limitedBy", { layers: viewer.limitedBy.map((l) => t(`aiPolicy.layer.${l}`)).join(", ") })}</span></dd>
      </dl>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`aiPolicy.mode.${viewer.mode}`)}</p>
      <ModeCapabilities mode={viewer.mode} />
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("aiPolicy.changedBy", { by: byLabel(session.policy.changedBy), when: formatWhen(session.policy.changedAt, intl) })}</p>
      {charter && session.policy.mode === "AGENTE" ? (
        <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-ai-spark p-[var(--ws-space-2)] text-[length:var(--ws-text-caption)]" data-testid="charter-summary">
          <p className="font-semibold">{t("aiPolicy.charter.active")}</p>
          <p>{charter.goal}</p>
          <p className="text-ws-text-muted">{t("aiPolicy.charter.limits", { tools: charter.allowedTools.map((x) => t(`aiPolicy.tool.${x}`)).join(", "), steps: charter.maxSteps, tokens: charter.maxTokens, when: formatWhen(charter.expiresAt, intl) })}</p>
          {viewer.mode !== "AGENTE" ? <p className="text-ws-text-muted">{t("aiPolicy.charter.inactive")}</p> : null}
        </div>
      ) : null}
      {owner ? (
        <Button size="sm" variant="default" className="w-fit" onClick={() => setOpen(true)} data-testid="change-mode">{t("aiPolicy.change.open")}</Button>
      ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("aiPolicy.onlyOwner")}</p>}
      {open ? <ChangeModeDialog open={open} onOpenChange={setOpen} /> : null}
    </Card>
  );
}

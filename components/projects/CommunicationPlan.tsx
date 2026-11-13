"use client";
/**
 * Plano de comunicação (PMBOK, gerenciamento das comunicações; aula de projetos, Tema 3): o quê, para quem, por qual canal, com
 * que frequência e quem envia. Ligado ao mapa poder × interesse (Mendelow): quem se gerencia de perto precisa de comunicação
 * frequente; quem se mantém satisfeito, ao menos periódica — o indicador Q_COMUNICACAO mede essa cobertura.
 */
import { useState } from "react";
import { Button, Checkbox, Field, Select, Tag, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { mendelow } from "@/lib/projects/engine/methods";
import { COMM_CHANNELS, COMM_FREQUENCIES, type CommChannel, type CommFrequency, type Stakeholder } from "@/lib/projects/types";
import { CommitText, SectionTitle, Theory } from "./common";
import { nameOf, type PanelProps } from "./shared";

const NEEDS = new Set(["GERENCIAR_DE_PERTO", "MANTER_SATISFEITO"]);
const FREQUENT = new Set<CommFrequency>(["DIARIA", "SEMANAL", "QUINZENAL"]);

export function CommunicationPlan({ model, dispatch, people, readOnly }: PanelProps) {
  const { t } = useI18n();
  const comms = model.communications ?? [];
  const [draft, setDraft] = useState<{ info: string; audienceIds: string[]; channel: CommChannel; frequency: CommFrequency; ownerId: string }>({ info: "", audienceIds: [], channel: "REUNIAO", frequency: "SEMANAL", ownerId: "" });
  const stkName = (id: string) => model.stakeholders.find((s) => s.id === id)?.name ?? id;
  const coverage = model.stakeholders.map((s) => {
    const strategy = mendelow(s.power, s.interest);
    const own = comms.filter((c) => c.audienceIds.includes(s.id));
    const ok = !NEEDS.has(strategy) || (own.length > 0 && (strategy !== "GERENCIAR_DE_PERTO" || own.some((c) => FREQUENT.has(c.frequency))));
    return { s, strategy, own, ok };
  });
  const gaps = coverage.filter((c) => !c.ok);
  const prepareFor = (s: Stakeholder) => setDraft((d) => ({ ...d, audienceIds: [s.id], frequency: mendelow(s.power, s.interest) === "GERENCIAR_DE_PERTO" ? "SEMANAL" : "MENSAL" }));
  const owners = [{ value: "", label: t("pm.ui.unassigned") }, ...model.team.map((m) => ({ value: m.userId, label: `${nameOf(people, m.userId)} · ${t(`pm.role.${m.role}`)}` }))];

  return (
    <section aria-labelledby="comm-title" className="grid gap-[var(--ws-space-3)]" data-comm>
      <SectionTitle id="comm-title">{t("pm.comm.title")}</SectionTitle>
      {gaps.length ? (
        <ul className="grid gap-1.5" aria-label={t("pm.comm.gaps")}>
          {gaps.map(({ s, strategy, own }) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-l-4 border-ws-border border-l-ws-warning bg-ws-surface-1 px-3 py-2 text-[length:var(--ws-text-body-sm)]" data-gap={s.id}>
              <span className="min-w-0 flex-1">{t(own.length ? "pm.comm.gapFrequency" : "pm.comm.gapNone", { name: s.name, strategy: t(`pm.engagement.${strategy}`) })}</span>
              {!readOnly ? <Button size="sm" variant="ghost" onClick={() => prepareFor(s)}>{t("pm.comm.planFor", { name: s.name })}</Button> : null}
            </li>
          ))}
        </ul>
      ) : model.stakeholders.length ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink">{t("pm.comm.allCovered")}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("pm.comm.title")}</caption>
          <thead>
            <tr className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              {["info", "audience", "channel", "frequency", "owner", "actions"].map((h) => <th key={h} scope="col" className="py-1.5 pr-3 font-semibold">{t(`pm.comm.col.${h}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {comms.map((c) => (
              <tr key={c.id} className="border-t border-ws-border align-top" data-comm-item={c.id}>
                <td className="py-1.5 pr-3"><CommitText bare label={t("pm.comm.col.info")} value={c.info} disabled={readOnly} onCommit={(v) => dispatch({ type: "COMM_UPDATE", id: c.id, patch: { info: v } })} /></td>
                <td className="py-1.5 pr-3"><span className="flex flex-wrap gap-1">{c.audienceIds.map((id) => <Tag key={id}>{stkName(id)}</Tag>)}</span></td>
                <td className="py-1.5 pr-3">
                  <Select aria-label={t("pm.comm.col.channel")} value={c.channel} disabled={readOnly} onChange={(e) => dispatch({ type: "COMM_UPDATE", id: c.id, patch: { channel: e.target.value as CommChannel } })} options={COMM_CHANNELS.map((x) => ({ value: x, label: t(`pm.comm.channel.${x}`) }))} className="min-h-[var(--ws-control-sm)]" />
                </td>
                <td className="py-1.5 pr-3">
                  <Select aria-label={t("pm.comm.col.frequency")} value={c.frequency} disabled={readOnly} onChange={(e) => dispatch({ type: "COMM_UPDATE", id: c.id, patch: { frequency: e.target.value as CommFrequency } })} options={COMM_FREQUENCIES.map((x) => ({ value: x, label: t(`pm.comm.frequency.${x}`) }))} className="min-h-[var(--ws-control-sm)]" />
                </td>
                <td className="py-1.5 pr-3">
                  <Select aria-label={t("pm.comm.col.owner")} value={c.ownerId ?? ""} disabled={readOnly} onChange={(e) => dispatch({ type: "COMM_UPDATE", id: c.id, patch: { ownerId: e.target.value || undefined } })} options={owners} className="min-h-[var(--ws-control-sm)]" />
                </td>
                <td className="py-1.5">{!readOnly ? <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: c.info })} onClick={() => dispatch({ type: "COMM_REMOVE", id: c.id })}>×</Button> : null}</td>
              </tr>
            ))}
            {!comms.length ? <tr><td colSpan={6} className="py-2 text-ws-text-muted">{t("pm.ui.noneYet")}</td></tr> : null}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <form
          className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] md:grid-cols-2"
          aria-label={t("pm.comm.add")}
          onSubmit={(e) => {
            e.preventDefault();
            const r = dispatch({ type: "COMM_ADD", info: draft.info, audienceIds: draft.audienceIds, channel: draft.channel, frequency: draft.frequency, ownerId: draft.ownerId || undefined });
            if (r.ok) setDraft({ info: "", audienceIds: [], channel: "REUNIAO", frequency: "SEMANAL", ownerId: "" });
          }}
        >
          <Field label={t("pm.comm.col.info")} className="md:col-span-2">
            {({ id }) => <Textarea id={id} value={draft.info} placeholder={t("pm.comm.infoPlaceholder")} onChange={(e) => setDraft({ ...draft, info: e.target.value })} className="min-h-16" />}
          </Field>
          <fieldset className="grid gap-1 md:col-span-2">
            <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("pm.comm.col.audience")}</legend>
            <div className="flex flex-wrap gap-x-4">
              {model.stakeholders.map((s) => (
                <Checkbox key={s.id} checked={draft.audienceIds.includes(s.id)} label={s.name} hint={t(`pm.engagement.${mendelow(s.power, s.interest)}`)}
                  onCheckedChange={(v) => setDraft({ ...draft, audienceIds: v ? [...draft.audienceIds, s.id] : draft.audienceIds.filter((x) => x !== s.id) })} />
              ))}
            </div>
          </fieldset>
          <Field label={t("pm.comm.col.channel")}>{({ id }) => <Select id={id} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as CommChannel })} options={COMM_CHANNELS.map((x) => ({ value: x, label: t(`pm.comm.channel.${x}`) }))} />}</Field>
          <Field label={t("pm.comm.col.frequency")}>{({ id }) => <Select id={id} value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as CommFrequency })} options={COMM_FREQUENCIES.map((x) => ({ value: x, label: t(`pm.comm.frequency.${x}`) }))} />}</Field>
          <Field label={t("pm.comm.col.owner")}>{({ id }) => <Select id={id} value={draft.ownerId} onChange={(e) => setDraft({ ...draft, ownerId: e.target.value })} options={owners} />}</Field>
          <div className="flex items-end"><Button type="submit" variant="primary" disabled={!draft.info.trim() || !draft.audienceIds.length}>{t("pm.comm.add")}</Button></div>
        </form>
      ) : null}
      <Theory refKey="PLANO_COMUNICACAO">{t("pm.comm.theory")}</Theory>
    </section>
  );
}

"use client";
/**
 * Criador de Chancela (RF39.CA01, CA02, CA09): nome, emissor (a conta que cria — EMPRESA ou o CHEFE e seu departamento), tier, selo de
 * Excelência, ciclo de concessão, limite de uso, política (AUTO ou REVISAO) com critérios calculados pelo sistema e até 4 benefícios
 * resgatáveis. Erros de validação voltam no campo (PERIODO_INVALIDO no ciclo). Só EMPRESA e CHEFE abrem o criador.
 */
import { useState, type FormEvent } from "react";
import { Button, Checkbox, Dialog, Field, IconButton, Input, RadioCards, Select, Switch, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { MAX_BENEFITS_PER_SEAL, SEAL_NAME_MAX, type BenefitForm, type SealError, type SealField, type SealsRepository } from "@/lib/seals/repository";
import { BENEFIT_TYPES, DEFAULT_THRESHOLDS, POLICY_MODES, SEAL_CRITERIA, SEAL_TIERS, THRESHOLD_CRITERIA, type BenefitType, type PolicyMode, type SealActor, type SealCriterion, type SealTier } from "@/lib/seals/types";

interface BenefitDraft { type: BenefitType; credits: string; quota: string; expiresAt: string }

const yearEnd = (now: Date) => `${now.getUTCFullYear()}-12-31`;

export function SealCreator({ open, onOpenChange, actor, repo }: { open: boolean; onOpenChange: (o: boolean) => void; actor: SealActor; repo: SealsRepository }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const now = new Date();
  const [name, setName] = useState("");
  const [tier, setTier] = useState<SealTier>("TAREFA");
  const [excellence, setExcellence] = useState(false);
  const [from, setFrom] = useState(now.toISOString().slice(0, 10));
  const [until, setUntil] = useState(yearEnd(now));
  const [limit, setLimit] = useState("");
  const [mode, setMode] = useState<PolicyMode>("REVISAO");
  const [criteria, setCriteria] = useState<Partial<Record<SealCriterion, string>>>({ PRAZO_CUMPRIDO: "", CONFORMIDADE_MIN: String(DEFAULT_THRESHOLDS.CONFORMIDADE_MIN) });
  const [benefits, setBenefits] = useState<BenefitDraft[]>([{ type: "PONTOS_BONUS", credits: "10", quota: "", expiresAt: "" }]);
  const [error, setError] = useState<{ reason: SealError; field?: SealField } | null>(null);

  const reset = () => {
    setName("");
    setTier("TAREFA");
    setExcellence(false);
    setLimit("");
    setMode("REVISAO");
    setCriteria({ PRAZO_CUMPRIDO: "", CONFORMIDADE_MIN: String(DEFAULT_THRESHOLDS.CONFORMIDADE_MIN) });
    setBenefits([{ type: "PONTOS_BONUS", credits: "10", quota: "", expiresAt: "" }]);
    setError(null);
  };

  const toggle = (c: SealCriterion, on: boolean) => {
    const next = { ...criteria };
    if (on) next[c] = THRESHOLD_CRITERIA.includes(c) ? String(DEFAULT_THRESHOLDS[c] ?? 1) : "";
    else delete next[c];
    setCriteria(next);
  };

  const setBenefit = (i: number, patch: Partial<BenefitDraft>) => setBenefits(benefits.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const forms: BenefitForm[] = benefits.map((b) => ({
      type: b.type,
      credits: b.type === "CREDITOS_IA" ? Number(b.credits) : null,
      totalQuota: b.quota.trim() ? Number(b.quota) : null,
      perUserLimit: 1,
      expiresAt: b.expiresAt || null,
    }));
    const r = repo.createSeal(actor, {
      name, tier, excellence, availableFrom: from, availableUntil: until || null, usageLimit: limit.trim() ? Number(limit) : null, mode,
      criteria: (Object.keys(criteria) as SealCriterion[]).map((c) => ({ criterion: c, threshold: THRESHOLD_CRITERIA.includes(c) ? Number(criteria[c]) : null })),
      benefits: forms,
    }, new Date());
    if (!r.ok) {
      setError({ reason: r.reason, field: r.field });
      return;
    }
    toast({ title: t("seals.creator.done", { name: r.seal.name }), description: t("seals.creator.doneHint", { n: r.benefits.length }), tone: "sucesso" });
    reset();
    onOpenChange(false);
  };

  const err = (field: SealField) => (error && error.field === field ? t(`seals.error.${error.reason}`) : undefined);
  const issuer = actor.profile === "EMPRESA" ? t("seals.creator.issuerCompany", { name: actor.name }) : t("seals.creator.issuerChief", { name: actor.name, department: actor.department ?? "—" });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={t("seals.creator.title")} description={t("seals.creator.description")} className="w-[min(94vw,44rem)]">
      <form className="grid gap-4" onSubmit={submit} data-testid="seal-creator">
        <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)]"><span className="font-semibold">{t("seals.creator.issuer")}:</span> {issuer}</p>
        <Field label={t("seals.creator.name")} hint={t("seals.creator.nameHint", { max: SEAL_NAME_MAX })} error={err("name")} required>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={name} maxLength={SEAL_NAME_MAX} onChange={(e) => setName(e.target.value)} data-testid="seal-name" />}
        </Field>
        <RadioCards label={t("seals.creator.tier")} value={tier} onValueChange={(v) => setTier(v as SealTier)} columns={3} options={SEAL_TIERS.map((x) => ({ value: x, label: t(`seals.tier.${x}`) }))} />
        <Switch checked={excellence} onCheckedChange={setExcellence} label={t("seals.creator.excellence")} hint={t("seals.creator.excellenceHint")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("seals.creator.from")} error={err("period")}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="seal-from" />}
          </Field>
          <Field label={t("seals.creator.until")}>
            {({ id }) => <Input id={id} type="date" value={until} onChange={(e) => setUntil(e.target.value)} data-testid="seal-until" />}
          </Field>
          <Field label={t("seals.creator.limit")} hint={t("seals.creator.limitHint")} error={err("usageLimit")}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} type="number" min={1} step={1} value={limit} onChange={(e) => setLimit(e.target.value)} />}
          </Field>
        </div>
        <RadioCards label={t("seals.creator.mode")} value={mode} onValueChange={(v) => setMode(v as PolicyMode)} columns={2} options={POLICY_MODES.map((m) => ({ value: m, label: t(`seals.mode.${m}`), hint: t(`seals.modeHint.${m}`) }))} />
        <fieldset className="grid gap-2">
          <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("seals.creator.criteria")}</legend>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.creator.criteriaHint")}</p>
          {SEAL_CRITERIA.map((c) => (
            <div key={c} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem]">
              <Checkbox checked={c in criteria} onCheckedChange={(v) => toggle(c, v)} label={t(`seals.criterion.${c}`)} hint={t(`seals.criterionHint.${c}`)} />
              {THRESHOLD_CRITERIA.includes(c) && c in criteria ? (
                <Field label={t("seals.creator.threshold")}>
                  {({ id }) => <Input id={id} type="number" min={0} max={c === "CONFORMIDADE_MIN" ? 100 : undefined} value={criteria[c] ?? ""} onChange={(e) => setCriteria({ ...criteria, [c]: e.target.value })} />}
                </Field>
              ) : null}
            </div>
          ))}
          {err("criteria") ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{err("criteria")}</p> : null}
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("seals.creator.benefits")}</legend>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.creator.benefitsHint")}</p>
          {benefits.map((b, i) => (
            <div key={i} className="grid items-end gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto]">
              <Field label={t("seals.creator.benefitType")}>
                {({ id }) => <Select id={id} value={b.type} onChange={(e) => setBenefit(i, { type: e.target.value as BenefitType })} options={BENEFIT_TYPES.map((x) => ({ value: x, label: t(`benefits.type.${x}`) }))} />}
              </Field>
              <Field label={t("seals.creator.credits")}>
                {({ id }) => <Input id={id} type="number" min={1} max={100} value={b.credits} disabled={b.type !== "CREDITOS_IA"} onChange={(e) => setBenefit(i, { credits: e.target.value })} />}
              </Field>
              <Field label={t("seals.creator.quota")}>
                {({ id }) => <Input id={id} type="number" min={1} value={b.quota} placeholder={t("seals.creator.noLimit")} onChange={(e) => setBenefit(i, { quota: e.target.value })} />}
              </Field>
              <Field label={t("seals.creator.expires")}>
                {({ id }) => <Input id={id} type="date" value={b.expiresAt} onChange={(e) => setBenefit(i, { expiresAt: e.target.value })} />}
              </Field>
              <IconButton icon="sair" label={t("seals.creator.removeBenefit")} onClick={() => setBenefits(benefits.filter((_, j) => j !== i))} />
            </div>
          ))}
          {err("benefits") ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{err("benefits")}</p> : null}
          {benefits.length < MAX_BENEFITS_PER_SEAL ? (
            <div><Button size="sm" variant="ghost" onClick={() => setBenefits([...benefits, { type: "CREDITOS_IA", credits: "10", quota: "", expiresAt: "" }])}>{t("seals.creator.addBenefit")}</Button></div>
          ) : null}
        </fieldset>
        {error && !error.field ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink">{t(`seals.error.${error.reason}`)}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" data-testid="seal-submit">{t("seals.creator.submit")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

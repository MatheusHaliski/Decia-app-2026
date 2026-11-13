"use client";
/**
 * Benefícios (`/benefits`, RF39.CA09, CA10): os benefícios liberados à pessoa por chancelas APROVADAS em itens em que ela colaborou,
 * com resgate confirmado — bônus em DECIA Points pelo `award` BENEFICIO_BONUS (valor da regra vigente), créditos de IA no saldo da
 * Loja ou código de resgate (certificado, capacitação, prioridade…) — e o histórico. EMPRESA e CHEFE veem os benefícios das próprias
 * chancelas com os resgates e publicam novos. Sem chancela válida, CHANCELA_INVALIDA. Dados DEMO desta aba.
 */
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { DemoBadge, DemoNote, Dp, formatDate, formatNumber, newActionKey, useMounted } from "@/components/points/shared";
import { RfPage } from "@/components/shell/RfPage";
import { Button, Card, Dialog, EmptyState, Field, Input, LoadingState, Select, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { PageEntry } from "@/lib/pages/registry";
import { usePointsTick, pointsLedger } from "@/lib/points/usePoints";
import { canCreateSeal, canRedeemBenefits, isIssuerOf } from "@/lib/seals/permissions";
import type { BenefitOffer, SealsRepository } from "@/lib/seals/repository";
import { BENEFIT_TYPES, type Benefit, type BenefitRedemption, type BenefitType, type SealActor } from "@/lib/seals/types";
import { demoSealsRepository, sealActorOf, useSealsTick } from "@/lib/seals/useSeals";
import { useViewer } from "@/lib/viewer/ViewerProvider";

function BenefitValue({ benefit }: { benefit: Benefit }) {
  const { t } = useI18n();
  if (benefit.type === "PONTOS_BONUS") return <Dp value={pointsLedger().rules().BENEFICIO_BONUS.points} signed />;
  if (benefit.type === "CREDITOS_IA") return <span className="font-semibold">{t("benefits.credits", { n: benefit.credits ?? 0 })}</span>;
  return <span className="font-semibold">{t("benefits.voucher")}</span>;
}

function RedeemDialog({ offer, actor, repo, onClose }: { offer: BenefitOffer; actor: SealActor; repo: SealsRepository; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const key = useMemo(() => newActionKey("resgate"), []);
  const [done, setDone] = useState<BenefitRedemption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = () => {
    const r = repo.redeem(actor, { benefitId: offer.benefit.id, bondId: offer.bond.id, idempotencyKey: key }, new Date());
    if (!r.ok) {
      setError(`${r.reason} — ${t(`seals.error.${r.reason}`)}`);
      return;
    }
    setDone(r.redemption);
    toast({ title: t("benefits.redeemed", { benefit: t(`benefits.type.${offer.benefit.type}`) }), tone: "sucesso" });
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={t("benefits.confirm.title")} description={t("benefits.confirm.description")}>
      <div className="grid gap-3" data-testid="redeem-dialog">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)]">
          <dt className="text-ws-text-muted">{t("benefits.confirm.benefit")}</dt>
          <dd className="font-semibold">{t(`benefits.type.${offer.benefit.type}`)}</dd>
          <dt className="text-ws-text-muted">{t("benefits.confirm.value")}</dt>
          <dd><BenefitValue benefit={offer.benefit} /></dd>
          <dt className="text-ws-text-muted">{t("benefits.confirm.seal")}</dt>
          <dd>{offer.seal.name}</dd>
          <dt className="text-ws-text-muted">{t("benefits.confirm.item")}</dt>
          <dd>{offer.bond.targetTitle}</dd>
        </dl>
        <div aria-live="polite" data-testid="redeem-outcome">
          {done ? (
            <div className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-success-soft p-3 text-[length:var(--ws-text-body-sm)]">
              <p className="font-semibold">{t(`benefits.delivered.${offer.benefit.type === "PONTOS_BONUS" || offer.benefit.type === "CREDITOS_IA" ? offer.benefit.type : "CODIGO"}`, { n: offer.benefit.type === "CREDITOS_IA" ? offer.benefit.credits ?? 0 : pointsLedger().rules().BENEFICIO_BONUS.points })}</p>
              <p>{t("benefits.code", { code: done.code })}</p>
            </div>
          ) : error ? <p role="alert" className="rounded-[var(--ws-radius-md)] bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]">{error}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{done ? t("common.close") : t("common.cancel")}</Button>
          {!done ? <Button variant="primary" onClick={confirm} data-testid="redeem-confirm">{t("benefits.confirm.submit")}</Button> : null}
        </div>
      </div>
    </Dialog>
  );
}

function MyBenefits({ actor, repo }: { actor: SealActor; repo: SealsRepository }) {
  const { t, intl } = useI18n();
  const [redeeming, setRedeeming] = useState<BenefitOffer | null>(null);
  const offers = repo.benefitsFor(actor.id);
  const history = repo.redemptions(actor.id);
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card title={t("benefits.mine.title")} eyebrow="RF39 · CA10" data-testid="my-benefits">
        <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("benefits.mine.intro")}</p>
        {offers.length === 0 ? <EmptyState compact title={t("benefits.mine.empty")} description={t("benefits.mine.emptyHint")} /> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {offers.map((o) => (
              <li key={`${o.bond.id}:${o.benefit.id}`} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" data-testid={`benefit-${o.benefit.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{t(`benefits.type.${o.benefit.type}`)}</h3>
                  <Tag tone={o.state === "DISPONIVEL" ? "success" : "neutral"}>{t(`benefits.state.${o.state}`)}</Tag>
                </div>
                <BenefitValue benefit={o.benefit} />
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("benefits.from", { seal: o.seal.name, item: o.bond.targetTitle })}</p>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`benefits.typeHint.${o.benefit.type}`)}{o.benefit.expiresAt ? ` · ${t("benefits.expires", { date: formatDate(`${o.benefit.expiresAt}T12:00:00Z`, intl) })}` : ""}</p>
                <div><Button size="sm" variant="primary" disabled={o.state !== "DISPONIVEL"} onClick={() => setRedeeming(o)} aria-label={t("benefits.redeemFor", { benefit: t(`benefits.type.${o.benefit.type}`), seal: o.seal.name })}>{t("benefits.redeem")}</Button></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t("benefits.history.title")}>
        {history.length === 0 ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("benefits.history.empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="redemptions-table">
              <caption className="sr-only">{t("benefits.history.caption")}</caption>
              <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t("benefits.history.colDate")}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t("benefits.history.colBenefit")}</th>
                  <th scope="col" className="py-2 font-semibold">{t("benefits.history.colCode")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const b = repo.allBenefits().find((x) => x.id === r.benefitId);
                  return (
                    <tr key={r.id} className="border-t border-ws-border">
                      <td className="whitespace-nowrap py-2 pr-3">{formatDate(r.at, intl)}</td>
                      <th scope="row" className="py-2 pr-3 font-normal">{b ? t(`benefits.type.${b.type}`) : r.benefitId}</th>
                      <td className="py-2 font-[family-name:var(--ws-font-mono)]">{r.code}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {redeeming ? <RedeemDialog offer={redeeming} actor={actor} repo={repo} onClose={() => setRedeeming(null)} /> : null}
    </div>
  );
}

function PublishDialog({ actor, repo, onClose }: { actor: SealActor; repo: SealsRepository; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const mine = repo.seals().filter((s) => isIssuerOf(actor, s));
  const [sealId, setSealId] = useState(mine[0]?.id ?? "");
  const [type, setType] = useState<BenefitType>("CAPACITACAO");
  const [credits, setCredits] = useState("10");
  const [quota, setQuota] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = repo.publishBenefit(actor, sealId, { type, credits: type === "CREDITOS_IA" ? Number(credits) : null, totalQuota: quota.trim() ? Number(quota) : null, perUserLimit: 1, expiresAt: expiresAt || null }, new Date());
    if (!r.ok) {
      setError(t(`seals.error.${r.reason}`));
      return;
    }
    toast({ title: t("benefits.publish.done", { benefit: t(`benefits.type.${type}`) }), tone: "sucesso" });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={t("benefits.publish.title")} description={t("benefits.publish.description")}>
      <form className="grid gap-3" onSubmit={submit} data-testid="publish-form">
        <Field label={t("benefits.publish.seal")}>
          {({ id }) => <Select id={id} value={sealId} onChange={(e) => setSealId(e.target.value)} options={mine.map((s) => ({ value: s.id, label: s.name }))} />}
        </Field>
        <Field label={t("benefits.publish.type")}>
          {({ id }) => <Select id={id} value={type} onChange={(e) => setType(e.target.value as BenefitType)} options={BENEFIT_TYPES.map((x) => ({ value: x, label: t(`benefits.type.${x}`) }))} />}
        </Field>
        {type === "CREDITOS_IA" ? (
          <Field label={t("seals.creator.credits")}>
            {({ id }) => <Input id={id} type="number" min={1} max={100} value={credits} onChange={(e) => setCredits(e.target.value)} />}
          </Field>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("seals.creator.quota")}>
            {({ id }) => <Input id={id} type="number" min={1} value={quota} placeholder={t("seals.creator.noLimit")} onChange={(e) => setQuota(e.target.value)} />}
          </Field>
          <Field label={t("seals.creator.expires")} error={error ?? undefined}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />}
          </Field>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!sealId}>{t("benefits.publish.submit")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function IssuerBenefits({ actor, repo }: { actor: SealActor; repo: SealsRepository }) {
  const { t, intl } = useI18n();
  const [publishing, setPublishing] = useState(false);
  const seals = repo.seals().filter((s) => isIssuerOf(actor, s));
  const benefits = repo.allBenefits().filter((b) => seals.some((s) => s.id === b.sealId));
  const redeemed = benefits.reduce((s, b) => s + b.redeemedCount, 0);
  return (
    <Card title={t("benefits.issuer.title")} eyebrow="RF39 · CA09" actions={seals.length ? <Button size="sm" variant="primary" onClick={() => setPublishing(true)} data-testid="publish-open">{t("benefits.publish.cta")}</Button> : undefined} data-testid="issuer-benefits">
      <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("benefits.issuer.published")}</dt><dd className="text-[length:var(--ws-text-h3)] font-semibold">{formatNumber(benefits.length, intl)}</dd></div>
        <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("benefits.issuer.redeemed")}</dt><dd className="text-[length:var(--ws-text-h3)] font-semibold">{formatNumber(redeemed, intl)}</dd></div>
        <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("benefits.issuer.seals")}</dt><dd className="text-[length:var(--ws-text-h3)] font-semibold">{formatNumber(seals.length, intl)}</dd></div>
      </dl>
      {benefits.length === 0 ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("benefits.issuer.empty")}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="issuer-benefits-table">
            <caption className="sr-only">{t("benefits.issuer.caption")}</caption>
            <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("benefits.issuer.colBenefit")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("benefits.issuer.colSeal")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("benefits.issuer.colRedeemed")}</th>
                <th scope="col" className="py-2 font-semibold">{t("benefits.issuer.colExpires")}</th>
              </tr>
            </thead>
            <tbody>
              {benefits.map((b) => (
                <tr key={b.id} className="border-t border-ws-border">
                  <th scope="row" className="py-2 pr-3 font-normal">{t(`benefits.type.${b.type}`)}{b.type === "CREDITOS_IA" ? ` · ${t("benefits.credits", { n: b.credits ?? 0 })}` : ""}</th>
                  <td className="py-2 pr-3">{seals.find((s) => s.id === b.sealId)?.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{b.totalQuota !== null ? t("benefits.issuer.ofQuota", { n: b.redeemedCount, quota: b.totalQuota }) : formatNumber(b.redeemedCount, intl)}</td>
                  <td className="py-2">{b.expiresAt ? formatDate(`${b.expiresAt}T12:00:00Z`, intl) : t("benefits.issuer.noExpiry")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {publishing ? <PublishDialog actor={actor} repo={repo} onClose={() => setPublishing(false)} /> : null}
    </Card>
  );
}

function BenefitsContent({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { user } = useViewer();
  const mounted = useMounted();
  const repo = demoSealsRepository();
  useSealsTick(repo);
  usePointsTick();
  const actor = sealActorOf(user, user.name || t(user.nameKey));
  const issuer = canCreateSeal(user.profile) && page.access[user.profile] === "E";
  return (
    <RfPage page={page} noEmpty actions={<DemoBadge hintKey="seals.demoHint" />}>
      {!mounted ? <LoadingState /> : (
        <div className="grid gap-[var(--ws-space-4)]">
          <DemoNote hintKey="benefits.demoHint" />
          {canRedeemBenefits(user.profile) ? <MyBenefits actor={actor} repo={repo} /> : null}
          {issuer ? <IssuerBenefits actor={actor} repo={repo} /> : null}
          {!issuer && !canRedeemBenefits(user.profile) ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("seals.readOnly")}</p> : null}
        </div>
      )}
    </RfPage>
  );
}

export function BenefitsPage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <BenefitsContent page={page} />
    </Suspense>
  );
}

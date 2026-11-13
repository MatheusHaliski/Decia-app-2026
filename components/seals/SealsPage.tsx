"use client";
/**
 * Chancelas & políticas (`/seals`, RF39): Minhas chancelas (as que a conta emite, com política, ciclo, uso e benefícios) · Conceder
 * (escolhe o item e o modo — vínculo sugerido ✦, política de critérios ou premiação; o relatório de critérios vem do sistema) ·
 * Recusadas (vínculos recusados na revisão, com o motivo). Criador de chancela para EMPRESA e CHEFE (também por `?acao=nova`, da
 * folha "+ Criar"); ADMIN só lê. Dados DEMO desta aba.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AiText, DemoBadge, DemoNote, formatDate, formatNumber, useMounted } from "@/components/points/shared";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, Button, Card, EmptyState, Field, LoadingState, RadioCards, Select, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { SubTab } from "@/lib/nav/matrix";
import type { PageEntry } from "@/lib/pages/registry";
import { evaluatePolicy, sealOpen, suggestSeals } from "@/lib/seals/criteria";
import { nameOf } from "@/lib/seals/fixtures";
import { canAwardSeal, canCreateSeal, canGrantSeal } from "@/lib/seals/permissions";
import type { SealsRepository } from "@/lib/seals/repository";
import { GRANT_MODES, type GrantMode, type Seal, type SealActor, type SealTarget } from "@/lib/seals/types";
import { currentSealTargets, demoSealsRepository, sealActorOf, useSealsTick } from "@/lib/seals/useSeals";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { CriteriaReport } from "./CriteriaReport";
import { SealCreator } from "./SealCreator";

export const SEALS_TABS: readonly SubTab[] = [
  { slug: "chancelas", labelKey: "seals.tabs.chancelas" },
  { slug: "conceder", labelKey: "seals.tabs.conceder" },
  { slug: "recusadas", labelKey: "seals.tabs.recusadas" },
];

function SealCard({ seal, repo }: { seal: Seal; repo: SealsRepository }) {
  const { t, intl } = useI18n();
  const benefits = repo.benefitsOf(seal.id);
  const open = sealOpen(seal, new Date());
  return (
    <Card as="li" padding="sm" className="grid gap-3" data-testid={`seal-${seal.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h3 className="font-semibold">{seal.name}</h3>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(seal.issuerKind === "EMPRESA" ? "seals.card.issuerCompany" : "seals.card.issuerChief", { name: seal.issuerName, department: seal.department ?? "—" })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag>{t(`seals.tier.${seal.tier}`)}</Tag>
          {seal.excellence ? <Tag tone="accent" filled>{t("seals.card.excellence")}</Tag> : null}
          <Tag tone={open === "ABERTA" ? "success" : "warning"}>{t(`seals.open.${open}`)}</Tag>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[length:var(--ws-text-body-sm)]">
        <dt className="text-ws-text-muted">{t("seals.card.cycle")}</dt>
        <dd>{seal.availableUntil ? t("seals.card.cycleRange", { from: formatDate(`${seal.availableFrom}T12:00:00Z`, intl), until: formatDate(`${seal.availableUntil}T12:00:00Z`, intl) }) : t("seals.card.cycleOpen", { from: formatDate(`${seal.availableFrom}T12:00:00Z`, intl) })}</dd>
        <dt className="text-ws-text-muted">{t("seals.card.usage")}</dt>
        <dd>{seal.usageLimit !== null ? t("seals.card.usageOf", { n: seal.usageCount, limit: seal.usageLimit }) : t("seals.card.usageFree", { n: seal.usageCount })}</dd>
        <dt className="text-ws-text-muted">{t("seals.card.policy")}</dt>
        <dd>{t(`seals.mode.${seal.policy.mode}`)} · {seal.policy.criteria.map((c) => (c.threshold ? `${t(`seals.criterion.${c.criterion}`)} ≥ ${formatNumber(c.threshold, intl)}` : t(`seals.criterion.${c.criterion}`))).join(" · ")}</dd>
        <dt className="text-ws-text-muted">{t("seals.card.benefits")}</dt>
        <dd>{benefits.length ? benefits.map((b) => t(`benefits.type.${b.type}`)).join(" · ") : t("seals.card.noBenefits")}</dd>
      </dl>
    </Card>
  );
}

function MySeals({ actor, repo }: { actor: SealActor; repo: SealsRepository }) {
  const { t } = useI18n();
  const seals = repo.seals().filter((s) => actor.profile === "ADMIN" || s.issuerId === actor.id);
  if (!seals.length) return <EmptyState compact title={t("seals.mine.empty")} description={t("seals.mine.emptyHint")} />;
  return <ul className="grid gap-3 lg:grid-cols-2" data-testid="my-seals">{seals.map((s) => <SealCard key={s.id} seal={s} repo={repo} />)}</ul>;
}

function GrantPanel({ actor, repo }: { actor: SealActor; repo: SealsRepository }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const targets = currentSealTargets();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [mode, setMode] = useState<GrantMode>("SUGESTAO");
  const target = targets.find((x) => x.id === targetId);
  const now = new Date();
  const readOnly = actor.profile === "ADMIN";
  const mine = repo.seals().filter((s) => (mode === "PREMIACAO" ? canAwardSeal(actor, s) : canGrantSeal(actor, s)) || readOnly);
  const existing = (s: Seal) => target ? repo.bonds().find((b) => b.targetId === target.id && b.issuerId === s.issuerId && ["EM_REVISAO", "APROVADA", "APROVADA_PRIVADA", "SUGERIDA"].includes(b.status)) : undefined;

  const grant = (seal: Seal, t0: SealTarget, confidence: number | null) => {
    const r = repo.grant(actor, { sealId: seal.id, target: t0, mode, confidence }, new Date());
    if (!r.ok) {
      toast({ title: r.reason, description: t(`seals.error.${r.reason}`), tone: "erro" });
      return;
    }
    toast({ title: t(`seals.grant.done.${r.bond.status === "APROVADA" ? "APROVADA" : "EM_REVISAO"}`, { seal: seal.name, item: t0.title }), tone: "sucesso" });
  };

  const rows = !target ? [] : mode === "SUGESTAO"
    ? suggestSeals(target, mine, now).map((s) => ({ seal: s.seal, report: s.report, confidence: s.confidence, basis: s.basis }))
    : mine.filter((s) => s.tier === target.type).map((s) => ({ seal: s, report: evaluatePolicy(s.policy, target.facts), confidence: null as number | null, basis: mode === "PREMIACAO" ? "PREMIACAO" as const : "POLITICA" as const }));

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card title={t("seals.grant.title")} eyebrow="RF39 · CA03 · CA04 · CA05">
        <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
          <Field label={t("seals.grant.target")}>
            {({ id }) => <Select id={id} value={targetId} onChange={(e) => setTargetId(e.target.value)} options={targets.map((x) => ({ value: x.id, label: `${t(`seals.tier.${x.type}`)} · ${x.title}` }))} data-testid="grant-target" />}
          </Field>
          <RadioCards label={t("seals.grant.mode")} value={mode} onValueChange={(v) => setMode(v as GrantMode)} columns={3} options={GRANT_MODES.map((m) => ({ value: m, label: t(`seals.grantMode.${m}`), hint: t(`seals.grantModeHint.${m}`) }))} />
        </div>
        {target ? (
          <p className="mt-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.grant.targetInfo", { owner: target.ownerName, department: target.department ?? "—", n: target.involvedIds.length })}</p>
        ) : null}
      </Card>
      {readOnly ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("seals.readOnly")}</p> : null}
      <div aria-live="polite" className="grid gap-3" data-testid="grant-results">
        {target && rows.length === 0 ? <EmptyState compact title={t(mode === "SUGESTAO" ? "seals.grant.noSuggestion" : "seals.grant.noSeal")} description={t("seals.grant.noSealHint", { tier: t(`seals.tier.${target.type}`) })} /> : null}
        {target ? rows.map((row) => {
          const already = existing(row.seal);
          const blocked = mode === "POLITICA" && !row.report.allMet;
          return (
            <Card key={row.seal.id} padding="sm" className="grid gap-2" data-testid={`grant-${row.seal.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{row.seal.name}</h3>
                  {row.seal.excellence ? <Tag tone="accent" filled>{t("seals.card.excellence")}</Tag> : null}
                  <Tag>{t(`seals.mode.${row.seal.policy.mode}`)}</Tag>
                </div>
                {row.confidence !== null ? <Badge tone="spark">{t("seals.grant.confidence", { n: row.confidence })}</Badge> : null}
              </div>
              {mode === "SUGESTAO" ? <p className="text-[length:var(--ws-text-body-sm)]"><AiText>{t(`seals.grant.why.${row.basis}`, { met: row.report.met, total: row.report.total })}</AiText></p> : null}
              <CriteriaReport results={row.report.results} />
              {already ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.grant.already", { status: t(`seals.status.${already.status}`) })}</p> : null}
              {!readOnly ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant={mode === "PREMIACAO" ? "gradient" : "primary"} disabled={blocked || !!already} onClick={() => grant(row.seal, target, row.confidence)} aria-label={t(`seals.grant.cta.${mode}`, { seal: row.seal.name })}>{t(`seals.grant.ctaShort.${mode}`)}</Button>
                  {blocked ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.grant.blocked")}</span> : null}
                  {!blocked && !already ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`seals.grant.outcome.${mode === "POLITICA" ? row.seal.policy.mode : mode}`)}</span> : null}
                </div>
              ) : null}
            </Card>
          );
        }) : null}
      </div>
    </div>
  );
}

function Rejected({ actor, repo }: { actor: SealActor; repo: SealsRepository }) {
  const { t, intl } = useI18n();
  const list = repo.rejected(actor);
  if (!list.length) return <EmptyState compact title={t("seals.rejected.empty")} />;
  return (
    <div className="overflow-x-auto rounded-[var(--ws-radius-lg)] border border-ws-border">
      <table className="w-full min-w-[40rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="rejected-table">
        <caption className="sr-only">{t("seals.rejected.caption")}</caption>
        <thead className="bg-ws-surface-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">{t("seals.rejected.colItem")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("seals.rejected.colSeal")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("seals.rejected.colReason")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("seals.rejected.colBy")}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="border-t border-ws-border align-top">
              <th scope="row" className="px-3 py-2 font-semibold">{b.targetTitle}<span className="block text-[length:var(--ws-text-caption)] font-normal text-ws-text-muted">{t(`seals.tier.${b.targetType}`)} · {t(`seals.status.${b.status}`)}</span></th>
              <td className="px-3 py-2">{repo.seal(b.sealId)?.name ?? b.sealId}</td>
              <td className="px-3 py-2">{b.reviewNote ?? "—"}</td>
              <td className="px-3 py-2 text-ws-text-muted">{b.reviewedBy ? nameOf(b.reviewedBy) : "—"}{b.decidedAt ? ` · ${formatDate(b.decidedAt, intl)}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SealsContent({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { user } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mounted = useMounted();
  const repo = demoSealsRepository();
  useSealsTick(repo);
  const actor = sealActorOf(user, user.name || t(user.nameKey));
  const canCreate = canCreateSeal(user.profile) && page.access[user.profile] === "E";
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.get("acao") === "nova" && canCreate) setCreating(true);
  }, [search, canCreate]);

  const closeCreator = (o: boolean) => {
    setCreating(o);
    if (!o && search.get("acao")) {
      const next = new URLSearchParams(search.toString());
      next.delete("acao");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  };

  return (
    <>
      <RfPage
        page={page}
        tabs={SEALS_TABS}
        actions={
          <>
            <DemoBadge hintKey="seals.demoHint" />
            {canCreate ? <Button variant="primary" size="sm" icon="chancela" onClick={() => setCreating(true)} data-testid="seal-new">{t("seals.new")}</Button> : null}
          </>
        }
        renderTab={(slug) => {
          if (!mounted) return <LoadingState />;
          if (slug === "conceder") return <GrantPanel actor={actor} repo={repo} />;
          if (slug === "recusadas") return <Rejected actor={actor} repo={repo} />;
          return <MySeals actor={actor} repo={repo} />;
        }}
      >
        <DemoNote hintKey="seals.demoHint" />
      </RfPage>
      {mounted && canCreate ? <SealCreator open={creating} onOpenChange={closeCreator} actor={actor} repo={repo} /> : null}
    </>
  );
}

export function SealsPage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SealsContent page={page} />
    </Suspense>
  );
}

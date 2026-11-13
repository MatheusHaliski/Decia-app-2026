"use client";
/**
 * Fila de chancelas (`/seals/review`, RF39.CA04, CA07; RF28.CA03): vínculos EM_REVISAO das chancelas que a pessoa pode revisar — o
 * CHEFE e a EMPRESA, as próprias; o CURADOR, as do chefe do seu departamento (sem revisar item em que está envolvido) — com o
 * relatório de critérios calculado pelo sistema e a síntese ✦. Aprovar libera os benefícios aos colaboradores envolvidos; recusar
 * exige motivo e leva o vínculo à sub-aba Recusadas de /seals. ADMIN só lê. Dados DEMO desta aba.
 */
import { Suspense, useState } from "react";
import { DemoBadge, DemoNote, formatDate, useMounted } from "@/components/points/shared";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, Button, Card, EmptyState, Field, LoadingState, Tag, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute, type PageEntry } from "@/lib/pages/registry";
import { nameOf } from "@/lib/seals/fixtures";
import { REVIEW_REASON_MAX, type SealsRepository } from "@/lib/seals/repository";
import type { SealActor, SealBond } from "@/lib/seals/types";
import { demoSealsRepository, sealActorOf, useSealsTick } from "@/lib/seals/useSeals";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { CriteriaReport } from "./CriteriaReport";

function QueueItem({ bond, actor, repo }: { bond: SealBond; actor: SealActor; repo: SealsRepository }) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seal = repo.seal(bond.sealId);
  const readOnly = actor.profile === "ADMIN";
  const benefits = seal ? repo.benefitsOf(seal.id) : [];

  const decide = (decision: "APROVAR" | "RECUSAR") => {
    const r = repo.review(actor, bond.id, decision, reason, new Date());
    if (!r.ok) {
      setError(t(`seals.error.${r.reason}`));
      if (r.reason !== "MOTIVO_OBRIGATORIO") toast({ title: r.reason, description: t(`seals.error.${r.reason}`), tone: "erro" });
      return;
    }
    toast({ title: t(decision === "APROVAR" ? "seals.review.approved" : "seals.review.rejected", { item: bond.targetTitle, seal: seal?.name ?? "" }), tone: decision === "APROVAR" ? "sucesso" : "info" });
  };

  return (
    <Card as="li" padding="md" className="grid gap-3" data-testid={`review-${bond.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h3 className="font-semibold">{bond.targetTitle}</h3>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.review.meta", { tier: t(`seals.tier.${bond.targetType}`), owner: nameOf(bond.targetOwnerId), date: formatDate(bond.createdAt, intl) })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="accent">{seal?.name ?? bond.sealId}</Tag>
          <Tag>{t(`seals.basis.${bond.basis}`)}</Tag>
          {bond.confidence !== null ? <Badge tone="spark">{t("seals.grant.confidence", { n: bond.confidence })}</Badge> : null}
        </div>
      </div>
      <p className="text-[length:var(--ws-text-body-sm)]">{t("seals.review.requestedBy", { name: nameOf(bond.requestedBy) })}</p>
      <CriteriaReport results={bond.report} />
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{benefits.length ? t("seals.review.benefits", { list: benefits.map((b) => t(`benefits.type.${b.type}`)).join(", "), n: bond.involvedIds.length }) : t("seals.review.noBenefits")}</p>
      {readOnly ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("seals.readOnly")}</p> : (
        <div className="grid gap-2">
          {rejecting ? (
            <Field label={t("seals.review.reason")} hint={t("seals.review.reasonHint", { max: REVIEW_REASON_MAX })} error={error ?? undefined} required>
              {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} maxLength={REVIEW_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />}
            </Field>
          ) : error ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {rejecting ? (
              <>
                <Button size="sm" variant="danger" onClick={() => decide("RECUSAR")} aria-label={t("seals.review.confirmRejectFor", { item: bond.targetTitle })}>{t("seals.review.confirmReject")}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(""); setError(null); }}>{t("common.cancel")}</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="primary" onClick={() => decide("APROVAR")} aria-label={t("seals.review.approveFor", { item: bond.targetTitle })}>{t("seals.review.approve")}</Button>
                <Button size="sm" variant="danger" onClick={() => setRejecting(true)} aria-label={t("seals.review.rejectFor", { item: bond.targetTitle })}>{t("seals.review.reject")}</Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ReviewContent({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { user } = useViewer();
  const mounted = useMounted();
  const repo = demoSealsRepository();
  useSealsTick(repo);
  const actor = sealActorOf(user, user.name || t(user.nameKey));
  const queue = mounted ? repo.reviewQueue(actor) : [];
  return (
    <RfPage page={page} noEmpty actions={<DemoBadge hintKey="seals.demoHint" />}>
      {!mounted ? <LoadingState /> : (
        <div className="grid gap-[var(--ws-space-4)]">
          <DemoNote hintKey="seals.review.intro" />
          <p className="text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="review-count">{t("seals.review.count", { n: queue.length })}</p>
          {queue.length ? (
            <ul className="grid gap-3">{queue.map((b) => <QueueItem key={b.id} bond={b} actor={actor} repo={repo} />)}</ul>
          ) : (
            <EmptyState title={t("seals.review.empty")} description={t("seals.review.emptyHint")} action={pageByRoute("/seals")?.access[user.profile] !== "O" ? <Button size="sm" variant="ghost" href="/seals?tab=recusadas">{t("seals.review.seeRejected")}</Button> : undefined} />
          )}
        </div>
      )}
    </RfPage>
  );
}

export function ReviewQueuePage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReviewContent page={page} />
    </Suspense>
  );
}

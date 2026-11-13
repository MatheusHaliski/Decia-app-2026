"use client";
/**
 * Detalhe do modelo do Balcão (RF40.CA02–CA04, CA06): prévia (objetivo, roteiro, entregas e critérios da tarefa; tarefas do kit;
 * resumo do projeto), autor, departamento de origem, licença explicada, reutilizações e visualizações — sem expor quem reutilizou.
 * "Usar este modelo": modelo pago pede confirmação e compra a licença uma vez (débito de quem usa e crédito ao autor no razão);
 * tarefa vira rascunho do criador (`saveTaskDraft` + `draftHref`), referência só se consulta, kit entrega um rascunho por tarefa e
 * projeto leva à Mesa do projeto e ao Autopiloto. O autor pode retirar a oferta (cópias já feitas continuam).
 */
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Dp, formatDate, formatNumber, newActionKey } from "@/components/points/shared";
import { Button, Dialog, Link, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ModelsRepository } from "@/lib/models/repository";
import type { ModelOffer } from "@/lib/models/types";
import { AUTOPILOT_HREF, draftFromTemplate, licenseCopies, projectDeskHref, sectionsOf, templatesOf } from "@/lib/models/use";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { draftHref, saveTaskDraft } from "@/lib/tasks/drafts";
import type { TaskTemplate } from "@/lib/tasks/templates";

export interface ModelViewer {
  /** dono do saldo (null = conta sem saldo próprio) */
  holder: string | null;
  /** identificador de quem vê (para reconhecer o autor) */
  actorId: string;
  /** pode usar e oferecer (E na matriz do /models) */
  canUse: boolean;
  balance: number;
}

function TemplatePreview({ tpl, full = false }: { tpl: TaskTemplate; full?: boolean }) {
  const { t } = useI18n();
  const sections = sectionsOf(tpl.descriptionMd);
  const criteria = full ? tpl.criteria : tpl.criteria.slice(0, 3);
  return (
    <div className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
      <p><span className="font-semibold">{t("models.preview.objective")}:</span> {tpl.objective}</p>
      <p><span className="font-semibold">{t("models.preview.type")}:</span> {t(`social.taskType.${tpl.type}`)}{tpl.effort ? ` · ${t("models.preview.effort", { effort: tpl.effort })}` : ""}</p>
      <div>
        <p className="font-semibold">{t("models.preview.sections")}</p>
        <p className="text-ws-text-muted">{sections.join(" · ")}</p>
      </div>
      <div>
        <p className="font-semibold">{t("models.preview.deliverables")}</p>
        <ul className="list-disc pl-5">{tpl.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
      </div>
      <div>
        <p className="font-semibold">{t("models.preview.criteria", { n: tpl.criteria.length })}</p>
        <ul className="list-disc pl-5">{criteria.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
    </div>
  );
}

function ProjectPreview() {
  const { t } = useI18n();
  const p = useMemo(() => buildDemoProject(), []);
  return (
    <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
      <li>{t("models.preview.project.tasks", { n: p.tasks.length, phases: new Set(p.tasks.map((x) => x.phase)).size })}</li>
      <li>{t("models.preview.project.team", { n: p.team.length })}</li>
      <li>{t("models.preview.project.milestones", { n: p.charter.milestones.length })}</li>
      <li>{t("models.preview.project.risks", { n: p.risks.length })}</li>
      <li>{t("models.preview.project.approach", { approach: t(`pm.approach.${p.approach}`) })}</li>
    </ul>
  );
}

type UseState =
  | { step: "idle" }
  | { step: "confirm" }
  | { step: "done"; templates: TaskTemplate[] }
  | { step: "error"; reason: string; message: string };

export function ModelDetail({ offer, viewer, repo, onClose }: { offer: ModelOffer; viewer: ModelViewer; repo: ModelsRepository; onClose: () => void }) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<UseState>({ step: "idle" });
  const reuseKey = useMemo(() => newActionKey("uso"), []);
  const templates = templatesOf(offer);
  const own = viewer.actorId === offer.authorId || viewer.holder === offer.authorId;
  const licensed = viewer.holder !== null && repo.hasLicense(offer.id, viewer.holder);
  const mustPay = !own && !licensed && offer.pricePoints > 0;
  const attribution = t("models.attribution", { title: offer.title, author: offer.authorName, department: offer.department ?? "—" });

  const openDraft = (tpl: TaskTemplate) => {
    const id = saveTaskDraft({ draft: draftFromTemplate(tpl, offer, attribution), origin: { kind: "OUTRO", label: t("models.draftOrigin", { title: offer.title, author: offer.authorName }), ref: offer.id } });
    router.push(draftHref(id));
  };

  const use = () => {
    if (mustPay && state.step !== "confirm") {
      setState({ step: "confirm" });
      return;
    }
    const r = repo.reuse({ offerId: offer.id, userId: viewer.holder, actorId: viewer.actorId, reuseKey }, new Date());
    if (!r.ok) {
      const message = r.reason === "SALDO_INSUFICIENTE"
        ? t("models.use.error.SALDO_INSUFICIENTE", { price: offer.pricePoints, balance: r.balance ?? viewer.balance, missing: offer.pricePoints - (r.balance ?? viewer.balance) })
        : t(`models.use.error.${r.reason}`);
      setState({ step: "error", reason: r.reason, message });
      return;
    }
    if (r.charged > 0) toast({ title: t("models.use.paid", { n: r.charged, author: offer.authorName }), tone: "sucesso" });
    if (offer.kind === "TAREFA" && templates[0] && licenseCopies(offer)) {
      openDraft(templates[0]);
      return;
    }
    setState({ step: "done", templates });
  };

  const withdraw = () => {
    const r = repo.withdraw(offer.id, offer.authorId);
    if (r.ok) {
      toast({ title: t("models.withdrawn", { title: offer.title }), tone: "info" });
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={offer.title} description={t("models.detail.description")} className="w-[min(94vw,44rem)]">
      <div className="grid gap-4" data-testid="model-detail">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={offer.shelf === "CHANCELADO" ? "accent" : "neutral"}>{t(`models.shelf.${offer.shelf}`)}</Tag>
          <Tag>{t(`models.kind.${offer.kind}`)}</Tag>
          <Tag>{t(`tasks.area.${offer.area}`)}</Tag>
          {offer.status !== "ATIVA" ? <Tag tone="warning">{t(`models.status.${offer.status}`)}</Tag> : null}
        </div>
        {offer.sealName ? <p className="text-[length:var(--ws-text-body-sm)]"><span className="font-semibold">{t("models.detail.seal")}:</span> {offer.sealName}</p> : null}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)]">
          <dt className="text-ws-text-muted">{t("models.detail.author")}</dt>
          <dd>{offer.authorName}</dd>
          <dt className="text-ws-text-muted">{t("models.detail.department")}</dt>
          <dd>{offer.department ?? t("models.detail.institutional")}</dd>
          <dt className="text-ws-text-muted">{t("models.detail.license")}</dt>
          <dd>{t(`models.license.${offer.license}`)} — <span className="text-ws-text-muted">{t(`models.licenseHint.${offer.license}`)}</span></dd>
          <dt className="text-ws-text-muted">{t("models.detail.price")}</dt>
          <dd>{offer.pricePoints > 0 ? <Dp value={offer.pricePoints} /> : t("models.free")}</dd>
          <dt className="text-ws-text-muted">{t("models.detail.reuses")}</dt>
          <dd data-testid="model-reuses">{t("models.detail.reusesValue", { n: offer.reuseCount, views: offer.viewsCount })}</dd>
          <dt className="text-ws-text-muted">{t("models.detail.since")}</dt>
          <dd>{formatDate(offer.createdAt, intl)}</dd>
        </dl>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("models.detail.privacy")}</p>
        {offer.usageDescription ? <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)]">{offer.usageDescription}</p> : null}

        <section aria-labelledby="model-preview" className="grid gap-2">
          <h3 id="model-preview" className="font-semibold">{t("models.preview.title")}</h3>
          {offer.kind === "PROJETO" ? <ProjectPreview /> : null}
          {offer.kind === "TAREFA" && templates[0] ? <TemplatePreview tpl={templates[0]} full={!licenseCopies(offer) && state.step === "done"} /> : null}
          {offer.kind === "KIT" ? (
            <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
              {templates.map((tpl) => <li key={tpl.id}>{tpl.title} <span className="text-ws-text-muted">· {t(`social.taskType.${tpl.type}`)} · {t("models.preview.criteriaCount", { n: tpl.criteria.length })}</span></li>)}
            </ul>
          ) : null}
        </section>

        <div aria-live="polite" data-testid="model-use-state" className="grid gap-2">
          {state.step === "confirm" ? (
            <div className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-warning-soft p-3 text-[length:var(--ws-text-body-sm)]">
              <p className="font-semibold">{t("models.use.confirmTitle", { price: offer.pricePoints })}</p>
              <p>{t("models.use.confirmBody", { author: offer.authorName, balance: viewer.balance })}</p>
            </div>
          ) : null}
          {state.step === "error" ? (
            <div role="alert" className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]">
              <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-semibold">{state.reason}</p>
              <p>{state.message}</p>
              {state.reason === "SALDO_INSUFICIENTE" ? <p>{t("store.error.earnHint")} <Link href="/decia">{t("store.error.goDecia")}</Link></p> : null}
            </div>
          ) : null}
          {state.step === "done" ? (
            <div className="grid gap-2 rounded-[var(--ws-radius-md)] bg-ws-success-soft p-3 text-[length:var(--ws-text-body-sm)]">
              {offer.kind === "PROJETO" ? (
                <>
                  <p>{t("models.use.projectReady")}</p>
                  <div className="flex flex-wrap gap-2">
                    {offer.source.type === "PROJECT" ? <Button size="sm" href={projectDeskHref(offer.source.projectId)} icon="mesa">{t("models.use.openDesk")}</Button> : null}
                    <Button size="sm" variant="spark" href={AUTOPILOT_HREF} icon="insights-ia">{t("models.use.openAutopilot")}</Button>
                  </div>
                </>
              ) : offer.kind === "KIT" && licenseCopies(offer) ? (
                <>
                  <p>{t("models.use.kitReady", { n: state.templates.length })}</p>
                  <ul className="grid gap-1">
                    {state.templates.map((tpl) => (
                      <li key={tpl.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{tpl.title}</span>
                        <Button size="sm" onClick={() => openDraft(tpl)} aria-label={t("models.use.openDraftFor", { title: tpl.title })}>{t("models.use.openDraft")}</Button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{t("models.use.referenceReady")}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {own && offer.status === "ATIVA" ? <Button variant="danger" size="sm" onClick={withdraw}>{t("models.withdraw")}</Button> : null}
          <Button variant="ghost" size="sm" onClick={onClose}>{t("common.close")}</Button>
          {viewer.canUse && offer.status === "ATIVA" && state.step !== "done" ? (
            <Button variant="primary" size="sm" onClick={use} data-testid="model-use">
              {state.step === "confirm" ? t("models.use.confirm", { price: offer.pricePoints }) : mustPay ? t("models.use.buyAndUse", { price: offer.pricePoints }) : t("models.use.cta")}
            </Button>
          ) : null}
        </div>
        {own ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("models.use.ownNote", { points: formatNumber(offer.pointsEarned, intl) })}</p> : null}
      </div>
    </Dialog>
  );
}

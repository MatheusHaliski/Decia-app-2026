"use client";
/**
 * Cartão de projeto da "Minha mesa" (RF21; RF21.CA06 "abrir na Mesa do projeto"): fase, % concluído, próximo marco, versão e
 * a última alteração; origem do esquema (✦ Autopiloto, modelo). Números do resumo calculado (`summarizeProject`).
 */
import { Badge, Button, Card, PercentBar, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { summarizeProject } from "@/lib/projects/autopilot/overview";
import type { ProjectModel } from "@/lib/projects/types";
import { versionSummary } from "../common";
import { fmt, nameOf, type PeopleDirectory } from "../shared";

export function ProjectCard({ model, today, people }: { model: ProjectModel; today: string; people: PeopleDirectory }) {
  const { t, intl } = useI18n();
  const s = summarizeProject(model, today);
  const last = model.versions.at(-1);
  const titleId = `desk-card-${model.id}`;
  return (
    <Card as="article" padding="sm" aria-labelledby={titleId} className="grid content-start gap-2" data-project-card={model.id}>
      <header className="flex flex-wrap items-start gap-2">
        <h3 id={titleId} className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold leading-tight">{model.title}</h3>
        <Tag>{t("pm.ws.version", { n: model.version })}</Tag>
      </header>
      <div className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)]">
        <Tag tone="accent" filled>{t("pm.ws.phase", { phase: t(`pm.phase.${model.currentPhase}`) })}</Tag>
        <Tag tone="blue">{t(`tasks.area.${model.area ?? "SOFTWARE"}`)}</Tag>
        {model.origin?.kind === "AUTOPILOTO" ? <Badge tone="spark"><span aria-hidden>✦ </span>{t("deskHome.card.fromAutopilot")}</Badge> : null}
        {model.origin?.kind === "MODELO" ? <Tag>{t("deskHome.card.fromTemplate")}</Tag> : null}
      </div>
      <PercentBar value={s.progress} label={t("deskHome.card.progress", { done: s.tasks.done, total: s.tasks.total })} size="sm" />
      <p className="text-[length:var(--ws-text-body-sm)]" data-next-milestone>
        {s.nextMilestone ? t("deskHome.card.nextMilestone", { title: s.nextMilestone.title, date: fmt.date(intl, s.nextMilestone.date) }) : t("deskHome.card.noMilestone")}
      </p>
      {s.overrunDays > 0 ? <p role="note" className="text-[length:var(--ws-text-caption)] font-semibold text-ws-danger-ink"><span aria-hidden>! </span>{t("deskHome.card.overrun", { n: s.overrunDays })}</p> : null}
      {last ? <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.ws.lastChange", { what: versionSummary(t, last), who: nameOf(people, last.actorId) })}</p> : null}
      <div className="mt-1 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" icon="mesa" href={`/projects/${model.id}/edit`}>{t("deskHome.card.open")}</Button>
        <Button size="sm" href={`/projects/${model.id}`}>{t("deskHome.card.overview")}</Button>
      </div>
    </Card>
  );
}

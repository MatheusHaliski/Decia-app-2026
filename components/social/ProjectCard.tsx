"use client";
/**
 * Card do esquema de projeto, versão compacta para perfis e Mural (ANATOMIA_CARDS §5): capa-mosaico 2×3 com os tipos das
 * tarefas, borda na cor do departamento, status (texto), barra de 7 fases com a atual destacada e nome em texto, próximo
 * marco, "n tarefas · n pessoas", último evento DECIA e a barra social. Layouts `mosaic` (grade) e `mural` (linha).
 */
import { Link, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { PROJECT_PHASES } from "@/lib/social/types";
import type { ProjectCardViewModel } from "@/lib/social/view-model";
import { NODE_BORDER, TONE_SOFT, formatDay } from "./meta";
import { PersonLink, Seal, Spark, Stamp } from "./Primitives";
import { SocialBar } from "./SocialBar";
import { DelegationLine } from "./TaskSchemeCard";

export function PhaseBar({ index, phase }: { index: number; phase: string }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-1">
      <div className="flex gap-0.5" role="img" aria-label={t("social.project.phaseAria", { phase: t(`social.phase.${phase}`), n: index + 1, total: PROJECT_PHASES.length })}>
        {PROJECT_PHASES.map((p, i) => <span key={p} className={cn("h-1.5 flex-1 rounded-full", i < index ? "bg-ws-accent" : i === index ? "bg-ws-accent-strong ring-2 ring-ws-accent-soft" : "bg-ws-surface-3")} />)}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.project.phase", { phase: t(`social.phase.${phase}`) })}</p>
    </div>
  );
}

function Mosaic({ vm, className }: { vm: ProjectCardViewModel; className?: string }) {
  const tiles = Array.from({ length: 6 }, (_, i) => vm.mosaic[i] ?? null);
  return (
    <div aria-hidden className={cn("relative grid grid-cols-3 grid-rows-2 gap-0.5 bg-ws-border", className)}>
      {tiles.map((tile, i) => (
        <div key={tile?.id ?? i} className={cn("flex items-center justify-center font-[family-name:var(--ws-font-mono)] text-[1.25rem]", tile ? TONE_SOFT[tile.tone] : "bg-ws-surface-2 text-ws-text-faint")}>{tile?.symbol ?? "·"}</div>
      ))}
    </div>
  );
}

export function ProjectCard({ vm, layout = "mosaic", className }: { vm: ProjectCardViewModel; layout?: "mosaic" | "mural"; className?: string }) {
  const { t, intl } = useI18n();
  const status = (
    <Tag tone={vm.statusTone} dashed={vm.status === "RASCUNHO"} pulse={vm.status === "EM_DECISAO"}>{t(`social.projectStatus.${vm.status}`)}</Tag>
  );
  const title = (
    <h3 className={cn("min-w-0 font-[family-name:var(--ws-font-display)] font-semibold leading-snug [overflow-wrap:break-word]", layout === "mosaic" ? "line-clamp-2 text-[length:var(--ws-text-body-lg)]" : "line-clamp-2 text-[length:var(--ws-text-body)]")}>
      <Link href={vm.href} variant="plain" className="hover:underline">{vm.title}</Link>
    </h3>
  );
  const facts = (
    <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
      {t("social.project.counts", { tasks: vm.tasksCount, people: vm.peopleCount })}
      {vm.nextMilestoneAt ? ` · ${t("social.project.milestone", { date: formatDay(vm.nextMilestoneAt, intl) })}` : ""}
    </p>
  );
  const shell = cn(
    "relative min-w-0 overflow-hidden rounded-[var(--ws-radius-md)] border-2 bg-ws-surface-1 text-ws-text shadow-ws-1",
    vm.department ? NODE_BORDER[vm.department.color] : "border-ws-border",
    vm.status === "RASCUNHO" && "border-dashed",
    vm.status === "ARQUIVADO" && "opacity-[0.62] saturate-[0.35]",
    className,
  );
  const aria = t("social.card.projectAria", { title: vm.title, status: t(`social.projectStatus.${vm.status}`) });

  if (layout === "mural") {
    return (
      <article aria-label={aria} data-layout="mural" data-variant={[...vm.variants].join(" ")} data-testid="project-card" className={cn(shell, "grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-2 p-2.5")}>
        <Mosaic vm={vm} className="size-16 overflow-hidden rounded-[var(--ws-radius-sm)] [&>div]:text-[0.75rem]" />
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-1.5">{status}{vm.aiGenerated ? <Spark /> : null}{vm.seals.map((s) => <Seal key={s.label} issuer={s.issuer} label={s.label} size={22} />)}</div>
          {title}
          {facts}
          {vm.delegation ? <DelegationLine d={vm.delegation} compact /> : null}
        </div>
        <SocialBar vm={vm} className="col-span-2" />
      </article>
    );
  }

  return (
    <article aria-label={aria} data-layout="mosaic" data-variant={[...vm.variants].join(" ")} data-testid="project-card" className={cn(shell, "flex flex-col")}>
      <div className="relative">
        <Mosaic vm={vm} className="aspect-[3/2] w-full" />
        <div className="absolute left-2 top-2 flex gap-1">{vm.aiGenerated ? <Spark /> : null}</div>
        <div className="absolute right-2 top-2 flex gap-1">{vm.seals.map((s) => <Seal key={s.label} issuer={s.issuer} label={s.label} />)}</div>
        {vm.status === "APROVADO" ? <div className="absolute inset-x-0 bottom-3 flex justify-center"><Stamp kind="ok">{t("social.project.validated")}</Stamp></div> : null}
        {vm.status === "DEVOLVIDO" ? <div className="absolute inset-x-0 bottom-3 flex justify-center"><Stamp kind="danger">{t("social.projectStatus.DEVOLVIDO")}</Stamp></div> : null}
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-2 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {status}
          {vm.department ? <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{vm.department.acronym}</span> : null}
        </div>
        {title}
        <PhaseBar index={vm.phaseIndex} phase={vm.phase} />
        {facts}
        {vm.lastDeciaEventLabel ? <p className="text-[length:var(--ws-text-caption)] text-ws-ai-spark-ink"><span aria-hidden>◆ </span>{vm.lastDeciaEventLabel}</p> : null}
        <div className="text-[length:var(--ws-text-caption)] text-ws-text-muted"><PersonLink person={vm.author} size={18} /></div>
        {vm.credit ? <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted"><span aria-hidden>⇄ </span>{t("social.card.remixOf", { name: vm.credit.originalAuthor.name })}</p> : null}
        {vm.delegation ? <DelegationLine d={vm.delegation} compact /> : null}
      </div>
      <div className="border-t border-ws-border px-1.5 py-1"><SocialBar vm={vm} /></div>
    </article>
  );
}

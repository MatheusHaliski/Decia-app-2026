"use client";
/**
 * Card do esquema de tarefa (ANATOMIA_CARDS §1–§3, ANATOMIAS_E_ESTUDIO §2/§7.2): camadas (superfície com borda na cor
 * do departamento → arte da família → container → mídia), elementos a…i (tipo, categoria, título, estado, prazo,
 * responsável, contadores, faísca ✦, lacre) e os layouts compact · list · expanded · attachment · mini. Variações
 * derivadas no view model (`data-variant`); RASCUNHO = borda tracejada; ARQUIVADA esmaecida; CONCLUIDA com carimbo.
 */
import type { ReactNode } from "react";
import { Avatar, Badge, Link, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { DelegationInfo, TaskCardViewModel } from "@/lib/social/view-model";
import { NODE_BORDER, formatDay } from "./meta";
import { AuthorshipBadge } from "./AuthorshipBadge";
import { CoverArt, Due, PersonLink, Seal, Spark, Stamp, TypeChip, VisibilityTag } from "./Primitives";
import { SocialBar } from "./SocialBar";

export type TaskCardLayout = "compact" | "list" | "expanded" | "attachment" | "mini";

export function StateTag({ vm }: { vm: TaskCardViewModel }) {
  const { t } = useI18n();
  const s = vm.state;
  return (
    <Tag tone={vm.stateTone} dashed={s === "RASCUNHO"} pulse={s === "EM_USO"} filled={s === "CONCLUIDA"} className="shrink-0" >
      {s === "BLOQUEADA" ? <span aria-hidden>⊘</span> : s === "MODELO_PUBLICO" ? <span aria-hidden>★</span> : null}
      {t(`social.taskState.${s}`)}
    </Tag>
  );
}

/** Linha da delegação no card (RF18.CA06): "Delegada a Y · aguardando", "delegada por X", recusada/devolvida com motivo. */
export function DelegationLine({ d, compact = false }: { d: DelegationInfo; compact?: boolean }) {
  const { t } = useI18n();
  const key = d.status === "PROPOSTA" ? "social.delegation.pending" : d.status === "ACEITA" ? "social.delegation.accepted" : d.status === "RECUSADA" ? "social.delegation.refused" : "social.delegation.returned";
  return (
    <p className={cn("flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[length:var(--ws-text-caption)]", d.status === "RECUSADA" || d.status === "DEVOLVIDA" ? "text-ws-danger-ink" : "text-ws-text-muted")} data-testid="delegation-line" data-status={d.status}>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><span aria-hidden>➜ </span>{t(key, { from: d.from.name, to: d.to.name })}</span>
      {d.status === "DEVOLVIDA" ? <Stamp kind="danger">{t("social.delegation.stampReturned")}</Stamp> : null}
      {!compact && d.reason ? <span className="w-full [overflow-wrap:anywhere]">“{d.reason}”</span> : null}
    </p>
  );
}

function CreditLine({ vm }: { vm: TaskCardViewModel }) {
  const { t } = useI18n();
  if (!vm.credit) return null;
  return (
    <p className="min-w-0 truncate text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="credit-line" title={vm.credit.originalTitle}>
      <span aria-hidden>⇄ </span>{t(vm.credit.via ? "social.card.remixOfVia" : "social.card.remixOf", { name: vm.credit.originalAuthor.name, via: vm.credit.via?.name ?? "" })}
    </p>
  );
}

function Title({ vm, as = "h3", className }: { vm: TaskCardViewModel; as?: "h2" | "h3"; className?: string }) {
  const H = as;
  return (
    <H className={cn("min-w-0 font-[family-name:var(--ws-font-display)] font-semibold leading-snug text-ws-text [overflow-wrap:break-word] [hyphens:auto]", className)}>
      <Link href={vm.href} variant="plain" className="hover:underline">{vm.title}</Link>
    </H>
  );
}

function Shell({ vm, layout, children, className }: { vm: TaskCardViewModel; layout: TaskCardLayout; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  const draft = vm.state === "RASCUNHO";
  return (
    <article
      aria-label={t("social.card.taskAria", { title: vm.title, type: t(`social.taskType.${vm.type}`), state: t(`social.taskState.${vm.state}`) })}
      data-layout={layout}
      data-variant={[...vm.variants].join(" ")}
      data-testid="task-card"
      data-task-id={vm.id}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[var(--ws-radius-md)] border-2 bg-ws-surface-1 text-ws-text shadow-ws-1 [container-type:inline-size]",
        vm.department ? NODE_BORDER[vm.department.color] : "border-ws-border",
        draft && "border-dashed",
        vm.state === "ARQUIVADA" && "opacity-[0.62] saturate-[0.35]",
        className,
      )}
    >
      {children}
    </article>
  );
}

function Media({ vm, className, children, size }: { vm: TaskCardViewModel; className?: string; children?: ReactNode; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <CoverArt family={vm.family} symbol={vm.typeSymbol} tone={vm.typeTone} title={vm.title} format={vm.format} className={className} size={size}>
      {children}
    </CoverArt>
  );
}

function MediaOverlays({ vm }: { vm: TaskCardViewModel }) {
  const { t } = useI18n();
  return (
    <>
      <div className="absolute left-2 top-2 flex gap-1">{vm.aiGenerated ? <Spark /> : null}{vm.variants.has("FAVORITA") ? <Badge tone="warning" title={t("social.card.favorite")}><span aria-hidden>★</span><span className="sr-only">{t("social.card.favorite")}</span></Badge> : null}</div>
      <div className="absolute right-2 top-2 flex gap-1">{vm.seals.map((s) => <Seal key={s.label} issuer={s.issuer} label={s.label} />)}</div>
      {vm.state === "CONCLUIDA" ? <div className="absolute inset-x-0 bottom-3 flex justify-center"><Stamp kind="ok">{t("social.taskState.CONCLUIDA")}</Stamp></div> : null}
    </>
  );
}

function Meta({ vm }: { vm: TaskCardViewModel }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)]">
      {vm.dueAt ? <Due date={vm.dueAt} kind={vm.dueKind} legal={vm.legal} /> : null}
      <span className="inline-flex min-w-0 items-center gap-1 text-ws-text-muted">
        <span className="sr-only">{t("social.card.author")}</span>
        <PersonLink person={vm.author} size={18} />
      </span>
      {vm.responsible ? <span className="min-w-0 truncate text-ws-text-muted">{t("social.card.responsible", { name: vm.responsible.name })}</span> : null}
    </div>
  );
}

export interface TaskSchemeCardProps {
  vm: TaskCardViewModel;
  layout?: TaskCardLayout;
  /** no detalhe: foca o campo de comentário */
  onComment?: () => void;
  /** ação principal única do layout ampliado (ANATOMIA_CARDS §3) */
  primaryAction?: ReactNode;
  className?: string;
}

export function TaskSchemeCard({ vm, layout = "compact", onComment, primaryAction, className }: TaskSchemeCardProps) {
  const { t, intl } = useI18n();
  const category = vm.category ? t(`social.category.${vm.category}`) : null;
  const label = [category, vm.department?.acronym].filter(Boolean).join(" · ");

  if (layout === "mini") {
    return (
      <Shell vm={vm} layout={layout} className={cn("flex items-center gap-2 p-1.5 shadow-none", className)}>
        <Media vm={vm} size="xs" className="size-8 shrink-0 rounded-[var(--ws-radius-sm)]" />
        <div className="min-w-0 flex-1">
          <Title vm={vm} className="truncate text-[length:var(--ws-text-body-sm)]" />
          <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`social.taskState.${vm.state}`)}{category ? ` · ${category}` : ""}</p>
        </div>
      </Shell>
    );
  }

  if (layout === "attachment") {
    return (
      <Shell vm={vm} layout={layout} className={cn("flex max-w-sm items-center gap-2 p-2", className)}>
        <Media vm={vm} size="xs" className="h-11 w-[66px] shrink-0 rounded-[var(--ws-radius-sm)]" />
        <div className="min-w-0 flex-1">
          <Title vm={vm} className="truncate text-[length:var(--ws-text-body-sm)]" />
          <p className="flex flex-wrap items-center gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted"><span className="truncate">{category ?? t(`social.taskType.${vm.type}`)}</span> · <StateTag vm={vm} /></p>
        </div>
      </Shell>
    );
  }

  if (layout === "list") {
    return (
      <Shell vm={vm} layout={layout} className={cn("grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-2 p-2.5 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center", className)}>
        <Media vm={vm} size="sm" className="size-16 rounded-[var(--ws-radius-sm)]">{vm.aiGenerated ? <span className="sr-only">{t("social.card.ai")}</span> : null}</Media>
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <TypeChip type={vm.type} symbol={vm.typeSymbol} tone={vm.typeTone} compact />
            <StateTag vm={vm} />
            {vm.accessClass === "RESTRITO" || vm.accessClass === "SIGILOSO" ? <Tag tone="danger"><span aria-hidden>⛨</span>{t(`social.access.${vm.accessClass}`)}</Tag> : null}
            {vm.aiGenerated ? <Spark /> : null}
            {vm.seals.map((s) => <Seal key={s.label} issuer={s.issuer} label={s.label} size={22} />)}
          </div>
          <Title vm={vm} className="line-clamp-2 text-[length:var(--ws-text-body)]" />
          <Meta vm={vm} />
          {vm.delegation ? <DelegationLine d={vm.delegation} compact /> : null}
        </div>
        <SocialBar vm={vm} className="col-span-2 sm:col-span-1 sm:justify-end" />
      </Shell>
    );
  }

  if (layout === "expanded") {
    return (
      <Shell vm={vm} layout={layout} className={cn("rounded-[var(--ws-radius-lg)]", className)}>
        <div className="grid gap-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Media vm={vm} size="lg" className="aspect-[3/2] md:aspect-auto md:min-h-64"><MediaOverlays vm={vm} /></Media>
          <div className="grid min-w-0 content-start gap-3 p-[var(--ws-space-4)] md:p-[var(--ws-space-5)]">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <TypeChip type={vm.type} symbol={vm.typeSymbol} tone={vm.typeTone} format={vm.format} />
              <StateTag vm={vm} />
              <VisibilityTag visibility={vm.visibility} accessClass={vm.accessClass} />
            </div>
            {label ? <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{label}</p> : null}
            <Title vm={vm} as="h2" className="text-[length:var(--ws-text-h2)] leading-[var(--ws-text-h2--lh)]" />
            <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
              <span className="text-ws-text-muted">{t("social.card.by")}</span>
              <PersonLink person={vm.author} size={24} />
              {vm.department ? <Link href={`/departments/${vm.department.slug}`} variant="plain" className="inline-flex items-center gap-1 hover:underline"><Avatar name={vm.department.acronym} monogram={vm.department.acronym.replace(/^SECID-/, "").slice(0, 3)} node={vm.department.color} shape="monitor" size={20} />{vm.department.acronym}</Link> : null}
            </div>
            {vm.authorship ? <AuthorshipBadge summary={vm.authorship} /> : null}
            {vm.aiGenerated ? <p className="rounded-[var(--ws-radius-md)] bg-ws-ai-spark-soft px-3 py-2 text-[length:var(--ws-text-caption)] text-ws-ai-spark-ink" data-testid="ai-transparency"><span aria-hidden>✦ </span>{t("social.card.aiTransparency")}</p> : null}
            {vm.summary ? <p className="text-[length:var(--ws-text-body)] [overflow-wrap:anywhere]">{vm.summary}</p> : null}
            <CreditLine vm={vm} />
            {vm.remixedBy ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="remixed-by">{t("social.card.remixedBy", { n: vm.remixedBy })}</p> : null}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[length:var(--ws-text-body-sm)] sm:grid-cols-3">
              <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.card.due")}</dt><dd>{vm.dueAt ? <Due date={vm.dueAt} kind={vm.dueKind} legal={vm.legal} /> : "—"}</dd></div>
              <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.card.accessClass")}</dt><dd>{t(`social.access.${vm.accessClass}`)}</dd></div>
              <div><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.card.responsibleLabel")}</dt><dd className="min-w-0 truncate">{(vm.responsible ?? vm.author).name}</dd></div>
              {vm.blockReason ? <div className="col-span-2 sm:col-span-3"><dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.card.blockedBy")}</dt><dd className="text-ws-danger-ink">{vm.blockReason}</dd></div> : null}
            </dl>
            {vm.delegation ? <DelegationLine d={vm.delegation} /> : null}
            {vm.delegation?.dueAt ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.delegation.due", { date: formatDay(vm.delegation.dueAt, intl) })}</p> : null}
            {primaryAction ? <div className="flex flex-wrap gap-2">{primaryAction}</div> : null}
            <div className="border-t border-ws-border pt-2"><SocialBar vm={vm} variant="full" onComment={onComment} /></div>
          </div>
        </div>
      </Shell>
    );
  }

  // compact (grade do Acervo, Buscar, Mural)
  return (
    <Shell vm={vm} layout="compact" className={cn("flex flex-col", className)}>
      <Media vm={vm} className="aspect-[3/2] w-full"><MediaOverlays vm={vm} /></Media>
      <div className="grid min-w-0 flex-1 content-start gap-2 p-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <TypeChip type={vm.type} symbol={vm.typeSymbol} tone={vm.typeTone} />
          <StateTag vm={vm} />
          {vm.accessClass === "RESTRITO" || vm.accessClass === "SIGILOSO" ? <Tag tone="danger"><span aria-hidden>⛨</span>{t(`social.access.${vm.accessClass}`)}</Tag> : null}
          {vm.authorship ? <AuthorshipBadge summary={vm.authorship} /> : null}
        </div>
        {label ? <p className="truncate font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{label}</p> : null}
        <Title vm={vm} className="line-clamp-2 text-[length:var(--ws-text-body-lg)]" />
        <Meta vm={vm} />
        {vm.state === "BLOQUEADA" && vm.blockReason ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink"><span aria-hidden>⊘ </span>{vm.blockReason}</p> : null}
        <CreditLine vm={vm} />
        {vm.delegation ? <DelegationLine d={vm.delegation} compact /> : null}
      </div>
      <div className="border-t border-ws-border px-1.5 py-1"><SocialBar vm={vm} /></div>
    </Shell>
  );
}

/** Grade responsiva de cards (mín. 240 px, ANATOMIA_CARDS §3 compacto). */
export function CardGrid({ children, label }: { children: ReactNode; label: string }) {
  return <ul aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-[var(--ws-space-4)] [&>li]:flex [&>li>*]:w-full">{children}</ul>;
}

export function CardList({ children, label }: { children: ReactNode; label: string }) {
  return <ul aria-label={label} className="grid gap-[var(--ws-space-3)]">{children}</ul>;
}

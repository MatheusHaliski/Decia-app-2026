"use client";
/**
 * Peças do card de tarefa/projeto documentadas no DESIGN_SYSTEM §3 e ainda sem componente: TypeChip, Due, Spark ✦,
 * Seal (lacre), Stamp (carimbo), etiqueta de estado/classificação, capa (arte da família, camada 2/4 da ANATOMIA_CARDS) e
 * o crédito de pessoa. Tudo com texto ou aria-label (nunca só cor), cor só por token.
 */
import type { ReactNode } from "react";
import { Avatar, Link, Tag, Tooltip, cn, initialsOf } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ArtFamily, DueKind, PersonRef, Tone } from "@/lib/social/view-model";
import type { AccessClassification, TaskType, Visibility } from "@/lib/social/types";
import { TONE_SOFT, formatDay } from "./meta";

export function TypeChip({ type, symbol, tone, format, compact = false }: { type: TaskType; symbol: string; tone: Tone; format?: string | null; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 rounded-[var(--ws-radius-sm)] px-1.5 py-0.5 text-[length:var(--ws-text-caption)] font-semibold leading-tight", TONE_SOFT[tone])} data-testid="type-chip">
      <span aria-hidden className="font-[family-name:var(--ws-font-mono)]">{symbol}</span>
      <span className={cn("truncate", compact && "sr-only")}>{t(`social.taskType.${type}`)}</span>
      {format && !compact ? <span className="font-[family-name:var(--ws-font-mono)] uppercase opacity-80">· {format}</span> : null}
    </span>
  );
}

export function Due({ date, kind, legal }: { date: string; kind: DueKind | null; legal?: boolean }) {
  const { t, intl } = useI18n();
  const label = t(kind === "over" ? "social.due.over" : kind === "soon" ? "social.due.soon" : "social.due.ok", { date: formatDay(date, intl) });
  return (
    <span className={cn("inline-flex items-center gap-1 text-[length:var(--ws-text-caption)] font-medium", kind === "over" ? "text-ws-danger-ink" : kind === "soon" ? "text-ws-warning-ink" : "text-ws-text-muted")} data-due={kind ?? undefined}>
      <span aria-hidden>{legal ? "⚖" : "◷"}</span>
      {legal ? <span className="sr-only">{t("social.due.legal")}</span> : null}
      {label}
    </span>
  );
}

export function Spark() {
  const { t } = useI18n();
  return (
    <Tooltip content={t("social.card.aiTooltip")}>
      <span role="img" aria-label={t("social.card.ai")} tabIndex={0} className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-ws-ai-spark-soft text-ws-ai-spark-ink focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]" data-testid="spark">
        ✦
      </span>
    </Tooltip>
  );
}

export function Seal({ issuer, label, size = 28 }: { issuer: "EMPRESA" | "CHEFE"; label: string; size?: number }) {
  const { t } = useI18n();
  const text = t(issuer === "EMPRESA" ? "social.card.sealCompany" : "social.card.sealDept", { issuer: label });
  return (
    <Tooltip content={text}>
      <span
        role="img"
        aria-label={text}
        tabIndex={0}
        style={{ width: size, height: size }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border-2 text-[length:var(--ws-text-body-sm)] font-bold leading-none focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
          issuer === "EMPRESA" ? "border-ws-warning bg-ws-warning-soft text-ws-warning-ink" : "border-ws-node-blue bg-ws-node-blue-soft text-ws-node-blue-ink",
        )}
        data-testid="seal"
      >
        ★
      </span>
    </Tooltip>
  );
}

export function Stamp({ kind, children }: { kind: "ok" | "danger"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-block -rotate-[8deg] rounded-[var(--ws-radius-sm)] border-[2.5px] px-2 py-0.5 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-bold uppercase tracking-[var(--ws-text-label--tracking)]",
        kind === "ok" ? "border-ws-success text-ws-success-ink" : "border-ws-danger text-ws-danger-ink",
      )}
      data-testid="stamp"
    >
      {children}
    </span>
  );
}

export function VisibilityTag({ visibility, accessClass }: { visibility: Visibility; accessClass?: AccessClassification }) {
  const { t } = useI18n();
  return (
    <>
      <Tag tone="neutral"><span aria-hidden>{visibility === "PUBLICA" ? "◎" : visibility === "PRIVADA" ? "◌" : "◐"}</span>{t(`social.visibility.${visibility}`)}</Tag>
      {accessClass && (accessClass === "RESTRITO" || accessClass === "SIGILOSO") ? (
        <Tag tone="danger"><span aria-hidden>⛨</span>{t(`social.access.${accessClass}`)}</Tag>
      ) : null}
    </>
  );
}

/** Pessoa com avatar e link para o perfil (RF16). */
export function PersonLink({ person, size = 20, className }: { person: PersonRef; size?: number; className?: string }) {
  return (
    <Link href={`/u/${person.username}`} variant="plain" className={cn("inline-flex min-w-0 items-center gap-1.5 hover:underline", className)}>
      <span aria-hidden className="inline-flex"><Avatar name={person.name} monogram={initialsOf(person.name.replace(/\s*\(.*\)\s*$/, ""))} node={person.node} size={size} /></span>
      <span className="truncate">{person.name}</span>
    </Link>
  );
}

/** Capa (camada 4) com a arte da família (camada 2): protocolo · carimbo · pasta · blueprint · monograma; decorativa. */
export function CoverArt({ family, symbol, tone, title, format, className, children, size = "md" }: { family: ArtFamily; symbol: string; tone: Tone; title: string; format?: string | null; className?: string; children?: ReactNode; size?: "xs" | "sm" | "md" | "lg" }) {
  const initials = title.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <div className={cn("relative isolate overflow-hidden", TONE_SOFT[tone], className)} data-family={family}>
      <div aria-hidden className="absolute inset-0 -z-10">
        {family === "protocolo" ? <div className="absolute inset-0 border-t-2 border-dashed border-ws-border-strong opacity-70 [background-image:repeating-linear-gradient(180deg,transparent_0_15px,var(--ws-border)_15px_16px)]" /> : null}
        {family === "blueprint" ? <div className="absolute inset-0 bg-ws-node-blue-soft [background-image:linear-gradient(var(--ws-border)_1px,transparent_1px),linear-gradient(90deg,var(--ws-border)_1px,transparent_1px)] [background-size:14px_14px]" /> : null}
        {family === "pasta" ? <div className="absolute left-3 top-0 h-3 w-1/3 rounded-b-[var(--ws-radius-sm)] bg-ws-node-brown opacity-60" /> : null}
        {family === "carimbo" ? <div className="absolute -right-3 -top-3 size-16 -rotate-12 rounded-full border-4 border-ws-node-red opacity-40" /> : null}
        {family === "monograma" ? <div className="absolute -bottom-4 right-1 font-[family-name:var(--ws-font-display)] text-[4.5rem] font-bold leading-none opacity-15">{initials || "WS"}</div> : null}
      </div>
      <div aria-hidden className={cn("flex h-full w-full items-center justify-center font-[family-name:var(--ws-font-mono)] leading-none", size === "xs" ? "text-[1rem]" : size === "sm" ? "text-[1.5rem]" : size === "lg" ? "text-[4.5rem]" : "text-[2.75rem]")}>{symbol}</div>
      {format && size !== "xs" ? <span aria-hidden className="absolute bottom-1.5 right-1.5 rounded-[var(--ws-radius-sm)] bg-ws-surface-1 px-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] font-bold uppercase text-ws-text">{format}</span> : null}
      {children}
    </div>
  );
}

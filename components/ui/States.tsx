"use client";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { Button } from "./Button";
import { cn } from "./cn";
import { Moji, type MojiName } from "./glyphs/Glyph";

/**
 * EmptyState (RF27.CA01, RF41.CA01: estado vazio ilustrado com WS Moji) · ErrorState ("tentar de novo", código e
 * correlationId) · ForbiddenState (403 ACESSO_NEGADO simulado por perfil) · LoadingState (aria-busy).
 */
export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  moji?: MojiName;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ title, description, moji = "vazio", action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-2 rounded-[var(--ws-radius-lg)] border border-dashed border-ws-border bg-ws-surface-1 text-center", compact ? "p-[var(--ws-space-4)]" : "p-[var(--ws-space-8)]", className)}>
      <Moji name={moji} size={compact ? 40 : 72} />
      <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold text-ws-text">{title}</p>
      {description ? <p className="max-w-prose text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  code?: string;
  correlationId?: string;
  onRetry?: () => void;
  className?: string;
  action?: ReactNode;
}

export function ErrorState({ title, description, code, correlationId, onRetry, className, action }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div role="alert" className={cn("grid justify-items-center gap-2 rounded-[var(--ws-radius-lg)] border border-ws-danger bg-ws-danger-soft p-[var(--ws-space-6)] text-center text-ws-text", className)}>
      <Moji name="erro" size={56} />
      <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{title ?? t("error.title")}</p>
      {description ? <p className="max-w-prose text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{description}</p> : null}
      {code || correlationId ? (
        <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {code ? <span>{code}</span> : null}
          {code && correlationId ? " · " : null}
          {correlationId ? <span>{t("error.correlation", { correlationId })}</span> : null}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {onRetry ? <Button variant="primary" size="sm" onClick={onRetry}>{t("common.retry")}</Button> : null}
        {action}
      </div>
    </div>
  );
}

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-live="polite" className={cn("grid justify-items-center gap-2 p-[var(--ws-space-6)] text-center text-ws-text-muted", className)}>
      <Moji name="carregando" size={48} decorative />
      <p className="text-[length:var(--ws-text-body-sm)]">{label ?? t("common.loading")}</p>
    </div>
  );
}

"use client";
import * as RD from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { IconButton } from "./Button";
import { cn } from "./cn";

/**
 * Dialog e Sheet (radix): foco preso, Esc fecha, scrim com blur por token (.ws-scrim), aria-modal. O Sheet é a folha
 * lateral (menu no celular) ou inferior ("+ Criar", ABAS_POR_PERFIL §2.6). Título obrigatório (acessibilidade).
 */
interface CommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** esconde visualmente o título (continua para leitores de tela) */
  hideTitle?: boolean;
}

function CloseButton() {
  const { t } = useI18n();
  return (
    <RD.Close asChild>
      <IconButton icon="sair" label={t("common.close")} className="absolute right-2 top-2" />
    </RD.Close>
  );
}

export function Dialog({ open, onOpenChange, title, description, children, className, hideTitle }: CommonProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="ws-scrim fixed inset-0 z-[var(--ws-z-dialog)]" />
        <RD.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--ws-z-dialog)] w-[min(92vw,32rem)] max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-6)] text-ws-text shadow-ws-2 outline-none",
            className,
          )}
        >
          <RD.Title className={cn("font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)]", hideTitle && "sr-only")}>{title}</RD.Title>
          {description ? <RD.Description className="mt-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{description}</RD.Description> : null}
          <div className="mt-[var(--ws-space-4)]">{children}</div>
          <CloseButton />
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export interface SheetProps extends CommonProps {
  side?: "left" | "right" | "bottom";
}

const SIDE: Record<NonNullable<SheetProps["side"]>, string> = {
  left: "inset-y-0 left-0 h-dvh w-[min(88vw,20rem)] rounded-r-[var(--ws-radius-lg)] border-r",
  right: "inset-y-0 right-0 h-dvh w-[min(88vw,24rem)] rounded-l-[var(--ws-radius-lg)] border-l",
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[var(--ws-radius-lg)] border-t pb-[max(var(--ws-space-4),env(safe-area-inset-bottom))]",
};

export function Sheet({ open, onOpenChange, title, description, children, className, hideTitle, side = "bottom" }: SheetProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="ws-scrim fixed inset-0 z-[var(--ws-z-dialog)]" />
        <RD.Content
          className={cn("fixed z-[var(--ws-z-dialog)] overflow-auto border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)] text-ws-text shadow-ws-2 outline-none", SIDE[side], className)}
        >
          <RD.Title className={cn("pr-10 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold", hideTitle && "sr-only")}>{title}</RD.Title>
          {description ? <RD.Description className="mt-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
          <div className="mt-[var(--ws-space-3)]">{children}</div>
          <CloseButton />
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

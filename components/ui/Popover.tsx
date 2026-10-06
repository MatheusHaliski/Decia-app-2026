"use client";
import * as RP from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Popover (radix): painel ancorado (sino, Central de Perfil, tema/idioma). Esc e clique fora fecham; foco volta ao gatilho. */
export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** rótulo acessível do painel */
  label: string;
  className?: string;
  /** largura do painel (classe) */
  width?: string;
}

export function Popover({ trigger, children, open, onOpenChange, align = "end", side = "bottom", label, className, width = "w-[min(92vw,22rem)]" }: PopoverProps) {
  return (
    <RP.Root open={open} onOpenChange={onOpenChange}>
      <RP.Trigger asChild>{trigger}</RP.Trigger>
      <RP.Portal>
        <RP.Content
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={8}
          aria-label={label}
          className={cn(
            "z-[var(--ws-z-popover)] rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-2)] text-ws-text shadow-ws-2 outline-none",
            "data-[state=open]:motion-safe:animate-[ws-pop_var(--ws-duration-base)_var(--ws-ease)]",
            width,
            className,
          )}
        >
          {children}
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}

export const PopoverClose = RP.Close;

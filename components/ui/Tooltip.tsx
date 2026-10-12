"use client";
import * as RT from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/** Tooltip (radix): texto curto por token; abre com foco e hover; Esc fecha. Envolva a árvore em <TooltipProvider>. */
export const TooltipProvider = ({ children }: { children: ReactNode }) => <RT.Provider delayDuration={300}>{children}</RT.Provider>;

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** desligado: devolve só o filho */
  disabled?: boolean;
}

export function Tooltip({ content, children, side = "top", disabled }: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={6}
          className="z-[var(--ws-z-popover)] max-w-xs rounded-[var(--ws-radius-md)] bg-ws-ink px-2.5 py-1.5 text-[length:var(--ws-text-caption)] font-medium text-ws-cream shadow-ws-2 select-none"
        >
          {content}
          <RT.Arrow className="fill-[var(--ws-ink)]" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}

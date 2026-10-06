import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** Superfície de conteúdo (clay por token): container branco/escuro com borda e raio do DS. `as` muda a tag semântica. */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "className" | "title"> {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside" | "li";
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "surface" | "soft" | "glass" | "clay";
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

const PAD = { none: "", sm: "p-[var(--ws-space-3)]", md: "p-[var(--ws-space-4)]", lg: "p-[var(--ws-space-6)]" };
const TONE = {
  surface: "border border-ws-border bg-ws-surface-1",
  soft: "border border-ws-border bg-ws-surface-2",
  glass: "ws-shell-glass border",
  clay: "ws-clay border border-transparent",
};

export function Card({ children, className, as = "div", padding = "md", tone = "surface", title, eyebrow, actions, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag className={cn("rounded-[var(--ws-radius-lg)] text-ws-text", TONE[tone], PAD[padding], className)} {...rest}>
      {title || actions ? (
        <header className="mb-[var(--ws-space-3)] flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {eyebrow ? <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{eyebrow}</p> : null}
            {title ? <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold leading-[var(--ws-text-h3--lh)]">{title}</h2> : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </Tag>
  );
}

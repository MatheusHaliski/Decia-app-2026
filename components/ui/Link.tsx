import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Link do design system: único wrapper de <a> fora do Button. Interno → next/link; externo → rel seguro e target.
 * `variant="nav"` é o item de menu (SidebarNav/BottomNav), com aria-current por rota.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href" | "children"> {
  href: string;
  children: ReactNode;
  variant?: "inline" | "nav" | "plain" | "card";
  current?: boolean;
  className?: string;
}

const VARIANT: Record<NonNullable<LinkProps["variant"]>, string> = {
  inline: "text-ws-accent-ink underline decoration-ws-accent/60 underline-offset-2 hover:decoration-ws-accent-ink",
  plain: "text-inherit no-underline",
  card: "block rounded-[var(--ws-radius-md)] no-underline text-inherit hover:bg-ws-surface-2",
  nav: "flex min-h-[var(--ws-control-md)] items-center gap-[var(--ws-space-3)] rounded-[var(--ws-radius-md)] px-[var(--ws-space-3)] text-ws-text no-underline hover:bg-ws-surface-2 aria-[current=page]:bg-ws-accent-soft aria-[current=page]:text-ws-accent-ink aria-[current=page]:font-semibold aria-[current=page]:[box-shadow:inset_3px_0_0_var(--ws-accent)]",
};

export function Link({ href, children, variant = "inline", current, className, ...rest }: LinkProps) {
  const classes = cn("focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] rounded-[var(--ws-radius-sm)]", VARIANT[variant], className);
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer" target={rest.target ?? "_blank"} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} className={classes} aria-current={current ? "page" : undefined} {...rest}>
      {children}
    </NextLink>
  );
}

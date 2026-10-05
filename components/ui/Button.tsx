import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Botão do design system DECIA (DESIGN_SYSTEM.md §3, classe .ws-btn das anatomias). Único lugar do frontend onde
 * <button> e <a> podem aparecer (regra no-restricted-syntax do eslint.config.mjs). Toda cor vem de token:
 * --primary/--on-primary, --secondary/--on-secondary, --class-risco (perigo), --surface/--ink/--line (padrão).
 */
export type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Operação em andamento: desabilita e marca aria-busy (o texto continua visível, nunca só um spinner). */
  busy?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type ButtonAsLink = BaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

const BASE =
  "inline-flex items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-[var(--radius-pill)] border-[1.5px] " +
  "font-[var(--font-ui)] font-semibold leading-tight transition-colors cursor-pointer select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] " +
  "disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-busy:cursor-progress";

const VARIANT: Record<ButtonVariant, string> = {
  default: "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
  primary: "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-strong)] hover:border-[var(--primary-strong)]",
  secondary: "border-[var(--secondary)] bg-[var(--secondary)] text-[var(--on-secondary)]",
  ghost: "border-transparent bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)]",
  danger: "border-[var(--class-risco)] bg-[var(--surface)] text-[var(--class-risco-ink)] hover:bg-[var(--class-risco)] hover:text-[var(--on-class-risco)]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[var(--control-sm)] px-[var(--space-3)] py-1 text-[length:var(--text-body-sm)]",
  md: "min-h-[var(--control-md)] px-[var(--space-4)] py-2 text-[length:var(--text-body)]",
  lg: "min-h-[var(--control-lg)] px-[var(--space-5)] py-3 text-[length:var(--text-body-lg)]",
};

export function buttonClassName(variant: ButtonVariant = "default", size: ButtonSize = "md", extra?: string): string {
  return [BASE, VARIANT[variant], SIZE[size], extra].filter(Boolean).join(" ");
}

export function Button(props: ButtonProps) {
  const { variant = "default", size = "md", busy = false, children, className, ...rest } = props;
  const classes = buttonClassName(variant, size, className);

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchor } = rest as ButtonAsLink;
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={classes}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        rel={external ? "noopener noreferrer" : undefined}
        {...anchor}
      >
        {children}
      </a>
    );
  }

  const { type = "button", disabled, ...button } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} disabled={disabled || busy} aria-busy={busy || undefined} {...button}>
      {children}
    </button>
  );
}

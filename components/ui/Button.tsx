"use client";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Glyph, type GlyphName } from "./glyphs/Glyph";

/**
 * Botão do design system (DESIGN_SYSTEM.md §3 `.ws-btn`). Único lugar do frontend onde <button> e <a> podem aparecer
 * (regra no-restricted-syntax do eslint.config.mjs). Toda cor vem de token --ws-*: accent/on-accent (primary),
 * gradient-brand (gradient), node-green (secondary), danger (danger), ai-spark (spark ✦), surface/text/border (default).
 * `icon` recebe um WS Glyph; `size="icon"` faz o botão quadrado (rótulo só por aria-label). Links internos usam next/link.
 */
export type ButtonVariant = "default" | "primary" | "gradient" | "secondary" | "ghost" | "danger" | "spark";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Operação em andamento: desabilita e marca aria-busy (o texto continua visível; o ícone vira o moji carregando). */
  busy?: boolean;
  icon?: GlyphName;
  iconVariant?: "outline" | "clay";
  children?: ReactNode;
  className?: string;
}

type ButtonAsButton = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type ButtonAsLink = BaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

const BASE =
  "inline-flex items-center justify-center gap-[var(--ws-space-2)] whitespace-nowrap rounded-[var(--ws-radius-pill)] border-[1.5px] " +
  "font-[family-name:var(--ws-font-body)] font-semibold leading-tight transition-colors cursor-pointer select-none " +
  "focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-busy:cursor-progress";

const VARIANT: Record<ButtonVariant, string> = {
  default: "border-ws-border bg-ws-surface-1 text-ws-text hover:bg-ws-surface-2",
  primary: "border-ws-accent bg-ws-accent text-ws-on-accent hover:bg-ws-accent-strong hover:border-ws-accent-strong",
  gradient: "border-transparent [background:var(--ws-gradient-brand)] text-ws-on-accent hover:brightness-105",
  secondary: "border-ws-node-green bg-ws-node-green text-ws-on-success hover:brightness-105",
  ghost: "border-transparent bg-transparent text-ws-text hover:bg-ws-surface-2",
  danger: "border-ws-danger bg-ws-surface-1 text-ws-danger-ink hover:bg-ws-danger hover:text-ws-on-danger",
  spark: "border-ws-ai-spark bg-ws-ai-spark-soft text-ws-ai-spark-ink hover:bg-ws-ai-spark hover:text-ws-on-ai-spark",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[var(--ws-control-sm)] px-[var(--ws-space-3)] py-1 text-[length:var(--ws-text-body-sm)]",
  md: "min-h-[var(--ws-control-md)] px-[var(--ws-space-4)] py-2 text-[length:var(--ws-text-body)]",
  lg: "min-h-[var(--ws-control-lg)] px-[var(--ws-space-5)] py-3 text-[length:var(--ws-text-body-lg)]",
  icon: "size-[var(--ws-control-md)] p-0 text-[length:var(--ws-text-body)]",
};

const ICON_PX: Record<ButtonSize, number> = { sm: 18, md: 20, lg: 22, icon: 22 };

export function buttonClassName(variant: ButtonVariant = "default", size: ButtonSize = "md", extra?: string): string {
  return cn(BASE, VARIANT[variant], SIZE[size], extra);
}

export function Button(props: ButtonProps) {
  const { variant = "default", size = "md", busy = false, icon, iconVariant = "outline", children, className, ...rest } = props;
  const classes = buttonClassName(variant, size, className);
  const glyph = icon ? <Glyph name={icon} variant={iconVariant} size={ICON_PX[size]} decorative /> : null;
  const content = (
    <>
      {busy ? <span className="ws-moji inline-block size-[1em] animate-pulse rounded-full bg-current opacity-60" aria-hidden /> : glyph}
      {children}
    </>
  );

  if ("href" in rest && typeof rest.href === "string") {
    const { href, onClick, ...anchor } = rest as ButtonAsLink;
    const external = /^https?:\/\//.test(href);
    // Ocupado: o link continua no DOM (mesma caixa, mesmo texto) mas perde o href, sai da ordem de tabulação e não navega.
    const shared = {
      className: classes,
      role: busy ? ("link" as const) : undefined,
      tabIndex: busy ? -1 : undefined,
      "aria-busy": busy || undefined,
      "aria-disabled": busy || undefined,
      onClick: busy ? (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault() : onClick,
      ...anchor,
    };
    if (busy || external) {
      return (
        <a href={busy ? undefined : href} rel={external ? "noopener noreferrer" : undefined} {...shared}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} {...shared}>
        {content}
      </Link>
    );
  }

  const { type = "button", disabled, ...button } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} disabled={disabled || busy} aria-busy={busy || undefined} {...button}>
      {content}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonAsButton, "size" | "children" | "icon"> {
  icon: GlyphName;
  /** rótulo acessível obrigatório (o ícone não fala sozinho, RF38.CA01) */
  label: string;
  iconVariant?: "outline" | "clay";
  size?: number;
}

/** Botão só com glifo: rótulo vai no aria-label e no title (tooltip nativo mínimo; use <Tooltip> para o do DS). */
export function IconButton({ icon, label, iconVariant = "outline", size = 22, variant = "ghost", className, ...rest }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} title={rest.title ?? label} className={buttonClassName(variant, "icon", className)} {...rest}>
      <Glyph name={icon} variant={iconVariant} size={size} decorative />
    </button>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";
import { Badge, Glyph, IconButton, Input, Link, Tooltip, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeLanguageMenu } from "./ThemeLanguageMenu";
import { UserPanel } from "./UserPanel";

/**
 * TopBar (DESIGN_SYSTEM.md §3): logo, busca global (atalho `/`), Mensagens (RF46, ícone ao lado do sino — proposta P-14),
 * sino de notificações com badge, ficha DP (saldo RF42), tema/idioma e a Central de Perfil. Sticky, vidro por token.
 */
export interface TopBarProps {
  onToggleMenu: () => void;
  menuExpanded: boolean;
  menuControls: string;
}

export function DpChip({ points }: { points: number }) {
  const { t, intl } = useI18n();
  return (
    <Tooltip content={t("topbar.dpTooltip")}>
      <Link href="/points" variant="plain" className="inline-flex min-h-[var(--ws-control-sm)] items-center gap-1.5 rounded-[var(--ws-radius-pill)] border border-ws-border bg-ws-surface-1 px-2.5 text-[length:var(--ws-text-body-sm)] font-semibold hover:bg-ws-surface-2" aria-label={t("topbar.dpLabel", { n: points })} data-testid="dp-chip">
        <Glyph name="decia-points" size={18} decorative />
        <span className="font-[family-name:var(--ws-font-mono)] tabular-nums">{new Intl.NumberFormat(intl).format(points)}</span>
        <span className="hidden text-ws-text-muted sm:inline">DP</span>
      </Link>
    </Tooltip>
  );
}

export function TopBar({ onToggleMenu, menuExpanded, menuControls }: TopBarProps) {
  const { t } = useI18n();
  const { user, profile } = useViewer();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // atalho "/" foca a busca (fora de campos editáveis)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchRef.current?.value.trim() ?? "";
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const visitor = profile === "VISITANTE";
  return (
    <header className={cn("ws-shell-glass sticky top-0 z-[var(--ws-z-header)] h-[var(--ws-shell-header)] border-b")} role="banner">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-[var(--ws-space-2)] px-[var(--ws-space-3)] sm:px-[var(--ws-space-4)]">
        <IconButton icon="mesa" label={t("a11y.toggleMenu")} aria-expanded={menuExpanded} aria-controls={menuControls} onClick={onToggleMenu} data-testid="menu-toggle" />
        <Link href="/mural" variant="plain" className="flex shrink-0 items-center gap-2" aria-label={t("brand.home")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático da marca em /public */}
          <img src="/brand/work-station-monitor.svg" alt="" width={32} height={32} className="size-8" />
          <span className="hidden font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold md:inline">{t("brand.name")}</span>
        </Link>
        <form role="search" onSubmit={onSearch} className="mx-auto hidden w-full max-w-md sm:block">
          <Input ref={searchRef} name="q" type="search" leading="buscar" placeholder={t("topbar.searchPlaceholder")} aria-label={t("nav.search")} aria-keyshortcuts="/" className="min-h-[var(--ws-control-sm)] rounded-[var(--ws-radius-pill)] bg-ws-surface-1" />
        </form>
        <div className="ml-auto flex items-center gap-1">
          <IconButton icon="buscar" label={t("nav.search")} className="sm:hidden" onClick={() => router.push("/search")} />
          {!visitor && user.points !== null ? <DpChip points={user.points} /> : null}
          {!visitor ? (
            <span className="relative hidden sm:inline-flex">
              <IconButton icon="sessao-decia" label={t("nav.messages")} onClick={() => router.push("/messages")} />
              <Badge count className="pointer-events-none absolute -right-0.5 -top-0.5" aria-hidden>2</Badge>
            </span>
          ) : null}
          {!visitor ? <NotificationsBell /> : null}
          <ThemeLanguageMenu />
          <UserPanel />
        </div>
      </div>
    </header>
  );
}

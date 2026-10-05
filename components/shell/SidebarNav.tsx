"use client";
import { usePathname } from "next/navigation";
import { Badge, Glyph, Link, Tooltip, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { isActivePath, resolveHref, visibleGroups, type NavItem } from "@/lib/nav/matrix";
import { useNotificationsState } from "@/lib/notifications/NotificationsProvider";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/**
 * SidebarNav (DESIGN_SYSTEM.md §3; Matriz A): grupos Descobrir · Meu trabalho · Criar · Jogar e ganhar · Gestão com os
 * itens visíveis para o perfil, estado ativo por rota (aria-current), badges e modo rail (72 px) com Tooltip.
 */
export interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/** Contadores de pendência por item (mock até os RFs correspondentes). */
function useBadges(): Partial<Record<NonNullable<NavItem["badge"]>, number>> {
  const { unread } = useNotificationsState();
  const { profile } = useViewer();
  return {
    notifications: unread,
    messages: profile === "VISITANTE" ? 0 : 2,
    reviewQueue: profile === "CHEFE" || profile === "EMPRESA" || profile === "CURADOR" ? 3 : 0,
    curation: profile === "CURADOR" ? 4 : 0,
    approvals: profile === "ADMIN" ? 2 : 0,
  };
}

export function NavGroups({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { profile, user } = useViewer();
  const badges = useBadges();
  const groups = visibleGroups(profile);
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`nav-${g.id}`}>
          <h2 id={`nav-${g.id}`} className={cn("px-[var(--ws-space-3)] pb-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] font-semibold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted", collapsed && "sr-only")}>
            {t(g.labelKey)}
          </h2>
          <ul className="grid gap-0.5">
            {g.items.map((item) => {
              const href = resolveHref(item, user);
              const on = isActivePath(pathname, href, item.activeOn);
              const count = item.badge ? badges[item.badge] ?? 0 : 0;
              const label = t(item.labelKey);
              const link = (
                <Link href={href} variant="nav" current={on} onClick={onNavigate} className={cn(collapsed && "justify-center px-0")} aria-label={collapsed ? label : undefined}>
                  <Glyph name={item.glyph} size={22} decorative />
                  {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
                  {!collapsed && item.proposal ? <span className="size-1.5 rounded-full bg-ws-ai-spark" aria-label={t("common.proposal")} title={t("common.proposal")} /> : null}
                  {count > 0 ? <Badge count className={cn(collapsed && "absolute -top-1 right-1")}>{count > 99 ? "99+" : count}</Badge> : null}
                </Link>
              );
              return (
                <li key={item.id} className="relative">
                  {collapsed ? <Tooltip content={label} side="right">{link}</Tooltip> : link}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function SidebarNav({ collapsed = false, className }: SidebarNavProps) {
  const { t } = useI18n();
  return (
    <nav
      id="app-sidebar"
      aria-label={t("a11y.mainMenu")}
      data-collapsed={collapsed || undefined}
      className={cn(
        "ws-shell-glass sticky top-[var(--ws-shell-header)] hidden h-[calc(100dvh-var(--ws-shell-header))] shrink-0 overflow-y-auto border-r p-[var(--ws-space-3)] transition-[width] duration-[var(--ws-duration-slow)] ease-[var(--ws-ease)] lg:block",
        collapsed ? "w-[var(--ws-shell-sidebar-rail)]" : "w-[var(--ws-shell-sidebar)]",
        className,
      )}
    >
      <NavGroups collapsed={collapsed} />
    </nav>
  );
}

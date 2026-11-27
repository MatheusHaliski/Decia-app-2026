"use client";
import { usePathname } from "next/navigation";
import { Badge, Glyph, Link, Tooltip, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { useMessagesUnread } from "@/lib/messages/unread";
import { pageForPath } from "@/lib/nav/currentPage";
import { useLabView } from "@/lib/nav/labView";
import { isActivePath, resolveHref, visibleGroups, type NavItem } from "@/lib/nav/matrix";
import { isComingSoon } from "@/lib/pages/status";
import { useNotificationsState } from "@/lib/notifications/NotificationsProvider";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/**
 * SidebarNav (DESIGN_SYSTEM.md §3; Matriz A): grupos Descobrir · Meu trabalho · Criar · Jogar e ganhar · Gestão com os
 * itens visíveis para o perfil, estado ativo por rota (aria-current), badges e modo rail (72 px) com Tooltip.
 * Rota ainda sem conteúdo (status `skeleton`/`preview` em lib/pages/status.ts) leva o selo em texto "Em breve" (no rail, no nome
 * acessível e na dica). O selo "proposta" (ABAS_POR_PERFIL) é jargão interno: só no laboratório, e em texto.
 */
export interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/** Contadores de pendência por item (notificações e mensagens reais com sessão; os demais mock até os RFs correspondentes). */
function useBadges(): Partial<Record<NonNullable<NavItem["badge"]>, number>> {
  const { unread } = useNotificationsState();
  const { profile } = useViewer();
  // RF46: conversas com não lidas pela API com sessão; DEMO (2) no laboratório
  const messages = useMessagesUnread();
  return {
    notifications: unread,
    messages: profile === "VISITANTE" ? 0 : messages ?? 2,
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
  const lab = useLabView();
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
              const soon = isComingSoon(pageForPath(href)?.status ?? "live");
              const label = t(item.labelKey);
              const fullLabel = soon ? t("guide.soon.navLabel", { label }) : label;
              const link = (
                <Link href={href} variant="nav" current={on} onClick={onNavigate} className={cn(collapsed && "justify-center px-0")} aria-label={collapsed ? fullLabel : undefined} data-soon={soon || undefined}>
                  <Glyph name={item.glyph} size={22} decorative />
                  {!collapsed ? <span className={cn("min-w-0 flex-1 truncate", soon && "text-ws-text-muted")}>{label}</span> : null}
                  {!collapsed && soon ? <Badge tone="neutral" className="shrink-0 px-1.5 py-0.5 normal-case tracking-normal">{t("guide.soon.badge")}</Badge> : null}
                  {!collapsed && lab && item.proposal ? <Badge tone="spark" className="shrink-0 px-1.5 py-0.5 normal-case tracking-normal">{t("common.proposal")}</Badge> : null}
                  {count > 0 ? <Badge count className={cn(collapsed && "absolute -top-1 right-1")}>{count > 99 ? "99+" : count}</Badge> : null}
                </Link>
              );
              return (
                <li key={item.id} className="relative">
                  {collapsed ? <Tooltip content={fullLabel} side="right">{link}</Tooltip> : link}
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

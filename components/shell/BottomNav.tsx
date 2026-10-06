"use client";
import { usePathname } from "next/navigation";
import { Button, Glyph, Link, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { bottomNav, isActivePath } from "@/lib/nav/matrix";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/** Barra inferior (< 1024 px; ABAS_POR_PERFIL §2.6): 5 destinos por perfil, o do meio abre a folha "+ Criar". */
export function BottomNav({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { user } = useViewer();
  const dests = bottomNav(user);
  return (
    <nav
      aria-label={t("a11y.bottomNav")}
      className="ws-shell-glass fixed inset-x-0 bottom-0 z-[var(--ws-z-header)] grid h-[calc(var(--ws-shell-bottomnav)+env(safe-area-inset-bottom))] border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ gridTemplateColumns: `repeat(${dests.length}, minmax(0, 1fr))` }}
    >
      {dests.map((d) =>
        d === "create" ? (
          <Button key="create" variant="ghost" aria-haspopup="dialog" onClick={onCreate} className="h-full flex-col gap-0.5 rounded-none border-0 px-0 text-[length:var(--ws-text-label)] font-semibold" data-testid="bottom-create">
            <span className="flex size-9 items-center justify-center rounded-full bg-ws-accent text-ws-on-accent text-xl leading-none" aria-hidden>+</span>
            <span>{t("nav.createShort")}</span>
          </Button>
        ) : (
          <Link key={d.id} href={d.href} variant="plain" current={isActivePath(pathname, d.href)} className={cn("flex h-full flex-col items-center justify-center gap-0.5 rounded-none px-1 text-[length:var(--ws-text-label)] font-semibold text-ws-text-muted aria-[current=page]:text-ws-accent-ink")}>
            <Glyph name={d.glyph} size={22} decorative />
            <span className="truncate">{t(d.labelKey)}</span>
          </Link>
        ),
      )}
    </nav>
  );
}

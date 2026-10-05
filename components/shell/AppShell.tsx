"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Sheet, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { BottomNav } from "./BottomNav";
import { CreateSheet } from "./CreateSheet";
import { NavGroups, SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

const SIDEBAR_KEY = "ws.sidebar";
const DESKTOP = "(min-width: 1024px)";

/** true a partir de 1024 px (menu lateral fixo); abaixo disso o botão abre a gaveta. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

/** Menu lateral recolhido (rail 72 px): lembrado neste navegador (conveniência por aparelho, não é preferência do servidor). */
function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "collapsed"); } catch { /* armazenamento indisponível */ }
  }, []);
  const set = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem(SIDEBAR_KEY, v ? "collapsed" : "open"); } catch { /* ignore */ }
  };
  return [collapsed, set];
}

/**
 * AppShell (ARQUITETURA §6 etapa (b); referência de arquitetura: FAI app-shell): skip link, TopBar, SidebarNav (≥ 1024 px,
 * recolhível), gaveta lateral (< 1024 px), conteúdo em <main id="conteudo">, BottomNav + folha "+ Criar" no celular.
 * Landmarks: banner · navigation (menu principal, barra inferior) · main. Esc fecha gaveta/folha (radix).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [drawer, setDrawer] = useState(false);
  const [create, setCreate] = useState(false);

  useEffect(() => { setDrawer(false); setCreate(false); }, [pathname]);

  return (
    <div className="min-h-dvh">
      <Link href="#conteudo" variant="plain" className="ws-skip-link">{t("a11y.skip")}</Link>
      <TopBar onToggleMenu={() => (desktop ? setCollapsed(!collapsed) : setDrawer(true))} menuExpanded={desktop ? !collapsed : drawer} menuControls={desktop ? "app-sidebar" : "app-drawer"} />
      <div className="mx-auto flex max-w-[1600px]">
        <SidebarNav collapsed={collapsed} />
        <main id="conteudo" tabIndex={-1} className={cn("min-w-0 flex-1 px-[var(--ws-space-4)] pb-[calc(var(--ws-shell-bottomnav)+var(--ws-space-8))] pt-[var(--ws-space-5)] sm:px-[var(--ws-space-6)] lg:pb-[var(--ws-space-8)]", "focus-visible:outline-none")}>
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
      <Sheet open={drawer} onOpenChange={setDrawer} side="left" title={t("a11y.mainMenu")} hideTitle className="p-[var(--ws-space-3)]">
        <nav id="app-drawer" aria-label={t("a11y.mainMenu")}>
          <NavGroups onNavigate={() => setDrawer(false)} />
        </nav>
      </Sheet>
      <BottomNav onCreate={() => setCreate(true)} />
      <CreateSheet open={create} onOpenChange={setCreate} />
    </div>
  );
}

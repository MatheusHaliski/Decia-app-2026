"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { Skeleton } from "./Skeleton";

/**
 * Tabs acessíveis (roles tablist/tab/tabpanel, setas ← → Home End, aria-selected, aria-controls) com a aba ativa na URL
 * (`?tab=slug`, RF3 "abas na URL"; RF19 sub-abas do perfil). Sem URL sync use `value`/`onChange` controlados.
 */
export interface TabItem {
  slug: string;
  label: ReactNode;
  /** badge/contador ao lado do rótulo */
  badge?: ReactNode;
  disabled?: boolean;
  /** marcado como proposta (ABAS_POR_PERFIL) — recebe um ponto discreto */
  proposal?: boolean;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  /** parâmetro de URL (padrão "tab"); `null` desliga a sincronização */
  param?: string | null;
  value?: string;
  onChange?: (slug: string) => void;
  /** conteúdo do painel da aba ativa */
  children?: (active: string) => ReactNode;
  label: string;
  className?: string;
  /** aparência: linha (padrão) ou pílulas */
  look?: "line" | "pills";
}

function TabsInner({ tabs, param = "tab", value, onChange, children, label, className, look = "line" }: TabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const first = tabs.find((t) => !t.disabled)?.slug ?? tabs[0]?.slug ?? "";
  const fromUrl = param ? search.get(param) : null;
  const active = value ?? (fromUrl && tabs.some((t) => t.slug === fromUrl && !t.disabled) ? fromUrl : first);

  const select = useCallback(
    (slug: string) => {
      onChange?.(slug);
      if (param && value === undefined) {
        const next = new URLSearchParams(search.toString());
        if (slug === first) next.delete(param); else next.set(param, slug);
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      }
    },
    [onChange, param, value, search, first, router, pathname],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = tabs.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.slug === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const slug = enabled[next]!.slug;
    select(slug);
    listRef.current?.querySelector<HTMLElement>(`[data-slug="${slug}"]`)?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className={cn("flex max-w-full gap-1 overflow-x-auto", look === "line" ? "border-b border-ws-border" : "rounded-[var(--ws-radius-pill)] bg-ws-surface-2 p-1")}
      >
        {tabs.map((t) => {
          const on = t.slug === active;
          return (
            <button
              key={t.slug}
              type="button"
              role="tab"
              id={`${id}-tab-${t.slug}`}
              data-slug={t.slug}
              aria-selected={on}
              aria-controls={`${id}-panel-${t.slug}`}
              aria-disabled={t.disabled || undefined}
              tabIndex={on ? 0 : -1}
              disabled={t.disabled}
              onClick={() => select(t.slug)}
              className={cn(
                "relative inline-flex min-h-[var(--ws-control-sm)] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap px-3 text-[length:var(--ws-text-body-sm)] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
                look === "line"
                  ? cn("-mb-px border-b-2 rounded-t-[var(--ws-radius-sm)]", on ? "border-ws-accent text-ws-accent-ink" : "border-transparent text-ws-text-muted hover:text-ws-text hover:bg-ws-surface-2")
                  : cn("rounded-[var(--ws-radius-pill)]", on ? "bg-ws-surface-1 text-ws-text shadow-ws-1" : "text-ws-text-muted hover:text-ws-text"),
              )}
            >
              {t.label}
              {t.badge}
              {t.proposal ? <span className="size-1.5 rounded-full bg-ws-ai-spark" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      {children ? (
        <div role="tabpanel" id={`${id}-panel-${active}`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0} className="pt-[var(--ws-space-4)] focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
          {children(active)}
        </div>
      ) : null}
    </div>
  );
}

export function Tabs(props: TabsProps) {
  // useSearchParams exige Suspense nas páginas pré-renderizadas
  return (
    <Suspense fallback={<Skeleton className="h-[var(--ws-control-sm)] w-full max-w-md" />}>
      <TabsInner {...props} />
    </Suspense>
  );
}

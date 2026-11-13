"use client";
import { Button, Card, Link, cn } from "@/components/ui";
import { readerHref } from "@/lib/memory/citation";
import type { FacetSelection, MemoryFacets } from "@/lib/memory/explore";
import type { MemoryDocument } from "@/lib/memory/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { kindKey } from "./labels";

/** Intensidade da célula por faixa (texto do número sempre presente: a cor só reforça). */
const tint = (n: number, max: number) => (n === 0 ? "" : n / Math.max(1, max) > 0.66 ? "bg-ws-accent-soft" : n / Math.max(1, max) > 0.33 ? "bg-ws-info-soft" : "bg-ws-surface-2");

/**
 * Explorador visual (RF33.CA04): tipos com contagem e grade unidade × exercício (tabela acessível; cada célula filtra por
 * unidade e exercício, operável por teclado). Só conta o que a pessoa pode ler.
 */
export function MemoryExplorer({ facets, selection, onSelect, docs }: {
  facets: MemoryFacets;
  selection: FacetSelection;
  onSelect: (s: FacetSelection) => void;
  /** documentos com os filtros atuais (lista curta para abrir no leitor) */
  docs: readonly MemoryDocument[];
}) {
  const { t } = useI18n();
  const deptLabel = (d: string | null) => d ?? t("memory.noDepartment");
  const yearLabel = (y: number | null) => (y === null ? t("memory.noYear") : String(y));
  const active = selection.kind || selection.department != null || selection.year != null;
  return (
    <Card as="section" aria-labelledby="memory-explorer-title" className="grid gap-3" data-testid="memory-explorer">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="memory-explorer-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("memory.explorer.title")}</h2>
        <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="memory-explorer-total">{t("memory.explorer.total", { n: facets.total })}</p>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.explorer.hint")}</p>

      <div className="grid gap-1.5">
        <h3 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("memory.explorer.byKind")}</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("memory.explorer.byKind")}>
          {facets.byKind.map((k) => (
            <Button
              key={k.kind}
              size="sm"
              variant={selection.kind === k.kind ? "primary" : "default"}
              aria-pressed={selection.kind === k.kind}
              onClick={() => onSelect({ ...selection, kind: selection.kind === k.kind ? null : k.kind })}
            >
              {t(kindKey(k.kind))} · {k.count}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("memory.explorer.grid")}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-ws-border p-1.5 text-left">{t("memory.explorer.department")}</th>
              {facets.grid.years.map((y) => (
                <th key={String(y)} scope="col" className="border-b border-ws-border p-1.5 text-center tabular-nums">{yearLabel(y)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facets.grid.departments.map((d) => (
              <tr key={String(d)}>
                <th scope="row" className="border-b border-ws-border p-1.5 text-left font-semibold">{deptLabel(d)}</th>
                {facets.grid.years.map((y) => {
                  const n = facets.grid.count(d, y);
                  const on = selection.department === d && selection.year === y;
                  return (
                    <td key={String(y)} className={cn("border-b border-ws-border p-1 text-center", tint(n, facets.grid.max))}>
                      {n ? (
                        <Button
                          size="sm"
                          variant={on ? "primary" : "ghost"}
                          aria-pressed={on}
                          aria-label={t("memory.explorer.cell", { dept: deptLabel(d), year: yearLabel(y), n })}
                          onClick={() => onSelect(on ? { ...selection, department: null, year: null } : { ...selection, department: d, year: y })}
                          className="min-w-10 tabular-nums"
                        >
                          {n}
                        </Button>
                      ) : (
                        <>
                          <span className="text-ws-text-faint" aria-hidden>—</span>
                          <span className="sr-only">{t("memory.explorer.cell", { dept: deptLabel(d), year: yearLabel(y), n: 0 })}</span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active ? (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("memory.explorer.docs")}</h3>
            <Button size="sm" variant="ghost" onClick={() => onSelect({})}>{t("memory.filter.clear")}</Button>
          </div>
          <ul className="grid gap-1" data-testid="memory-explorer-docs">
            {docs.slice(0, 12).map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 text-[length:var(--ws-text-body-sm)]">
                <Link href={readerHref(d.id)}>{d.title}</Link>
                <span className="text-ws-text-muted">{t(kindKey(d.kind))} · {deptLabel(d.department)} · {yearLabel(d.year)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

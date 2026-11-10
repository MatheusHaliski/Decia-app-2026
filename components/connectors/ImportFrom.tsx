"use client";
/**
 * "Importar de…" no topo do criador de tarefas (RF4, RF20.CA07, RF23, RF34): botão e diálogo. O corpo do diálogo (contas, busca,
 * colar link e o catálogo de regras) só é baixado quando abre. A URL também abre o diálogo: `?importar=conta|link` (atalho de
 * Configurações › Conectores) e a volta do provedor (`?importar=conta&conector=ok|erro&motivo=`), que é lida uma vez e limpa.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Button, Dialog, LoadingState } from "@/components/ui";
import { readConnectorReturn, type ConnectorReturn } from "@/lib/connectors/client";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ImportTab } from "./ImportPanel";

const ImportPanel = lazy(() => import("./ImportPanel"));
const URL_PARAMS = ["importar", "conector", "motivo"];

export function ImportFrom({ hasDraft = false }: { hasDraft?: boolean }) {
  const { t } = useI18n();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ImportTab>("conta");
  const [returned, setReturned] = useState<ConnectorReturn | null>(null);
  const handled = useRef<string | null>(null);
  const query = search.toString();

  useEffect(() => {
    if (handled.current === query) return;
    handled.current = query;
    const params = new URLSearchParams(query);
    const target = params.get("importar");
    const ret = readConnectorReturn(params);
    if (target !== "conta" && target !== "link" && !ret) return;
    setTab(target === "link" ? "link" : "conta");
    setReturned(ret);
    setOpen(true);
    URL_PARAMS.forEach((k) => params.delete(k));
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [query, router, pathname]);

  const openOn = (next: ImportTab) => {
    setTab(next);
    setReturned(null);
    setOpen(true);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ws-radius-lg)] border border-dashed border-ws-border bg-ws-surface-1 px-[var(--ws-space-3)] py-2" data-testid="import-from">
      <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("connectors.import.teaser")}</p>
      <Button size="sm" icon="acervo" onClick={() => openOn("conta")} data-testid="import-open" aria-haspopup="dialog">{t("connectors.import.open")}</Button>
      <Dialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setReturned(null); }}
        title={t("connectors.import.title")}
        description={t("connectors.import.description")}
        className="w-[min(96vw,44rem)]"
      >
        {open ? (
          <Suspense fallback={<LoadingState />}>
            <ImportPanel initialTab={tab} returned={returned} hasDraft={hasDraft} onDone={() => setOpen(false)} />
          </Suspense>
        ) : null}
      </Dialog>
    </div>
  );
}

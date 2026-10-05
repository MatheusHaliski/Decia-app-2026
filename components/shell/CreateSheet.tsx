"use client";
import { Badge, Glyph, Link, Sheet } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { createOptions } from "@/lib/nav/matrix";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/** Folha "+ Criar" (ABAS_POR_PERFIL §2.6): Criar Tarefa · Criar Projeto · Plano Anual/Trilha · Nova sessão DECIA (+ Nova chancela para EMPRESA/CHEFE). */
export function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const options = createOptions(profile);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title={t("create.title")} description={t("create.description")}>
      <ul className="grid gap-1 sm:grid-cols-2" data-testid="create-sheet">
        {options.map((o) => (
          <li key={o.id}>
            <Link href={o.href} variant="card" onClick={() => onOpenChange(false)} className="flex items-center gap-3 border border-ws-border p-3 hover:border-ws-accent">
              <Glyph name={o.glyph} variant="clay" size={40} decorative />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t(o.labelKey)}</span>
                <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(o.hintKey)}</span>
              </span>
              <Badge>{o.rf}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

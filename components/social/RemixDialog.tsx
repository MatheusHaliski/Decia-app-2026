"use client";
/**
 * Remixar (RF26.CA06): mostra o original, o crédito (autor do original e "via" quando é remix de remix) e o que será
 * copiado × o que fica para trás; confirmar cria a cópia no Acervo de quem remixou (RASCUNHO, PRIVADA) com
 * `originalTaskId`/`originalProjectId`. Depois oferece "Ver no meu Acervo" e "Abrir a cópia".
 */
import { useState } from "react";
import { Button, Dialog, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { REMIX_COPIES, REMIX_LEAVES, remix } from "@/lib/social/rules";
import type { CardViewModel } from "@/lib/social/view-model";
import { useSocial } from "./context";
import { ACTION_SYMBOL } from "./meta";
import { PersonLink } from "./Primitives";

export function RemixDialog({ open, onOpenChange, vm }: { open: boolean; onOpenChange: (o: boolean) => void; vm: CardViewModel }) {
  const { t } = useI18n();
  const { run } = useSocial();
  const [result, setResult] = useState<string | null>(null);
  const copies = REMIX_COPIES[vm.kind];
  const confirm = () => {
    const r = run((s, v, now) => remix(s, v, vm.ref, now), "social.toast.remixed");
    if (r.ok) setResult(r.resultId);
  };
  const resultHref = result ? (vm.kind === "TASK" ? `/tasks/${result}` : `/projects/${result}`) : "";
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setResult(null); }} title={<><span aria-hidden>{ACTION_SYMBOL.remix} </span>{t("social.remix.title")}</>} description={t("social.remix.description")} className="w-[min(92vw,36rem)]">
      {result ? (
        <div className="grid gap-3" data-testid="remix-done" role="status">
          <p className="text-[length:var(--ws-text-body)] font-semibold">{t("social.remix.done", { title: vm.title })}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.remix.doneHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" href={vm.kind === "TASK" ? "/profile?tab=acervo" : "/profile?tab=projetos"} data-testid="remix-go-acervo">{t("social.remix.goAcervo")}</Button>
            <Button href={resultHref}>{t("social.remix.openCopy")}</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3" aria-label={t("social.remix.original")}>
            <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t("social.remix.original")}</p>
            <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold [overflow-wrap:anywhere]">{vm.title}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--ws-text-body-sm)]">
              <span className="text-ws-text-muted">{t("social.remix.creditTo")}</span>
              <PersonLink person={vm.credit?.originalAuthor ?? vm.author} />
              {vm.credit ? <span className="text-ws-text-muted">· {t("social.remix.via", { name: vm.author.name })}</span> : null}
            </p>
            {vm.credit ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="remix-chain">{t("social.remix.chainNote", { title: vm.credit.originalTitle })}</p> : null}
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <section aria-labelledby="remix-copies">
              <h3 id="remix-copies" className="mb-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("social.remix.copies")}</h3>
              <ul className="flex flex-wrap gap-1" data-testid="remix-copies">{copies.map((k) => <li key={k}><Tag tone="success"><span aria-hidden>✓</span>{t(`social.remix.field.${k}`)}</Tag></li>)}</ul>
            </section>
            <section aria-labelledby="remix-leaves">
              <h3 id="remix-leaves" className="mb-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("social.remix.leaves")}</h3>
              <ul className="flex flex-wrap gap-1">{REMIX_LEAVES.map((k) => <li key={k}><Tag tone="neutral"><span aria-hidden>—</span>{t(`social.remix.field.${k}`)}</Tag></li>)}</ul>
            </section>
          </div>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.remix.result")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onOpenChange(false)}>{t("social.common.cancel")}</Button>
            <Button variant="primary" onClick={confirm} data-testid="remix-confirm">{t("social.remix.confirm")}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

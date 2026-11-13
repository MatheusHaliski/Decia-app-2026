"use client";
import { useEffect, useRef } from "react";
import { Button, Card, ErrorState, Link, Tag } from "@/components/ui";
import type { MemoryDocument } from "@/lib/memory/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { accessKey, kindKey, originKey } from "./labels";

/**
 * Leitor da Memória (`/memory?doc=<id>&trecho=<início>-<fim>`): o documento inteiro com o trecho citado destacado e rolado à
 * vista — é a "página própria" dos documentos de exemplo e ingeridos. Documento fora do acesso aparece como não encontrado.
 */
export function MemoryReader({ doc, span, onClose }: { doc: MemoryDocument | null; span: { start: number; end: number } | null; onClose: () => void }) {
  const { t } = useI18n();
  const markRef = useRef<HTMLElement>(null);
  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "center" });
  }, [doc?.id, span?.start, span?.end]);
  if (!doc) {
    return <ErrorState title={t("memory.reader.notFound")} code="404 NAO_ENCONTRADO" action={<Button size="sm" onClick={onClose}>{t("memory.reader.close")}</Button>} />;
  }
  const body = doc.body;
  return (
    <Card as="section" aria-labelledby="memory-reader-title" className="grid gap-3" data-testid="memory-reader">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t("memory.reader.title")}</p>
          <h2 id="memory-reader-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold [overflow-wrap:anywhere]">{doc.title}</h2>
        </div>
        <Button size="sm" onClick={onClose}>{t("memory.reader.close")}</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag>{t(kindKey(doc.kind))}</Tag>
        <Tag>{doc.department ?? t("memory.noDepartment")}</Tag>
        <Tag>{doc.year ?? t("memory.noYear")}</Tag>
        <Tag>{t(accessKey(doc.accessClass))}</Tag>
        <Tag tone={doc.origin === "EXEMPLO" ? "neutral" : doc.origin === "DECIA" ? "accent" : "yellow"}>{t(originKey(doc.origin))}</Tag>
        {doc.origin === "DECIA" && doc.href ? <Link href={doc.href}>{t("memory.hit.openSource")}</Link> : null}
      </div>
      {span ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.reader.cited")}</p> : null}
      <div className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)] leading-relaxed [overflow-wrap:anywhere]" data-testid="memory-reader-body">
        {span ? (
          <>
            {body.slice(0, span.start)}
            <mark ref={markRef} className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft text-ws-text underline decoration-ws-warning decoration-2 underline-offset-2" data-testid="memory-reader-mark">
              {body.slice(span.start, span.end)}
            </mark>
            {body.slice(span.end)}
          </>
        ) : (
          body
        )}
      </div>
    </Card>
  );
}

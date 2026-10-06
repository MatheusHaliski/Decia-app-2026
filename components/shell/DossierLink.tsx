"use client";
// Navegação RF47 ↔ RF48 que preserva o dossiê (RF47.CA14, RF48.CA19): o escopo viaja em `?dossie=<id>`. Sem dossiê
// válido, "Testar esta contratação" não tem contratação a testar — vira texto desativado com a explicação (Codex, PR #42).
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/** Identificador aceito na URL: curto e sem caracteres de caminho ou de consulta. */
const DOSSIER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function dossierFrom(search: URLSearchParams | null): string | null {
  const id = search?.get("dossie") ?? null;
  return id && DOSSIER_ID.test(id) ? id : null;
}

export function dossierHref(to: "/agents" | "/find", dossier: string | null): string {
  return dossier ? `${to}?dossie=${encodeURIComponent(dossier)}` : to;
}

interface DossierLinkProps {
  to: "/agents" | "/find";
  labelKey: string;
  testId: string;
  /** sem dossiê na URL, o link vira texto desativado com esta explicação */
  requiresDossierHintKey?: string;
}

function DossierLinkInner({ to, labelKey, testId, requiresDossierHintKey }: DossierLinkProps) {
  const { t } = useI18n();
  const dossier = dossierFrom(useSearchParams());
  if (!dossier && requiresDossierHintKey) {
    return (
      <span data-testid={testId} aria-disabled="true" className="text-ws-text-muted" title={t(requiresDossierHintKey)}>
        {t(labelKey)} <span className="text-[length:var(--ws-text-caption)]">— {t(requiresDossierHintKey)}</span>
      </span>
    );
  }
  return <Link href={dossierHref(to, dossier)} data-testid={testId}>{t(labelKey)}</Link>;
}

export function DossierLink(props: DossierLinkProps) {
  // useSearchParams exige Suspense nas páginas pré-renderizadas
  return (
    <Suspense fallback={null}>
      <DossierLinkInner {...props} />
    </Suspense>
  );
}

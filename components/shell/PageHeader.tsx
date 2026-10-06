"use client";
import type { ReactNode } from "react";
import { Badge, Glyph, RfChip, cn, type GlyphName } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/** Cabeçalho padrão das páginas: glifo clay, título (h1), descrição, chips de RF e ações à direita. */
export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  glyph?: GlyphName;
  rfs?: readonly string[];
  actions?: ReactNode;
  /** marca "(proposta)" do ABAS_POR_PERFIL */
  proposal?: boolean;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, glyph, rfs = [], actions, proposal, eyebrow, className }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className={cn("mb-[var(--ws-space-5)] flex flex-wrap items-start gap-[var(--ws-space-4)]", className)}>
      {glyph ? <Glyph name={glyph} variant="clay" size={48} decorative className="mt-0.5 hidden sm:block" /> : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h1)] font-semibold leading-[var(--ws-text-h1--lh)] tracking-[var(--ws-text-display--tracking)]">{title}</h1>
          {rfs.map((rf, i) => <RfChip key={rf} id={rf} primary={i === 0} />)}
          {proposal ? <Badge tone="spark" title={t("common.proposalHint")}>{t("common.proposal")}</Badge> : null}
        </div>
        {description ? <p className="mt-1 max-w-prose text-[length:var(--ws-text-body)] text-ws-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

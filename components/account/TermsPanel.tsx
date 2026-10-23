"use client";
import { Card, Link } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";

/** Configurações › Termos: versões aceitas no cadastro e os textos vigentes da Velion (dona da Orange Social). */
export function TermsPanel() {
  const { t } = useI18n();
  const { me } = useCurrentUser();
  return (
    <Card title={t("account.terms.title")} eyebrow="RF1 · D-143" data-testid="terms-panel">
      <div className="grid gap-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]">
        <p>{t("account.terms.intro")}</p>
        <ul className="grid gap-1">
          <li><Link href="/termos">{t("legal.terms")}</Link> — {t("account.terms.accepted", { version: me?.termsVersion ?? "—" })}</li>
          <li><Link href="/privacidade">{t("legal.privacy")}</Link> — {t("account.terms.accepted", { version: me?.privacyVersion ?? "—" })}</li>
        </ul>
        <p className="text-ws-text-muted">{t("account.terms.rights")}</p>
      </div>
    </Card>
  );
}

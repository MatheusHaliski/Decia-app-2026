"use client";
/** Especialidades da pessoa (RF3) como etiquetas; nada quando não há (sem texto de exemplo). */
import { Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

export function SpecialtyTags({ items, testId = "profile-specialties" }: { items: readonly string[] | null | undefined; testId?: string }) {
  const { t } = useI18n();
  if (!items?.length) return null;
  return (
    <ul aria-label={t("account.publication.specialties")} className="flex flex-wrap gap-1.5" data-testid={testId}>
      {items.map((s) => <li key={s}><Tag>{s}</Tag></li>)}
    </ul>
  );
}

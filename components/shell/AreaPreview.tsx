"use client";
import { Badge, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Sub-aba-esqueleto que descreve uma área já desenhada no card (ex.: ferramentas A · B · C · lista de termos do RF47) sem
 * dados: título, descrição e as partes da área como chips. O conteúdo funcional chega com o RF; até lá nada é clicável.
 */
export function AreaPreview({ titleKey, descriptionKey, itemKeys, testId }: { titleKey: string; descriptionKey: string; itemKeys: readonly string[]; testId?: string }) {
  const { t } = useI18n();
  return (
    <div data-testid={testId}>
      <EmptyState
        title={t(titleKey)}
        description={t(descriptionKey)}
        action={(
          <ul className="flex flex-wrap justify-center gap-2" aria-label={t(titleKey)}>
            {itemKeys.map((k) => <li key={k}><Badge tone="neutral" className="normal-case tracking-normal">{t(k)}</Badge></li>)}
          </ul>
        )}
      />
    </div>
  );
}

/** Opção A do RF47 (RF47.CA11). */
export const FIND_AREA_ITEMS = ["find.area.encontrar.contexto", "find.area.encontrar.agrupar", "find.area.encontrar.filtros", "find.area.encontrar.acoes"] as const;
/** Opção B do RF47 (leitor com mapa, RF47.CA14 / RF48.CA16). */
export const READ_AREA_ITEMS = ["find.area.ler.destaques", "find.area.ler.mapa"] as const;
/** Opção C do RF47 (RF47.CA12), reaproveitada no "Extrair do dossiê" do RF48 (RF48.CA14). */
export const EXTRACT_AREA_ITEMS = ["find.area.extrair.termos", "find.area.extrair.valores", "find.area.extrair.datas", "find.area.extrair.artigos", "find.area.extrair.orgaos"] as const;
/** Lista de termos (RF47.CA05), aplicada pelo agente Contratual no RF48 (RF48.CA15). */
export const LIST_AREA_ITEMS = ["find.area.lista.presentes", "find.area.lista.ausentes", "find.area.lista.onde"] as const;

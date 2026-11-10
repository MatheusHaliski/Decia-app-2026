"use client";
import { useMemo } from "react";
import { hasMessage } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/useI18n";

const SIZE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;

/**
 * Rótulos dos valores que vêm da API ou do catálogo (sourceKind, taskType, provedor, estado) e formatação de data e tamanho no
 * idioma da pessoa. Valor que o catálogo de textos ainda não conhece (enum novo no backend) aparece cru, nunca como chave.
 */
export function useConnectorLabels() {
  const { t, intl } = useI18n();
  return useMemo(() => {
    const or = (key: string, raw: string) => (hasMessage("pt-BR", key) ? t(key) : raw);
    const dates = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" });
    return {
      t,
      kind: (k: string) => or(`sourceKind.${k}`, k),
      type: (v: string) => or(`social.taskType.${v}`, v),
      provider: (p: string) => or(`connectors.provider.${p}`, p),
      status: (s: string) => or(`connectors.status.${s}`, s),
      when: (iso?: string | null) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? "—" : dates.format(d);
      },
      size: (bytes?: number | null): string | null => {
        if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
        let v = bytes;
        let i = 0;
        while (v >= 1024 && i < SIZE_UNITS.length - 1) {
          v /= 1024;
          i += 1;
        }
        return new Intl.NumberFormat(intl, { style: "unit", unit: SIZE_UNITS[i], unitDisplay: "short", maximumFractionDigits: i > 0 && v < 10 ? 1 : 0 }).format(v);
      },
    };
  }, [t, intl]);
}

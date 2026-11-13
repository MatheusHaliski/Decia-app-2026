"use client";
import { Button, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { HEAT_DIMENSIONS, HEAT_RUBRIC_VERSION, HEAT_THRESHOLDS, SEVERITY_WEIGHT, type BlockScore } from "@/lib/letters/score";
import { HEAT_CELL } from "./shared";

/**
 * Placar por bloco (mapa de calor, RF54.CA05): contagem ponderada de achados por 100 palavras em quatro dimensões.
 * O nível tem nome em texto (nunca só cor) e a rubrica fica declarada: heurística, não nota calibrada.
 */
export function HeatMap({ scores, blockLabel, onGoTo }: { scores: readonly BlockScore[]; blockLabel: (blockId: string) => string; onGoTo: (blockId: string) => void }) {
  const { t } = useI18n();
  const rows = scores.filter((s) => s.words > 0);
  const cell = (level: 0 | 1 | 2 | 3 | 4, count: number) => (
    <span className={cn("inline-flex min-w-16 items-center justify-between gap-1 rounded-[var(--ws-radius-sm)] px-1.5 py-0.5", HEAT_CELL[level])}>
      <span>{t(`letters.heat.level.${level}`)}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
        <table className="w-full text-left text-[length:var(--ws-text-caption)]">
          <caption className="sr-only">{t("letters.heat.caption")}</caption>
          <thead className="bg-ws-surface-2">
            <tr>
              <th scope="col" className="px-2 py-1">{t("letters.heat.block")}</th>
              {HEAT_DIMENSIONS.map((d) => <th key={d} scope="col" className="px-2 py-1">{t(`letters.heat.dim.${d}`)}</th>)}
              <th scope="col" className="px-2 py-1">{t("letters.heat.total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.blockId} className="border-t border-ws-border">
                <th scope="row" className="px-1 py-1 font-normal">
                  <Button size="sm" variant="ghost" onClick={() => onGoTo(s.blockId)}>{blockLabel(s.blockId)}</Button>
                </th>
                {HEAT_DIMENSIONS.map((d) => <td key={d} className="px-2 py-1">{cell(s.dims[d].level, s.dims[d].count)}</td>)}
                <td className="px-2 py-1">{cell(s.level, s.findings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t("letters.heat.rubric", { erro: SEVERITY_WEIGHT.ERRO, aviso: SEVERITY_WEIGHT.AVISO, sugestao: SEVERITY_WEIGHT.SUGESTAO, t1: HEAT_THRESHOLDS[0], t2: HEAT_THRESHOLDS[1], t3: HEAT_THRESHOLDS[2], version: HEAT_RUBRIC_VERSION })}
      </p>
    </div>
  );
}

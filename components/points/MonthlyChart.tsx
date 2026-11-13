"use client";
/**
 * Gráfico mensal do DECIA Points (RF42.CA03): colunas divergentes — ganhos acima da linha de base, gastos abaixo, numa só escala
 * de DP — com a tabela equivalente logo abaixo (os mesmos números, para leitor de tela e impressão). Cores só por token (azul =
 * ganhos, laranja = gastos; o par passa no validador de daltonismo nos temas claro e escuro com 85 % de opacidade), legenda sempre
 * presente, rótulo só no mês atual e dica nativa por mês.
 */
import { useI18n } from "@/lib/i18n/useI18n";
import type { MonthPoint } from "@/lib/points/statement";
import { formatMonth, formatNumber } from "./shared";

const W = 560;
const H = 220;
const P = { l: 40, r: 12, t: 22, b: 28 };
const BAR = 18;

/** Teto "redondo" para o eixo (1, 2, 2,5, 5 × 10ⁿ). */
export function niceCeil(v: number): number {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

/** Coluna com cantos arredondados só na ponta dos dados (quadrada na linha de base). */
function columnPath(x: number, base: number, end: number, w: number): string {
  const h = Math.abs(end - base);
  if (h < 0.5) return "";
  const r = Math.min(4, h, w / 2);
  if (end < base) {
    return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`;
  }
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

export function MonthlyChart({ series }: { series: readonly MonthPoint[] }) {
  const { t, intl } = useI18n();
  const top = niceCeil(Math.max(0, ...series.map((m) => m.earned)));
  const bottom = niceCeil(Math.max(0, ...series.map((m) => m.spent)));
  const span = Math.max(1, top + bottom);
  const plotH = H - P.t - P.b;
  const y = (v: number) => P.t + ((top - v) / span) * plotH;
  const base = y(0);
  const band = (W - P.l - P.r) / Math.max(1, series.length);
  const xOf = (i: number) => P.l + i * band + band / 2;
  const last = series.length - 1;
  const totalEarned = series.reduce((s, m) => s + m.earned, 0);
  const totalSpent = series.reduce((s, m) => s + m.spent, 0);

  return (
    <figure className="grid gap-2" data-testid="points-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t("points.chart.aria", { months: series.length, earned: totalEarned, spent: totalSpent })}>
        {[top, -bottom].filter((v) => v !== 0).map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-ws-border" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ws-text-muted text-[10px] tabular-nums">{formatNumber(v, intl)}</text>
          </g>
        ))}
        <text x={P.l - 6} y={base + 4} textAnchor="end" className="fill-ws-text-muted text-[10px] tabular-nums">0</text>
        {series.map((m, i) => {
          const cx = xOf(i);
          const earnedPath = columnPath(cx - BAR - 1, base, y(m.earned), BAR);
          const spentPath = columnPath(cx + 1, base, y(-m.spent), BAR);
          const label = t("points.chart.month", { month: formatMonth(m.month, intl), earned: m.earned, spent: m.spent });
          return (
            <g key={m.month} className="group">
              <title>{label}</title>
              <rect x={cx - band / 2} y={P.t} width={band} height={plotH} className="fill-ws-surface-2 opacity-0 group-hover:opacity-60" />
              {earnedPath ? <path d={earnedPath} className="fill-ws-node-blue opacity-85" /> : null}
              {spentPath ? <path d={spentPath} className="fill-ws-accent opacity-85" /> : null}
              {i === last && m.earned > 0 ? <text x={cx - BAR / 2 - 1} y={y(m.earned) - 5} textAnchor="middle" className="fill-ws-text text-[10px] font-semibold tabular-nums">{formatNumber(m.earned, intl)}</text> : null}
              {i === last && m.spent > 0 ? <text x={cx + BAR / 2 + 1} y={y(-m.spent) + 12} textAnchor="middle" className="fill-ws-text text-[10px] font-semibold tabular-nums">{formatNumber(m.spent, intl)}</text> : null}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-ws-text-muted text-[10px]">{formatMonth(m.month, intl)}</text>
            </g>
          );
        })}
        <line x1={P.l} x2={W - P.r} y1={base} y2={base} className="stroke-ws-text-faint" strokeWidth={1} />
      </svg>
      <figcaption className="flex flex-wrap gap-4 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-[2px] bg-ws-node-blue opacity-85" />{t("points.chart.earned")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-[2px] bg-ws-accent opacity-85" />{t("points.chart.spent")}</span>
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="points-chart-table">
          <caption className="sr-only">{t("points.chart.tableCaption")}</caption>
          <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className="py-1 pr-3 font-semibold">{t("points.chart.colMonth")}</th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">{t("points.chart.earned")}</th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">{t("points.chart.spent")}</th>
              <th scope="col" className="py-1 text-right font-semibold">{t("points.chart.net")}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((m) => (
              <tr key={m.month} className="border-t border-ws-border">
                <th scope="row" className="py-1 pr-3 font-normal">{formatMonth(m.month, intl)}</th>
                <td className="py-1 pr-3 text-right tabular-nums">{formatNumber(m.earned, intl)}</td>
                <td className="py-1 pr-3 text-right tabular-nums">{formatNumber(m.spent, intl)}</td>
                <td className="py-1 text-right tabular-nums">{new Intl.NumberFormat(intl, { signDisplay: "exceptZero" }).format(m.earned - m.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

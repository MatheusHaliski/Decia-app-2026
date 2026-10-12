package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Brier e calibração das previsões (§6.9; PRODUCT HYPOTHESIS, Q-156). Brier = média de {@code (p − o)²} só sobre OCORREU/NAO_OCORREU,
 * arredondado a 4 casas como o {@code round(v, 4)} do oráculo (meio-para-par sobre o valor binário exato). Nunca é "nota do usuário": só aparece
 * em "Calibração das minhas previsões" com n ≥ {@link #MIN_FORECASTS_TO_SHOW}. Buckets: 5–15, 20–35, 40–60, 65–80, 85–95.
 */
public final class Calibration {

    public static final int MIN_FORECASTS_TO_SHOW = 10;
    private static final int[][] BUCKETS = {{5, 15}, {20, 35}, {40, 60}, {65, 80}, {85, 95}};

    private Calibration() {
    }

    /** Previsão para o cálculo. */
    public record Forecast(int probabilityPct, ForecastResolution resolution) {
    }

    /** {@code brier} nulo quando não há previsão resolvida. */
    public record BrierResult(int n, Double brier) {
        /** Só exibível com n ≥ 10. */
        public boolean showable() {
            return n >= MIN_FORECASTS_TO_SHOW;
        }
    }

    /** Bucket de calibração: média declarada × frequência observada. */
    public record Bucket(int fromPct, int toPct, int n, Double meanDeclared, Double observedFrequency) {
    }

    public static BrierResult brier(List<Forecast> forecasts) {
        int n = 0;
        double sum = 0;
        for (Forecast f : forecasts) {
            if (resolved(f)) {
                double o = f.resolution() == ForecastResolution.OCORREU ? 1 : 0;
                double diff = f.probabilityPct() / 100.0 - o;
                sum += diff * diff;
                n++;
            }
        }
        if (n == 0) {
            return new BrierResult(0, null);
        }
        return new BrierResult(n, new BigDecimal(sum / n).setScale(4, RoundingMode.HALF_EVEN).doubleValue());
    }

    public static List<Bucket> buckets(List<Forecast> forecasts) {
        List<Bucket> out = new ArrayList<>();
        for (int[] b : BUCKETS) {
            int n = 0;
            double declared = 0;
            double occurred = 0;
            for (Forecast f : forecasts) {
                if (resolved(f) && f.probabilityPct() >= b[0] && f.probabilityPct() <= b[1]) {
                    n++;
                    declared += f.probabilityPct() / 100.0;
                    occurred += f.resolution() == ForecastResolution.OCORREU ? 1 : 0;
                }
            }
            out.add(new Bucket(b[0], b[1], n, n == 0 ? null : declared / n, n == 0 ? null : occurred / n));
        }
        return out;
    }

    private static boolean resolved(Forecast f) {
        return f.resolution() == ForecastResolution.OCORREU || f.resolution() == ForecastResolution.NAO_OCORREU;
    }
}

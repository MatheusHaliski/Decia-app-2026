package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Divergência entre avaliadores (§6.2): para cada (alternativa, critério) com ≥ 2 avaliadores, {@code amplitude = max − min};
 * ≥ 3 ALTA, = 2 MODERADA, ≤ 1 BAIXA (limiares DESIGN PROPOSAL). Divergência alta é sinal, não ruído (G6). Considera todas as alternativas,
 * inclusive DESCARTADAS, como o oráculo.
 */
public final class DivergenceAnalysis {

    private DivergenceAnalysis() {
    }

    public enum Level { BAIXA, MODERADA, ALTA }

    /** Célula com ≥ 2 avaliadores. */
    public record Cell(String alt, String crit, int range, Level level) {
    }

    public static List<Cell> analyze(MatrixInput in) {
        List<Cell> out = new ArrayList<>();
        for (MatrixInput.Alternative a : in.alternatives()) {
            for (String c : in.criterionKeys()) {
                List<Integer> vals = WeightedScoring.scores(in, a.key(), c);
                if (vals.size() >= 2) {
                    int amp = Collections.max(vals) - Collections.min(vals);
                    out.add(new Cell(a.key(), c, amp, level(amp)));
                }
            }
        }
        return out;
    }

    public static Level level(int range) {
        if (range >= 3) {
            return Level.ALTA;
        }
        return range == 2 ? Level.MODERADA : Level.BAIXA;
    }

    /** Verdadeiro quando há ao menos uma célula com divergência ALTA (alimenta o guarda §6.10 e a saúde §6.8). */
    public static boolean hasHigh(MatrixInput in) {
        return analyze(in).stream().anyMatch(c -> c.level() == Level.ALTA);
    }
}

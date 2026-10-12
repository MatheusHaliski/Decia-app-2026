package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sensibilidade dos pesos (§6.4), algoritmo exato do oráculo: só com pesos válidos e líder definido. Para cada critério {@code c} (peso &lt; 100)
 * e cada desafiante {@code X}, procura o menor deslocamento inteiro {@code d = 1..100}, tentando {@code w − d} antes de {@code w + d} (dentro
 * de [0, 100]), com os demais pesos redistribuídos proporcionalmente ({@code v·(100 − w')/(100 − w)}) até {@code X} virar líder. Saída
 * ordenada por {@code delta}, posição do critério e novo líder; {@code delta ≤ 10} → sensível; nenhuma inversão → robusta.
 */
public final class SensitivityAnalysis {

    static final int SENSITIVE_PP = 10;

    private SensitivityAnalysis() {
    }

    /** Inversão: "se {@code criterion} for de {@code fromPct} % para {@code toPct} %, {@code newLeader} passa a liderar". */
    public record Flip(String criterion, double fromPct, double toPct, double delta, String newLeader) {
    }

    /**
     * Resultado.
     *
     * @param applicable falso sem pesos, com matriz inválida ou em empate técnico
     * @param flips      inversões ordenadas pela menor mudança
     * @param robust     nenhuma inversão possível (nulo quando não aplicável)
     * @param sensitive  alguma inversão com mudança ≤ 10 pp (nulo quando não aplicável)
     */
    public record Result(boolean applicable, List<Flip> flips, Boolean robust, Boolean sensitive) {
        public Result {
            flips = List.copyOf(flips);
        }
    }

    public static Result analyze(MatrixInput in) {
        WeightedScoring.Result base = WeightedScoring.score(in);
        if (!in.weightingEnabled() || !base.valid() || base.leader() == null) {
            return new Result(false, List.of(), null, null);
        }
        String leader = base.leader();
        Map<String, Double> weights = new LinkedHashMap<>();
        for (MatrixInput.Criterion c : in.criteria()) {
            weights.put(c.key(), c.weightPct());
        }
        List<String> challengers = base.ranking().stream().map(WeightedScoring.Ranked::alt).filter(a -> !a.equals(leader)).toList();
        List<Positioned> found = new ArrayList<>();
        List<String> keys = in.criterionKeys();
        for (int pos = 0; pos < keys.size(); pos++) {
            String c = keys.get(pos);
            double wc = weights.get(c);
            if (wc >= 100) {
                continue;
            }
            for (String x : challengers) {
                Double to = search(in, weights, c, wc, x);
                if (to != null) {
                    found.add(new Positioned(new Flip(c, wc, to, Math.abs(to - wc), x), pos));
                }
            }
        }
        found.sort(Comparator.comparingDouble((Positioned p) -> p.flip().delta()).thenComparingInt(Positioned::pos)
                .thenComparing(p -> p.flip().newLeader()));
        List<Flip> flips = found.stream().map(Positioned::flip).toList();
        boolean sensitive = flips.stream().anyMatch(f -> f.delta() <= SENSITIVE_PP);
        return new Result(true, flips, flips.isEmpty(), sensitive);
    }

    private record Positioned(Flip flip, int pos) {
    }

    private static Double search(MatrixInput in, Map<String, Double> weights, String c, double wc, String challenger) {
        for (int d = 1; d <= 100; d++) {
            for (double cand : new double[] {wc - d, wc + d}) {
                if (cand < 0 || cand > 100) {   // d ≥ 1: o próprio peso atual nunca é candidato
                    continue;
                }
                Map<String, Double> nw = new LinkedHashMap<>();
                for (Map.Entry<String, Double> e : weights.entrySet()) {
                    nw.put(e.getKey(), e.getKey().equals(c) ? cand : e.getValue() * (100 - cand) / (100 - wc));
                }
                if (challenger.equals(WeightedScoring.score(in, nw).leader())) {
                    return cand;
                }
            }
        }
        return null;
    }
}

package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Dominância de Pareto (§6.3) sobre as notas de consenso das alternativas ativas e completas: A domina B se {@code nota(A,c) ≥ nota(B,c)} em
 * todos os critérios e {@code >} em pelo menos um. A dominada não é removida — recebe a etiqueta "dominada por A".
 */
public final class DominanceAnalysis {

    private DominanceAnalysis() {
    }

    /**
     * Par dominante → dominada.
     *
     * @param betterOn critérios em que a dominante é estritamente melhor (nenhum critério em que a dominada é melhor, por definição)
     */
    public record Dominance(String dominant, String dominated, List<String> betterOn) {
        public Dominance {
            betterOn = List.copyOf(betterOn);
        }
    }

    public static List<Dominance> analyze(MatrixInput in) {
        List<String> crits = in.criterionKeys();
        Map<String, Map<String, Double>> cons = WeightedScoring.consensus(in, in.activeAlternativeKeys());
        List<String> full = cons.entrySet().stream().filter(e -> e.getValue().size() == crits.size()).map(Map.Entry::getKey).toList();
        List<Dominance> out = new ArrayList<>();
        for (String a : full) {
            for (String b : full) {
                if (a.equals(b)) {
                    continue;
                }
                boolean all = true;
                List<String> better = new ArrayList<>();
                for (String c : crits) {
                    double va = cons.get(a).get(c);
                    double vb = cons.get(b).get(c);
                    if (va < vb) {
                        all = false;
                    } else if (va > vb) {
                        better.add(c);
                    }
                }
                if (all && !better.isEmpty()) {
                    out.add(new Dominance(a, b, better));
                }
            }
        }
        return out;
    }
}

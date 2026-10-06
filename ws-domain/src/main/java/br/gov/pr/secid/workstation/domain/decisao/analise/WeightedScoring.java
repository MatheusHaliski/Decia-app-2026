package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pontuação ponderada transparente (03_MODELO_FUNCIONAL §6.1, modelo {@code decia-scoring-v1}). Consenso de cada célula = mediana das notas
 * (par → média dos dois centrais); pesos iguais sem {@code weightingEnabled}; com pesos, todos obrigatórios em [0, 100] e soma 100 ± 0,01,
 * senão matriz inválida sem ranking. {@code score = Σ nota × w / Σ w}, arredondado a 2 casas por {@link #r2}; contribuição por critério
 * sempre exposta. DESCARTADA fora; célula sem nota → alternativa incompleta (nunca imputar zero). Diferença &lt; 0,05 → empate técnico.
 * A aritmética em {@code double} segue a ordem das operações do oráculo {@code contracts/decia/gerar_vetores.py}, para reproduzir os vetores.
 */
public final class WeightedScoring {

    public static final String PESO_INVALIDO = "PESO_INVALIDO";
    public static final String PESOS_NAO_SOMAM_100 = "PESOS_NAO_SOMAM_100";
    static final double EPS = 1e-9;
    static final double TIE = 0.05;

    private WeightedScoring() {
    }

    /** Arredondamento meio-para-cima em 2 casas (§6.1): {@code floor(x·100 + 0,5 + 1e-9) / 100}. */
    public static double r2(double x) {
        return Math.floor(x * 100 + 0.5 + EPS) / 100;
    }

    /** Mediana; com número par de notas, média dos dois centrais. */
    public static double median(List<Integer> values) {
        if (values.isEmpty()) {
            throw new IllegalArgumentException("mediana de lista vazia");
        }
        int[] s = values.stream().mapToInt(Integer::intValue).sorted().toArray();
        int n = s.length;
        if (n % 2 == 1) {
            return s[n / 2];
        }
        return (s[n / 2 - 1] + s[n / 2]) / 2.0;
    }

    /** Notas de consenso {alternativa → {critério → mediana}} só para células com avaliação, nas alternativas pedidas. */
    public static Map<String, Map<String, Double>> consensus(MatrixInput in, List<String> alts) {
        Map<String, Map<String, Double>> out = new LinkedHashMap<>();
        for (String a : alts) {
            Map<String, Double> row = new LinkedHashMap<>();
            for (String c : in.criterionKeys()) {
                List<Integer> vals = scores(in, a, c);
                if (!vals.isEmpty()) {
                    row.put(c, median(vals));
                }
            }
            out.put(a, row);
        }
        return out;
    }

    static List<Integer> scores(MatrixInput in, String alt, String crit) {
        List<Integer> vals = new ArrayList<>();
        for (MatrixInput.Assessment x : in.assessments()) {
            if (x.alt().equals(alt) && x.crit().equals(crit)) {
                vals.add(x.score());
            }
        }
        return vals;
    }

    public static Result score(MatrixInput in) {
        return score(in, null);
    }

    /** Pontuação com pesos substitutos (usada pela sensibilidade, §6.4); {@code null} = pesos dos critérios. */
    static Result score(MatrixInput in, Map<String, Double> weightsOverride) {
        List<String> crits = in.criterionKeys();
        List<String> alts = in.activeAlternativeKeys();
        Map<String, Double> w = new LinkedHashMap<>();
        if (in.weightingEnabled()) {
            if (weightsOverride != null) {
                w.putAll(weightsOverride);
            } else {
                for (MatrixInput.Criterion c : in.criteria()) {
                    w.put(c.key(), c.weightPct());
                }
            }
            for (Double v : w.values()) {
                if (v == null || v < 0 || v > 100) {
                    return Result.invalid(PESO_INVALIDO, null);
                }
            }
            double total = 0;
            for (Double v : w.values()) {
                total += v;
            }
            if (Math.abs(total - 100) > 0.01) {
                return Result.invalid(PESOS_NAO_SOMAM_100, r2(total));
            }
        } else {
            for (String c : crits) {
                w.put(c, 1.0);
            }
        }
        Map<String, Map<String, Double>> cons = consensus(in, alts);
        double sw = 0;
        for (String c : crits) {
            sw += w.get(c);
        }
        List<Ranked> ranking = new ArrayList<>();
        List<String> incomplete = new ArrayList<>();
        for (String a : alts) {
            Map<String, Double> row = cons.get(a);
            if (row.size() < crits.size()) {
                incomplete.add(a);
                continue;
            }
            Map<String, Double> contrib = new LinkedHashMap<>();
            double sum = 0;
            for (String c : crits) {
                contrib.put(c, r2(row.get(c) * w.get(c) / sw));
                sum += row.get(c) * w.get(c);
            }
            ranking.add(new Ranked(a, r2(sum / sw), contrib));
        }
        ranking.sort(Comparator.comparingDouble((Ranked r) -> -r.score()).thenComparing(Ranked::alt));
        String leader = null;
        if (!ranking.isEmpty() && (ranking.size() == 1 || ranking.get(0).score() - ranking.get(1).score() >= TIE - EPS)) {
            leader = ranking.get(0).alt();
        }
        return new Result(true, null, in.weightingEnabled() ? 100.0 : null, ranking, incomplete, leader);
    }

    /** Alternativa ranqueada com a contribuição de cada critério (explicabilidade), na ordem dos critérios. */
    public record Ranked(String alt, double score, Map<String, Double> contributions) {
        public Ranked {
            contributions = Collections.unmodifiableMap(new LinkedHashMap<>(contributions));
        }
    }

    /**
     * Resultado da matriz.
     *
     * @param valid      falso quando os pesos são inválidos (sem ranking)
     * @param reason     {@link #PESO_INVALIDO} / {@link #PESOS_NAO_SOMAM_100}, ou nulo
     * @param weightSum  100 com pesos válidos; a soma (2 casas) quando não soma 100; nulo sem pesos ou com peso inválido
     * @param ranking    alternativas completas, da maior para a menor pontuação (empate pela chave)
     * @param incomplete alternativas ativas com célula sem avaliação
     * @param leader     líder, ou nulo em empate técnico / sem ranking
     */
    public record Result(boolean valid, String reason, Double weightSum, List<Ranked> ranking, List<String> incomplete, String leader) {
        public Result {
            ranking = List.copyOf(ranking);
            incomplete = List.copyOf(incomplete);
        }

        static Result invalid(String reason, Double weightSum) {
            return new Result(false, reason, weightSum, List.of(), List.of(), null);
        }

        /** Empate técnico: ranking com ≥ 2 alternativas e sem líder (diferença &lt; 0,05). */
        public boolean technicalTie() {
            return valid && ranking.size() >= 2 && leader == null;
        }
    }
}

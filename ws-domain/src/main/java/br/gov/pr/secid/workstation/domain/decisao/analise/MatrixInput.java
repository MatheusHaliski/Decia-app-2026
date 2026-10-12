package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.List;
import java.util.Objects;

/**
 * Entrada da matriz de decisão para os cálculos do §6 (pontuação, divergência, dominância, sensibilidade), no mesmo formato dos vetores de
 * {@code contracts/decia/vetores.json}: chaves textuais de critérios e alternativas, na ordem de exibição.
 *
 * @param weightingEnabled pesos habilitados ({@code Decision.weightingEnabled})
 * @param criteria         critérios na ordem de exibição
 * @param alternatives     alternativas (inclui DESCARTADAS, que ficam fora do ranking)
 * @param assessments      uma linha por (alternativa, critério, avaliador)
 */
public record MatrixInput(boolean weightingEnabled, List<Criterion> criteria, List<Alternative> alternatives, List<Assessment> assessments) {

    public MatrixInput {
        criteria = List.copyOf(criteria);
        alternatives = List.copyOf(alternatives);
        assessments = List.copyOf(assessments);
    }

    /** Critério com peso opcional (nulo quando a decisão não usa pesos ou o peso não foi informado). */
    public record Criterion(String key, Double weightPct) {
        public Criterion {
            Objects.requireNonNull(key, "key");
        }
    }

    /** Alternativa; {@code active = false} para DESCARTADA. */
    public record Alternative(String key, boolean active) {
        public Alternative {
            Objects.requireNonNull(key, "key");
        }
    }

    /** Nota 1–5 de um avaliador. */
    public record Assessment(String alt, String crit, int score, String by) {
    }

    List<String> criterionKeys() {
        return criteria.stream().map(Criterion::key).toList();
    }

    List<String> activeAlternativeKeys() {
        return alternatives.stream().filter(Alternative::active).map(Alternative::key).toList();
    }
}

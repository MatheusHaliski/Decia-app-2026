package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Severidade de risco pela matriz probabilidade × impacto (§6.6; matriz citada pelo board RF43, valores DESIGN PROPOSAL) e risco da decisão:
 * maior severidade entre os riscos ABERTOS da alternativa selecionada/líder e os riscos sem alternativa; premissa CRITICO INVALIDADA eleva para
 * no mínimo ALTO. Sem riscos → "não avaliado" ({@link Optional#empty()}), nunca BAIXO por omissão.
 */
public final class RiskSeverity {

    private static final DecisionLevel B = DecisionLevel.BAIXO;
    private static final DecisionLevel M = DecisionLevel.MEDIO;
    private static final DecisionLevel A = DecisionLevel.ALTO;
    private static final DecisionLevel C = DecisionLevel.CRITICO;
    /** Linhas na ordem de {@link Likelihood}; colunas na ordem de {@link DecisionLevel}. */
    private static final DecisionLevel[][] MATRIX = {
        {B, B, M, A},
        {B, M, A, A},
        {M, A, A, C},
        {M, A, C, C},
    };

    private RiskSeverity() {
    }

    public static DecisionLevel of(Likelihood likelihood, DecisionLevel impact) {
        return MATRIX[likelihood.ordinal()][impact.ordinal()];
    }

    /** Risco para o cálculo; {@code alt} nulo = risco da decisão como um todo. */
    public record Risk(Likelihood likelihood, DecisionLevel impact, RiskStatus status, String alt) {
    }

    /** Premissa para o cálculo (só importância e validação importam). */
    public record Assumption(DecisionLevel importance, AssumptionStatus status) {
    }

    /** Risco da decisão para a alternativa {@code alt}; vazio = "não avaliado". */
    public static Optional<DecisionLevel> decisionRisk(String alt, List<Risk> risks, List<Assumption> assumptions) {
        DecisionLevel worst = null;
        for (Risk r : risks) {
            if (r.status() == RiskStatus.ABERTO && (r.alt() == null || Objects.equals(r.alt(), alt))) {
                DecisionLevel s = of(r.likelihood(), r.impact());
                worst = worst == null ? s : DecisionLevel.max(worst, s);
            }
        }
        for (Assumption a : assumptions) {
            if (a.importance() == DecisionLevel.CRITICO && a.status() == AssumptionStatus.INVALIDADA) {
                worst = worst == null ? DecisionLevel.ALTO : DecisionLevel.max(worst, DecisionLevel.ALTO);
            }
        }
        return Optional.ofNullable(worst);
    }
}

package br.gov.pr.secid.workstation.domain.decisao.analise;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

/**
 * Saúde do registro (§6.8): cinco componentes, cada um OK (≥ 0,8 ou verdadeiro), ATENCAO (≥ 0,5) ou FALTA. Não existe nota geral — esta
 * classe deliberadamente não agrega (não é OVR; G9/G10). Razões com denominador zero: sem critérios → evidenceCoverage FALTA; sem premissa
 * crítica → assumptionValidation OK (nada a validar). Frescor não aplicável (decisão ainda aberta) → OK.
 */
public final class Health {

    static final double OK_AT = 0.8;
    static final double ATTENTION_AT = 0.5;
    private static final double EPS = 1e-9;

    private Health() {
    }

    public enum Component { EVIDENCE_COVERAGE, ASSUMPTION_VALIDATION, ALTERNATIVE_COVERAGE, STAKEHOLDER_ALIGNMENT, FRESHNESS }

    public enum Status { OK, ATENCAO, FALTA }

    /**
     * Fatos do registro.
     *
     * @param criteria                  critérios
     * @param criteriaWithEvidence      critérios com ≥ 1 evidência vigente ligada
     * @param criticalAssumptions       premissas CRITICO
     * @param criticalValidated         premissas CRITICO VALIDADA
     * @param activeAlternatives        alternativas ATIVAS
     * @param doNothingConsidered       "não agir" cadastrada (ativa ou descartada com motivo)
     * @param openHighDivergence        alguma divergência ALTA aberta (§6.2)
     * @param freshness                 frescor (§6.11); nulo quando não se aplica
     */
    public record Input(int criteria, int criteriaWithEvidence, int criticalAssumptions, int criticalValidated, int activeAlternatives,
                        boolean doNothingConsidered, boolean openHighDivergence, Freshness.Level freshness) {
    }

    public static Map<Component, Status> components(Input in) {
        Map<Component, Status> out = new EnumMap<>(Component.class);
        out.put(Component.EVIDENCE_COVERAGE, in.criteria() == 0 ? Status.FALTA : ratio((double) in.criteriaWithEvidence() / in.criteria()));
        out.put(Component.ASSUMPTION_VALIDATION, in.criticalAssumptions() == 0 ? Status.OK
                : ratio((double) in.criticalValidated() / in.criticalAssumptions()));
        out.put(Component.ALTERNATIVE_COVERAGE, flag(in.activeAlternatives() >= 2 && in.doNothingConsidered()));
        out.put(Component.STAKEHOLDER_ALIGNMENT, flag(!in.openHighDivergence()));
        out.put(Component.FRESHNESS, freshness(in.freshness()));
        return Collections.unmodifiableMap(out);
    }

    static Status ratio(double r) {
        if (r >= OK_AT - EPS) {
            return Status.OK;
        }
        return r >= ATTENTION_AT - EPS ? Status.ATENCAO : Status.FALTA;
    }

    private static Status flag(boolean ok) {
        return ok ? Status.OK : Status.FALTA;
    }

    private static Status freshness(Freshness.Level level) {
        if (level == null || level == Freshness.Level.FRESCA) {
            return Status.OK;
        }
        return level == Freshness.Level.REVISAO_DEVIDA ? Status.ATENCAO : Status.FALTA;
    }
}

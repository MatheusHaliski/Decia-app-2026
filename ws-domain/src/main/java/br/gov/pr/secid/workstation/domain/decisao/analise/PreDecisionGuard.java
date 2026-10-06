package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.decisao.AlternativeStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Guarda pré-decisão (§6.10) — prevenção de erro sem burocracia. Bloqueia ({@code DECISAO_INCOMPLETA}): sem alternativa selecionada, sem
 * responsável, motivo com menos de 10 caracteres, alternativa selecionada DESCARTADA. Avisa (exige confirmação explícita, que fica na trilha):
 * prontidão ≠ PRONTA_PARA_DECIDIR em PADRAO/PROFUNDA, risco CRÍTICO aberto, divergência alta aberta, premissa crítica NAO_VALIDADA, confiança
 * ALTA com evidência FRACA. RAPIDA nunca recebe avisos de evidência.
 */
public final class PreDecisionGuard {

    public static final String DECISAO_INCOMPLETA = "DECISAO_INCOMPLETA";
    public static final String AVISOS_NAO_CONFIRMADOS = "DECISAO_AVISOS_NAO_CONFIRMADOS";
    static final int MIN_RATIONALE_CHARS = 10;

    private PreDecisionGuard() {
    }

    /** Erros que bloqueiam. */
    public enum Block { SEM_ALTERNATIVA_SELECIONADA, SEM_RESPONSAVEL, MOTIVO_VAZIO, ALTERNATIVA_DESCARTADA }

    /** Avisos que exigem confirmação. */
    public enum Warning { PRONTIDAO_INCOMPLETA, RISCO_CRITICO_ABERTO, DIVERGENCIA_ALTA_ABERTA, PREMISSA_CRITICA_NAO_VALIDADA,
        CONFIANCA_ACIMA_DA_EVIDENCIA }

    /**
     * Fatos no momento de decidir.
     *
     * @param selectedAlternativeStatus estado da alternativa selecionada (nulo = nenhuma selecionada)
     * @param readiness                 prontidão (§6.7)
     * @param criticalRiskOpen          algum risco ABERTO com severidade CRITICO (§6.6)
     * @param highDivergenceOpen        alguma divergência ALTA aberta (§6.2)
     * @param criticalAssumptionUnvalidated alguma premissa CRITICO NAO_VALIDADA
     * @param confidencePct             confiança humana (nula = não informada)
     * @param evidence                  força da evidência da selecionada (§6.5)
     */
    public record Input(DecisionComplexity complexity, AlternativeStatus selectedAlternativeStatus, boolean hasOwner, String rationale,
                        Readiness.Level readiness, boolean criticalRiskOpen, boolean highDivergenceOpen, boolean criticalAssumptionUnvalidated,
                        Integer confidencePct, EvidenceStrength.Level evidence) {
        public Input {
            Objects.requireNonNull(complexity, "complexity");
        }
    }

    public record Result(List<Block> blocking, List<Warning> warnings) {
        public Result {
            blocking = List.copyOf(blocking);
            warnings = List.copyOf(warnings);
        }

        /** Pode decidir: nenhum bloqueio e, havendo avisos, confirmação explícita. */
        public boolean canDecide(boolean warningsConfirmed) {
            return blocking.isEmpty() && (warnings.isEmpty() || warningsConfirmed);
        }

        /** Lança {@code DECISAO_INCOMPLETA} (bloqueios) ou {@code DECISAO_AVISOS_NAO_CONFIRMADOS} (avisos sem confirmação). */
        public void enforce(boolean warningsConfirmed) {
            if (!blocking.isEmpty()) {
                throw new DomainRuleException(DECISAO_INCOMPLETA, "decisão incompleta", blocking.stream().map(Enum::name).toList());
            }
            if (!warnings.isEmpty() && !warningsConfirmed) {
                throw new DomainRuleException(AVISOS_NAO_CONFIRMADOS, "avisos exigem confirmação explícita", warnings.stream().map(Enum::name).toList());
            }
        }
    }

    public static Result check(Input in) {
        List<Block> blocking = new ArrayList<>();
        if (in.selectedAlternativeStatus() == null) {
            blocking.add(Block.SEM_ALTERNATIVA_SELECIONADA);
        } else if (in.selectedAlternativeStatus() == AlternativeStatus.DESCARTADA) {
            blocking.add(Block.ALTERNATIVA_DESCARTADA);
        }
        if (!in.hasOwner()) {
            blocking.add(Block.SEM_RESPONSAVEL);
        }
        if (in.rationale() == null || in.rationale().strip().length() < MIN_RATIONALE_CHARS) {
            blocking.add(Block.MOTIVO_VAZIO);
        }
        List<Warning> warnings = new ArrayList<>();
        boolean quick = in.complexity() == DecisionComplexity.RAPIDA;
        if (!quick && in.readiness() != Readiness.Level.PRONTA_PARA_DECIDIR) {
            warnings.add(Warning.PRONTIDAO_INCOMPLETA);
        }
        if (in.criticalRiskOpen()) {
            warnings.add(Warning.RISCO_CRITICO_ABERTO);
        }
        if (in.highDivergenceOpen()) {
            warnings.add(Warning.DIVERGENCIA_ALTA_ABERTA);
        }
        if (in.criticalAssumptionUnvalidated()) {
            warnings.add(Warning.PREMISSA_CRITICA_NAO_VALIDADA);
        }
        if (!quick && in.confidencePct() != null && ConfidenceBand.of(in.confidencePct()) == ConfidenceBand.ALTA
                && (in.evidence() == null || in.evidence() == EvidenceStrength.Level.FRACA)) {
            warnings.add(Warning.CONFIANCA_ACIMA_DA_EVIDENCIA);
        }
        return new Result(blocking, warnings);
    }
}

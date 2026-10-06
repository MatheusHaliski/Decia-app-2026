package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.common.DomainRuleException;

import java.math.BigDecimal;

/**
 * Invariantes numéricos compartilhados pelos records do contexto 5b (os mesmos limites viram CHECK na V22): confiança 0–100 em passos de
 * 5 (G11, §6.9), probabilidade de previsão 5–95 em passos de 5, nota 1–5 (§6.1) e peso 0–100 (§6.1). Violação = {@code VALIDACAO}.
 */
public final class DecisionRules {

    /** Versão do modelo de pontuação gravada em snapshots e recomendações MODELO ({@code contracts/decia/vetores.json}). */
    public static final String SCORING_MODEL_VERSION = "decia-scoring-v1";

    private DecisionRules() {
    }

    /** Confiança opcional: nula ou 0–100 em passos de 5. */
    public static void confidence(Integer pct, String field) {
        if (pct != null && (pct < 0 || pct > 100 || pct % 5 != 0)) {
            throw invalid(field + " deve estar em 0–100 em passos de 5 (recebido " + pct + ")");
        }
    }

    /** Probabilidade de previsão: 5–95 em passos de 5 (§6.9). */
    public static void probability(int pct) {
        if (pct < 5 || pct > 95 || pct % 5 != 0) {
            throw invalid("probabilityPct deve estar em 5–95 em passos de 5 (recebido " + pct + ")");
        }
    }

    /** Nota de avaliação: inteiro 1–5, sempre desejabilidade (§6.1). */
    public static void score(int score) {
        if (score < 1 || score > 5) {
            throw invalid("score deve estar em 1–5 (recebido " + score + ")");
        }
    }

    /** Peso opcional do critério: nulo ou 0–100 (§6.1). */
    public static void weight(BigDecimal weightPct) {
        if (weightPct != null && (weightPct.signum() < 0 || weightPct.compareTo(BigDecimal.valueOf(100)) > 0)) {
            throw invalid("weightPct deve estar em 0–100 (recebido " + weightPct.toPlainString() + ")");
        }
    }

    /**
     * Proveniência de IA na criação (G2): conteúdo com {@code origin = IA} precisa de {@code aiInferenceId}. Não fica no construtor dos records
     * porque a FK para {@code ai_inference_log} é SET NULL — um registro antigo continua legível mesmo sem a linha da trilha.
     */
    public static void aiProvenance(ContentOrigin origin, java.util.UUID aiInferenceId) {
        if (origin == ContentOrigin.IA && aiInferenceId == null) {
            throw invalid("conteúdo de IA exige aiInferenceId (G2)");
        }
    }

    static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    static DomainRuleException invalid(String message) {
        return new DomainRuleException("VALIDACAO", message);
    }
}

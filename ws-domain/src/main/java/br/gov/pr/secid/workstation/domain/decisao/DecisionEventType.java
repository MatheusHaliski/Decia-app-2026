package br.gov.pr.secid.workstation.domain.decisao;

/**
 * Fato de domínio da decisão (pretérito: "algo aconteceu"), gravado em {@code decision_events} (histórico da decisão, legível pelo usuário)
 * e publicado no outbox {@code domain_events} com o nome de mensagem {@link #messageType()} (docs/decia/09_ARQUITETURA_MENSAGENS.md,
 * Hohpe &amp; Woolf: Event Message). Comandos ("faça algo", ex.: {@code GenerateDecisionAnalysis}) não entram aqui; eventos de UI/analytics
 * ({@code card_flipped}, {@code decision_compared}) vivem só no frontend ({@code lib/decia/analytics.ts}) — histórico da decisão ≠
 * histórico técnico de mensagens ≠ analytics.
 */
public enum DecisionEventType {
    DECISAO_CRIADA("DecisionCreated"),
    PROBLEMA_ENQUADRADO("DecisionFramed"),
    ESTADO_ALTERADO("DecisionStatusChanged"),
    EVIDENCIA_ADICIONADA("EvidenceAdded"),
    EVIDENCIA_SUBSTITUIDA("EvidenceSuperseded"),
    ALTERNATIVA_CRIADA("AlternativeCreated"),
    ALTERNATIVA_DESCARTADA("AlternativeDiscarded"),
    CRITERIO_ATUALIZADO("CriterionUpdated"),
    AVALIACAO_REGISTRADA("AssessmentRecorded"),
    PREMISSA_ATUALIZADA("AssumptionUpdated"),
    RISCO_ALTERADO("RiskChanged"),
    RECOMENDACAO_GERADA("RecommendationGenerated"),
    SUGESTAO_IA_ACEITA("AiSuggestionAccepted"),
    SUGESTAO_IA_DESCARTADA("AiSuggestionDismissed"),
    DECISAO_DESAFIADA("DecisionChallenged"),
    DECISAO_FINALIZADA("DecisionFinalized"),
    DECISAO_REABERTA("DecisionReopened"),
    TRABALHO_VINCULADO("WorkItemsLinked"),
    CHECKPOINT_VENCENDO("CheckpointDue"),
    CHECKPOINT_CONCLUIDO("CheckpointCompleted"),
    GATILHO_DISPARADO("TriggerFired"),
    RESULTADO_REGISTRADO("OutcomeRecorded"),
    REVISAO_CONCLUIDA("ReviewCompleted"),
    DECISAO_ARQUIVADA("DecisionArchived");

    private final String messageType;

    DecisionEventType(String messageType) {
        this.messageType = messageType;
    }

    /** Nome da mensagem de evento no canal {@code decision.events} (PascalCase, pretérito). */
    public String messageType() {
        return messageType;
    }
}

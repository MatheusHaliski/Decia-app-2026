package br.gov.pr.secid.workstation.infrastructure.mysql.aitrail;

import br.gov.pr.secid.workstation.application.ai.AiInferenceLogPort;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Grava {@code ai_inference_log} em transação PRÓPRIA (D-69): a chamada ao provedor já aconteceu, então a trilha fica mesmo que o caso
 * de uso faça rollback depois.
 */
@Component
public class JpaAiInferenceLog implements AiInferenceLogPort {
    private final AiInferenceLogJpaRepository repository;
    private final TransactionTemplate ownTransaction;

    public JpaAiInferenceLog(AiInferenceLogJpaRepository repository, PlatformTransactionManager transactions) {
        this.repository = repository;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void append(AiInferenceLog entry) {
        AiInferenceLogEntity e = AiInferenceLogEntity.of(entry);
        ownTransaction.executeWithoutResult(status -> repository.save(e));
    }
}

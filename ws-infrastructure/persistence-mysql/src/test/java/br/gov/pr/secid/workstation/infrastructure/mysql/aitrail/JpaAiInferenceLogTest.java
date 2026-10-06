package br.gov.pr.secid.workstation.infrastructure.mysql.aitrail;

import br.gov.pr.secid.workstation.domain.common.AiMode;
import br.gov.pr.secid.workstation.domain.ia.AiCapability;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import br.gov.pr.secid.workstation.domain.ia.AiProvider;
import br.gov.pr.secid.workstation.domain.ia.InferenceResult;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.infrastructure.mysql.security.JpaMembershipAdapter;
import br.gov.pr.secid.workstation.infrastructure.mysql.security.ActiveMembershipQueries;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** D-69: a trilha de IA grava em transação própria e a entidade não tem onde guardar prompt/resposta brutos; D-66: lotações vigentes. */
class JpaAiInferenceLogTest {

    static final class CountingTransactionManager extends AbstractPlatformTransactionManager {
        final List<Integer> propagations = new ArrayList<>();

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            propagations.add(definition.getPropagationBehavior());
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            // sem recurso
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            // sem recurso
        }
    }

    @Test
    void gravaEmTransacaoPropriaComOsCamposMascarados() {
        AiInferenceLogJpaRepository repo = mock(AiInferenceLogJpaRepository.class);
        CountingTransactionManager tx = new CountingTransactionManager();
        UUID id = UUID.randomUUID();
        new JpaAiInferenceLog(repo, tx).append(new AiInferenceLog(id, UUID.randomUUID(), null, AiCapability.INSIGHT, "RF43", AiProvider.CLAUDE,
                "m", null, 12, 3, 4, null, InferenceResult.OK, false, "{\"CPF\":1}", "{\"chars\":10}", null, null, null, null, null, "c"));
        ArgumentCaptor<AiInferenceLogEntity> saved = ArgumentCaptor.forClass(AiInferenceLogEntity.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(id);
        assertThat(saved.getValue().getCapability()).isEqualTo("INSIGHT");
        assertThat(saved.getValue().getMode()).as("modo nulo vira ECONOMIA (padrão do V2)").isEqualTo(AiMode.ECONOMIA);
        assertThat(saved.getValue().getMaskedFieldsJson()).isEqualTo("{\"CPF\":1}");
        assertThat(saved.getValue().getInputSummaryJson()).isEqualTo("{\"chars\":10}");
        assertThat(tx.propagations).containsExactly(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Test
    void entidadeNaoTemColunaParaPromptNemResposta() {
        for (Field f : AiInferenceLogEntity.class.getDeclaredFields()) {
            assertThat(f.getName().toLowerCase()).doesNotContain("prompt").doesNotContain("output_summary").isNotEqualTo("outputsummary");
        }
        assertThat(AiInferenceLogEntity.class.isAnnotationPresent(org.hibernate.annotations.Immutable.class)).isTrue();
    }

    @Test
    void lotacoesVigentesFicamComOPapelMaisForte() {
        UUID d1 = UUID.randomUUID();
        UUID d2 = UUID.randomUUID();
        UUID user = UUID.randomUUID();
        ActiveMembershipQueries q = mock(ActiveMembershipQueries.class);
        when(q.activeRoles(user)).thenReturn(List.of(new Object[] {d1, DeptRole.MEMBRO}, new Object[] {d1, DeptRole.CHEFE},
                new Object[] {d2, DeptRole.CURADOR}, new Object[] {d2, DeptRole.MEMBRO}, new Object[] {"lixo"}, new Object[] {null, DeptRole.MEMBRO}));
        assertThat(new JpaMembershipAdapter(q).activeRoles(user)).isEqualTo(Map.of(d1, DeptRole.CHEFE, d2, DeptRole.CURADOR));
    }
}

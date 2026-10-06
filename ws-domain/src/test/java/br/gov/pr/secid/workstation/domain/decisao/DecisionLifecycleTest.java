package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.common.InvalidTransitionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.AGUARDANDO_DECISAO;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.ARQUIVADA;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.COMPARACAO;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.DECIDIDA;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.EM_EXECUCAO;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.ENQUADRAMENTO;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.PESQUISA;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.RASCUNHO;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.REABERTA;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.RESOLVIDA;
import static br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle.REVISADA;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** {@link DecisionLifecycle}: a tabela do §4.3 inteira — todo par (de, para) é permitido se e só se está na tabela. */
class DecisionLifecycleTest {

    /** Tabela do 03_MODELO_FUNCIONAL §4.3, transcrita. */
    private static final Map<DecisionLifecycle, Set<DecisionLifecycle>> SPEC = Map.ofEntries(
            Map.entry(RASCUNHO, EnumSet.of(ENQUADRAMENTO, ARQUIVADA)),
            Map.entry(ENQUADRAMENTO, EnumSet.of(PESQUISA, COMPARACAO, ARQUIVADA)),
            Map.entry(PESQUISA, EnumSet.of(COMPARACAO, ENQUADRAMENTO, ARQUIVADA)),
            Map.entry(COMPARACAO, EnumSet.of(AGUARDANDO_DECISAO, PESQUISA, ARQUIVADA)),
            Map.entry(AGUARDANDO_DECISAO, EnumSet.of(DECIDIDA, COMPARACAO)),
            Map.entry(DECIDIDA, EnumSet.of(EM_EXECUCAO, REABERTA, RESOLVIDA)),
            Map.entry(EM_EXECUCAO, EnumSet.of(RESOLVIDA, REABERTA)),
            Map.entry(RESOLVIDA, EnumSet.of(REVISADA, REABERTA)),
            Map.entry(REVISADA, EnumSet.of(ARQUIVADA, REABERTA)),
            Map.entry(REABERTA, EnumSet.of(COMPARACAO)),
            Map.entry(ARQUIVADA, EnumSet.noneOf(DecisionLifecycle.class)));

    static Stream<Arguments> todosOsPares() {
        return Stream.of(DecisionLifecycle.values()).flatMap(from -> Stream.of(DecisionLifecycle.values()).map(to -> Arguments.of(from, to)));
    }

    @ParameterizedTest(name = "{0} → {1}")
    @MethodSource("todosOsPares")
    void cadaParSegueATabelaDoSpec(DecisionLifecycle from, DecisionLifecycle to) {
        boolean allowed = SPEC.get(from).contains(to);
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
        if (allowed) {
            assertThat(from.transition(to)).isEqualTo(to);
        } else {
            assertThatThrownBy(() -> from.transition(to)).isInstanceOf(InvalidTransitionException.class)
                    .hasMessageContaining("DECISAO_CICLO_TRANSICAO_INVALIDA");
        }
    }

    @Test
    void tabelaCobreTodosOsEstados() {
        assertThat(SPEC.keySet()).containsExactlyInAnyOrder(DecisionLifecycle.values());
    }

    @Test
    void caminhoFelizEReabertura() {
        assertThat(RASCUNHO.transition(ENQUADRAMENTO).transition(PESQUISA).transition(COMPARACAO).transition(AGUARDANDO_DECISAO)
                .transition(DECIDIDA).transition(EM_EXECUCAO).transition(RESOLVIDA).transition(REVISADA).transition(REABERTA)
                .transition(COMPARACAO)).isEqualTo(COMPARACAO);
        assertThat(DecisionLifecycle.machine().isTerminal(ARQUIVADA)).isTrue();
        assertThat(RASCUNHO.canTransitionTo(AGUARDANDO_DECISAO)).as("decisão rápida não pula etapas (§4.3)").isFalse();
        assertThat(REABERTA.canTransitionTo(DECIDIDA)).as("REABERTA só volta para COMPARACAO").isFalse();
    }

    @Test
    void frescorSoNosEstadosDecididos() {
        assertThat(EnumSet.allOf(DecisionLifecycle.class).stream().filter(DecisionLifecycle::tracksFreshness))
                .containsExactlyInAnyOrder(DECIDIDA, EM_EXECUCAO, RESOLVIDA);
        assertThat(REVISADA.isDecided()).isTrue();
        assertThat(REABERTA.isDecided()).isFalse();
    }
}

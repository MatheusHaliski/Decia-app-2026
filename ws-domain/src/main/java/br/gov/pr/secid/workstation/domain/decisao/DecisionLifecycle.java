package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

import java.util.EnumSet;
import java.util.Set;

/**
 * Ciclo de vida da decisão estruturada (03_MODELO_FUNCIONAL §4.3), exatamente pela tabela do spec:
 * RASCUNHO → ENQUADRAMENTO → PESQUISA → COMPARACAO → AGUARDANDO_DECISAO → DECIDIDA → EM_EXECUCAO → RESOLVIDA → REVISADA → ARQUIVADA;
 * REABERTA (de DECIDIDA, EM_EXECUCAO, RESOLVIDA ou REVISADA) volta só para COMPARACAO; ARQUIVADA é final. DECIDIDA exige o guarda
 * pré-decisão (§6.10) e grava o snapshot DECISAO; REABERTA grava o snapshot REABERTURA — ver {@link Decision#decide} e
 * {@link Decision#reopen}.
 */
public enum DecisionLifecycle {
    RASCUNHO, ENQUADRAMENTO, PESQUISA, COMPARACAO, AGUARDANDO_DECISAO, DECIDIDA, EM_EXECUCAO, RESOLVIDA, REVISADA, REABERTA, ARQUIVADA;

    private static final StateMachine<DecisionLifecycle> MACHINE = StateMachine.of(DecisionLifecycle.class, "DECISAO_CICLO_TRANSICAO_INVALIDA")
            .from(RASCUNHO).to(ENQUADRAMENTO, ARQUIVADA)
            .from(ENQUADRAMENTO).to(PESQUISA, COMPARACAO, ARQUIVADA)
            .from(PESQUISA).to(COMPARACAO, ENQUADRAMENTO, ARQUIVADA)
            .from(COMPARACAO).to(AGUARDANDO_DECISAO, PESQUISA, ARQUIVADA)
            .from(AGUARDANDO_DECISAO).to(DECIDIDA, COMPARACAO)
            .from(DECIDIDA).to(EM_EXECUCAO, REABERTA, RESOLVIDA)
            .from(EM_EXECUCAO).to(RESOLVIDA, REABERTA)
            .from(RESOLVIDA).to(REVISADA, REABERTA)
            .from(REVISADA).to(ARQUIVADA, REABERTA)
            .from(REABERTA).to(COMPARACAO)
            .from(ARQUIVADA)
            .build();

    /** Estados em que o frescor (§6.11) se aplica. */
    private static final Set<DecisionLifecycle> FRESHNESS = EnumSet.of(DECIDIDA, EM_EXECUCAO, RESOLVIDA);

    public boolean canTransitionTo(DecisionLifecycle to) {
        return MACHINE.canTransition(this, to);
    }

    public DecisionLifecycle transition(DecisionLifecycle to) {
        return MACHINE.transition(this, to);
    }

    /** Verdadeiro em DECIDIDA, EM_EXECUCAO e RESOLVIDA — os únicos estados avaliados por frescor (§6.11). */
    public boolean tracksFreshness() {
        return FRESHNESS.contains(this);
    }

    /** Verdadeiro depois da escolha (DECIDIDA em diante, exceto REABERTA). */
    public boolean isDecided() {
        return this == DECIDIDA || this == EM_EXECUCAO || this == RESOLVIDA || this == REVISADA;
    }

    public static StateMachine<DecisionLifecycle> machine() {
        return MACHINE;
    }
}

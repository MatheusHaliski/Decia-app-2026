package br.gov.pr.secid.workstation.domain.common;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StateMachineTest {

    enum S { A, B, C }

    private static final StateMachine<S> M = StateMachine.of(S.class, "X_INVALIDA").from(S.A).to(S.B).from(S.B).to(S.C).from(S.C).build();

    @Test
    void transicaoDeclaradaPassaENaoDeclaradaLancaComCodigo() {
        assertThat(M.canTransition(S.A, S.B)).isTrue();
        assertThat(M.transition(S.A, S.B)).isEqualTo(S.B);
        assertThat(M.canTransition(S.A, S.C)).isFalse();
        assertThat(M.canTransition(S.A, S.A)).as("auto-transição nunca").isFalse();
        assertThat(M.canTransition(null, S.A)).isFalse();
        assertThatThrownBy(() -> M.transition(S.A, S.C)).isInstanceOf(InvalidTransitionException.class)
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("X_INVALIDA").hasMessageContaining("A -> C")
                .satisfies(ex -> {
                    InvalidTransitionException e = (InvalidTransitionException) ex;
                    assertThat(e.getCode()).isEqualTo("X_INVALIDA");
                    assertThat(e.getFrom()).isEqualTo("A");
                    assertThat(e.getTo()).isEqualTo("C");
                });
        assertThat(M.isTerminal(S.C)).isTrue();
        assertThat(M.next(S.A)).containsExactly(S.B);
        assertThatThrownBy(() -> M.next(S.A).add(S.C)).isInstanceOf(UnsupportedOperationException.class);
        assertThat(M.code()).isEqualTo("X_INVALIDA");
    }

    @Test
    void builderRecusaAutoTransicaoEToSemFrom() {
        assertThatThrownBy(() -> StateMachine.of(S.class, "c").from(S.A).to(S.A)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StateMachine.of(S.class, "c").to(S.A)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void valueObjects() {
        Period p = new Period(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        assertThat(p.contains(LocalDate.of(2026, 6, 1))).isTrue();
        assertThat(p.contains(LocalDate.of(2027, 1, 1))).isFalse();
        assertThat(p.overlaps(new Period(LocalDate.of(2026, 12, 1), null))).isTrue();
        assertThat(p.overlaps(new Period(LocalDate.of(2027, 1, 1), null))).isFalse();
        assertThat(Period.open(LocalDate.of(2026, 1, 1)).isOpen()).isTrue();
        assertThatThrownBy(() -> new Period(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1))).hasMessageContaining("PERIODO_INVALIDO");
        assertThatThrownBy(() -> new Period(null, null)).hasMessageContaining("PERIODO_INVALIDO");

        assertThat(Points.of(10).plus(Points.of(5))).isEqualTo(Points.of(15));
        assertThat(Points.of(10).minus(Points.of(4)).value()).isEqualTo(6);
        assertThat(Points.of(10).covers(Points.of(10))).isTrue();
        assertThat(Points.ZERO.compareTo(Points.of(1))).isNegative();
        assertThatThrownBy(() -> Points.of(3).minus(Points.of(4))).hasMessageContaining("SALDO_INSUFICIENTE");

        assertThatThrownBy(() -> new TargetRef(null, java.util.UUID.randomUUID())).hasMessageContaining("VALIDACAO");
        assertThat(AccessClassification.RESTRITO.allowsExternalAi()).isFalse();
        assertThat(AccessClassification.INTERNO.allowsExternalAi()).isTrue();
    }
}

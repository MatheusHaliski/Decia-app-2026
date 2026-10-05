package br.gov.pr.secid.workstation.domain.common;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Máquina de estados explícita e imutável para um enum de status. Cada enum de estado do domínio expõe
 * {@code canTransitionTo(to)} e {@code transition(to)} delegando a uma instância desta classe; a transição inválida
 * lança {@link InvalidTransitionException} com o código do contexto.
 *
 * @param <S> enum de estados
 */
public final class StateMachine<S extends Enum<S>> {

    private final Class<S> type;
    private final String code;
    private final Map<S, Set<S>> transitions;

    private StateMachine(Class<S> type, String code, Map<S, Set<S>> transitions) {
        this.type = type;
        this.code = code;
        this.transitions = transitions;
    }

    public static <S extends Enum<S>> Builder<S> of(Class<S> type, String code) {
        return new Builder<>(type, code);
    }

    /** Verdadeiro quando {@code from -> to} está declarado; a auto-transição nunca é permitida. */
    public boolean canTransition(S from, S to) {
        if (from == null || to == null) {
            return false;
        }
        return transitions.getOrDefault(from, Collections.emptySet()).contains(to);
    }

    /** Devolve {@code to} ou lança {@link InvalidTransitionException} com o código da máquina. */
    public S transition(S from, S to) {
        if (!canTransition(from, to)) {
            throw new InvalidTransitionException(code, from, to);
        }
        return to;
    }

    /** Estados alcançáveis a partir de {@code from} (vazio = estado terminal). */
    public Set<S> next(S from) {
        return Collections.unmodifiableSet(transitions.getOrDefault(from, EnumSet.noneOf(type)));
    }

    public boolean isTerminal(S state) {
        return next(state).isEmpty();
    }

    public String code() {
        return code;
    }

    /** Construtor fluente: {@code from(A).to(B, C).from(B).to(D)}. */
    public static final class Builder<S extends Enum<S>> {
        private final Class<S> type;
        private final String code;
        private final Map<S, Set<S>> transitions;
        private S current;

        private Builder(Class<S> type, String code) {
            this.type = type;
            this.code = code;
            this.transitions = new EnumMap<>(type);
        }

        public Builder<S> from(S state) {
            this.current = state;
            transitions.computeIfAbsent(state, s -> EnumSet.noneOf(type));
            return this;
        }

        @SafeVarargs
        public final Builder<S> to(S... targets) {
            if (current == null) {
                throw new IllegalStateException("chame from(...) antes de to(...)");
            }
            for (S t : targets) {
                if (t == current) {
                    throw new IllegalArgumentException("auto-transição não é permitida: " + t);
                }
                transitions.get(current).add(t);
            }
            return this;
        }

        public StateMachine<S> build() {
            Map<S, Set<S>> frozen = new EnumMap<>(type);
            transitions.forEach((k, v) -> frozen.put(k, Collections.unmodifiableSet(EnumSet.copyOf(v.isEmpty() ? EnumSet.noneOf(type) : v))));
            return new StateMachine<>(type, code, Collections.unmodifiableMap(frozen));
        }
    }
}

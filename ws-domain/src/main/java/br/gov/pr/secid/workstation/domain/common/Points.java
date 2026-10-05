package br.gov.pr.secid.workstation.domain.common;

/**
 * Quantidade de DECIA Points (RF42, D-07: única moeda do produto). Inteira, sem casas decimais; o sinal fica no
 * lançamento do extrato ({@code delta}). Operações nunca produzem saldo negativo ({@code SALDO_INSUFICIENTE}).
 */
public record Points(long value) implements Comparable<Points> {

    public static final Points ZERO = new Points(0);

    public Points {
        if (value < 0) {
            throw new IllegalArgumentException("SALDO_INSUFICIENTE: pontos não podem ser negativos: " + value);
        }
    }

    public static Points of(long value) {
        return new Points(value);
    }

    public Points plus(Points other) {
        return new Points(Math.addExact(value, other.value));
    }

    /** Debita; lança {@link IllegalArgumentException} {@code SALDO_INSUFICIENTE} se o resultado ficar negativo. */
    public Points minus(Points other) {
        return new Points(value - other.value);
    }

    public boolean covers(Points price) {
        return value >= price.value;
    }

    @Override
    public int compareTo(Points o) {
        return Long.compare(value, o.value);
    }
}

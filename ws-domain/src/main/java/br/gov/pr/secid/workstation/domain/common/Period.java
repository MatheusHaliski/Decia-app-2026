package br.gov.pr.secid.workstation.domain.common;

import java.time.LocalDate;

/**
 * Período fechado {@code [from, to]} em datas civis (vigência de agrupamentos RF25, metas RF35, chancelas RF39,
 * regras de prazo legal RF20). {@code to} nulo = aberto. Inválido quando {@code to < from} ({@code PERIODO_INVALIDO}).
 */
public record Period(LocalDate from, LocalDate to) {

    public Period {
        if (from == null) {
            throw new IllegalArgumentException("PERIODO_INVALIDO: from obrigatório");
        }
        if (to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("PERIODO_INVALIDO: to anterior a from");
        }
    }

    public static Period open(LocalDate from) {
        return new Period(from, null);
    }

    public boolean isOpen() {
        return to == null;
    }

    public boolean contains(LocalDate date) {
        return date != null && !date.isBefore(from) && (to == null || !date.isAfter(to));
    }

    public boolean overlaps(Period other) {
        boolean thisEndsBefore = to != null && to.isBefore(other.from);
        boolean otherEndsBefore = other.to != null && other.to.isBefore(from);
        return !thisEndsBefore && !otherEndsBefore;
    }
}

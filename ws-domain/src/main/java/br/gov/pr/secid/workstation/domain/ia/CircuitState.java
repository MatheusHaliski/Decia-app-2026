package br.gov.pr.secid.workstation.domain.ia;

/** Estado do circuit breaker do provedor (Resilience4j). */
public enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

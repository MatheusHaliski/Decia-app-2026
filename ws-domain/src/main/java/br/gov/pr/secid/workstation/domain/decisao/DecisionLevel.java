package br.gov.pr.secid.workstation.domain.decisao;

/**
 * Nível ordinal BAIXO &lt; MEDIO &lt; ALTO &lt; CRITICO (§4.2): impacto, urgência, importância de premissa, impacto e severidade de risco
 * (§6.6). A ordem de declaração é a ordem de gravidade.
 */
public enum DecisionLevel {
    BAIXO, MEDIO, ALTO, CRITICO;

    public boolean atLeast(DecisionLevel other) {
        return compareTo(other) >= 0;
    }

    public static DecisionLevel max(DecisionLevel a, DecisionLevel b) {
        return a.compareTo(b) >= 0 ? a : b;
    }
}

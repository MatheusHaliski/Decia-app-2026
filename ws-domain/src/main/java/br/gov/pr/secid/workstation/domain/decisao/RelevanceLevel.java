package br.gov.pr.secid.workstation.domain.decisao;

/** Relevância / confiabilidade da evidência (§4.2). O peso de confiabilidade da força da evidência é ALTA = 3, MEDIA = 2, BAIXA = 1 (§6.5). */
public enum RelevanceLevel {
    BAIXA(1), MEDIA(2), ALTA(3);

    private final int weight;

    RelevanceLevel(int weight) {
        this.weight = weight;
    }

    public int weight() {
        return weight;
    }
}

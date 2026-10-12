package br.gov.pr.secid.workstation.domain.decisao;

/**
 * Papel do participante na decisão (DACI, [REF-DACI]; §4.2) e o que cada papel pode fazer (§8). Decidir e reabrir NÃO é de papel:
 * é só do responsável ({@code Decision.ownerUserId}), ou do APROVADOR com delegação explícita registrada.
 */
public enum DecisionRole {
    CONDUTOR, APROVADOR, CONTRIBUIDOR, INFORMADO;

    /** Editar estrutura (alternativas, critérios, evidências, premissas, riscos): CONDUTOR e APROVADOR (o responsável também, fora do papel). */
    public boolean canEditStructure() {
        return this == CONDUTOR || this == APROVADOR;
    }

    /** Avaliar (notas 1–5): CONTRIBUIDOR ou acima. */
    public boolean canAssess() {
        return this != INFORMADO;
    }

    /** INFORMADO só lê. */
    public boolean isReadOnly() {
        return this == INFORMADO;
    }
}

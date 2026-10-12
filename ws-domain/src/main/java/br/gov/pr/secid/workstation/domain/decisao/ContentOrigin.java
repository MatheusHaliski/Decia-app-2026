package br.gov.pr.secid.workstation.domain.decisao;

/** Origem do conteúdo (G2): toda sugestão da IA tem {@code origin = IA} + {@code aiInferenceId} e só entra no registro com aceite humano. */
public enum ContentOrigin {
    HUMANO, IA, IMPORTADA
}

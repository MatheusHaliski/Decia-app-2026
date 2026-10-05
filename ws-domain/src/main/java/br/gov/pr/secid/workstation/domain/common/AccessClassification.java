package br.gov.pr.secid.workstation.domain.common;

/** Classificação de acesso do conteúdo (RF43.CA02): RESTRITO e SIGILOSO nunca saem para provedor de IA externo. */
public enum AccessClassification {
    PUBLICO, INTERNO, RESTRITO, SIGILOSO;

    public boolean allowsExternalAi() {
        return this == PUBLICO || this == INTERNO;
    }
}

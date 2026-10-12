package br.gov.pr.secid.workstation.domain.social;

/** Reações (RF26): CURTIR é única por ator/alvo; as demais pesam na qualidade (RF42, RF45). */
public enum ReactionType {
    CURTIR,
    UTIL,
    BEM_FUNDAMENTADO,
    INOVADOR,
    CONFORME
}

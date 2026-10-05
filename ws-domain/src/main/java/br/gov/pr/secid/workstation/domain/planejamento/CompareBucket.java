package br.gov.pr.secid.workstation.domain.planejamento;

/** Classificação de um projeto ao comparar planos de anos distintos (RF24.CA05). */
public enum CompareBucket {
    NOVO,
    CONCLUIDO,
    REPROGRAMADO,
    MANTIDO
}

package br.gov.pr.secid.workstation.domain.decia;

/** Ciclo do artefato (RF13 README): SOLICITADO → GERANDO → GERADO → ARQUIVO_PRONTO; FALHA · BLOQUEADO_SIGILO · CONVERTIDO · SUBSTITUIDO. */
public enum ArtifactStatus {
    SOLICITADO,
    GERANDO,
    GERADO,
    ARQUIVO_PRONTO,
    FALHA,
    BLOQUEADO_SIGILO,
    CONVERTIDO,
    SUBSTITUIDO
}

package br.gov.pr.secid.workstation.domain.institutional;

/** Ciclo de uma política versionada (VerificationPolicy, PolicyDocument): RASCUNHO → VIGENTE → SUBSTITUIDA. */
public enum PolicyStatus {
    RASCUNHO, VIGENTE, SUBSTITUIDA
}

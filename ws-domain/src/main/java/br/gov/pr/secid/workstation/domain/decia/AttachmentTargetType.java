package br.gov.pr.secid.workstation.domain.decia;

/** O que pode ser anexado a uma mensagem (RF29.CA03, ≤ 5). */
public enum AttachmentTargetType {
    TASK,
    PROJECT,
    PLAN,
    SCENARIO,
    ARTIFACT,
    EVIDENCE
}

package br.gov.pr.secid.workstation.domain.identity;

/** Finalidade de um código/token de verificação ({@code verification_codes.purpose}, V3). */
public enum VerificationPurpose {
    EMAIL_VERIFICATION,
    PASSWORD_RESET,
    TWO_FACTOR
}

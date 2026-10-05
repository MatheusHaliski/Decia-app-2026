package br.gov.pr.secid.workstation.application.audit;

/** Catálogo de ações auditadas (coluna {@code audit_log.action}, sem CHECK: cresce por RF — D-23). */
public final class AuditActions {
    public static final String LOGIN_OK = "LOGIN_OK";
    public static final String LOGIN_FALHA = "LOGIN_FALHA";
    public static final String LOGIN_BLOQUEADO_TENTATIVAS = "LOGIN_BLOQUEADO_TENTATIVAS";
    public static final String REAUTH_OK = "REAUTH_OK";
    public static final String REAUTH_FALHA = "REAUTH_FALHA";

    private AuditActions() {
    }
}

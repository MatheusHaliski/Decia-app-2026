package br.gov.pr.secid.workstation.application.audit;

/** Catálogo de {@code audit_log.action} (cresce por RF; sem CHECK no banco — este enum-constante é a fonte, D-23). */
public final class AuditActions {
    public static final String LOGIN_OK = "LOGIN_OK";
    public static final String LOGIN_FALHA = "LOGIN_FALHA";
    public static final String LOGIN_BLOQUEADO_TENTATIVAS = "LOGIN_BLOQUEADO_TENTATIVAS";
    public static final String LOGOUT = "LOGOUT";
    public static final String REFRESH_REUSO = "REFRESH_REUSO";
    public static final String SESSIONS_REVOKED = "SESSIONS_REVOKED";
    public static final String SESSION_REVOKED = "SESSION_REVOKED";
    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED";
    public static final String PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED";
    public static final String USER_REGISTERED = "USER_REGISTERED";
    public static final String REGISTER_EMAIL_EM_USO = "REGISTER_EMAIL_EM_USO";
    public static final String EMAIL_VERIFIED = "EMAIL_VERIFIED";
    public static final String EMAIL_VERIFICATION_FALHA = "EMAIL_VERIFICATION_FALHA";
    public static final String PROFILE_UPDATED = "PROFILE_UPDATED";
    public static final String SENSITIVE_DATA_UPDATED = "SENSITIVE_DATA_UPDATED";
    public static final String PREFERENCES_UPDATED = "PREFERENCES_UPDATED";
    public static final String ACCOUNT_DELETION_REQUESTED = "ACCOUNT_DELETION_REQUESTED";
    public static final String ACCOUNT_DELETION_CANCELLED = "ACCOUNT_DELETION_CANCELLED";
    public static final String ADMIN_BOOTSTRAP = "ADMIN_BOOTSTRAP";
    public static final String OIDC_LOGIN = "OIDC_LOGIN";
    public static final String OIDC_LINK_RECUSADO = "OIDC_LINK_RECUSADO";
    public static final String ACESSO_NEGADO = "ACESSO_NEGADO";
    /** Acervo (RF4/RF12/RF41): criação, edição e transição de estado da tarefa. */
    public static final String TASK_CREATED = "TASK_CREATED";
    public static final String TASK_UPDATED = "TASK_UPDATED";
    public static final String TASK_STATE_CHANGED = "TASK_STATE_CHANGED";

    private AuditActions() {
    }
}

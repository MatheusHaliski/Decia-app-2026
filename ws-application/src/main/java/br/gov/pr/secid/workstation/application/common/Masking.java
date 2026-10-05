package br.gov.pr.secid.workstation.application.common;

/**
 * Mascaramento de dados pessoais para logs, auditoria e mensagens ao usuário (LGPD, ARQUITETURA §3.3).
 * Nunca devolve o valor original; o resultado serve só para a pessoa reconhecer o próprio dado.
 */
public final class Masking {
    private static final String STARS = "***";

    private Masking() {
    }

    /**
     * {@code maria.silva@gmail.com} → {@code m***@g***.com}. Mantém só a primeira letra da parte local, a primeira
     * letra do domínio e o sufixo após o último ponto. Entrada sem {@code @} ou vazia vira {@code ***}.
     */
    public static String maskEmail(String email) {
        if (email == null) {
            return STARS;
        }
        String value = email.trim();
        int at = value.indexOf('@');
        if (at < 0 || at == value.length() - 1) {
            return STARS;
        }
        String local = value.substring(0, at);
        String domain = value.substring(at + 1);
        String maskedLocal = local.isEmpty() ? STARS : local.charAt(0) + STARS;
        int lastDot = domain.lastIndexOf('.');
        String maskedDomain;
        if (lastDot <= 0 || lastDot == domain.length() - 1) {
            maskedDomain = domain.charAt(0) + STARS;
        } else {
            maskedDomain = domain.charAt(0) + STARS + domain.substring(lastDot);
        }
        return maskedLocal + "@" + maskedDomain;
    }

    /** Mostra só os últimos {@code visible} caracteres (telefone, CNPJ, token curto): {@code ***1234}. */
    public static String maskTail(String value, int visible) {
        if (value == null || value.isBlank()) {
            return STARS;
        }
        String v = value.trim();
        if (visible <= 0 || v.length() <= visible) {
            return STARS;
        }
        return STARS + v.substring(v.length() - visible);
    }
}

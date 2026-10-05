package br.gov.pr.secid.workstation.application.identity;

/**
 * Mensagem transacional. {@code template} identifica o texto (i18n no adaptador); {@code secret} é o código/token que
 * só pode aparecer no corpo do e-mail — nunca em log, auditoria ou resposta HTTP.
 */
public record MailMessage(String to, String template, String subject, String secret, java.util.Map<String, String> params) {
    @Override
    public String toString() {
        return "MailMessage{to=" + br.gov.pr.secid.workstation.application.common.Masking.maskEmail(to) + ", template=" + template + "}";
    }
}

package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.Masking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * {@link MailPort} de desenvolvimento: nenhum SMTP; registra destinatário MASCARADO, template e assunto. O segredo
 * (código/token) só aparece no log com {@code ws.mail.echo-body=true} (perfil dev) — em prod é sempre false.
 * O adaptador SMTP real ({@code WS_SMTP_*}) é a Q-84.
 */
@Configuration
public class LoggingMailAdapter {
    private static final Logger log = LoggerFactory.getLogger(LoggingMailAdapter.class);

    @Bean
    @ConditionalOnMissingBean(MailPort.class)
    MailPort loggingMailPort(@Value("${ws.mail.echo-body:false}") boolean echoBody) {
        return message -> {
            String to = Masking.maskEmail(message.to());
            if (echoBody) {
                log.info("[mail-dev] para={} template={} assunto='{}' segredo={} params={}", to, message.template(), message.subject(),
                        message.secret(), message.params());
            } else {
                log.info("[mail-dev] para={} template={} assunto='{}' (corpo omitido)", to, message.template(), message.subject());
            }
        };
    }
}

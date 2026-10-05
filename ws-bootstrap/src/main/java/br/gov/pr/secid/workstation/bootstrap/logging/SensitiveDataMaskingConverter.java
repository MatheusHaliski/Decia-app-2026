package br.gov.pr.secid.workstation.bootstrap.logging;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Pattern;

/**
 * Última linha de defesa do log (ARQUITETURA §3.3, LGPD): mascara senha/token/chave que escapem numa mensagem
 * (ex.: exceção de driver que ecoa a URL com credenciais, cabeçalho Authorization em debug). Registrado no
 * logback-spring.xml como a palavra de conversão {@code %mmsg} no lugar de {@code %msg}.
 */
public class SensitiveDataMaskingConverter extends MessageConverter {
    private static final String MASK = "***";

    /** chave=valor / chave: valor / "chave":"valor" para nomes sensíveis (pt/en) */
    private static final Pattern KEY_VALUE = Pattern.compile(
            "(?i)(password|passwd|pwd|senha|secret|segredo|token|refresh[_-]?token|access[_-]?token|api[_-]?key|apikey|"
                    + "authorization|private[_-]?key|encryption[_-]?key|client[_-]?secret)(\"?\\s*[:=]\\s*\"?)([^\\s,;\"'&]+)");
    /** Authorization: Bearer <jwt> */
    private static final Pattern BEARER = Pattern.compile("(?i)\\bBearer\\s+[A-Za-z0-9\\-_.=+/]+");
    /** JWT compacto (três segmentos base64url começando por eyJ) */
    private static final Pattern JWT = Pattern.compile("\\beyJ[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+");
    /** credenciais embutidas em URL: scheme://user:pass@host */
    private static final Pattern URL_CREDENTIALS = Pattern.compile("(?i)(\\b[a-z][a-z0-9+.-]*://[^/\\s:@]+:)([^@\\s/]+)(@)");

    @Override
    public String convert(ILoggingEvent event) {
        return mask(super.convert(event));
    }

    public static String mask(String message) {
        if (message == null || message.isEmpty()) {
            return message;
        }
        String out = URL_CREDENTIALS.matcher(message).replaceAll("$1" + MASK + "$3");
        out = BEARER.matcher(out).replaceAll("Bearer " + MASK);
        out = JWT.matcher(out).replaceAll(MASK);
        out = KEY_VALUE.matcher(out).replaceAll("$1$2" + MASK);
        return out;
    }
}

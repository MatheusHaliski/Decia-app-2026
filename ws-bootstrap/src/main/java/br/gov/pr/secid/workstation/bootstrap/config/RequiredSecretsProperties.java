package br.gov.pr.secid.workstation.bootstrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Segredos obrigatórios por ambiente ({@code ws.secrets.*}). O application.yml mapeia cada NOME de variável para o seu
 * valor ({@code "[WS_DB_PASSWORD]": ${WS_DB_PASSWORD:}}); com {@code enforce=true} (perfil {@code prod}) qualquer valor
 * vazio derruba o boot — listando só os nomes, nunca os valores (RequiredSecretsGuard). Um nome composto
 * {@code "[A|B]"} mapeia a concatenação {@code ${A:}${B:}}: basta UMA das variáveis ter valor (D-24: chave JWT por
 * caminho OU por PEM).
 *
 * @param enforce  liga a verificação (prod); em dev/test o aviso vai só para o log
 * @param required nome da variável de ambiente → valor resolvido
 */
@Validated
@ConfigurationProperties(prefix = "ws.secrets")
public record RequiredSecretsProperties(boolean enforce, Map<String, String> required) {

    public RequiredSecretsProperties {
        required = required == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(required));
    }

    /** Nomes (ordenados) das variáveis obrigatórias cujo valor está ausente ou em branco. */
    public List<String> missing() {
        return required.entrySet().stream()
                .filter(e -> e.getValue() == null || e.getValue().isBlank())
                .map(Map.Entry::getKey)
                .sorted()
                .toList();
    }
}

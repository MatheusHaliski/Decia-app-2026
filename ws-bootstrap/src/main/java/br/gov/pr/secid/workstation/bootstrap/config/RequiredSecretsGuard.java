package br.gov.pr.secid.workstation.bootstrap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Falha o boot em produção quando um segredo obrigatório está vazio (ARQUITETURA §3.3: nenhuma senha padrão).
 * Roda na inicialização dos singletons — antes de qualquer conexão — e a mensagem traz só os NOMES das variáveis.
 */
@Configuration
@EnableConfigurationProperties(RequiredSecretsProperties.class)
public class RequiredSecretsGuard implements InitializingBean {
    private static final Logger log = LoggerFactory.getLogger(RequiredSecretsGuard.class);

    private final RequiredSecretsProperties props;

    public RequiredSecretsGuard(RequiredSecretsProperties props) {
        this.props = props;
    }

    @Override
    public void afterPropertiesSet() {
        check(props);
    }

    static void check(RequiredSecretsProperties props) {
        List<String> missing = props.missing();
        if (missing.isEmpty()) {
            log.info("Segredos obrigatórios conferidos: {} variável(is) presente(s)", props.required().size());
            return;
        }
        String names = String.join(", ", missing);
        if (props.enforce()) {
            throw new IllegalStateException("Variáveis de ambiente obrigatórias ausentes ou vazias: " + names
                    + ". Defina-as no ambiente (ver .env.example e docs/seguranca/SEGURANCA.md) — a API não sobe sem elas.");
        }
        log.warn("Segredos ausentes neste ambiente (tolerado fora de prod): {}", names);
    }
}

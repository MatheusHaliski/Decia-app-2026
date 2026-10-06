package br.gov.pr.secid.workstation.web.config;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Configuration;

/**
 * Contrato OpenAPI (D-71): {@link CurrentUser} e {@link RequestContext} vêm do {@code CurrentUserArgumentResolver}
 * (JWT + IP/User-Agent da requisição), não do cliente. Sem isto o springdoc os publica como query params
 * {@code user}/{@code ctx} obrigatórios e o {@code lib/api/schema.d.ts} gerado mente sobre a API (Codex, PR #38).
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    static {
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentUser.class, RequestContext.class);
    }
}

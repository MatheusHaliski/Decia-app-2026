package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;
import java.util.UUID;

/**
 * Injeta {@link CurrentUser} (do JWT: {@code sub}, {@code role}, {@code sid}) e {@link RequestContext} (IP do
 * {@link ClientIpResolver} + User-Agent) nos controllers. Papel desconhecido no claim → {@code 403 ACESSO_NEGADO}.
 */
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver, WebMvcConfigurer {
    private final ClientIpResolver clientIp;

    public CurrentUserArgumentResolver(ClientIpResolver clientIp) {
        this.clientIp = clientIp;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(this);
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return CurrentUser.class.equals(parameter.getParameterType()) || RequestContext.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav, NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        if (RequestContext.class.equals(parameter.getParameterType())) {
            return context(request);
        }
        return currentUser();
    }

    public RequestContext context(HttpServletRequest request) {
        if (request == null) {
            return RequestContext.NONE;
        }
        return new RequestContext(clientIp.resolve(request), request.getHeader("User-Agent"));
    }

    public static CurrentUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken token)) {
            throw ApiException.unauthorized("Autenticação necessária.");
        }
        String roleClaim = token.getToken().getClaimAsString("role");
        Role role;
        try {
            role = Role.valueOf(roleClaim == null ? "" : roleClaim);
        } catch (IllegalArgumentException e) {
            throw ApiException.forbidden("Você não tem permissão para esta ação.");
        }
        String subject = token.getToken().getSubject();
        String sid = token.getToken().getClaimAsString("sid");
        if (subject == null) {
            throw ApiException.unauthorized("Token sem identidade válida.");
        }
        try {
            return new CurrentUser(UUID.fromString(subject), role, sid == null ? null : UUID.fromString(sid));
        } catch (IllegalArgumentException e) {
            throw ApiException.unauthorized("Token sem identidade válida.");
        }
    }
}

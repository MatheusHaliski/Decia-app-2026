package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.Method;
import java.util.Arrays;

/**
 * Rede de segurança contra BOLA esquecido (D-65): todo handler com {@code @PathVariable} que não seja {@link AuthorizationExempt} só
 * escreve o corpo se o {@code ResourceAuthorizer} marcou o {@link AuthorizationTrail} nesta requisição. Sem a marca, a resposta vira
 * {@code 500 ERRO_INTERNO} (o dado nunca sai) e o log aponta o handler. O interceptor limpa a trilha no início e no fim de cada
 * requisição (threads do servidor são reaproveitadas).
 */
@ControllerAdvice
public class AuthorizationEnforcementAdvice implements ResponseBodyAdvice<Object>, WebMvcConfigurer {
    private static final Logger log = LoggerFactory.getLogger(AuthorizationEnforcementAdvice.class);

    /** Handlers que exigem a trilha: têm id no caminho e não são isentos. */
    static boolean requiresTrail(Method m) {
        if (m == null || m.isAnnotationPresent(AuthorizationExempt.class)) {
            return false;
        }
        return Arrays.stream(m.getParameters()).anyMatch(p -> p.isAnnotationPresent(PathVariable.class));
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return requiresTrail(returnType.getMethod());
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType, ServerHttpRequest request,
                                  ServerHttpResponse response) {
        if (!AuthorizationTrail.checked()) {
            Method m = returnType.getMethod();
            String handler = m == null ? "?" : m.getDeclaringClass().getSimpleName() + "." + m.getName();
            log.error("BOLA: {} respondeu sem passar pelo ResourceAuthorizer — resposta bloqueada", handler);
            throw new IllegalStateException("handler com id no caminho sem autorização de recurso: " + handler);
        }
        return body;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                AuthorizationTrail.clear();
                return true;
            }

            @Override
            public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
                AuthorizationTrail.clear();
            }
        });
    }
}

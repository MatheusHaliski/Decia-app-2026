package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** 403 em JSON ({@code ApiError}) com registro no log (o audit_log chega no Bloco 2). */
@Component
public class ApiErrorAccessDeniedHandler implements AccessDeniedHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiErrorAccessDeniedHandler.class);
    private final ErrorWriter errors;

    public ApiErrorAccessDeniedHandler(ErrorWriter errors) {
        this.errors = errors;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {
        log.warn("Acesso negado em {} {}", request.getMethod(), request.getRequestURI());
        errors.write(request, response, 403, ApiException.ACESSO_NEGADO, "Você não tem permissão para esta ação.");
    }
}

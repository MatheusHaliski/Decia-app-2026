package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** 401 em JSON ({@code ApiError}) para requisição sem token ou com token inválido — nunca a página HTML padrão. */
@Component
public class ApiErrorAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ErrorWriter errors;

    public ApiErrorAuthenticationEntryPoint(ErrorWriter errors) {
        this.errors = errors;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        response.setHeader("WWW-Authenticate", "Bearer");
        errors.write(request, response, 401, ApiException.NAO_AUTENTICADO, "Autenticação necessária.");
    }
}

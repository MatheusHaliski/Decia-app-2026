package br.gov.pr.secid.workstation.web.error;

import br.gov.pr.secid.workstation.application.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduz toda falha em {@link ApiError} (ARQUITETURA §3.3): a UI nunca recebe stack trace, HTML de erro nem mensagem
 * interna de exceção — só um código estável, uma mensagem exibível e o correlationId para procurar no log.
 * Mapeamento: 400 corpo/parâmetro inválido · 401 não autenticado · 403 acesso negado · 404 não encontrado ·
 * 405/413/415 protocolo · 409 conflito/edição concorrente · 422 validação · 429 limite · 503 dependência fora · 500 genérico.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> api(ApiException ex, HttpServletRequest req) {
        if (ex.status() >= 500) {
            log.warn("{} {} -> {} {}", req.getMethod(), req.getRequestURI(), ex.status(), ex.code());
        }
        return respond(req, ex.status(), ex.code(), ex.getMessage(), ex.details());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return respond(req, 422, ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> constraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> fields.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        return respond(req, 422, ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return respond(req, 400, "JSON_INVALIDO", "O corpo da requisição não é um JSON válido.", Map.of());
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<ApiError> badParam(Exception ex, HttpServletRequest req) {
        String name = ex instanceof MethodArgumentTypeMismatchException m ? m.getName()
                : ((MissingServletRequestParameterException) ex).getParameterName();
        return respond(req, 400, "PARAMETRO_INVALIDO", "Parâmetro ausente ou inválido: " + name + ".", Map.of("parameter", name));
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> unauthenticated(AuthenticationException ex, HttpServletRequest req) {
        return respond(req, 401, ApiException.NAO_AUTENTICADO, "Autenticação necessária.", Map.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> accessDenied(AccessDeniedException ex, HttpServletRequest req) {
        log.warn("Acesso negado em {} {}", req.getMethod(), req.getRequestURI());
        return respond(req, 403, ApiException.ACESSO_NEGADO, "Você não tem permissão para esta ação.", Map.of());
    }

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    ResponseEntity<ApiError> notFound(Exception ex, HttpServletRequest req) {
        return respond(req, 404, ApiException.NAO_ENCONTRADO, "Endereço não encontrado.", Map.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return respond(req, 405, "METODO_NAO_SUPORTADO", "Operação não suportada neste endereço.", Map.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tooLarge(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return respond(req, 413, "ARQUIVO_GRANDE", "O arquivo passa do limite permitido.", Map.of());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> mediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest req) {
        return respond(req, 415, "FORMATO_NAO_SUPORTADO", "Formato de conteúdo não suportado.", Map.of());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<ApiError> concurrent(OptimisticLockingFailureException ex, HttpServletRequest req) {
        return respond(req, 409, "EDICAO_CONCORRENTE", "Este conteúdo foi alterado em outra sessão. Recarregue e tente de novo.", Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> integrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violação de integridade em {} {}", req.getMethod(), req.getRequestURI());
        return respond(req, 409, ApiException.CONFLITO, "Esta ação conflita com um registro existente.", Map.of());
    }

    @ExceptionHandler(TransientDataAccessException.class)
    ResponseEntity<ApiError> unavailable(TransientDataAccessException ex, HttpServletRequest req) {
        log.error("Dependência indisponível em {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getClass().getSimpleName());
        return respond(req, 503, ApiException.SERVICO_INDISPONIVEL, "Serviço temporariamente indisponível. Tente de novo em instantes.", Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest req) {
        // a stack trace fica só no log do servidor (com o correlationId do MDC); o cliente recebe o código genérico
        log.error("Erro inesperado em {} {}", req.getMethod(), req.getRequestURI(), ex);
        return respond(req, 500, ApiException.ERRO_INTERNO, "Algo deu errado do nosso lado. Informe o código de correlação ao suporte.", Map.of());
    }

    private static ResponseEntity<ApiError> respond(HttpServletRequest req, int status, String code, String message,
                                                    Map<String, Object> details) {
        return ResponseEntity.status(status).body(ErrorWriter.of(req, status, code, message, details));
    }
}

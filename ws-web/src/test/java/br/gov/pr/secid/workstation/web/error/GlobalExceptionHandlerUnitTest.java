package br.gov.pr.secid.workstation.web.error;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Handlers que a fatia MVC não dispara com facilidade (validação de método, upload grande). */
class GlobalExceptionHandlerUnitTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");

    @Test
    void violacaoDeConstraintVira422ComCaminhoDoCampo() {
        @SuppressWarnings("unchecked")
        ConstraintViolation<Object> v = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("criar.arg0.email");
        when(v.getPropertyPath()).thenReturn(path);
        when(v.getMessage()).thenReturn("formato inválido");
        ResponseEntity<ApiError> r = handler.constraint(new ConstraintViolationException(Set.of(v)), req);
        assertThat(r.getStatusCode().value()).isEqualTo(422);
        assertThat(r.getBody().code()).isEqualTo("VALIDACAO");
        assertThat(r.getBody().details()).containsKey("fields");
        assertThat(r.getBody().path()).isEqualTo("/api/x");
        assertThat(r.getBody().timestamp()).isNotNull();
    }

    @Test
    void uploadGrandeVira413() {
        ResponseEntity<ApiError> r = handler.tooLarge(new MaxUploadSizeExceededException(1), req);
        assertThat(r.getStatusCode().value()).isEqualTo(413);
        assertThat(r.getBody().code()).isEqualTo("ARQUIVO_GRANDE");
    }
}

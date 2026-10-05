package br.gov.pr.secid.workstation.web.error;

import br.gov.pr.secid.workstation.application.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Controller só de teste: cada rota provoca uma falha para o GlobalExceptionHandler traduzir. */
@RestController
public class ProbeController {

    record Body(@NotBlank String name) {
    }

    @GetMapping("/probe/ok")
    Map<String, String> ok() {
        return Map.of("ok", "true");
    }

    @PostMapping("/probe/body")
    Map<String, String> body(@Valid @RequestBody Body body) {
        return Map.of("name", body.name());
    }

    @GetMapping("/probe/param")
    Map<String, Integer> param(@RequestParam int n) {
        return Map.of("n", n);
    }

    @GetMapping("/probe/api")
    void api(@RequestParam int status) {
        throw new ApiException("CODIGO_DE_TESTE", status, "Mensagem de negócio", Map.of("k", "v"));
    }

    @GetMapping("/probe/unauthenticated")
    void unauthenticated() {
        throw new BadCredentialsException("x");
    }

    @GetMapping("/probe/forbidden")
    void forbidden() {
        throw new AccessDeniedException("x");
    }

    @GetMapping("/probe/conflict")
    void conflict() {
        throw new DataIntegrityViolationException("duplicate key (segredo=abc)");
    }

    @GetMapping("/probe/concurrent")
    void concurrent() {
        throw new OptimisticLockingFailureException("x");
    }

    @GetMapping("/probe/unavailable")
    void unavailable() {
        throw new TransientDataAccessResourceException("x");
    }

    @GetMapping("/probe/boom")
    void boom() {
        throw new IllegalStateException("detalhe interno com senha=supersecreta");
    }
}

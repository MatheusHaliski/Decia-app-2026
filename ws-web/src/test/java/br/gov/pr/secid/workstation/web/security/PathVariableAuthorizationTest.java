package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste-guarda do D-65 ("impossível esquecer"): TODO handler de {@code @RestController} com {@code @PathVariable} declara
 * {@link AuthorizedBy} (nomeando um método público existente do {@link ResourceAuthorizer}) ou {@link AuthorizationExempt} com motivo.
 * Um controller novo com {@code /{id}} sem uma das duas anotações quebra o build aqui; se tiver a anotação mas o serviço não chamar
 * o authorizer, o {@link AuthorizationEnforcementAdvice} bloqueia a resposta (testado no {@code AuthorizationMatrixWebTest}).
 */
class PathVariableAuthorizationTest {
    static final Set<String> AUTHORIZER_METHODS = Arrays.stream(ResourceAuthorizer.class.getMethods())
            .filter(m -> m.getDeclaringClass() == ResourceAuthorizer.class && !Modifier.isStatic(m.getModifiers()))
            .map(Method::getName).collect(Collectors.toSet());

    static List<String> violations(Class<?> controller) {
        List<String> out = new ArrayList<>();
        for (Method m : controller.getDeclaredMethods()) {
            boolean pathVar = Arrays.stream(m.getParameters()).anyMatch(p -> p.isAnnotationPresent(PathVariable.class));
            if (!pathVar) {
                continue;
            }
            String where = controller.getSimpleName() + "." + m.getName();
            AuthorizedBy by = m.getAnnotation(AuthorizedBy.class);
            AuthorizationExempt exempt = m.getAnnotation(AuthorizationExempt.class);
            if (by == null && exempt == null) {
                out.add(where + ": @PathVariable sem @AuthorizedBy nem @AuthorizationExempt");
            } else if (by != null && exempt != null) {
                out.add(where + ": @AuthorizedBy e @AuthorizationExempt ao mesmo tempo");
            } else if (by != null && !AUTHORIZER_METHODS.contains(by.value())) {
                out.add(where + ": @AuthorizedBy(\"" + by.value() + "\") não é método do ResourceAuthorizer");
            } else if (exempt != null && exempt.reason().strip().length() < 20) {
                out.add(where + ": @AuthorizationExempt precisa de motivo (≥ 20 caracteres)");
            }
        }
        return out;
    }

    static List<Class<?>> restControllers() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scan = new ClassPathScanningCandidateComponentProvider(false);
        scan.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Class<?>> out = new ArrayList<>();
        for (BeanDefinition bd : scan.findCandidateComponents("br.gov.pr.secid.workstation")) {
            out.add(Class.forName(bd.getBeanClassName()));
        }
        return out;
    }

    @Test
    void todoHandlerComIdNoCaminhoPassaPeloAuthorizerOuTemIsencaoComMotivo() throws Exception {
        List<Class<?>> controllers = restControllers();
        assertThat(controllers).as("controllers encontrados").extracting(Class::getSimpleName).contains("MeController", "RegistrationController");
        List<String> all = new ArrayList<>();
        for (Class<?> c : controllers) {
            all.addAll(violations(c));
        }
        assertThat(all).isEmpty();
    }

    @Test
    void oProprioGuardaPegaControllerEsquecido() {
        assertThat(violations(Forgotten.class)).singleElement().asString().contains("Forgotten.get").contains("sem @AuthorizedBy");
        assertThat(violations(WrongName.class)).singleElement().asString().contains("não é método do ResourceAuthorizer");
        assertThat(violations(LazyExemption.class)).singleElement().asString().contains("precisa de motivo");
        assertThat(violations(Both.class)).singleElement().asString().contains("ao mesmo tempo");
        assertThat(AUTHORIZER_METHODS).contains("requireSelfOrAdmin", "require", "requireDecision", "requireMedia", "ownAccount");
        assertThat(AuthorizationEnforcementAdvice.requiresTrail(null)).isFalse();
    }

    /** Sem {@code @RestController} de propósito: não pode entrar no scan das fatias MVC. */
    static class Forgotten {
        @GetMapping("/x/{id}")
        String get(@PathVariable UUID id) {
            return "x";
        }
    }

    /** Sem {@code @RestController} de propósito: não pode entrar no scan das fatias MVC. */
    static class WrongName {
        @GetMapping("/y/{id}")
        @AuthorizedBy("checaQualquerCoisa")
        String get(@PathVariable UUID id) {
            return "y";
        }
    }

    /** Sem {@code @RestController} de propósito: não pode entrar no scan das fatias MVC. */
    static class LazyExemption {
        @GetMapping("/z/{id}")
        @AuthorizationExempt(reason = "porque sim")
        String get(@PathVariable UUID id) {
            return "z";
        }
    }

    /** Sem {@code @RestController} de propósito: não pode entrar no scan das fatias MVC. */
    static class Both {
        @GetMapping("/w/{id}")
        @AuthorizedBy("require")
        @AuthorizationExempt(reason = "isenção que não deveria estar aqui junto")
        String get(@PathVariable UUID id) {
            return "w";
        }
    }
}

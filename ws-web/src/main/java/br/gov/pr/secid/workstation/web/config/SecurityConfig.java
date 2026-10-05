package br.gov.pr.secid.workstation.web.config;

import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.security.ApiErrorAccessDeniedHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAuthenticationEntryPoint;
import br.gov.pr.secid.workstation.web.security.SessionActiveFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Clock;
import java.util.List;

/**
 * Segurança da API (ARQUITETURA §3.3): stateless, JWT RS256 próprio (OAuth2 Resource Server), papel vindo do claim
 * {@code role}. Público: {@code GET /actuator/health}, OpenAPI (desligável em prod) e as rotas de entrada da
 * autenticação (login, refresh, cadastro, verificação de e-mail, redefinição de senha, OIDC, consulta de username) —
 * todas limitadas por IP pelo {@code AuthRateLimitFilter}, que roda ANTES desta cadeia. O resto do Actuator exige
 * ADMIN; qualquer outra rota exige um papel conhecido ({@code USER} ou {@code ADMIN}) — claim desconhecido é 403.
 * Depois do Bearer, o {@link SessionActiveFilter} recusa {@code sid} revogado. 401/403 saem em JSON ({@code ApiError}).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** Rotas de entrada (sem token); o AuthRateLimitFilter limita todas por IP. */
    static final String[] PUBLIC_POST = {
            "/api/auth/login", "/api/auth/refresh", "/api/auth/register",
            "/api/auth/email-verification/confirm", "/api/auth/email-verification/resend",
            "/api/auth/password-reset/request", "/api/auth/password-reset/confirm", "/api/auth/oidc/login"};
    static final String[] PUBLIC_GET = {"/api/usernames/*/availability", "/api/auth/username-suggestions"};

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            ApiErrorAuthenticationEntryPoint entryPoint,
                                            ApiErrorAccessDeniedHandler accessDenied,
                                            SessionStorePort sessions,
                                            ErrorWriter errors,
                                            Clock clock) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)                 // API stateless com Bearer: sem cookie de sessão
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // OWASP A05 — a API só devolve JSON: nada nela pode ser embutido nem executar script
                .headers(h -> h
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                                "camera=(), microphone=(), geolocation=(), payment=(), usb=()"))
                        .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin")))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(entryPoint).accessDeniedHandler(accessDenied))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.POST, PUBLIC_POST).permitAll()
                        .requestMatchers(HttpMethod.GET, PUBLIC_GET).permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        .anyRequest().hasAnyRole("USER", "ADMIN"))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(accessDenied)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .addFilterAfter(new SessionActiveFilter(sessions, errors, clock), BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    static JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String role = jwt.getClaimAsString("role");
            return role == null || role.isBlank() ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
        });
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(WsSecurityProperties props) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(props.cors().allowedOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Correlation-Id", "Accept-Language"));
        cors.setExposedHeaders(List.of("X-Correlation-Id", "Content-Disposition", "Retry-After"));
        cors.setAllowCredentials(true);
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}

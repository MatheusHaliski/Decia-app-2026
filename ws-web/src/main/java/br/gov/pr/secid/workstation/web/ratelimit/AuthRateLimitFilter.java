package br.gov.pr.secid.workstation.web.ratelimit;

import br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Limite por IP+método+rota nas rotas de autenticação e step-up (SEG RN49.04/RN49.05, CA04), rodando <b>antes</b> do
 * Spring Security: o balde é reservado no {@link RateLimitPort} com o IP do {@link ClientIpResolver} (IPv6 por /64);
 * estourou → {@code 429 MUITAS_TENTATIVAS} + {@code Retry-After}. Nas rotas que calculam Argon2 ({@code hashes}),
 * passa também pelo {@link HashBulkhead}: sem vaga em 2 s → {@code 503 AUTENTICACAO_OCUPADA} + {@code Retry-After},
 * e a vaga volta em {@code finally}. Rotas fora de {@link #RULES} não são tocadas.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    public static final String MUITAS_TENTATIVAS = "MUITAS_TENTATIVAS";
    public static final String AUTENTICACAO_OCUPADA = "AUTENTICACAO_OCUPADA";
    private static final Logger log = LoggerFactory.getLogger(AuthRateLimitFilter.class);
    private static final Duration DEZ_MIN = Duration.ofMinutes(10);
    private static final Duration UMA_HORA = Duration.ofHours(1);

    /** Regra por método+rota (exata). {@code hashes} = a rota avalia Argon2 e passa pelo bulkhead. */
    public record Rule(String method, String path, int limit, Duration window, boolean hashes) {
        public boolean matches(String method, String path) {
            return this.method.equalsIgnoreCase(method) && this.path.equals(path);
        }

        /** Nome do balde: {@code post:/api/auth/login}. */
        public String bucket() {
            return method.toLowerCase(Locale.ROOT) + ":" + path;
        }
    }

    public static final List<Rule> RULES = List.of(
            new Rule("POST", "/api/auth/login", 30, DEZ_MIN, true),
            new Rule("POST", "/api/auth/register", 10, UMA_HORA, true),
            new Rule("POST", "/api/auth/refresh", 120, DEZ_MIN, false),
            new Rule("POST", "/api/auth/password-reset", 10, UMA_HORA, false),
            new Rule("POST", "/api/auth/password-reset/confirm", 20, UMA_HORA, true),
            new Rule("PUT", "/api/me/password", 20, UMA_HORA, true),
            new Rule("PATCH", "/api/me/sensitive", 30, UMA_HORA, true),
            new Rule("POST", "/api/me/deletion", 10, UMA_HORA, true),
            new Rule("GET", "/api/auth/username/availability", 120, DEZ_MIN, false),
            new Rule("GET", "/api/auth/username/suggestions", 60, DEZ_MIN, false),
            new Rule("POST", "/api/auth/uploads", 40, UMA_HORA, false));

    private final RateLimitPort rateLimit;
    private final ClientIpResolver clientIp;
    private final HashBulkhead bulkhead;
    private final ErrorWriter errors;
    private final Clock clock;

    @Autowired
    public AuthRateLimitFilter(RateLimitPort rateLimit, ClientIpResolver clientIp, HashBulkhead bulkhead, ErrorWriter errors) {
        this(rateLimit, clientIp, bulkhead, errors, Clock.systemUTC());
    }

    public AuthRateLimitFilter(RateLimitPort rateLimit, ClientIpResolver clientIp, HashBulkhead bulkhead, ErrorWriter errors,
                               Clock clock) {
        this.rateLimit = rateLimit;
        this.clientIp = clientIp;
        this.bulkhead = bulkhead;
        this.errors = errors;
        this.clock = clock;
    }

    public static Optional<Rule> ruleFor(String method, String path) {
        return RULES.stream().filter(r -> r.matches(method, path)).findFirst();
    }

    /** Dono do balde: {@code ip:<ipv4>} ou {@code ip:<prefixo/64>}. */
    public static String bucketKey(String ip) {
        return "ip:" + ClientIpResolver.bucketOwner(ip);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<Rule> matched = ruleFor(request.getMethod(), path(request));
        if (matched.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        Rule rule = matched.get();
        String owner = bucketKey(clientIp.resolve(request));
        if (!rateLimit.tryAcquire(owner, rule.bucket(), rule.limit(), rule.window())) {
            QuotaStatus status = rateLimit.status(owner, rule.bucket(), rule.limit(), rule.window());
            long retryAfter = Math.max(1, status.retryAfterSeconds(clock.instant()));
            log.warn("Limite por IP estourado em {} (balde {}, {} em {})", rule.bucket(), owner, rule.limit(), rule.window());
            reject(request, response, 429, retryAfter, MUITAS_TENTATIVAS, "Muitas tentativas. Aguarde e tente de novo.");
            return;
        }
        if (!rule.hashes()) {
            chain.doFilter(request, response);
            return;
        }
        if (!bulkhead.tryAcquire()) {
            log.warn("Teto de hashes atingido em {}: {} vagas, espera de {} ms", rule.bucket(), bulkhead.capacity(), bulkhead.waitMillis());
            reject(request, response, 503, Math.max(1, bulkhead.waitMillis() / 1000), AUTENTICACAO_OCUPADA,
                    "Serviço de autenticação ocupado. Tente de novo em instantes.");
            return;
        }
        try {
            chain.doFilter(request, response);
        } finally {
            bulkhead.release();
        }
    }

    private static String path(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String ctx = request.getContextPath();
        return ctx != null && !ctx.isEmpty() && uri.startsWith(ctx) ? uri.substring(ctx.length()) : uri;
    }

    private void reject(HttpServletRequest request, HttpServletResponse response, int status, long retryAfter, String code,
                        String message) throws IOException {
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        errors.write(request, response, status, code, message);
    }
}

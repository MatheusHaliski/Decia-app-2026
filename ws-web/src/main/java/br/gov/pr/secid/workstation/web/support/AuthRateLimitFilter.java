package br.gov.pr.secid.workstation.web.support;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.security.HashBulkhead;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Freios das rotas de autenticação, ANTES do Spring Security (D-14, RF1.CA08, RF2.CA10/CA11):
 * <ol>
 *   <li><b>Limite por IP + método + rota</b>: o bloqueio por conta não segura o "credential stuffing" que troca de conta
 *       a cada tentativa nem a criação de contas em massa. O IP vem do {@link ClientIpResolver} (nunca X-Forwarded-For);
 *       IPv6 conta por /64. A regra casa com o método e o caminho normalizado ({@link RequestPaths}).</li>
 *   <li><b>Bulkhead de hashes</b> ({@link HashBulkhead}) nas rotas que calculam Argon2: excedente recebe 503 +
 *       Retry-After em vez de esgotar o pool do banco.</li>
 * </ol>
 * Respostas no formato {@code ApiError}: {@code 429 MUITAS_TENTATIVAS} e {@code 503 AUTENTICACAO_OCUPADA}, ambas com
 * {@code Retry-After}. Se o {@link RateLimitPort} falhar (Redis fora do ar), o filtro <b>fecha</b> a rota com
 * {@code 503 SERVICO_INDISPONIVEL} + {@code Retry-After} no mesmo contrato: o {@code GlobalExceptionHandler} ainda não está
 * no caminho, porque o filtro roda antes do DispatcherServlet. Desligável por
 * {@code ws.security.auth-rate-limit.enabled=false} (só para testes locais).
 */
@Component
@Order(AuthRateLimitFilter.ORDER)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    /** Antes da cadeia do Spring Security (-100) e depois do CorrelationIdFilter (HIGHEST_PRECEDENCE). */
    public static final int ORDER = -102;
    public static final String MUITAS_TENTATIVAS = "MUITAS_TENTATIVAS";
    public static final String AUTENTICACAO_OCUPADA = "AUTENTICACAO_OCUPADA";
    /** Retry-After quando o armazenamento do limite falha (fail closed). */
    static final long STORE_RETRY_AFTER_SECONDS = 5;

    /** {@code *} casa com exatamente um segmento. {@code hashes}: a rota calcula Argon2 (entra no bulkhead). */
    public record Rule(String method, String path, int limit, Duration window, boolean hashes) {
        boolean matches(String m, String p) {
            if (!method.equalsIgnoreCase(m)) {
                return false;
            }
            String[] want = path.split("/");
            String[] got = p.split("/");
            if (want.length != got.length) {
                return false;
            }
            for (int i = 0; i < want.length; i++) {
                if (!want[i].equals("*") && !want[i].equals(got[i])) {
                    return false;
                }
            }
            return true;
        }

        String bucket() {
            return "ip:" + method.toLowerCase(java.util.Locale.ROOT) + path.replace('/', ':').replace("*", "_");
        }
    }

    /** Tabela do brief (Bloco 3). Rotas de OIDC, 2FA e código de verificação incluídas. */
    public static final List<Rule> RULES = List.of(
            new Rule("POST", "/api/auth/login", 30, Duration.ofMinutes(10), true),
            new Rule("POST", "/api/auth/register", 10, Duration.ofHours(1), true),
            new Rule("POST", "/api/auth/refresh", 120, Duration.ofMinutes(10), false),
            new Rule("POST", "/api/auth/password-reset/request", 10, Duration.ofHours(1), false),
            new Rule("POST", "/api/auth/password-reset/confirm", 20, Duration.ofHours(1), true),
            new Rule("PUT", "/api/auth/password", 20, Duration.ofHours(1), true),
            new Rule("PATCH", "/api/me/sensitive", 30, Duration.ofHours(1), true),
            new Rule("POST", "/api/me/deletion", 10, Duration.ofHours(1), true),
            new Rule("GET", "/api/usernames/*/availability", 120, Duration.ofMinutes(10), false),
            new Rule("GET", "/api/auth/username-suggestions", 60, Duration.ofMinutes(10), false),
            new Rule("POST", "/api/auth/uploads", 40, Duration.ofHours(1), false),
            // códigos de verificação de e-mail (RF1.CA11): reenvio e confirmação
            new Rule("POST", "/api/auth/email-verification/resend", 10, Duration.ofHours(1), false),
            new Rule("POST", "/api/auth/email-verification/confirm", 20, Duration.ofHours(1), false),
            // OIDC institucional (RF2.CA03/CA12) e 2FA (contrato reservado, Q-83)
            new Rule("POST", "/api/auth/oidc/login", 30, Duration.ofMinutes(10), false),
            new Rule("POST", "/api/auth/two-factor/verify", 20, Duration.ofMinutes(10), false));

    private final RateLimitPort rateLimit;
    private final ClientIpResolver clientIp;
    private final HashBulkhead bulkhead;
    private final ErrorWriter errors;
    private final boolean enabled;
    private final List<String> origins;

    @Autowired
    public AuthRateLimitFilter(RateLimitPort rateLimit, ClientIpResolver clientIp, HashBulkhead bulkhead, ErrorWriter errors,
                               WsSecurityProperties props,
                               @Value("${ws.security.auth-rate-limit.enabled:true}") boolean enabled) {
        this.rateLimit = rateLimit;
        this.clientIp = clientIp;
        this.bulkhead = bulkhead;
        this.errors = errors;
        this.enabled = enabled;
        this.origins = props.cors().allowedOrigins();
    }

    public static Optional<Rule> ruleFor(String method, String path) {
        return RULES.stream().filter(r -> r.matches(method, path)).findFirst();
    }

    /** Dono do balde: o IP; IPv6 pelo prefixo /64 (um cliente controla 2^64 endereços — cada um abriria um balde novo). */
    public static String bucketKey(String ip) {
        if (ip == null || ip.indexOf(':') < 0) {
            return ip;
        }
        int zone = ip.indexOf('%');
        String literal = zone >= 0 ? ip.substring(0, zone) : ip;
        try {
            byte[] b = InetAddress.getByName(literal).getAddress();
            if (b.length == 4) {
                return InetAddress.getByAddress(b).getHostAddress();      // ::ffff:a.b.c.d conta como o IPv4
            }
            return HexFormat.of().formatHex(b, 0, 8) + "::/64";
        } catch (UnknownHostException e) {
            return ip;
        }
    }

    static UUID owner(String ip) {
        return UUID.nameUUIDFromBytes(("ip:" + bucketKey(ip)).getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !enabled || ruleFor(req.getMethod(), RequestPaths.normalized(req)).isEmpty();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = ruleFor(req.getMethod(), RequestPaths.normalized(req)).orElseThrow();
        UUID owner = owner(clientIp.resolve(req));
        boolean acquired;
        long retry = 0;
        try {
            acquired = rateLimit.tryAcquire(owner, rule.bucket(), rule.limit(), rule.window());
            if (!acquired) {
                retry = rateLimit.status(owner, rule.bucket(), rule.limit(), rule.window()).retryAfterSeconds(java.time.Instant.now());
            }
        } catch (RuntimeException e) {
            logger.error("Armazenamento do limite por IP indisponível em " + rule.bucket() + ": " + e + " — fechando a rota");
            reject(req, res, 503, STORE_RETRY_AFTER_SECONDS, ApiException.SERVICO_INDISPONIVEL,
                    "Serviço temporariamente indisponível. Tente de novo em instantes.");
            return;
        }
        if (!acquired) {
            reject(req, res, 429, retry, MUITAS_TENTATIVAS, "Muitas tentativas a partir deste endereço. Aguarde e tente de novo.");
            return;
        }
        if (!rule.hashes()) {
            chain.doFilter(req, res);
            return;
        }
        if (!bulkhead.tryAcquire()) {
            reject(req, res, 503, HashBulkhead.RETRY_AFTER_SECONDS, AUTENTICACAO_OCUPADA,
                    "A autenticação está ocupada neste momento. Tente de novo em instantes.");
            return;
        }
        try {
            chain.doFilter(req, res);
        } finally {
            bulkhead.release();
        }
    }

    private void reject(HttpServletRequest req, HttpServletResponse res, int status, long retryAfterSeconds, String code,
                        String message) throws IOException {
        // o CorsFilter fica na cadeia do Spring Security, que ainda não rodou: o navegador precisa ler o 429/503
        String origin = req.getHeader("Origin");
        // devolve o valor da LISTA (nunca o header cru): só uma origem configurada volta no Access-Control-Allow-Origin
        Optional<String> allowed = origin == null ? Optional.empty() : origins.stream().filter(origin::equals).findFirst();
        if (allowed.isPresent()) {
            res.setHeader("Access-Control-Allow-Origin", allowed.get());
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Access-Control-Expose-Headers", "Retry-After, " + CorrelationIdFilter.HEADER);
            res.addHeader("Vary", "Origin");
        }
        res.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        errors.write(req, res, status, code, message);
    }
}

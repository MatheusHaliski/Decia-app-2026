package br.gov.pr.secid.workstation.web.support;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;

/**
 * IP real de quem fez a requisição — única fonte para limite por IP, auditoria e sessões (D-14, RF2.CA10).
 * {@code X-Forwarded-For} NUNCA é usado: o valor mais à esquerda é escrito pelo próprio cliente. Ordem de confiança:
 * <ol>
 *   <li>cabeçalhos assinados pelo BFF Next.js: {@code X-Ws-Client-Ip}, {@code X-Ws-Proxy-Ts} (epoch em segundos) e
 *       {@code X-Ws-Proxy-Sig} = base64url sem preenchimento de HMAC-SHA256({@code EDGE_PROXY_SECRET}, ip + "|" + ts);
 *       só vale com o segredo configurado (≥ {@value #MIN_SECRET_LENGTH} caracteres), assinatura correta em tempo
 *       constante e relógio a no máximo {@value #MAX_SKEW_SECONDS} s;</li>
 *   <li>cabeçalho de valor único escrito pela borda ({@code ws.security.edge-ip-header}, padrão {@code X-Real-IP}),
 *       aceito <b>só</b> quando a conexão TCP vem de um proxy de confiança ({@code ws.security.edge-trusted-proxies},
 *       IPs ou CIDRs; lista vazia = cabeçalho ignorado, com WARN no boot) — senão qualquer cliente que alcance a API
 *       direto escolheria o próprio balde; header vazio também desliga;</li>
 *   <li>o endereço da conexão TCP (a requisição original, antes do ForwardedHeaderFilter).</li>
 * </ol>
 * Todo valor precisa ser um IP literal (nunca há consulta DNS); senão cai para a próxima fonte.
 */
@Component
public class ClientIpResolver {
    public static final String SIGNED_IP = "X-Ws-Client-Ip";
    public static final String SIGNED_TS = "X-Ws-Proxy-Ts";
    public static final String SIGNED_SIG = "X-Ws-Proxy-Sig";
    static final String ATTRIBUTE = ClientIpResolver.class.getName() + ".ip";
    static final long MAX_SKEW_SECONDS = 60;
    static final int MIN_SECRET_LENGTH = 32;
    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);
    private static final Pattern IPV4 = Pattern.compile(
            "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$");
    private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");

    private final byte[] edgeSecret;
    private final String header;
    private final List<Cidr> trustedProxies;
    private final LongSupplier nowEpochSeconds;

    @Autowired
    public ClientIpResolver(@Value("${ws.security.edge-proxy-secret:}") String edgeSecret,
                            @Value("${ws.security.edge-ip-header:X-Real-IP}") String header,
                            @Value("${ws.security.edge-trusted-proxies:}") List<String> trustedProxies) {
        this(edgeSecret, header, trustedProxies, () -> System.currentTimeMillis() / 1000);
    }

    public ClientIpResolver(String edgeSecret, String header, List<String> trustedProxies, LongSupplier nowEpochSeconds) {
        String secret = edgeSecret == null ? "" : edgeSecret.trim();
        boolean usable = secret.length() >= MIN_SECRET_LENGTH;
        if (secret.isEmpty()) {
            log.warn("EDGE_PROXY_SECRET ausente: a assinatura de IP do BFF está desligada; pedidos pelo BFF contam no IP"
                    + " do próprio BFF (um balde só para todos). Defina o mesmo segredo no BFF e aqui.");
        } else if (!usable) {
            log.warn("EDGE_PROXY_SECRET com {} caracteres (mínimo {}): assinatura de IP desligada; gere com openssl rand -hex 32",
                    secret.length(), MIN_SECRET_LENGTH);
        }
        this.edgeSecret = usable ? secret.getBytes(StandardCharsets.UTF_8) : null;
        this.header = header == null ? "" : header.trim();
        this.trustedProxies = trustedProxies == null ? List.of()
                : trustedProxies.stream().map(String::trim).filter(t -> !t.isEmpty()).map(Cidr::parse).toList();
        if (!this.header.isEmpty() && this.trustedProxies.isEmpty()) {
            log.warn("ws.security.edge-trusted-proxies vazio: o cabeçalho {} da borda será ignorado (vale o IP assinado e depois o"
                    + " endereço TCP). Liste os IPs/CIDRs da borda em WS_TRUSTED_PROXIES ou use só o IP assinado.", this.header);
        }
        this.nowEpochSeconds = nowEpochSeconds;
    }

    /** Proxies de confiança já interpretados (visível para testes). */
    List<Cidr> trustedProxies() {
        return trustedProxies;
    }

    /** O cabeçalho da borda está ligado (nome configurado e ao menos um proxy de confiança). */
    public boolean edgeHeaderEnabled() {
        return !header.isEmpty() && !trustedProxies.isEmpty();
    }

    /** A assinatura do BFF está ligada (segredo presente e com tamanho mínimo). */
    public boolean signedHeadersEnabled() {
        return edgeSecret != null;
    }

    /** IP do cliente, resolvido uma vez por requisição e guardado como atributo. */
    public String resolve(HttpServletRequest request) {
        Object cached = request.getAttribute(ATTRIBUTE);
        if (cached instanceof String ip) {
            return ip;
        }
        String ip = compute(request);
        request.setAttribute(ATTRIBUTE, ip);
        return ip;
    }

    private String compute(HttpServletRequest request) {
        if (edgeSecret != null) {
            String signed = signedIp(request.getHeader(SIGNED_IP), request.getHeader(SIGNED_TS), request.getHeader(SIGNED_SIG));
            if (signed != null) {
                return signed;
            }
        }
        String socket = socketAddress(request);
        if (edgeHeaderEnabled() && isTrustedProxy(socket)) {
            String trusted = literalIp(request.getHeader(header));
            if (trusted != null) {
                return trusted;
            }
        }
        return socket;
    }

    /** O endereço TCP (já normalizado) pertence a um dos proxies de confiança. */
    boolean isTrustedProxy(String socket) {
        String literal = literalIp(socket);
        if (literal == null) {
            return false;
        }
        InetAddress addr;
        try {
            addr = InetAddress.getByName(literal);      // literal validado acima: nunca DNS
        } catch (Exception e) {
            return false;
        }
        for (Cidr cidr : trustedProxies) {
            if (cidr.contains(addr)) {
                return true;
            }
        }
        return false;
    }

    /** Endereço da conexão: desembrulha até a requisição original do contêiner (antes do ForwardedHeaderFilter). */
    public static String socketAddress(ServletRequest request) {
        ServletRequest inner = request;
        while (inner instanceof ServletRequestWrapper wrapper) {
            inner = wrapper.getRequest();
        }
        String addr = inner.getRemoteAddr();
        String ip = literalIp(addr);
        return ip != null ? ip : addr;
    }

    String signedIp(String ip, String ts, String sig) {
        if (ip == null || ts == null || sig == null) {
            return null;
        }
        long when;
        try {
            when = Long.parseLong(ts.trim());
        } catch (NumberFormatException e) {
            return null;
        }
        if (Math.abs(nowEpochSeconds.getAsLong() - when) > MAX_SKEW_SECONDS) {
            return null;
        }
        String value = ip.trim();
        byte[] given;
        try {
            given = Base64.getUrlDecoder().decode(sig.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
        if (!MessageDigest.isEqual(sign(edgeSecret, value + "|" + ts.trim()), given)) {
            return null;
        }
        return literalIp(value);
    }

    static byte[] sign(byte[] secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Assinatura no formato que o BFF envia (base64url sem preenchimento) — usada nos testes e na documentação do BFF. */
    public static String signature(String secret, String ip, long ts) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(sign(secret.getBytes(StandardCharsets.UTF_8), ip + "|" + ts));
    }

    /**
     * IP literal normalizado (IPv6 canônico; IPv4 mapeado em IPv6 vira IPv4) ou {@code null}. Só chega ao
     * {@link InetAddress#getByName} texto já validado como IPv4 ou com ':' — tratado como literal, nunca resolvido por DNS.
     */
    static String literalIp(String raw) {
        if (raw == null) {
            return null;
        }
        String v = raw.trim();
        if (v.startsWith("[") && v.endsWith("]")) {
            v = v.substring(1, v.length() - 1);
        }
        if (IPV4.matcher(v).matches()) {
            return v;
        }
        if (v.indexOf(':') < 0 || !IPV6_CHARS.matcher(v).matches()) {
            return null;
        }
        try {
            InetAddress addr = InetAddress.getByName(v);
            return addr instanceof Inet6Address six ? six.getHostAddress() : addr.getHostAddress();
        } catch (Exception e) {
            return null;
        }
    }

    /** IP único ou bloco CIDR ({@code 10.0.0.0/8}, {@code fd00::/8}) da borda de confiança. Inválido derruba o boot. */
    static final class Cidr {
        private final byte[] address;
        private final int bits;

        private Cidr(byte[] address, int bits) {
            this.address = address;
            this.bits = bits;
        }

        static Cidr parse(String spec) {
            String v = spec.trim();
            int slash = v.indexOf('/');
            String literal = literalIp(slash < 0 ? v : v.substring(0, slash));
            if (literal == null) {
                throw new IllegalArgumentException("edge-trusted-proxies: '" + spec + "' não é IP nem CIDR literal");
            }
            byte[] addr;
            try {
                addr = InetAddress.getByName(literal).getAddress();
            } catch (Exception e) {
                throw new IllegalArgumentException("edge-trusted-proxies: '" + spec + "' não é IP nem CIDR literal", e);
            }
            int max = addr.length * 8;
            int bits = max;
            if (slash >= 0) {
                try {
                    bits = Integer.parseInt(v.substring(slash + 1));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("edge-trusted-proxies: prefixo inválido em '" + spec + "'", e);
                }
                if (bits < 0 || bits > max) {
                    throw new IllegalArgumentException("edge-trusted-proxies: prefixo fora de 0.." + max + " em '" + spec + "'");
                }
            }
            return new Cidr(addr, bits);
        }

        int prefix() {
            return bits;
        }

        boolean contains(InetAddress candidate) {
            byte[] c = candidate.getAddress();
            if (c.length != address.length) {
                return false;
            }
            int full = bits / 8;
            for (int i = 0; i < full; i++) {
                if (c[i] != address[i]) {
                    return false;
                }
            }
            int rest = bits % 8;
            if (rest == 0) {
                return true;
            }
            int mask = (0xff << (8 - rest)) & 0xff;
            return (c[full] & mask) == (address[full] & mask);
        }
    }
}

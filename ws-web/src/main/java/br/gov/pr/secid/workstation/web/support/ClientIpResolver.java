package br.gov.pr.secid.workstation.web.support;

import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * IP do cliente para os limites por IP e a auditoria (SEG RN49.04, D-14). Ordem: {@code X-Ws-Client-Ip} assinado pelo
 * BFF ({@code X-Ws-Proxy-Sig} = HMAC-SHA256 de {@code ip|ts} com {@code EDGE_PROXY_SECRET}, {@code X-Ws-Proxy-Ts}
 * dentro de {@value #MAX_SKEW_SECONDS} s, comparação em tempo constante) › header da borda ({@code X-Real-IP}) › endereço
 * TCP. <b>Nunca</b> {@code X-Forwarded-For}: qualquer cliente pode forjá-lo. Só literais de IP são aceitos (nada de
 * DNS). IPv6 é reduzido ao prefixo /64 ({@link #bucketOwner}): trocar o fim do endereço não abre balde novo.
 * Segredo ausente ou menor que {@value #MIN_SECRET_LENGTH} caracteres: WARN no boot e a assinatura é ignorada.
 */
@Component
public class ClientIpResolver {
    public static final String SIGNED_IP = "X-Ws-Client-Ip";
    public static final String SIGNED_TS = "X-Ws-Proxy-Ts";
    public static final String SIGNED_SIG = "X-Ws-Proxy-Sig";
    public static final long MAX_SKEW_SECONDS = 60;
    public static final int MIN_SECRET_LENGTH = 32;
    private static final String ATTRIBUTE = ClientIpResolver.class.getName() + ".ip";
    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);
    private static final Pattern IPV4 = Pattern.compile("^\\d{1,3}(\\.\\d{1,3}){3}$");
    private static final Pattern IPV6 = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");
    private static final Pattern HEX = Pattern.compile("^[0-9a-fA-F]{64}$");

    private final byte[] edgeSecret;
    private final String header;
    private final Clock clock;

    @Autowired
    public ClientIpResolver(WsSecurityProperties props) {
        this(props.edgeProxy().secret(), props.edgeProxy().clientIpHeader(), Clock.systemUTC());
    }

    public ClientIpResolver(String edgeSecret, String header, Clock clock) {
        if (edgeSecret == null || edgeSecret.isBlank()) {
            log.warn("EDGE_PROXY_SECRET ausente: o IP assinado pelo BFF será ignorado; vale {} e depois o endereço TCP", header);
            this.edgeSecret = null;
        } else if (edgeSecret.length() < MIN_SECRET_LENGTH) {
            log.warn("EDGE_PROXY_SECRET com menos de {} caracteres: assinatura ignorada", MIN_SECRET_LENGTH);
            this.edgeSecret = null;
        } else {
            this.edgeSecret = edgeSecret.getBytes(StandardCharsets.UTF_8);
        }
        this.header = header;
        this.clock = clock;
    }

    /** IP resolvido desta requisição (já normalizado), guardado em atributo para controller e auditoria reutilizarem. */
    public String resolve(HttpServletRequest request) {
        Object cached = request.getAttribute(ATTRIBUTE);
        if (cached != null) {
            return cached.toString();
        }
        String ip = signedIp(request.getHeader(SIGNED_IP), request.getHeader(SIGNED_TS), request.getHeader(SIGNED_SIG));
        if (ip == null) {
            ip = literalIp(request.getHeader(header));
        }
        if (ip == null) {
            ip = literalIp(request.getRemoteAddr());
        }
        if (ip == null) {
            ip = "0.0.0.0";
        }
        request.setAttribute(ATTRIBUTE, ip);
        return ip;
    }

    /** IP já resolvido nesta requisição (ou {@code null} se o filtro ainda não passou). */
    public static String clientIp(HttpServletRequest request) {
        Object ip = request.getAttribute(ATTRIBUTE);
        return ip == null ? null : ip.toString();
    }

    /** Dono do balde por IP: IPv4 inteiro; IPv6 reduzido ao /64 ({@code 2001:db8:0:1::/64}). */
    public static String bucketOwner(String ip) {
        InetAddress addr = parse(ip);
        if (addr instanceof Inet6Address v6) {
            byte[] b = v6.getAddress();
            return String.format("%x:%x:%x:%x::/64",
                    ((b[0] & 0xff) << 8) | (b[1] & 0xff), ((b[2] & 0xff) << 8) | (b[3] & 0xff),
                    ((b[4] & 0xff) << 8) | (b[5] & 0xff), ((b[6] & 0xff) << 8) | (b[7] & 0xff));
        }
        return addr == null ? ip : addr.getHostAddress();
    }

    String signedIp(String ip, String ts, String sig) {
        if (edgeSecret == null || ip == null || ts == null || sig == null || !HEX.matcher(sig).matches()) {
            return null;
        }
        long issued;
        try {
            issued = Long.parseLong(ts.trim());
        } catch (NumberFormatException e) {
            return null;
        }
        if (Math.abs(clock.instant().getEpochSecond() - issued) > MAX_SKEW_SECONDS) {
            return null;
        }
        String literal = literalIp(ip);
        if (literal == null) {
            return null;
        }
        byte[] expected = hmac(edgeSecret, ip.trim() + "|" + ts.trim());
        byte[] given = HexFormat.of().parseHex(sig.toLowerCase());
        return MessageDigest.isEqual(expected, given) ? literal : null;
    }

    /** Assinatura que o BFF deve enviar: HMAC-SHA256({@code secret}, {@code ip|ts}) em hex minúsculo. */
    public static String sign(String secret, String ip, long ts) {
        return HexFormat.of().formatHex(hmac(secret.getBytes(StandardCharsets.UTF_8), ip + "|" + ts));
    }

    private static byte[] hmac(byte[] secret, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 indisponível", e);
        }
    }

    /** Só literais (IPv4 pontuado ou IPv6), normalizados pelo JDK; qualquer outra coisa é {@code null}. Nunca resolve nome. */
    static String literalIp(String raw) {
        InetAddress addr = parse(raw);
        return addr == null ? null : addr.getHostAddress();
    }

    private static InetAddress parse(String raw) {
        if (raw == null) {
            return null;
        }
        String v = raw.trim();
        if (v.startsWith("[") && v.endsWith("]")) {
            v = v.substring(1, v.length() - 1);
        }
        int zone = v.indexOf('%');
        if (zone > 0) {
            v = v.substring(0, zone);          // escopo de link-local (fe80::1%eth0) não entra no balde
        }
        boolean v4 = IPV4.matcher(v).matches();
        boolean v6 = v.indexOf(':') >= 0 && IPV6.matcher(v).matches();
        if (!v4 && !v6) {
            return null;
        }
        try {
            return InetAddress.getByName(v);   // literal garantido pelos padrões acima: não há consulta DNS
        } catch (UnknownHostException | IllegalArgumentException e) {
            return null;
        }
    }
}

package br.gov.pr.secid.workstation.infrastructure.platform.antivirus;

import br.gov.pr.secid.workstation.application.media.AntivirusPort;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * {@link AntivirusPort} real (Q-165): ClamAV pelo daemon {@code clamd} em TCP, comando {@code zINSTREAM} — o binário vai em pedaços
 * ({@code <tamanho uint32 big-endian><bytes>}, fim = tamanho 0) e o daemon responde uma linha terminada em NUL:
 * <ul>
 *   <li>{@code stream: OK} → {@code LIMPO};</li>
 *   <li>{@code stream: <assinatura> FOUND} → {@code INFECTADO} com o nome da ameaça (ex.: {@code Eicar-Signature});</li>
 *   <li>qualquer outra resposta ({@code ... ERROR}, ex.: {@code INSTREAM size limit exceeded}), tempo esgotado ou conexão recusada →
 *       {@code NAO_VERIFICADO}: com {@code ws.upload.require-antivirus=true} o arquivo fica em quarentena (423) e não é servido.</li>
 * </ul>
 * O conteúdo do arquivo nunca vai para o log; a falha registra só o tipo do erro. Ligado por {@link ClamdConfig}
 * ({@code ws.upload.antivirus=clamd}).
 */
public class ClamdAntivirus implements AntivirusPort {
    public static final String ENGINE = "clamav";
    private static final Logger log = LoggerFactory.getLogger(ClamdAntivirus.class);
    private static final Pattern FOUND = Pattern.compile("^stream: (.{1,200}) FOUND$");
    private static final int MAX_REPLY = 1024;

    private final String host;
    private final int port;
    private final int timeoutMillis;
    private final int chunkBytes;

    public ClamdAntivirus(String host, int port, int timeoutMillis, int chunkBytes) {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("ws.upload.clamd.host é obrigatório com ws.upload.antivirus=clamd");
        }
        if (port <= 0 || port > 65_535) {
            throw new IllegalArgumentException("ws.upload.clamd.port inválida");
        }
        this.host = host.strip();
        this.port = port;
        this.timeoutMillis = timeoutMillis > 0 ? timeoutMillis : 30_000;
        this.chunkBytes = chunkBytes > 0 ? Math.min(chunkBytes, 1 << 20) : 64 * 1024;
    }

    @Override
    public Verdict scan(byte[] content, DetectedType type) {
        try {
            return verdict(instream(content == null ? new byte[0] : content));
        } catch (IOException | RuntimeException e) {
            log.warn("clamd indisponível ou resposta ilegível ({}): arquivo fica NAO_VERIFICADO", e.getClass().getSimpleName());
            return new Verdict(MediaScanStatus.NAO_VERIFICADO, ENGINE, null);
        }
    }

    /** Envia o binário pelo protocolo INSTREAM e devolve a linha de resposta (sem o NUL final). */
    String instream(byte[] content) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMillis);
            socket.setSoTimeout(timeoutMillis);
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));
            for (int off = 0; off < content.length; off += chunkBytes) {
                int len = Math.min(chunkBytes, content.length - off);
                out.writeInt(len);
                out.write(content, off, len);
            }
            out.writeInt(0);
            out.flush();
            return readReply(socket.getInputStream());
        }
    }

    static String readReply(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int c;
        while ((c = in.read()) != -1 && c != 0 && c != '\n') {
            if (buf.size() >= MAX_REPLY) {
                throw new IOException("resposta do clamd longa demais");
            }
            buf.write(c);
        }
        return buf.toString(StandardCharsets.US_ASCII).strip();
    }

    /** Linha do clamd → veredito. */
    static Verdict verdict(String reply) {
        if ("stream: OK".equals(reply)) {
            return Verdict.clean(ENGINE);
        }
        Matcher m = FOUND.matcher(reply == null ? "" : reply);
        if (m.matches()) {
            return Verdict.infected(ENGINE, m.group(1).strip());
        }
        log.warn("clamd respondeu sem veredito (ERROR ou formato desconhecido): arquivo fica NAO_VERIFICADO");
        return new Verdict(MediaScanStatus.NAO_VERIFICADO, ENGINE, null);
    }
}

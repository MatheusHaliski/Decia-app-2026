package br.gov.pr.secid.workstation.infrastructure.platform.antivirus;

import br.gov.pr.secid.workstation.application.media.AntivirusPort.Verdict;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link ClamdAntivirus} contra um clamd FALSO em socket local que fala o protocolo {@code zINSTREAM} de verdade (comando terminado em NUL,
 * pedaços com tamanho uint32 big-endian, fim = 0, resposta terminada em NUL). O falso responde {@code stream: OK} ou
 * {@code stream: Eicar-Signature FOUND} conforme o conteúdo recebido — o teste não usa a assinatura EICAR real (não dispara antivírus da
 * máquina de quem roda).
 */
class ClamdAntivirusTest {
    private static final String MARCADOR = "ARQUIVO-DE-TESTE-INFECTADO";

    private FakeClamd server;

    @AfterEach
    void stop() throws IOException {
        if (server != null) {
            server.close();
        }
    }

    @Test
    void arquivoLimpoRespondeStreamOk() throws Exception {
        server = new FakeClamd(body -> "stream: OK");
        ClamdAntivirus av = new ClamdAntivirus("127.0.0.1", server.port(), 5_000, 8);
        byte[] content = "conteúdo limpo de um PDF qualquer, maior que um pedaço".getBytes(StandardCharsets.UTF_8);

        Verdict v = av.scan(content, DetectedType.PDF);

        assertThat(v.status()).isEqualTo(MediaScanStatus.LIMPO);
        assertThat(v.engine()).isEqualTo("clamav");
        assertThat(v.threatName()).isNull();
        assertThat(server.commands).containsExactly("zINSTREAM");
        assertThat(server.bodies).singleElement().isEqualTo(content);
        assertThat(server.chunkCounts).singleElement().as("pedaços de 8 bytes + terminador").isEqualTo((content.length + 7) / 8);
    }

    @Test
    void assinaturaEncontradaViraInfectadoComONomeDaAmeaca() throws Exception {
        server = new FakeClamd(body -> new String(body, StandardCharsets.UTF_8).contains(MARCADOR) ? "stream: Eicar-Signature FOUND" : "stream: OK");
        ClamdAntivirus av = new ClamdAntivirus("127.0.0.1", server.port(), 5_000, 65_536);

        Verdict v = av.scan(("prefixo " + MARCADOR).getBytes(StandardCharsets.UTF_8), DetectedType.ZIP);

        assertThat(v.status()).isEqualTo(MediaScanStatus.INFECTADO);
        assertThat(v.threatName()).isEqualTo("Eicar-Signature");
        assertThat(av.scan("ok".getBytes(StandardCharsets.UTF_8), DetectedType.TXT).status()).isEqualTo(MediaScanStatus.LIMPO);
    }

    @Test
    void erroDoDaemonOuServidorForaDoArFicaNaoVerificado() throws Exception {
        server = new FakeClamd(body -> "INSTREAM size limit exceeded. ERROR");
        ClamdAntivirus av = new ClamdAntivirus("127.0.0.1", server.port(), 5_000, 1024);
        assertThat(av.scan(new byte[] {1, 2, 3}, DetectedType.PDF).status()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);

        int closedPort;
        try (ServerSocket s = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            closedPort = s.getLocalPort();
        }
        ClamdAntivirus down = new ClamdAntivirus("127.0.0.1", closedPort, 500, 1024);
        Verdict v = down.scan(new byte[] {1}, DetectedType.PDF);
        assertThat(v.status()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);
        assertThat(v.engine()).isEqualTo("clamav");
    }

    @Test
    void respostaEConfiguracao() throws Exception {
        assertThat(ClamdAntivirus.verdict("stream: OK").status()).isEqualTo(MediaScanStatus.LIMPO);
        assertThat(ClamdAntivirus.verdict("stream: Win.Test.EICAR_HDB-1 FOUND").threatName()).isEqualTo("Win.Test.EICAR_HDB-1");
        assertThat(ClamdAntivirus.verdict("").status()).isEqualTo(MediaScanStatus.NAO_VERIFICADO);
        assertThat(ClamdAntivirus.readReply(new ByteArrayInputStream("stream: OK\0lixo".getBytes(StandardCharsets.US_ASCII))))
                .isEqualTo("stream: OK");
        assertThatThrownBy(() -> ClamdAntivirus.readReply(new ByteArrayInputStream("a".repeat(2000).getBytes(StandardCharsets.US_ASCII))))
                .isInstanceOf(IOException.class).hasMessageContaining("longa demais");
        assertThatThrownBy(() -> new ClamdAntivirus(" ", 3310, 0, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ClamdAntivirus("clamav", 0, 0, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    /** clamd falso: aceita conexões numa thread, lê o comando e os pedaços do INSTREAM e responde a linha escolhida + NUL. */
    static final class FakeClamd implements AutoCloseable {
        final List<String> commands = Collections.synchronizedList(new ArrayList<>());
        final List<byte[]> bodies = Collections.synchronizedList(new ArrayList<>());
        final List<Integer> chunkCounts = Collections.synchronizedList(new ArrayList<>());
        private final ServerSocket socket;
        private final Thread thread;

        FakeClamd(Function<byte[], String> reply) throws IOException {
            socket = new ServerSocket(0, 5, InetAddress.getLoopbackAddress());
            thread = new Thread(() -> {
                while (!socket.isClosed()) {
                    try (Socket s = socket.accept()) {
                        DataInputStream in = new DataInputStream(s.getInputStream());
                        ByteArrayOutputStream cmd = new ByteArrayOutputStream();
                        int c;
                        while ((c = in.read()) > 0) {
                            cmd.write(c);
                        }
                        commands.add(cmd.toString(StandardCharsets.US_ASCII));
                        ByteArrayOutputStream body = new ByteArrayOutputStream();
                        int chunks = 0;
                        int len;
                        while ((len = in.readInt()) > 0) {
                            body.write(in.readNBytes(len));
                            chunks++;
                        }
                        bodies.add(body.toByteArray());
                        chunkCounts.add(chunks);
                        OutputStream out = s.getOutputStream();
                        out.write((reply.apply(body.toByteArray()) + "\0").getBytes(StandardCharsets.US_ASCII));
                        out.flush();
                    } catch (IOException e) {
                        return;   // socket fechado no fim do teste
                    }
                }
            }, "fake-clamd");
            thread.setDaemon(true);
            thread.start();
        }

        int port() {
            return socket.getLocalPort();
        }

        @Override
        public void close() throws IOException {
            socket.close();
        }
    }
}

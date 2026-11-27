package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.media.CaptureMetadata.Capture;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.InspectedUpload;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.UploadCandidate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;
import java.util.TreeMap;

/**
 * Preparação comum a TODO binário que vira anexo ou evidência — upload direto e cópia trazida por conector passam pelo mesmo caminho:
 * <ol>
 *   <li>inspeção D-67 ({@link MediaUploadInspector}: tipo real, limites, zip-bomb, nome/MIME declarados);</li>
 *   <li>SHA-256 do arquivo COMO RECEBIDO ({@code originalSha256}) e metadados de captura do EXIF ({@link CaptureMetadata}) — lidos ANTES
 *       do strip, que os apaga;</li>
 *   <li>strip dos metadados embutidos ({@link ImageMetadata}) e SHA-256 do binário limpo ({@code sha256}, o que é guardado e deduplicado);</li>
 *   <li>formato de entrega ({@link DetectedFormat}) extraído do binário limpo, pelo tipo real.</li>
 * </ol>
 * O resultado não grava nada: quem chama manda {@link #clean()} ao {@link MediaUploadService#upload} e guarda a proveniência no vínculo.
 */
public record PreparedUpload(InspectedUpload inspected, byte[] clean, String originalSha256, String sha256, DetectedFormat.Result format,
                             Capture capture) {
    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<Map<String, String>> MAP = new TypeReference<>() {
    };

    public static PreparedUpload prepare(MediaUploadInspector inspector, UploadCandidate candidate) {
        InspectedUpload ok = inspector.inspect(candidate);
        byte[] original = candidate.content();
        Capture capture = CaptureMetadata.read(ok.type(), original).orElse(null);
        byte[] clean = ImageMetadata.strip(ok.type(), original);
        String sha = clean == original ? ok.sha256() : MediaUploadInspector.sha256(clean);
        return new PreparedUpload(ok, clean, ok.sha256(), sha, DetectedFormat.of(ok.type(), clean), capture);
    }

    /** O candidato com os bytes limpos (mesmo nome/MIME declarados e tipos aceitos), para o {@link MediaUploadService#upload}. */
    public UploadCandidate cleanCandidate(UploadCandidate original) {
        return new UploadCandidate(clean, original.declaredName(), original.declaredContentType(), original.accepted());
    }

    /** Detalhes do formato em JSON canônico (chaves ordenadas) ou nulo sem detalhes. */
    public String formatDetailsJson() {
        return canonical(format.details());
    }

    /** Captura em JSON canônico (o adaptador cifra antes de gravar) ou nulo quando o arquivo não trazia EXIF de captura. */
    public String captureJson() {
        return capture == null ? null : canonical(capture.asMap());
    }

    /** Lê a captura gravada por {@link #captureJson()}; JSON ilegível → nulo (nunca derruba a listagem). */
    public static Capture readCapture(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return Capture.fromMap(JSON.readValue(json, MAP));
        } catch (RuntimeException e) {
            return null;
        }
    }

    static String canonical(Map<String, String> m) {
        return m == null || m.isEmpty() ? null : JSON.writeValueAsString(new TreeMap<>(m));
    }
}

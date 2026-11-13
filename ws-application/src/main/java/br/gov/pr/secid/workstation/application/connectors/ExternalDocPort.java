package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;

import java.time.Instant;
import java.util.List;

/**
 * Documentos de um provedor lidos com o access token da pessoa (só leitura): Drive API v3 ({@code GoogleDriveAdapter}) e Graph v1.0
 * OneDrive/SharePoint ({@code MicrosoftGraphAdapter}). Os adaptadores devolvem os metadados crus; a classificação (fonte, tipo, formatos)
 * é regra de domínio ({@code ExternalSources}). Falhas saem como {@link ProviderException}.
 */
public interface ExternalDocPort {

    ConnectorProvider provider();

    /** Busca/lista itens: {@code query} no nome (vazia = recentes), {@code pageToken} opaco devolvido pela página anterior. */
    RemotePage list(String accessToken, String query, String pageToken, int pageSize);

    /** Metadados de um item pelo id externo (Drive: fileId; Graph: {@code driveId~itemId}). */
    RemoteItem get(String accessToken, String externalId);

    /**
     * Conteúdo do item: {@code asPdf} → PDF gerado pelo provedor (Drive {@code files.export}; Graph {@code /content?format=pdf}); senão o
     * binário original. Mais que {@code maxBytes} → {@link ProviderException.Kind#TOO_LARGE} (o download é interrompido, nunca truncado).
     */
    RemoteContent download(String accessToken, RemoteItem item, boolean asPdf, long maxBytes);

    /**
     * Item remoto: {@code version} é o que muda quando o conteúdo muda (Drive: {@code headRevisionId}/{@code version}; Graph: {@code cTag}
     * ou {@code eTag}); {@code packageType} só no Graph ({@code oneNote} para cadernos).
     */
    record RemoteItem(String externalId, String name, String mimeType, String webUrl, Instant modifiedAt, Long sizeBytes, boolean folder,
                      String packageType, String version) {
    }

    record RemotePage(List<RemoteItem> items, String nextPageToken) {
        public RemotePage {
            items = items == null ? List.of() : List.copyOf(items);
        }
    }

    /** Bytes baixados e o tipo informado pelo provedor (o pipeline de mídia confere o tipo real pelos magic bytes). */
    record RemoteContent(byte[] bytes, String mimeType) {
        @Override
        public String toString() {
            return "RemoteContent{bytes=" + (bytes == null ? 0 : bytes.length) + ", mimeType=" + mimeType + "}";
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof RemoteContent other && java.util.Arrays.equals(bytes, other.bytes) && java.util.Objects.equals(mimeType, other.mimeType);
        }

        @Override
        public int hashCode() {
            return 31 * java.util.Arrays.hashCode(bytes) + java.util.Objects.hashCode(mimeType);
        }
    }
}

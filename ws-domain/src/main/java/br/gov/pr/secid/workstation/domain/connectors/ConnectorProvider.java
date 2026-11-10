package br.gov.pr.secid.workstation.domain.connectors;

import java.util.Locale;
import java.util.Optional;

/**
 * Provedor de documentos externos (RF20.CA07, RF23, RF34). {@code GOOGLE} = OAuth 2.0 + Drive API v3; {@code MICROSOFT} = OAuth 2.0
 * (v2.0 da Microsoft identity platform) + Graph v1.0 (OneDrive/SharePoint); {@code APPLE_ICLOUD} não tem API pública para iWork, Notas
 * ou Lembretes: entra só por link de compartilhamento do iCloud (CalDAV fica planejado). Qualquer provedor também aceita colar um link.
 */
public enum ConnectorProvider {
    GOOGLE(ConnectorMode.OAUTH),
    MICROSOFT(ConnectorMode.OAUTH),
    APPLE_ICLOUD(ConnectorMode.LINK);

    private final ConnectorMode mode;

    ConnectorProvider(ConnectorMode mode) {
        this.mode = mode;
    }

    public ConnectorMode mode() {
        return mode;
    }

    /** Tem conta conectada por OAuth (busca e importação pela API do provedor). */
    public boolean oauth() {
        return mode == ConnectorMode.OAUTH;
    }

    /** Nome vindo da URL/JSON, sem diferenciar maiúsculas; desconhecido → vazio (o chamador responde VALIDACAO). */
    public static Optional<ConnectorProvider> parse(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > 20) {
            return Optional.empty();
        }
        String name = raw.strip().toUpperCase(Locale.ROOT).replace('-', '_');
        for (ConnectorProvider p : values()) {
            if (p.name().equals(name)) {
                return Optional.of(p);
            }
        }
        return Optional.empty();
    }
}

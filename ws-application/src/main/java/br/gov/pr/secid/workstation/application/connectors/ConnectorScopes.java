package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Escopos mínimos, só leitura (decisão dos conectores). Google: {@code openid email drive.readonly} — {@code drive.readonly} é escopo
 * RESTRITO (app "interno" do Workspace da organização ou verificação do Google; ver CONECTORES.md); Microsoft: {@code openid email
 * offline_access User.Read Files.Read} — delegados, sem consentimento de administrador. Nada de escrita. O Google deixa a pessoa desmarcar
 * o Drive na tela de consentimento: sem o escopo de arquivos a conexão é recusada ({@code ESCOPO_INSUFICIENTE}).
 */
public final class ConnectorScopes {
    public static final String GOOGLE_DRIVE_READONLY = "https://www.googleapis.com/auth/drive.readonly";
    public static final List<String> GOOGLE = List.of("openid", "email", GOOGLE_DRIVE_READONLY);
    public static final List<String> MICROSOFT = List.of("openid", "email", "offline_access", "User.Read", "Files.Read");
    private static final String GRAPH_PREFIX = "https://graph.microsoft.com/";

    private ConnectorScopes() {
    }

    public static List<String> requested(ConnectorProvider provider) {
        return switch (provider) {
            case GOOGLE -> GOOGLE;
            case MICROSOFT -> MICROSOFT;
            case APPLE_ICLOUD -> List.of();
        };
    }

    /** Campo {@code scope} da resposta do token (separado por espaço) → conjunto; o prefixo de recurso do Graph sai. */
    public static Set<String> parse(String scopeField) {
        Set<String> out = new LinkedHashSet<>();
        if (scopeField == null || scopeField.isBlank()) {
            return out;
        }
        Arrays.stream(scopeField.trim().split("\\s+")).map(s -> s.startsWith(GRAPH_PREFIX) ? s.substring(GRAPH_PREFIX.length()) : s)
                .filter(s -> !s.isBlank() && s.length() <= 200).limit(30).forEach(out::add);
        return out;
    }

    /**
     * O escopo de leitura de arquivos veio? Resposta sem {@code scope} = os escopos pedidos (RFC 6749 §5.1). Google: {@code drive.readonly}
     * (ou {@code drive}); Microsoft: {@code Files.Read*} (ou {@code Files.ReadWrite*}).
     */
    public static boolean satisfied(ConnectorProvider provider, Set<String> granted) {
        if (granted == null || granted.isEmpty()) {
            return true;
        }
        return switch (provider) {
            case GOOGLE -> granted.contains(GOOGLE_DRIVE_READONLY) || granted.contains("https://www.googleapis.com/auth/drive");
            case MICROSOFT -> granted.stream().map(s -> s.toLowerCase(Locale.ROOT)).anyMatch(s -> s.startsWith("files.read"));
            case APPLE_ICLOUD -> false;
        };
    }
}

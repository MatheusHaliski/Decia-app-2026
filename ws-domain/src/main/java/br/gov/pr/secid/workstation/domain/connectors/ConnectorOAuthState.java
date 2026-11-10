package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Pedido de autorização OAuth em andamento (conectores, V61): nasce no {@code POST /api/connectors/{provider}/authorize} de quem está
 * autenticado e morre no callback — uso único, validade de 10 minutos, ligado ao usuário. Fica em tabela (não em memória) porque o
 * callback pode cair em outra instância. Só o HASH do {@code state} é guardado (o valor viaja na URL); o {@code code_verifier} do PKCE
 * (S256) vai selado pela aplicação; {@code returnTo} é sempre um caminho interno (sem esquema, sem host: nada de redirecionamento aberto).
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "connector_oauth_states", rfs = {"RF20", "RF4"}, migration = 61, audit = Audit.CREATED,
        doc = "Autorização OAuth em andamento: hash do state (uso único, 10 min), verificador PKCE selado e caminho interno de volta. "
                + "Some com quem iniciou.",
        indexes = {"owner_id", "expires_at"})
public record ConnectorOAuthState(
        @Attr("identificador") UUID id,
        @Attr(value = "SHA-256 do state (hex; o valor só viaja na URL)", sql = "CHAR(64)", unique = true) String stateHash,
        @Attr(value = "quem iniciou", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr("provedor") ConnectorProvider provider,
        @Attr(value = "code_verifier do PKCE selado (AES-256-GCM, WS_CONNECTORS_TOKEN_KEY)", len = 512) String codeVerifierSealed,
        @Attr(value = "caminho interno de volta (ex.: /tasks/new)", len = 200) String returnTo,
        @Attr("expira em") Instant expiresAt) {

    /** Validade do pedido (decisão de segurança dos conectores; não é configurável). */
    public static final Duration TTL = Duration.ofMinutes(10);
    public static final String DEFAULT_RETURN_TO = "/settings?tab=conectores";
    public static final int MAX_RETURN_TO = 200;
    private static final Pattern HASH = Pattern.compile("^[0-9a-f]{64}$");
    /** Caminho interno: começa com uma barra só, segmentos e consulta com caracteres seguros, sem fragmento nem barra invertida. */
    private static final Pattern SAFE_PATH = Pattern.compile("^/(?![/\\\\])[A-Za-z0-9\\-._~/]*(\\?[A-Za-z0-9\\-._~=&%+]*)?$");

    public ConnectorOAuthState {
        if (stateHash == null || !HASH.matcher(stateHash).matches()) {
            throw new IllegalArgumentException("VALIDACAO: stateHash deve ser SHA-256 em hex");
        }
        if (ownerId == null || provider == null || !provider.oauth()) {
            throw new IllegalArgumentException("VALIDACAO: estado OAuth exige dono e provedor OAuth");
        }
        if (codeVerifierSealed == null || codeVerifierSealed.isBlank()) {
            throw new IllegalArgumentException("VALIDACAO: estado OAuth exige o verificador PKCE selado");
        }
        if (expiresAt == null) {
            throw new IllegalArgumentException("VALIDACAO: expiresAt obrigatório");
        }
        returnTo = safeReturnTo(returnTo).orElseThrow(() -> new IllegalArgumentException("VALIDACAO: returnTo precisa ser caminho interno"));
    }

    /** Pedido novo, válido por {@link #TTL} a partir de {@code now}. */
    public static ConnectorOAuthState issue(UUID ownerId, ConnectorProvider provider, String stateHash, String codeVerifierSealed,
                                            String returnTo, Instant now) {
        return new ConnectorOAuthState(UUID.randomUUID(), stateHash, ownerId, provider, codeVerifierSealed,
                returnTo == null || returnTo.isBlank() ? DEFAULT_RETURN_TO : returnTo, now.plus(TTL));
    }

    public boolean expired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    /**
     * {@code returnTo} aceito: vazio vira o padrão; caminho interno com até 200 caracteres (sem {@code //host}, sem esquema, sem
     * {@code \}, sem {@code %} no caminho, sem {@code ..}, sem fragmento, sem quebra de linha). Qualquer outra coisa é recusada
     * (redirecionamento aberto).
     */
    public static Optional<String> safeReturnTo(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.of(DEFAULT_RETURN_TO);
        }
        String p = raw.strip();
        // o caminho não aceita "%" (nada de "/%2F%2Fhost"); na consulta, escapes do URLSearchParams do front são inofensivos: a origem do
        // destino é sempre a base configurada do front
        if (p.length() > MAX_RETURN_TO || !SAFE_PATH.matcher(p).matches() || p.contains("/..")) {
            return Optional.empty();
        }
        return Optional.of(p);
    }
}

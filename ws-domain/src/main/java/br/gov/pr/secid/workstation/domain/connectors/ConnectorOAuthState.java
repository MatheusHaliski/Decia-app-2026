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
 * Pedido de autorização OAuth em andamento (conectores, V61), em duas fases de uso único, cada uma com o seu segredo aleatório:
 * <ol>
 *   <li><b>pedido</b>: nasce no {@code POST /api/connectors/{provider}/authorize} de quem está autenticado (10 minutos); o segredo é o
 *       {@code state} que viaja até o provedor;</li>
 *   <li><b>retorno</b>: o callback consome o pedido e, sem trocar o {@code code}, grava esta segunda linha com o {@code code} selado (5
 *       minutos); o segredo vai só para o navegador que voltou do provedor ({@code conector=confirmar&pedido=}), e só a SESSÃO de quem
 *       iniciou conclui ({@code POST /api/connectors/oauth/confirm}). Assim a URL de consentimento repassada a outra pessoa não liga a
 *       conta Google/Microsoft dela à conta de quem a gerou (RFC 9700 §4.7: o state precisa estar preso a quem iniciou).</li>
 * </ol>
 * Fica em tabela (não em memória) porque o callback e a confirmação podem cair em outra instância. Só o HASH do segredo é guardado; o
 * {@code code_verifier} do PKCE (S256) e o {@code code} vão selados pela aplicação; {@code returnTo} é sempre um caminho interno (sem
 * esquema, sem host: nada de redirecionamento aberto).
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "connector_oauth_states", rfs = {"RF20", "RF4"}, migration = 61, audit = Audit.CREATED,
        doc = "Autorização OAuth em andamento: hash do segredo da fase (state do pedido, 10 min; confirmação do retorno, 5 min — uso único), "
                + "verificador PKCE e code selados e caminho interno de volta. Some com quem iniciou.",
        indexes = {"owner_id", "expires_at"})
public record ConnectorOAuthState(
        @Attr("identificador") UUID id,
        @Attr(value = "SHA-256 do segredo da fase: state do pedido ou confirmação do retorno (hex; o valor só viaja na URL)", sql = "CHAR(64)",
                unique = true) String stateHash,
        @Attr(value = "quem iniciou", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr("provedor") ConnectorProvider provider,
        @Attr(value = "code_verifier do PKCE selado (AES-256-GCM, WS_CONNECTORS_TOKEN_KEY)", len = 512) String codeVerifierSealed,
        @Attr(value = "code do provedor selado, à espera da confirmação de quem iniciou (só na fase de retorno)", opt = true, sql = "TEXT")
        String codeSealed,
        @Attr(value = "caminho interno de volta (ex.: /tasks/new)", len = 200) String returnTo,
        @Attr("expira em") Instant expiresAt) {

    /** Validade do pedido (decisão de segurança dos conectores; não é configurável). */
    public static final Duration TTL = Duration.ofMinutes(10);
    /**
     * Validade do retorno à espera da confirmação: o front confirma assim que a página abre; o {@code code} do provedor vence em cerca
     * de 10 minutos, então a confirmação precisa chegar bem antes.
     */
    public static final Duration CONFIRM_TTL = Duration.ofMinutes(5);
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
        if (codeSealed != null && codeSealed.isBlank()) {
            throw new IllegalArgumentException("VALIDACAO: code selado vazio");
        }
        if (expiresAt == null) {
            throw new IllegalArgumentException("VALIDACAO: expiresAt obrigatório");
        }
        returnTo = safeReturnTo(returnTo).orElseThrow(() -> new IllegalArgumentException("VALIDACAO: returnTo precisa ser caminho interno"));
    }

    /** Pedido novo, válido por {@link #TTL} a partir de {@code now}. */
    public static ConnectorOAuthState issue(UUID ownerId, ConnectorProvider provider, String stateHash, String codeVerifierSealed,
                                            String returnTo, Instant now) {
        return new ConnectorOAuthState(UUID.randomUUID(), stateHash, ownerId, provider, codeVerifierSealed, null,
                returnTo == null || returnTo.isBlank() ? DEFAULT_RETURN_TO : returnTo, now.plus(TTL));
    }

    /**
     * Retorno do provedor à espera de quem iniciou: mesma pessoa, provedor e destino; segredo NOVO (o {@code state} já passou pela URL do
     * provedor e pode ter sido repassado), verificador e {@code code} selados no contexto do novo segredo, válido por
     * {@link #CONFIRM_TTL}.
     */
    public ConnectorOAuthState returned(String confirmHash, String verifierSealed, String sealedCode, Instant now) {
        if (sealedCode == null || sealedCode.isBlank()) {
            throw new IllegalArgumentException("VALIDACAO: o retorno exige o code selado");
        }
        return new ConnectorOAuthState(UUID.randomUUID(), confirmHash, ownerId, provider, verifierSealed, sealedCode, returnTo,
                now.plus(CONFIRM_TTL));
    }

    /** Fase de retorno (o provedor já devolveu o {@code code}): só a confirmação de quem iniciou a consome. */
    public boolean awaitingConfirmation() {
        return codeSealed != null;
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

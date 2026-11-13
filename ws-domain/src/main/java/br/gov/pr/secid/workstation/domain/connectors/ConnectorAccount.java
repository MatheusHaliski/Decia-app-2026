package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Conta externa conectada por uma pessoa (RF20.CA07, RF23, RF34; conectores, V61): uma linha por (dono, provedor, conta no provedor).
 * Só o dono vê e usa (BOLA, D-65). Os tokens chegam aqui já SELADOS pela aplicação (AES-256-GCM com {@code WS_CONNECTORS_TOKEN_KEY},
 * contexto amarrado ao dono e ao provedor): o domínio nunca guarda token em claro e o {@link #toString()} não mostra nem o selado.
 * O e-mail da conta externa é dado pessoal e vai cifrado pelo conversor de campo ({@code account_email_enc}, LGPD).
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "connector_accounts", rfs = {"RF20", "RF4", "RF23", "RF34"}, migration = 61,
        doc = "Contas Google/Microsoft conectadas por OAuth 2.0 + PKCE para importar documentos (só leitura). Tokens selados na aplicação "
                + "(AES-256-GCM, WS_CONNECTORS_TOKEN_KEY); e-mail cifrado. Dono → CASCADE.",
        uniques = {"owner_id, provider, external_subject"})
public record ConnectorAccount(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr("provedor (GOOGLE, MICROSOFT)") ConnectorProvider provider,
        @Attr(value = "id estável da conta no provedor (sub do Google, id do Graph)", len = 128) String externalSubject,
        @Attr(value = "e-mail da conta externa (cifrado)", opt = true, len = 512, encrypted = true) String accountEmail,
        @Attr(value = "escopos concedidos", opt = true, col = "scopes_json") Set<String> scopes,
        @Attr(value = "situação", def = "'ATIVO'") ConnectionStatus status,
        @Attr(value = "access token selado (AES-256-GCM, WS_CONNECTORS_TOKEN_KEY)", opt = true, sql = "TEXT") String accessTokenSealed,
        @Attr(value = "refresh token selado (AES-256-GCM, WS_CONNECTORS_TOKEN_KEY)", opt = true, sql = "TEXT") String refreshTokenSealed,
        @Attr(value = "validade do access token", opt = true) Instant accessExpiresAt,
        @Attr("conectada (ou reconectada) em") Instant connectedAt,
        @Attr(value = "último uso", opt = true) Instant lastUsedAt,
        @Attr(value = "último erro (código, sem dado pessoal)", opt = true, len = 60) String lastError) {

    public static final int MAX_SUBJECT = 128;
    public static final int MAX_ERROR = 60;
    /** Folga antes da validade: o access token é renovado um minuto antes de vencer. */
    public static final Duration REFRESH_SKEW = Duration.ofSeconds(60);

    public ConnectorAccount {
        if (ownerId == null) {
            throw new IllegalArgumentException("VALIDACAO: conta conectada exige dono");
        }
        if (provider == null || !provider.oauth()) {
            throw new IllegalArgumentException("VALIDACAO: só provedores OAuth têm conta conectada");
        }
        if (externalSubject == null || externalSubject.isBlank() || externalSubject.length() > MAX_SUBJECT) {
            throw new IllegalArgumentException("VALIDACAO: externalSubject obrigatório (≤ " + MAX_SUBJECT + ")");
        }
        if (connectedAt == null) {
            throw new IllegalArgumentException("VALIDACAO: connectedAt obrigatório");
        }
        status = status == null ? ConnectionStatus.ATIVO : status;
        scopes = scopes == null ? Set.of() : Set.copyOf(scopes);
        lastError = lastError == null || lastError.length() <= MAX_ERROR ? lastError : lastError.substring(0, MAX_ERROR);
    }

    /** Primeira conexão desta conta externa (o id vem do banco). */
    public static ConnectorAccount connect(UUID ownerId, ConnectorProvider provider, String externalSubject, String accountEmail,
                                           Set<String> scopes, String accessTokenSealed, String refreshTokenSealed, Instant accessExpiresAt,
                                           Instant now) {
        return new ConnectorAccount(null, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.ATIVO, accessTokenSealed,
                refreshTokenSealed, accessExpiresAt, now, null, null);
    }

    /**
     * A mesma conta externa conectada de novo (por exemplo, depois de EXPIRADO): volta a ATIVO com os tokens novos. Sem refresh token
     * novo (o Google só reenvia com {@code prompt=consent}) mantém o anterior.
     */
    public ConnectorAccount reconnected(String newEmail, Set<String> newScopes, String newAccessSealed, String newRefreshSealed,
                                        Instant newAccessExpiresAt, Instant now) {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, newEmail, newScopes, ConnectionStatus.ATIVO, newAccessSealed,
                newRefreshSealed != null ? newRefreshSealed : refreshTokenSealed, newAccessExpiresAt, now, lastUsedAt, null);
    }

    /** Access token renovado (a Microsoft também gira o refresh token; sem um novo, fica o atual). */
    public ConnectorAccount refreshed(String newAccessSealed, String newRefreshSealed, Instant newAccessExpiresAt) {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.ATIVO, newAccessSealed,
                newRefreshSealed != null ? newRefreshSealed : refreshTokenSealed, newAccessExpiresAt, connectedAt, lastUsedAt, null);
    }

    /** Chamada ao provedor bem-sucedida: marca o uso e limpa um erro anterior. */
    public ConnectorAccount used(Instant now) {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.ATIVO, accessTokenSealed,
                refreshTokenSealed, accessExpiresAt, connectedAt, now, null);
    }

    /** O provedor recusou a renovação: os tokens deixam de valer e é preciso reconectar (409 CONECTOR_EXPIRADO). */
    public ConnectorAccount expired(String errorCode) {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.EXPIRADO, null, null, null,
                connectedAt, lastUsedAt, errorCode);
    }

    /**
     * Desconexão em andamento: os tokens saem do banco ANTES de chamar a revogação no provedor; se o processo cair no meio, a linha fica
     * REVOGADO, sem nenhum token, até a pessoa desconectar de novo.
     */
    public ConnectorAccount revoked() {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.REVOGADO, null, null, null,
                connectedAt, lastUsedAt, null);
    }

    /** Falha que não invalida os tokens (provedor fora do ar, resposta inesperada): o próximo uso tenta de novo. */
    public ConnectorAccount failed(String errorCode) {
        return new ConnectorAccount(id, ownerId, provider, externalSubject, accountEmail, scopes, ConnectionStatus.ERRO, accessTokenSealed,
                refreshTokenSealed, accessExpiresAt, connectedAt, lastUsedAt, errorCode);
    }

    /** O access token guardado ainda vale por mais que a folga de renovação. */
    public boolean accessFresh(Instant now) {
        return accessTokenSealed != null && accessExpiresAt != null && now.plus(REFRESH_SKEW).isBefore(accessExpiresAt);
    }

    public boolean ownedBy(UUID userId) {
        return ownerId.equals(userId);
    }

    /** Nunca mostra tokens (nem selados) nem o e-mail: o record pode acabar num log por engano. */
    @Override
    public String toString() {
        return "ConnectorAccount{id=" + id + ", ownerId=" + ownerId + ", provider=" + provider + ", status=" + status + ", scopes=" + scopes
                + ", accessExpiresAt=" + accessExpiresAt + ", lastError=" + lastError + "}";
    }
}

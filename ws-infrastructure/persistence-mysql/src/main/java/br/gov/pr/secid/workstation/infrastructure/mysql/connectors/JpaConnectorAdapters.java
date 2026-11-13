package br.gov.pr.secid.workstation.infrastructure.mysql.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorAccountRepositoryPort;
import br.gov.pr.secid.workstation.application.connectors.ConnectorOAuthStateRepositoryPort;
import br.gov.pr.secid.workstation.application.connectors.TaskExternalLinkRepositoryPort;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.ConnectorAccountEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.ConnectorOAuthStateEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.TaskExternalLinkEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository.ConnectorAccountRepository;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository.ConnectorOAuthStateRepository;
import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository.TaskExternalLinkRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Adaptadores JPA das portas dos conectores (V61): contas conectadas ({@code connector_accounts} — os tokens chegam já selados pela
 * aplicação; o e-mail passa pelo conversor AES-GCM do campo), pedidos OAuth em andamento ({@code connector_oauth_states} — consumo atômico
 * por lock da linha + DELETE, válido entre instâncias) e a origem externa das tarefas importadas ({@code task_external_links}).
 */
@Configuration
public class JpaConnectorAdapters {
    private static final ObjectMapper JSON = JsonMapper.builder().build();

    @Bean
    ConnectorAccountRepositoryPort connectorAccountRepositoryPort(ConnectorAccountRepository repo, EntityManager em) {
        return new ConnectorAccountRepositoryPort() {
            @Override
            public Optional<ConnectorAccount> findById(UUID id) {
                return repo.findById(id).map(JpaConnectorAdapters::toDomain);
            }

            @Override
            public List<ConnectorAccount> findByOwner(UUID ownerId) {
                return em.createQuery("select a from ConnectorAccountEntity a where a.ownerId = :owner order by a.connectedAt desc",
                        ConnectorAccountEntity.class).setParameter("owner", ownerId).setMaxResults(50).getResultList().stream()
                        .map(JpaConnectorAdapters::toDomain).toList();
            }

            @Override
            public Optional<ConnectorAccount> findByOwnerAndSubject(UUID ownerId, ConnectorProvider provider, String externalSubject) {
                return em.createQuery("select a from ConnectorAccountEntity a where a.ownerId = :owner and a.provider = :provider"
                                + " and a.externalSubject = :subject", ConnectorAccountEntity.class)
                        .setParameter("owner", ownerId).setParameter("provider", provider).setParameter("subject", externalSubject)
                        .getResultList().stream().findFirst().map(JpaConnectorAdapters::toDomain);
            }

            @Override
            @Transactional
            public ConnectorAccount save(ConnectorAccount account) {
                ConnectorAccountEntity e = account.id() == null ? new ConnectorAccountEntity() : repo.findById(account.id()).orElseThrow();
                apply(e, account);
                return toDomain(repo.saveAndFlush(e));
            }

            @Override
            @Transactional
            public void delete(UUID id) {
                repo.deleteById(id);
            }
        };
    }

    @Bean
    ConnectorOAuthStateRepositoryPort connectorOAuthStateRepositoryPort(ConnectorOAuthStateRepository repo, EntityManager em, Clock clock) {
        return new ConnectorOAuthStateRepositoryPort() {
            @Override
            @Transactional
            public void insert(ConnectorOAuthState state) {
                ConnectorOAuthStateEntity e = new ConnectorOAuthStateEntity();
                e.setId(state.id());
                e.setStateHash(state.stateHash());
                e.setOwnerId(state.ownerId());
                e.setProvider(state.provider());
                e.setCodeVerifierSealed(state.codeVerifierSealed());
                e.setCodeSealed(state.codeSealed());
                e.setReturnTo(state.returnTo());
                e.setExpiresAt(state.expiresAt());
                e.setCreatedAt(clock.instant());
                repo.saveAndFlush(e);
            }

            @Override
            @Transactional
            public Optional<ConnectorOAuthState> consume(String stateHash) {
                // SELECT … FOR UPDATE: um segundo callback (ou confirmação) com o mesmo segredo espera e, depois do DELETE, não acha nada
                List<ConnectorOAuthStateEntity> found = em.createQuery("select s from ConnectorOAuthStateEntity s where s.stateHash = :hash",
                                ConnectorOAuthStateEntity.class).setParameter("hash", stateHash)
                        .setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
                if (found.isEmpty()) {
                    return Optional.empty();
                }
                ConnectorOAuthStateEntity e = found.get(0);
                ConnectorOAuthState state = new ConnectorOAuthState(e.getId(), e.getStateHash(), e.getOwnerId(), e.getProvider(),
                        e.getCodeVerifierSealed(), e.getCodeSealed(), e.getReturnTo(), e.getExpiresAt());
                em.remove(e);
                em.flush();
                return Optional.of(state);
            }

            @Override
            @Transactional
            public int purgeExpired(Instant now) {
                return em.createQuery("delete from ConnectorOAuthStateEntity s where s.expiresAt < :now").setParameter("now", now)
                        .executeUpdate();
            }
        };
    }

    @Bean
    TaskExternalLinkRepositoryPort taskExternalLinkRepositoryPort(TaskExternalLinkRepository repo, Clock clock) {
        return new TaskExternalLinkRepositoryPort() {
            @Override
            @Transactional
            public TaskExternalLink insert(TaskExternalLink link) {
                TaskExternalLinkEntity e = new TaskExternalLinkEntity();
                e.setTaskId(link.taskId());
                e.setAccountId(link.accountId());
                e.setProvider(link.provider());
                e.setExternalId(link.externalId());
                e.setMimeType(link.mimeType());
                e.setLinkMode(link.linkMode());
                e.setRemoteVersion(link.remoteVersion());
                e.setSyncedAt(link.syncedAt());
                e.setCreatedAt(clock.instant());
                return toDomain(repo.saveAndFlush(e));
            }

            @Override
            public Optional<TaskExternalLink> findByTask(UUID taskId) {
                return repo.findById(taskId).map(JpaConnectorAdapters::toDomain);
            }
        };
    }

    static void apply(ConnectorAccountEntity e, ConnectorAccount a) {
        e.setOwnerId(a.ownerId());
        e.setProvider(a.provider());
        e.setExternalSubject(a.externalSubject());
        e.setAccountEmailEnc(a.accountEmail());
        e.setScopesJson(a.scopes().isEmpty() ? null : JSON.writeValueAsString(new TreeSet<>(a.scopes())));
        e.setStatus(a.status());
        e.setAccessTokenSealed(a.accessTokenSealed());
        e.setRefreshTokenSealed(a.refreshTokenSealed());
        e.setAccessExpiresAt(a.accessExpiresAt());
        e.setConnectedAt(a.connectedAt());
        e.setLastUsedAt(a.lastUsedAt());
        e.setLastError(a.lastError());
    }

    static ConnectorAccount toDomain(ConnectorAccountEntity e) {
        Set<String> scopes = e.getScopesJson() == null || e.getScopesJson().isBlank() ? Set.of()
                : JSON.readValue(e.getScopesJson(), new TypeReference<Set<String>>() { });
        return new ConnectorAccount(e.getId(), e.getOwnerId(), e.getProvider(), e.getExternalSubject(), e.getAccountEmailEnc(), scopes, e.getStatus(),
                e.getAccessTokenSealed(), e.getRefreshTokenSealed(), e.getAccessExpiresAt(), e.getConnectedAt(), e.getLastUsedAt(), e.getLastError());
    }

    static TaskExternalLink toDomain(TaskExternalLinkEntity e) {
        return new TaskExternalLink(e.getTaskId(), e.getAccountId(), e.getProvider(), e.getExternalId(), e.getMimeType(), e.getLinkMode(),
                e.getRemoteVersion(), e.getSyncedAt());
    }
}

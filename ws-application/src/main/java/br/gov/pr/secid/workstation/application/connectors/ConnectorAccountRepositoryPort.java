package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Contas conectadas ({@code connector_accounts}, V61). Adaptador JPA: {@code JpaConnectorAdapters} (persistence-mysql). */
public interface ConnectorAccountRepositoryPort {

    Optional<ConnectorAccount> findById(UUID id);

    /** Contas da pessoa, mais recentes primeiro. */
    List<ConnectorAccount> findByOwner(UUID ownerId);

    Optional<ConnectorAccount> findByOwnerAndSubject(UUID ownerId, ConnectorProvider provider, String externalSubject);

    /** Insere (id nulo — o banco gera) ou atualiza; devolve o estado gravado. */
    ConnectorAccount save(ConnectorAccount account);

    void delete(UUID id);
}

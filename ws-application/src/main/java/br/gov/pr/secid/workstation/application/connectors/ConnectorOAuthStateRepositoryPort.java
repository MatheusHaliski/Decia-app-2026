package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;

import java.time.Instant;
import java.util.Optional;

/**
 * Pedidos de autorização OAuth em andamento ({@code connector_oauth_states}, V61). Em tabela, não em memória: o callback pode cair em
 * outra instância. Adaptador JPA: {@code JpaConnectorAdapters}.
 */
public interface ConnectorOAuthStateRepositoryPort {

    void insert(ConnectorOAuthState state);

    /**
     * Uso único: apaga e devolve o pedido com esse hash numa operação atômica entre instâncias (lock da linha + DELETE). Um segundo
     * callback com o mesmo {@code state} recebe vazio. Vencido também é devolvido (quem chama decide e responde ESTADO_INVALIDO).
     */
    Optional<ConnectorOAuthState> consume(String stateHash);

    /** Remove os pedidos vencidos (limpeza a cada nova autorização). */
    int purgeExpired(Instant now);
}

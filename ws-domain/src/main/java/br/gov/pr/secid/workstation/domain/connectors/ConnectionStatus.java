package br.gov.pr.secid.workstation.domain.connectors;

/**
 * Situação da conta conectada: {@code ATIVO} — tokens válidos (ou renováveis); {@code EXPIRADO} — a renovação foi recusada pelo
 * provedor (refresh token revogado, senha trocada, consentimento removido): é preciso reconectar; {@code REVOGADO} — a pessoa
 * desconectou e a revogação no provedor ainda não terminou (a linha some em seguida); {@code ERRO} — a última chamada falhou por outro
 * motivo (o próximo uso tenta de novo). Reconectar a mesma conta volta a {@code ATIVO}.
 */
public enum ConnectionStatus {
    ATIVO, EXPIRADO, REVOGADO, ERRO;

    /** Pode chamar o provedor agora (com renovação, se preciso). */
    public boolean usable() {
        return this == ATIVO || this == ERRO;
    }
}

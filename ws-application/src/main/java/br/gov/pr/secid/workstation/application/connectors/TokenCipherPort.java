package br.gov.pr.secid.workstation.application.connectors;

/**
 * Cifra dos segredos dos conectores em repouso (access/refresh token e verificador PKCE): AES-256-GCM com {@code WS_CONNECTORS_TOKEN_KEY}
 * ({@code AesGcmTokenCipher}, platform). O {@code context} entra como dado autenticado (AAD): um token selado para um dono/provedor não
 * abre em outra linha — copiar o valor de uma conta para outra no banco não funciona. Sem chave válida o bean é {@link #UNAVAILABLE} e os
 * conectores OAuth ficam desabilitados (nunca texto puro). Mensagens de erro nunca levam o valor.
 */
public interface TokenCipherPort {

    String seal(String plaintext, String context);

    /** Abre o valor selado; chave errada, contexto diferente ou dado adulterado → {@link IllegalStateException}. */
    String open(String sealed, String context);

    /** Chave válida carregada. Falso = conectores OAuth desabilitados ({@code 503 CONECTOR_DESABILITADO}). */
    default boolean available() {
        return true;
    }

    /** Sem chave (ou chave inválida): nada é selado nem aberto — os conectores OAuth ficam desabilitados, nunca em texto puro. */
    TokenCipherPort UNAVAILABLE = new TokenCipherPort() {
        @Override
        public String seal(String plaintext, String context) {
            throw new IllegalStateException("WS_CONNECTORS_TOKEN_KEY ausente ou inválida: conectores desabilitados");
        }

        @Override
        public String open(String sealed, String context) {
            throw new IllegalStateException("WS_CONNECTORS_TOKEN_KEY ausente ou inválida: conectores desabilitados");
        }

        @Override
        public boolean available() {
            return false;
        }
    };
}

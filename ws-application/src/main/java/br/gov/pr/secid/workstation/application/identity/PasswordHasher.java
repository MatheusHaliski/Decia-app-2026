package br.gov.pr.secid.workstation.application.identity;

/**
 * Porta de hash de senha (RF1.CA07, D-14). A implementação de produção é Argon2id nos parâmetros mínimos da OWASP
 * ({@code Argon2PasswordHasher}, ws-web); os testes usam um espião que conta chamadas de {@link #matches}.
 */
public interface PasswordHasher {

    /** Hash novo (sal aleatório) da senha em claro. Nunca registre o argumento. */
    String hash(String rawPassword);

    /** Conferência em tempo (aproximadamente) constante do custo do Argon2: é chamada mesmo para conta bloqueada. */
    boolean matches(String rawPassword, String encodedPassword);

    /** {@code true} quando o hash guardado foi feito com parâmetros antigos e deve ser refeito no próximo login certo. */
    boolean needsRehash(String encodedPassword);
}

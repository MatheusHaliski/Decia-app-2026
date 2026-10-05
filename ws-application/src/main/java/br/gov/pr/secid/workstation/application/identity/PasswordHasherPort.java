package br.gov.pr.secid.workstation.application.identity;

/**
 * Hash de senha (porta): Argon2id com os parâmetros mínimos da OWASP no adaptador do ws-web. O serviço de identidade
 * nunca vê o algoritmo — só pede {@code hash}, {@code matches} e, após um login correto, {@code needsRehash} para
 * refazer o hash quando os parâmetros do adaptador subirem.
 */
public interface PasswordHasherPort {

    /** Hash codificado (PHC string, inclui algoritmo, parâmetros e salt). */
    String hash(CharSequence raw);

    /** {@code true} se a senha corresponde ao hash; {@code false} para hash nulo/ilegível (nunca lança). */
    boolean matches(CharSequence raw, String encoded);

    /** {@code true} quando o hash foi gerado com parâmetros mais fracos que os atuais (rehash no login). */
    boolean needsRehash(String encoded);
}

package br.gov.pr.secid.workstation.application.identity;

/** Códigos de erro da autenticação e da conta (RF1–RF3, D-14), citados nos CAs. */
public final class AuthCodes {
    public static final String CREDENCIAIS_INVALIDAS = "CREDENCIAIS_INVALIDAS";
    public static final String CONTA_INDISPONIVEL = "CONTA_INDISPONIVEL";
    public static final String DOIS_FATORES_NECESSARIO = "DOIS_FATORES_NECESSARIO";
    public static final String MUITAS_TENTATIVAS = "MUITAS_TENTATIVAS";
    public static final String SESSAO_INVALIDA = "SESSAO_INVALIDA";
    public static final String SESSAO_ENCERRADA = "SESSAO_ENCERRADA";
    public static final String SENHA_ATUAL_INCORRETA = "SENHA_ATUAL_INCORRETA";
    public static final String REAUTENTICACAO_FALHOU = "REAUTENTICACAO_FALHOU";
    public static final String NOME_RESERVADO = "NOME_RESERVADO";
    public static final String USERNAME_EM_USO = "USERNAME_EM_USO";
    public static final String USERNAME_IMUTAVEL = "USERNAME_IMUTAVEL";
    public static final String CODIGO_INVALIDO = "CODIGO_INVALIDO";
    public static final String CODIGO_EXPIRADO = "CODIGO_EXPIRADO";
    public static final String LINK_INVALIDO = "LINK_INVALIDO";
    public static final String EXCLUSAO_AGENDADA = "EXCLUSAO_AGENDADA";
    public static final String EXCLUSAO_NAO_AGENDADA = "EXCLUSAO_NAO_AGENDADA";
    public static final String OIDC_DESLIGADO = "OIDC_DESLIGADO";
    public static final String OIDC_TOKEN_INVALIDO = "OIDC_TOKEN_INVALIDO";
    public static final String OIDC_NONCE_INVALIDO = "OIDC_NONCE_INVALIDO";
    public static final String OIDC_EMAIL_NAO_VERIFICADO = "OIDC_EMAIL_NAO_VERIFICADO";
    public static final String AUTENTICACAO_INDISPONIVEL = "AUTENTICACAO_INDISPONIVEL";

    private AuthCodes() {
    }
}

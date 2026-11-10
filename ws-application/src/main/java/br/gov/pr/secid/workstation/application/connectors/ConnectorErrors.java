package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.application.common.ApiException;

import java.util.Map;

/**
 * Códigos de erro dos conectores (contrato REST, campo {@code code}): {@code VALIDACAO} (400), {@code ACESSO_NEGADO} (403),
 * {@code NAO_ENCONTRADO} (404), {@code CONECTOR_EXPIRADO} (409 — a renovação falhou: reconectar), {@code CONECTOR_DESABILITADO} (503 — sem
 * client id/segredo ou sem chave de cifra) e {@code PROVEDOR_INDISPONIVEL} (502). E os motivos do retorno do OAuth
 * ({@code conector=erro&motivo=<CODIGO>} no 302 do callback).
 */
public final class ConnectorErrors {
    public static final String CONECTOR_EXPIRADO = "CONECTOR_EXPIRADO";
    public static final String CONECTOR_DESABILITADO = "CONECTOR_DESABILITADO";
    public static final String PROVEDOR_INDISPONIVEL = "PROVEDOR_INDISPONIVEL";

    /** Motivos do callback: state ausente, desconhecido, vencido ou já usado (ou código recusado na troca). */
    public static final String MOTIVO_ESTADO_INVALIDO = "ESTADO_INVALIDO";
    /** A pessoa recusou o consentimento no provedor ({@code error=access_denied}). */
    public static final String MOTIVO_ACESSO_NEGADO = ApiException.ACESSO_NEGADO;
    /** O consentimento veio sem o escopo de leitura de arquivos (o Google deixa desmarcar). */
    public static final String MOTIVO_ESCOPO_INSUFICIENTE = "ESCOPO_INSUFICIENTE";
    public static final String MOTIVO_DESABILITADO = CONECTOR_DESABILITADO;
    public static final String MOTIVO_PROVEDOR = PROVEDOR_INDISPONIVEL;
    public static final String MOTIVO_ERRO_INTERNO = ApiException.ERRO_INTERNO;

    private ConnectorErrors() {
    }

    public static ApiException expired() {
        return new ApiException(CONECTOR_EXPIRADO, 409, "A conexão com o provedor expirou ou foi revogada. Conecte a conta de novo.");
    }

    public static ApiException disabled() {
        return new ApiException(CONECTOR_DESABILITADO, 503, "Este conector não está habilitado neste ambiente.");
    }

    public static ApiException unavailable() {
        return new ApiException(PROVEDOR_INDISPONIVEL, 502, "O provedor não respondeu como esperado. Tente de novo em instantes.");
    }

    public static ApiException forbidden() {
        return ApiException.forbidden("O provedor recusou o acesso a este item com a conta conectada.");
    }

    public static ApiException itemNotFound() {
        return ApiException.notFound("Item");
    }

    /** {@code 400 VALIDACAO} com o campo em {@code details.fields} (mesmo formato do resto da API). */
    public static ApiException invalid(String field, String message) {
        return ApiException.badRequest(ApiException.VALIDACAO, message, Map.of("fields", Map.of(field, message)));
    }
}

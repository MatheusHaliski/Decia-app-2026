package br.gov.pr.secid.workstation.domain.acervo;

/**
 * Por onde o binário de um anexo/evidência entrou (proveniência, V73): {@code DIRETO} = enviado pela própria pessoa (upload multipart);
 * os demais = cópia trazida por conta conectada do provedor (mesmos nomes de {@code ConnectorProvider}). Nulo nas linhas anteriores à V73.
 */
public enum UploadChannel {
    DIRETO, GOOGLE, MICROSOFT, APPLE_ICLOUD
}

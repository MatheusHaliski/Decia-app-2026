package br.gov.pr.secid.workstation.domain.connectors;

/**
 * Como um provedor entra no Work Station: {@code OAUTH} — conta conectada por OAuth 2.0 + PKCE, com busca e importação pela API do
 * provedor; {@code LINK} — sem API pública utilizável, só por link de compartilhamento (e por arquivo exportado no upload).
 */
public enum ConnectorMode {
    OAUTH, LINK
}

package br.gov.pr.secid.workstation.domain.acervo;

/**
 * Família do formato de entrega (docs/produto/FORMATOS_E_VARIANTES.md; front: {@code FORMAT_FAMILIES} em lib/tasks/formats.ts — mesmos
 * códigos). A variante ({@code formatVariant}) é um código curto conferido contra a família em {@link DeliveryFormats}.
 */
public enum FormatFamily {
    PLANILHA, DOCUMENTO, APRESENTACAO, IMAGEM, DESENHO_TECNICO, DADOS, AUDIO_VIDEO, PACOTE, LINK, OUTRO
}

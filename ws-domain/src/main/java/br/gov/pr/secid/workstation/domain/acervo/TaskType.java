package br.gov.pr.secid.workstation.domain.acervo;

/** Tipo da tarefa (RF20, RF41) — TAXONOMIA §13. */
public enum TaskType {
    TEXTO_MANUAL,
    TEXTO_IA,
    IMAGEM_WEB,
    IMAGEM_EDITADA,
    PLANILHA,
    DOCUMENTO,
    PASTA,
    LINK,
    DESENHO_TECNICO,
    FORMULARIO,
    ATA_REGISTRO,
    EMAIL,
    PROTOCOLO,
    CRONOGRAMA,
    ESTUDO_TECNICO_PRELIMINAR
}

package br.gov.pr.secid.workstation.domain.acervo;

/**
 * Tipo da tarefa (RF20, RF41) — TAXONOMIA §13. Os 15 primeiros são os originais; os 16 seguintes chegam com os conectores de
 * fontes externas (V60), um por artefato que o Google, a Microsoft e a Apple produzem e que não cabia nos anteriores (apresentação,
 * diagrama, quadro branco, nota, evento, lista de tarefas, gravação e transcrição de reunião, mensagem de chat, página web, vídeo,
 * áudio, painel de dados, código, mapa e atividade de curso). Ordem preservada: o front espelha esta lista literal.
 */
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
    ESTUDO_TECNICO_PRELIMINAR,
    APRESENTACAO,
    DIAGRAMA,
    QUADRO_BRANCO,
    NOTA,
    EVENTO_AGENDA,
    LISTA_TAREFAS,
    GRAVACAO_REUNIAO,
    TRANSCRICAO,
    MENSAGEM_CHAT,
    PAGINA_WEB,
    VIDEO,
    AUDIO,
    PAINEL_DADOS,
    CODIGO,
    MAPA,
    ATIVIDADE_CURSO
}

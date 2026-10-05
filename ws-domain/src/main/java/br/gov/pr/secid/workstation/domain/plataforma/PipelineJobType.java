package br.gov.pr.secid.workstation.domain.plataforma;

/** Tipo de job assíncrono (TAXONOMIA §12.3; DATA_EXPORT proposto, RF3). */
public enum PipelineJobType {
    THUMBNAIL,
    OCR,
    ANTIVIRUS,
    SYNC_EXTERNO,
    INDEXAR_MEMORIA,
    EXPORT_PDF,
    TRANSCRICAO,
    RECALC_HYPE,
    RECALC_RANKING,
    RECALC_METRICS,
    PERGUNTA_ADIADA,
    DATA_EXPORT
}

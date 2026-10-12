package br.gov.pr.secid.workstation.domain.decisao;

/** Estado do checkpoint (§4.2); PERDIDO torna a decisão VENCIDA (§6.11). */
public enum CheckpointStatus {
    AGENDADO, CONCLUIDO, PERDIDO, CANCELADO
}

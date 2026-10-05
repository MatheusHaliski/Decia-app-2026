package br.gov.pr.secid.workstation.domain.institutional;

/** Decisão do ADMIN sobre um pedido de validação (RF28.CA10, D-19). */
public enum ReviewDecision {
    APROVAR, AJUSTES, RECUSAR;

    public ApprovalStatus resultingStatus() {
        return switch (this) {
            case APROVAR -> ApprovalStatus.APROVADO;
            case AJUSTES -> ApprovalStatus.AJUSTES;
            case RECUSAR -> ApprovalStatus.RECUSADO;
        };
    }
}

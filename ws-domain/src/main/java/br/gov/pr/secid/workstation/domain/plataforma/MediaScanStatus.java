package br.gov.pr.secid.workstation.domain.plataforma;

/**
 * Situação da varredura de um binário (quarentena, D-67/Q-165). PENDENTE = em quarentena aguardando o motor; LIMPO = liberado;
 * INFECTADO = nunca é servido; NAO_VERIFICADO = sem motor de antivírus configurado (porta no-op) — só servido quando
 * {@code ws.upload.require-antivirus=false}.
 */
public enum MediaScanStatus {
    PENDENTE, LIMPO, INFECTADO, NAO_VERIFICADO;

    /** Pode ser servido? INFECTADO e PENDENTE nunca; NAO_VERIFICADO só se o antivírus não for obrigatório. */
    public boolean servable(boolean antivirusRequired) {
        return this == LIMPO || (this == NAO_VERIFICADO && !antivirusRequired);
    }
}

package br.gov.pr.secid.workstation.domain.gamificacao;

/** Situação do lançamento no extrato (RF42): SUSPENSO pelo antifraude, ESTORNADO por revisão. */
public enum LedgerStatus {
    CONFIRMADO,
    SUSPENSO,
    ESTORNADO
}

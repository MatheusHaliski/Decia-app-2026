package br.gov.pr.secid.workstation.domain.decia;

/** Classificação da mensagem pela IA (RF7): ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo · RUIDO. */
public enum MessageClass {
    ARGUMENTO,
    DIVERGENCIA,
    RISCO,
    CONSENSO,
    PERGUNTA,
    RUIDO
}

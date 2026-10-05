package br.gov.pr.secid.workstation.application.identity;

/** Envio de e-mail transacional (códigos, redefinição). Em dev: adaptador de log mascarado; SMTP real é a Q-84. */
public interface MailPort {
    void send(MailMessage message);
}

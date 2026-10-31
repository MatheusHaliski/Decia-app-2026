package br.gov.pr.secid.workstation.domain.identity;

/**
 * Quem vê o perfil público da pessoa (RF3, controle de publicação; auditoria Onda 1). Vale para o cabeçalho, a foto, as tarefas visíveis
 * e seguir: quem não pode ver recebe o mesmo 404 de uma conta inexistente.
 */
public enum ProfileVisibility {
    /** Qualquer conta autenticada (padrão). */
    AUTENTICADOS,
    /** Só pessoas da mesma empresa ({@code users.company_id}); sem empresa, só a própria pessoa. */
    EMPRESA
}

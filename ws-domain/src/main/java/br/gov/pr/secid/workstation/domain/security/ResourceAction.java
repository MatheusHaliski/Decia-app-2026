package br.gov.pr.secid.workstation.domain.security;

/**
 * Ações avaliadas pelas políticas (D-65/D-66). Genéricas para qualquer recurso (VIEW, EDIT, DELETE, MANAGE) e específicas da decisão
 * estruturada (EDIT_STRUCTURE, ASSESS, DECIDE, REOPEN — 03_MODELO_FUNCIONAL §8).
 */
public enum ResourceAction {
    /** Ler o recurso (e saber que existe). */
    VIEW,
    /** Alterar o conteúdo (dono, colaborador explícito ou ADMIN fora de SIGILOSO). */
    EDIT,
    /** Apagar/arquivar (dono ou ADMIN fora de SIGILOSO). */
    DELETE,
    /** Moderar/gerir no escopo do departamento (dono, ADMIN, CHEFE/CURADOR do departamento do recurso). */
    MANAGE,
    /** Decisão: editar alternativas, critérios, evidências, premissas, riscos (CONDUTOR, APROVADOR, responsável). */
    EDIT_STRUCTURE,
    /** Decisão: dar notas 1–5 (CONTRIBUIDOR ou acima, e o responsável). */
    ASSESS,
    /** Decisão: AGUARDANDO_DECISAO → DECIDIDA (só o responsável ou APROVADOR com delegação registrada). */
    DECIDE,
    /** Decisão: reabrir (só o responsável ou APROVADOR com delegação registrada). */
    REOPEN
}

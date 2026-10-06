package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;

/**
 * Permissões da decisão estruturada (03_MODELO_FUNCIONAL §8, D-66) sobre {@link AccessPolicy}:
 * <ul>
 *   <li>Ver: responsável, qualquer participante DACI e o escopo da visibilidade (com o teto da classificação); ADMIN vê.</li>
 *   <li>Editar estrutura (EDIT/EDIT_STRUCTURE): responsável, CONDUTOR, APROVADOR.</li>
 *   <li>Avaliar (ASSESS): responsável, CONDUTOR, APROVADOR, CONTRIBUIDOR. INFORMADO só lê.</li>
 *   <li>Decidir/Reabrir: só o responsável, ou o APROVADOR com delegação explícita registrada.</li>
 *   <li>DELETE: responsável ou ADMIN; MANAGE: responsável, ADMIN, CHEFE/CURADOR do departamento (fora de PRIVADA).</li>
 * </ul>
 * ADMIN não avalia, não edita a estrutura e não decide por ninguém (G1: um responsável humano) — vê, e recebe 403 nessas ações.
 */
public final class DecisionAccessPolicy {

    private DecisionAccessPolicy() {
    }

    /**
     * @param participantRole papel DACI de quem pede nesta decisão, ou {@code null} se não participa
     * @param delegatedApprover delegação explícita registrada para o APROVADOR decidir/reabrir
     */
    public static AccessDecision decide(Viewer viewer, Decision decision, DecisionRole participantRole, boolean delegatedApprover,
                                        ResourceAction action) {
        if (viewer == null || decision == null) {
            return AccessDecision.NOT_FOUND;
        }
        ScopedResource r = ScopedResource.of(decision);
        boolean visible = participantRole != null || AccessPolicy.visible(viewer, r);
        if (!visible) {
            return AccessDecision.NOT_FOUND;
        }
        boolean owner = viewer.is(decision.ownerUserId());
        boolean permitted = switch (action) {
            case VIEW -> true;
            case EDIT, EDIT_STRUCTURE -> owner || (participantRole != null && participantRole.canEditStructure());
            case ASSESS -> owner || (participantRole != null && participantRole.canAssess());
            case DECIDE, REOPEN -> owner || (participantRole == DecisionRole.APROVADOR && delegatedApprover);
            case DELETE, MANAGE -> AccessPolicy.decide(viewer, r, action).allowed();
        };
        return AccessDecision.of(true, permitted);
    }
}

package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;

/**
 * Acesso ao binário de mídia (OwnMedia, D-67). A classe de armazenamento manda:
 * <ul>
 *   <li>RESTRICTED (conteúdo RESTRITO/SIGILOSO, chave {@code restricted/…}): só o dono e ADMIN — mesmo que o recurso-pai seja visível.</li>
 *   <li>PRIVATE: dono, ADMIN ou quem vê o recurso-pai (anexo de tarefa/decisão visível).</li>
 *   <li>PUBLIC: qualquer autenticado.</li>
 * </ul>
 * Ler = VIEW; trocar/apagar (EDIT/DELETE) = dono ou ADMIN; demais ações → FORBIDDEN. Invisível → NOT_FOUND.
 */
public final class MediaAccessPolicy {

    private MediaAccessPolicy() {
    }

    /** Classe de armazenamento obrigatória para a classificação do conteúdo: RESTRITO/SIGILOSO nunca ficam fora de {@code restricted/}. */
    public static MediaAccessClass storageClassFor(AccessClassification classification, boolean publicAsset) {
        if (classification == AccessClassification.RESTRITO || classification == AccessClassification.SIGILOSO) {
            return MediaAccessClass.RESTRICTED;
        }
        return publicAsset && classification == AccessClassification.PUBLICO ? MediaAccessClass.PUBLIC : MediaAccessClass.PRIVATE;
    }

    /**
     * @param parentVisible quem pede vê o recurso que referencia a mídia (calculado pela política do pai)
     */
    public static AccessDecision decide(Viewer viewer, MediaObject media, boolean parentVisible, ResourceAction action) {
        if (viewer == null || media == null) {
            return AccessDecision.NOT_FOUND;
        }
        boolean ownerOrAdmin = viewer.is(media.ownerId()) || viewer.isAdmin();
        MediaAccessClass cls = media.accessClass() == null ? MediaAccessClass.PRIVATE : media.accessClass();
        boolean visible = switch (cls) {
            case RESTRICTED -> ownerOrAdmin;
            case PRIVATE -> ownerOrAdmin || parentVisible;
            case PUBLIC -> true;
        };
        boolean permitted = switch (action) {
            case VIEW -> true;
            case EDIT, DELETE -> ownerOrAdmin;
            default -> false;
        };
        return AccessDecision.of(visible, permitted);
    }
}

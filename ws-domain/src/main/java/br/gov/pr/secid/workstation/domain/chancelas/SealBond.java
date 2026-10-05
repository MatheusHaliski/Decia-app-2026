package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Vínculo de Chancela (= FAI SealBond) — TAXONOMIA §6.3 (RF39; lido em RF20, RF21, RF40, RF45). Estado por {@link SealBondStatus};
 * único (targetId, issuerUserId) (RF39.CA08); toda transição gera AuditLog + Notification.
 */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "seal_bonds", rfs = {"RF39", "RF20", "RF21", "RF40", "RF42", "RF45"}, migration = 18,
        versioned = true,
        doc = "Vínculos chancela × alvo (polimórfico). Chancela/emissor/autor RESTRICT (prova de mérito); revisor RESTRICT.",
        uniques = {"target_id, issuer_user_id", "seal_code"},
        indexes = {"seal_id, status", "target_type, target_id", "target_owner_id, status", "status, expires_at"})
public record SealBond(
        @Attr("identificador") UUID id,
        @Attr(value = "chancela", ref = "seals", onDelete = OnDelete.RESTRICT) UUID sealId,
        @Attr(value = "emissor", ref = "users", onDelete = OnDelete.RESTRICT) UUID issuerUserId,
        @Attr("tipo do alvo") SealTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "autor do alvo", ref = "users", onDelete = OnDelete.RESTRICT) UUID targetOwnerId,
        @Attr(value = "quem pediu (indicação/curadoria)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID requestedBy,
        @Attr("base") SealBondBasis basis,
        @Attr("origem") SealBondOrigin origin,
        @Attr(value = "confiança 0–1", opt = true, sql = "DECIMAL(5,4)") BigDecimal confidence,
        @Attr(value = "justificativa", opt = true, len = 1024) String justification,
        @Attr(value = "relatório dos critérios", opt = true) String criteriaReportJson,
        @Attr(value = "estado", def = "'SUGERIDA'") SealBondStatus status,
        @Attr("exige revisão") boolean requiresReview,
        @Attr(value = "consentimento do autor (lacre público)", opt = true) Boolean authorConsent,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "resposta do autor em", opt = true) Instant respondedAt,
        @Attr(value = "revisado em", opt = true) Instant reviewedAt,
        @Attr(value = "revisor", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewedBy,
        @Attr(value = "nota do revisor", opt = true, len = 1000) String reviewNote,
        @Attr(value = "código do lacre (único)", opt = true, len = 40) String sealCode,
        @Attr(value = "emitido em", opt = true) Instant issuedAt,
        @Attr(value = "expira em", opt = true) Instant expiresAt,
        @Attr(value = "motivo da revogação", opt = true, len = 500) String revokeReason,
        @Attr(value = "última recertificação", opt = true) Instant lastRecertifiedAt) {

    /** Transição pela máquina do RF39; revogar exige motivo; aprovar público exige consentimento do autor. */
    public SealBond transition(SealBondStatus to, Instant at, String reason) {
        SealBondStatus next = status.transition(to);
        if (next == SealBondStatus.REVOGADA && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("VALIDACAO: revogação exige revokeReason");
        }
        if (next == SealBondStatus.APROVADA && !Boolean.TRUE.equals(authorConsent)) {
            throw new IllegalStateException("CHANCELA_INVALIDA: APROVADA exige authorConsent = true (use APROVADA_PRIVADA)");
        }
        return new SealBond(id, sealId, issuerUserId, targetType, targetId, targetOwnerId, requestedBy, basis, origin, confidence, justification,
                criteriaReportJson, next, requiresReview, authorConsent, aiInferenceId,
                next == SealBondStatus.ACEITA || next == SealBondStatus.EDITADA || next == SealBondStatus.RECUSADA ? at : respondedAt,
                next == SealBondStatus.REJEITADA || next.isApproved() && status == SealBondStatus.EM_REVISAO ? at : reviewedAt,
                reviewedBy, reviewNote, sealCode, next.isApproved() && issuedAt == null ? at : issuedAt, expiresAt,
                next == SealBondStatus.REVOGADA ? reason : revokeReason, lastRecertifiedAt);
    }
}

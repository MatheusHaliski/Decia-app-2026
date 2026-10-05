package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Dossiê de Transição (RF36) — TAXONOMIA §11.1; encerrar gestão (RF25.CA05) e troca de chefe (RF28) o geram. */
@DomainEntity(context = "6 Rastro de Decisão", table = "handoff_dossiers", rfs = {"RF36", "RF25", "RF28"}, migration = 15, versioned = true,
        doc = "Dossiês de transição. Pessoas RESTRICT (trilha institucional); agrupamento, documento e projeto gerados SET NULL.",
        indexes = {"subject_user_id, status", "grouping_id", "successor_user_id"})
public record HandoffDossier(
        @Attr("identificador") UUID id,
        @Attr("empregado ou gestão") HandoffSubjectType subjectType,
        @Attr(value = "pessoa que sai (quando EMPREGADO)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID subjectUserId,
        @Attr(value = "gestão encerrada (quando GESTAO)", opt = true, ref = "groupings", onDelete = OnDelete.SET_NULL) UUID groupingId,
        @Attr(value = "quem pediu", ref = "users", onDelete = OnDelete.RESTRICT) UUID requestedBy,
        @Attr("motivo") HandoffReason reason,
        @Attr("gerado em") Instant generatedAt,
        @Attr("conteúdo {openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries[]}")
        String contentJson,
        @Attr(value = "DOCUMENTO PDF gerado", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID documentTaskId,
        @Attr(value = "projeto de transição", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID transitionProjectId,
        @Attr(value = "sucessor", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID successorUserId,
        @Attr(value = "aceite do sucessor", opt = true) Instant successorAcceptedAt,
        @Attr(value = "estado", def = "'GERADO'") HandoffStatus status,
        @Attr("consentimento para itens privados") boolean consentForPrivateItems,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {

    public HandoffDossier transition(HandoffStatus to) {
        return new HandoffDossier(id, subjectType, subjectUserId, groupingId, requestedBy, reason, generatedAt, contentJson, documentTaskId,
                transitionProjectId, successorUserId, successorAcceptedAt, status.transition(to), consentForPrivateItems, aiInferenceId);
    }
}

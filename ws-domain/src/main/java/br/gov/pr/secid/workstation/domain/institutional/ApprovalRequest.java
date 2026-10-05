package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;

import java.time.Instant;
import java.util.UUID;

/**
 * Pedido de validação de perfil EMPRESA/CHEFE — TAXONOMIA §1.8 (RF1 após e-mail confirmado, RF28.CA01/CA09–CA17, RF3, RF18; D-19).
 * Nasce só depois da confirmação do e-mail; APROVADO exige todos os critérios obrigatórios; AJUSTES/RECUSADO exigem motivo.
 */
@DomainEntity(context = "1 Identidade & Acesso", table = "approval_requests", rfs = {"RF1", "RF28", "RF3", "RF18"}, migration = 10, versioned = true,
        doc = "Validação de perfil pelo ADMIN. Um pedido por usuário; attempts ≤ maxSubmissions da política; prazo em dias úteis.",
        indexes = {"status, due_at", "reviewed_by"},
        checks = {"attempts BETWEEN 1 AND 5"})
public record ApprovalRequest(
        @Attr("identificador") UUID id,
        @Attr(value = "titular do pedido", ref = "users", onDelete = OnDelete.CASCADE, unique = true) UUID userId,
        @Attr("perfil pedido") ProfileType requestedProfile,
        @Attr(value = "evidências enviadas", opt = true) String evidenceJson,
        @Attr(value = "estado", def = "'PENDENTE'") ApprovalStatus status,
        @Attr(value = "versão da VerificationPolicy congelada", len = 20) String policyVersion,
        @Attr(value = "checklist [{code, mandatory, auto, checked, checkedBy, checkedAt}]", opt = true) String criteriaJson,
        @Attr(value = "motivos padronizados (≥ 1 em AJUSTES/RECUSADO)", opt = true) String reasonsJson,
        @Attr(value = "nota do analista (≤ 500, sem dado sensível)", opt = true, len = 500) String note,
        @Attr(value = "envios (cadastro = 1; ≤ 5)", def = "1") int attempts,
        @Attr(value = "confirmação do e-mail (início do prazo)", opt = true) Instant emailConfirmedAt,
        @Attr(value = "último envio", opt = true) Instant submittedAt,
        @Attr(value = "prazo da análise", opt = true) Instant dueAt,
        @Attr(value = "código WS-xxxxxx mostrado só ao dono", len = 12) String verificationCode,
        @Attr(value = "chaves dos documentos em restricted/", opt = true) String documentKeysJson,
        @Attr(value = "quem confirmou o vínculo (CHEFE: chefe atual ou dona da EMPRESA, Q-66)", opt = true, ref = "users",
                onDelete = OnDelete.RESTRICT) UUID confirmedBy,
        @Attr(value = "data da confirmação", opt = true) Instant confirmedAt,
        @Attr(value = "ADMIN que decidiu", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewedBy,
        @Attr(value = "data da decisão", opt = true) Instant reviewedAt) {

    public static final int MAX_ATTEMPTS = 5;

    public ApprovalRequest {
        if (attempts < 1 || attempts > MAX_ATTEMPTS) {
            throw new IllegalArgumentException("LIMITE_ESGOTADO: attempts fora de 1.." + MAX_ATTEMPTS);
        }
    }

    /** Aplica a decisão do ADMIN; o ADMIN não decide o próprio pedido (403 ACESSO_NEGADO) e motivos são obrigatórios em AJUSTES/RECUSAR. */
    public ApprovalRequest review(ReviewDecision decision, UUID adminId, String reasons, Instant at) {
        if (adminId.equals(userId)) {
            throw new IllegalStateException("ACESSO_NEGADO: o ADMIN não decide o próprio pedido");
        }
        ApprovalStatus next = status.transition(decision.resultingStatus());
        if (next.requiresReason() && (reasons == null || reasons.isBlank())) {
            throw new IllegalArgumentException("VALIDACAO: motivos obrigatórios em " + next);
        }
        return new ApprovalRequest(id, userId, requestedProfile, evidenceJson, next, policyVersion, criteriaJson, reasons, note, attempts,
                emailConfirmedAt, submittedAt, dueAt, verificationCode, documentKeysJson, confirmedBy, confirmedAt, adminId, at);
    }

    /** Reenvio pelo titular: volta a PENDENTE e conta uma tentativa; na quinta tentativa esgota. */
    public ApprovalRequest resubmit(Instant at, Instant newDueAt) {
        if (attempts >= MAX_ATTEMPTS) {
            ApprovalStatus exhausted = status.transition(ApprovalStatus.ESGOTADO);
            return withStatus(exhausted, attempts, at, newDueAt);
        }
        return withStatus(status.transition(ApprovalStatus.PENDENTE), attempts + 1, at, newDueAt);
    }

    private ApprovalRequest withStatus(ApprovalStatus next, int newAttempts, Instant at, Instant newDueAt) {
        return new ApprovalRequest(id, userId, requestedProfile, evidenceJson, next, policyVersion, criteriaJson, reasonsJson, note, newAttempts,
                emailConfirmedAt, at, newDueAt, verificationCode, documentKeysJson, confirmedBy, confirmedAt, reviewedBy, reviewedAt);
    }
}

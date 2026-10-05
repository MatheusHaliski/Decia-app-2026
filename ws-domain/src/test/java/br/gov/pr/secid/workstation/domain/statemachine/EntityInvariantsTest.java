package br.gov.pr.secid.workstation.domain.statemachine;

import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskSnapshot;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.chancelas.SealBond;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondBasis;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondOrigin;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondStatus;
import br.gov.pr.secid.workstation.domain.chancelas.SealTargetType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decia.DecisionReview;
import br.gov.pr.secid.workstation.domain.decia.ReviewOutcome;
import br.gov.pr.secid.workstation.domain.gamificacao.DeciaPointsLedgerEntry;
import br.gov.pr.secid.workstation.domain.gamificacao.LedgerStatus;
import br.gov.pr.secid.workstation.domain.gamificacao.PointsEvent;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalRequest;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalStatus;
import br.gov.pr.secid.workstation.domain.institutional.ReviewDecision;
import br.gov.pr.secid.workstation.domain.lgpd.DataExportRequest;
import br.gov.pr.secid.workstation.domain.lgpd.ExportFormat;
import br.gov.pr.secid.workstation.domain.lgpd.ExportStatus;
import br.gov.pr.secid.workstation.domain.mensageria.Assignment;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentOrigin;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentStatus;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentTargetType;
import br.gov.pr.secid.workstation.domain.projetos.ProjectTask;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import br.gov.pr.secid.workstation.domain.common.UiLanguage;
import br.gov.pr.secid.workstation.domain.acervo.TaskOrigin;
import br.gov.pr.secid.workstation.domain.acervo.CoverMode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Invariantes dos records de domínio (validações nos construtores compactos e operações de transição). */
class EntityInvariantsTest {

    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");

    private static TaskItem task(TaskState state, Set<ProcessTag> tags) {
        return new TaskItem(UUID.randomUUID(), UUID.randomUUID(), null, "Ofício 12", null, null, TaskType.DOCUMENTO, null, null, tags, null,
                AccessClassification.INTERNO, "pdf", null, null, BigDecimal.ZERO, TaskOrigin.INTERNA, SourceKind.ARQUIVO, null, null, null, null,
                null, null, null, null, null, Priority.MEDIA, state, null, null, null, null, null, null, null, null, Visibility.PRIVADA, false,
                false, false, null, null, null, null, CoverMode.AUTO, null, null, null, null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, null);
    }

    @Test
    void tarefaLimitaEtiquetasBloqueioExigeCausaEOferecerMarcaBalcao() {
        assertThatThrownBy(() -> task(TaskState.RASCUNHO, Set.of(ProcessTag.OBRA, ProcessTag.CONVENIO, ProcessTag.JURIDICO)))
                .hasMessageContaining("processTags ≤ 2");
        TaskItem t = task(TaskState.DISPONIVEL, Set.of(ProcessTag.OBRA));
        assertThatThrownBy(() -> t.block(null, null, "x")).hasMessageContaining("blockedByTaskId ou blockedByUserId");
        assertThatThrownBy(() -> t.block(UUID.randomUUID(), null, " ")).hasMessageContaining("blockReason");
        TaskItem blocked = t.block(UUID.randomUUID(), null, "aguarda parecer");
        assertThat(blocked.state()).isEqualTo(TaskState.BLOQUEADA);
        assertThat(blocked.blockReason()).isEqualTo("aguarda parecer");
        TaskItem unblocked = blocked.transition(TaskState.DISPONIVEL);
        assertThat(unblocked.blockReason()).isNull();
        TaskItem offered = unblocked.transition(TaskState.OFERECIDA);
        assertThat(offered.offeredInCounter()).isTrue();
        assertThat(offered.transition(TaskState.DISPONIVEL).offeredInCounter()).isFalse();
        assertThatThrownBy(() -> t.transition(TaskState.RASCUNHO)).hasMessageContaining("TAREFA_TRANSICAO_INVALIDA");
        assertThat(t.allowsExternalAi()).isTrue();
        TaskSnapshot snap = TaskSnapshot.of(t, "Ana", NOW);
        assertThat(snap.title()).isEqualTo("Ofício 12");
        assertThat(snap.type()).isEqualTo(TaskType.DOCUMENTO);
    }

    @Test
    void projectTaskPertEPercentual() {
        ProjectTask pt = new ProjectTask(UUID.randomUUID(), UUID.randomUUID(), null, ProjectPhase.ELABORACAO, 1, null, null, null, null,
                new BigDecimal("2"), new BigDecimal("4"), new BigDecimal("12"), null, 50, null, null, null, false, null, null, null, false, null, null,
                null, null, null, null, null);
        assertThat(pt.pertEstimate()).isEqualByComparingTo("5.00");
        assertThatThrownBy(() -> new ProjectTask(UUID.randomUUID(), UUID.randomUUID(), null, ProjectPhase.ELABORACAO, 1, null, null, null, null, null,
                null, null, null, 101, null, null, null, false, null, null, null, false, null, null, null, null, null, null, null))
                .hasMessageContaining("percentComplete");
    }

    @Test
    void validacaoDePerfilAdminNaoDecideOProprioEMotivoObrigatorio() {
        UUID owner = UUID.randomUUID();
        ApprovalRequest r = new ApprovalRequest(UUID.randomUUID(), owner, ProfileType.EMPRESA, null, ApprovalStatus.PENDENTE, "1.0", null, null, null, 1,
                NOW, NOW, null, "WS-ABC123", null, null, null, null, null);
        assertThatThrownBy(() -> r.review(ReviewDecision.APROVAR, owner, null, NOW)).hasMessageContaining("ACESSO_NEGADO");
        assertThatThrownBy(() -> r.review(ReviewDecision.RECUSAR, UUID.randomUUID(), " ", NOW)).hasMessageContaining("VALIDACAO");
        ApprovalRequest adjusted = r.review(ReviewDecision.AJUSTES, UUID.randomUUID(), "[\"DOC_ILEGIVEL\"]", NOW);
        assertThat(adjusted.status()).isEqualTo(ApprovalStatus.AJUSTES);
        ApprovalRequest resubmitted = adjusted.resubmit(NOW, NOW);
        assertThat(resubmitted.status()).isEqualTo(ApprovalStatus.PENDENTE);
        assertThat(resubmitted.attempts()).isEqualTo(2);
        ApprovalRequest fifth = new ApprovalRequest(UUID.randomUUID(), owner, ProfileType.EMPRESA, null, ApprovalStatus.RECUSADO, "1.0", null, null,
                null, 5, NOW, NOW, null, "WS-ABC123", null, null, null, null, null);
        assertThat(fifth.resubmit(NOW, NOW).status()).isEqualTo(ApprovalStatus.ESGOTADO);
        assertThatThrownBy(() -> new ApprovalRequest(UUID.randomUUID(), owner, ProfileType.EMPRESA, null, ApprovalStatus.PENDENTE, "1.0", null, null,
                null, 6, NOW, NOW, null, "WS-ABC123", null, null, null, null, null)).hasMessageContaining("LIMITE_ESGOTADO");
    }

    @Test
    void exportacaoSoDoDonoEmReadyENaoVencida() {
        UUID owner = UUID.randomUUID();
        DataExportRequest e = new DataExportRequest(UUID.randomUUID(), owner, ExportStatus.REQUESTED, null, null, ExportFormat.JSON, UiLanguage.PT_BR,
                null, NOW, null, NOW.plusSeconds(3600), null, null);
        assertThat(e.canDownload(owner, NOW)).isFalse();
        DataExportRequest ready = e.transition(ExportStatus.PROCESSING).transition(ExportStatus.READY);
        assertThat(ready.canDownload(owner, NOW)).isTrue();
        assertThat(ready.canDownload(UUID.randomUUID(), NOW)).isFalse();
        assertThat(ready.canDownload(owner, NOW.plusSeconds(7200))).isFalse();
    }

    @Test
    void atribuicaoSoDestinatarioRespondeComMotivo() {
        UUID to = UUID.randomUUID();
        Assignment a = new Assignment(UUID.randomUUID(), AssignmentTargetType.TASK, UUID.randomUUID(), UUID.randomUUID(), to, AssignmentOrigin.CHAT_WS,
                AssignmentStatus.PROPOSTA, null, null, null, null, null, null);
        assertThatThrownBy(() -> a.respond(UUID.randomUUID(), AssignmentStatus.ACEITA, null, NOW)).hasMessageContaining("ACESSO_NEGADO");
        assertThatThrownBy(() -> a.respond(to, AssignmentStatus.RECUSADA, "", NOW)).hasMessageContaining("MOTIVO_OBRIGATORIO");
        Assignment accepted = a.respond(to, AssignmentStatus.ACEITA, null, NOW);
        assertThat(accepted.status()).isEqualTo(AssignmentStatus.ACEITA);
        assertThatThrownBy(() -> accepted.respond(to, AssignmentStatus.RECUSADA, "x", NOW)).hasMessageContaining("ATRIBUICAO_JA_RESPONDIDA");
        assertThat(accepted.respond(to, AssignmentStatus.DEVOLVIDA, "mudei de setor", NOW).status()).isEqualTo(AssignmentStatus.DEVOLVIDA);
    }

    @Test
    void chancelaAprovadaExigeConsentimentoERevogacaoExigeMotivo() {
        SealBond b = new SealBond(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), SealTargetType.TASK, UUID.randomUUID(), UUID.randomUUID(), null,
                SealBondBasis.POLITICA, SealBondOrigin.POLITICA, null, null, null, SealBondStatus.ACEITA, false, null, null, null, null, null, null, null,
                null, null, null, null);
        assertThatThrownBy(() -> b.transition(SealBondStatus.APROVADA, NOW, null)).hasMessageContaining("CHANCELA_INVALIDA");
        SealBond priv = b.transition(SealBondStatus.APROVADA_PRIVADA, NOW, null);
        assertThat(priv.issuedAt()).isEqualTo(NOW);
        assertThatThrownBy(() -> priv.transition(SealBondStatus.REVOGADA, NOW, " ")).hasMessageContaining("revokeReason");
        assertThat(priv.transition(SealBondStatus.REVOGADA, NOW, "critério deixou de ser atendido").revokeReason()).isNotBlank();
    }

    @Test
    void extratoDePontosMultiplicadorEIdempotencia() {
        DeciaPointsLedgerEntry e = new DeciaPointsLedgerEntry(UUID.randomUUID(), UUID.randomUUID(), 10, PointsEvent.CONSENSO, null, null, null, null,
                new BigDecimal("1.5"), "CONSENSO:1:u", LedgerStatus.CONFIRMADO, null, null, null, null, null);
        assertThat(e.effectivePoints()).isEqualTo(15);
        assertThatThrownBy(() -> new DeciaPointsLedgerEntry(UUID.randomUUID(), UUID.randomUUID(), 10, PointsEvent.CONSENSO, null, null, null, null,
                new BigDecimal("3"), "k", LedgerStatus.CONFIRMADO, null, null, null, null, null)).hasMessageContaining("qualityMultiplier");
        assertThatThrownBy(() -> new DeciaPointsLedgerEntry(UUID.randomUUID(), UUID.randomUUID(), 10, PointsEvent.CONSENSO, null, null, null, null,
                null, " ", LedgerStatus.CONFIRMADO, null, null, null, null, null)).hasMessageContaining("idempotencyKey");
        assertThatThrownBy(() -> new DecisionReview(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), ReviewOutcome.DEVOLVIDA, null, NOW, null))
                .hasMessageContaining("motivo");
    }
}

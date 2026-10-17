package br.gov.pr.secid.workstation.domain.catalog;

import br.gov.pr.secid.workstation.domain.acervo.Evidence;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;
import br.gov.pr.secid.workstation.domain.acervo.OrgEntity;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskSnapshot;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskVersion;
import br.gov.pr.secid.workstation.domain.balcao.ModelOffer;
import br.gov.pr.secid.workstation.domain.balcao.StoreItem;
import br.gov.pr.secid.workstation.domain.balcao.StorePurchase;
import br.gov.pr.secid.workstation.domain.balcao.UserSkin;
import br.gov.pr.secid.workstation.domain.chancelas.Benefit;
import br.gov.pr.secid.workstation.domain.chancelas.BenefitRedemption;
import br.gov.pr.secid.workstation.domain.chancelas.Seal;
import br.gov.pr.secid.workstation.domain.chancelas.SealBond;
import br.gov.pr.secid.workstation.domain.chancelas.SealPolicy;
import br.gov.pr.secid.workstation.domain.chancelas.SealProposal;
import br.gov.pr.secid.workstation.domain.decia.AiQuestion;
import br.gov.pr.secid.workstation.domain.decia.AnalyticalSummary;
import br.gov.pr.secid.workstation.domain.decia.DeciaSession;
import br.gov.pr.secid.workstation.domain.decia.DecisionReview;
import br.gov.pr.secid.workstation.domain.decia.Divergence;
import br.gov.pr.secid.workstation.domain.decia.DivergenceReply;
import br.gov.pr.secid.workstation.domain.decia.FinalDecision;
import br.gov.pr.secid.workstation.domain.decia.Meeting;
import br.gov.pr.secid.workstation.domain.decia.MeetingTranscript;
import br.gov.pr.secid.workstation.domain.decia.MessageAttachment;
import br.gov.pr.secid.workstation.domain.decia.MessageClassification;
import br.gov.pr.secid.workstation.domain.decia.RecordingConsent;
import br.gov.pr.secid.workstation.domain.decia.ReopenRequest;
import br.gov.pr.secid.workstation.domain.decia.SessionArtifact;
import br.gov.pr.secid.workstation.domain.decia.SessionMessage;
import br.gov.pr.secid.workstation.domain.decia.SessionMessageIndex;
import br.gov.pr.secid.workstation.domain.decia.SessionParticipant;
import br.gov.pr.secid.workstation.domain.decia.SummaryScenario;
import br.gov.pr.secid.workstation.domain.decisao.CriterionAssessment;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAlternative;
import br.gov.pr.secid.workstation.domain.decisao.DecisionAssumption;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCheckpoint;
import br.gov.pr.secid.workstation.domain.decisao.DecisionCriterion;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvent;
import br.gov.pr.secid.workstation.domain.decisao.DecisionEvidence;
import br.gov.pr.secid.workstation.domain.decisao.DecisionForecast;
import br.gov.pr.secid.workstation.domain.decisao.DecisionOutcome;
import br.gov.pr.secid.workstation.domain.decisao.DecisionParticipant;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRecommendation;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRetrospective;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRisk;
import br.gov.pr.secid.workstation.domain.decisao.DecisionScenario;
import br.gov.pr.secid.workstation.domain.decisao.DecisionSnapshot;
import br.gov.pr.secid.workstation.domain.decisao.DecisionTrigger;
import br.gov.pr.secid.workstation.domain.decisao.DecisionWorkLink;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceLink;
import br.gov.pr.secid.workstation.domain.gamificacao.AiCreditLedgerEntry;
import br.gov.pr.secid.workstation.domain.gamificacao.CollectiveGoal;
import br.gov.pr.secid.workstation.domain.gamificacao.DailyTask;
import br.gov.pr.secid.workstation.domain.gamificacao.DeciaPointsLedgerEntry;
import br.gov.pr.secid.workstation.domain.gamificacao.DeciaPointsRule;
import br.gov.pr.secid.workstation.domain.gamificacao.DeliberativeProfile;
import br.gov.pr.secid.workstation.domain.gamificacao.EfficiencyScoreSnapshot;
import br.gov.pr.secid.workstation.domain.gamificacao.GoalParticipant;
import br.gov.pr.secid.workstation.domain.gamificacao.Highlight;
import br.gov.pr.secid.workstation.domain.gamificacao.HseWeights;
import br.gov.pr.secid.workstation.domain.gamificacao.HypeBand;
import br.gov.pr.secid.workstation.domain.gamificacao.HypeIgnoredEvent;
import br.gov.pr.secid.workstation.domain.gamificacao.PointsDonation;
import br.gov.pr.secid.workstation.domain.gamificacao.ProfileHypeScore;
import br.gov.pr.secid.workstation.domain.gamificacao.RankingEntry;
import br.gov.pr.secid.workstation.domain.gamificacao.RankingWeights;
import br.gov.pr.secid.workstation.domain.gamificacao.Recognition;
import br.gov.pr.secid.workstation.domain.gamificacao.WeekPlan;
import br.gov.pr.secid.workstation.domain.gamificacao.WeekPlanDay;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import br.gov.pr.secid.workstation.domain.ia.AiProviderCircuitState;
import br.gov.pr.secid.workstation.domain.ia.AiQuota;
import br.gov.pr.secid.workstation.domain.ia.Citation;
import br.gov.pr.secid.workstation.domain.ia.ExtractionCorrection;
import br.gov.pr.secid.workstation.domain.ia.ExtractionResult;
import br.gov.pr.secid.workstation.domain.ia.FeasibilitySheet;
import br.gov.pr.secid.workstation.domain.ia.Insight;
import br.gov.pr.secid.workstation.domain.ia.InstitutionalMemoryDocument;
import br.gov.pr.secid.workstation.domain.ia.MemoryQuery;
import br.gov.pr.secid.workstation.domain.ia.MetricDefinition;
import br.gov.pr.secid.workstation.domain.ia.MetricSnapshot;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalRequest;
import br.gov.pr.secid.workstation.domain.institutional.ChefeProfileExtension;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CuratorAppointment;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DepartmentMembership;
import br.gov.pr.secid.workstation.domain.institutional.EmpresaProfileExtension;
import br.gov.pr.secid.workstation.domain.institutional.PendingUpload;
import br.gov.pr.secid.workstation.domain.institutional.VerificationPolicy;
import br.gov.pr.secid.workstation.domain.lgpd.ConsentEvent;
import br.gov.pr.secid.workstation.domain.lgpd.DataExportRequest;
import br.gov.pr.secid.workstation.domain.lgpd.DataSubjectRequest;
import br.gov.pr.secid.workstation.domain.lgpd.PolicyAcceptance;
import br.gov.pr.secid.workstation.domain.lgpd.PolicyDocument;
import br.gov.pr.secid.workstation.domain.lgpd.UserConsent;
import br.gov.pr.secid.workstation.domain.mensageria.Assignment;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversation;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessage;
import br.gov.pr.secid.workstation.domain.planejamento.AnnualPlan;
import br.gov.pr.secid.workstation.domain.planejamento.Grouping;
import br.gov.pr.secid.workstation.domain.planejamento.GroupingItem;
import br.gov.pr.secid.workstation.domain.planejamento.PlanAxis;
import br.gov.pr.secid.workstation.domain.planejamento.PlanAxisProject;
import br.gov.pr.secid.workstation.domain.plataforma.DomainEventOutbox;
import br.gov.pr.secid.workstation.domain.plataforma.FeatureFlag;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;
import br.gov.pr.secid.workstation.domain.plataforma.PersonalDataSource;
import br.gov.pr.secid.workstation.domain.plataforma.PipelineJob;
import br.gov.pr.secid.workstation.domain.projetos.ComplianceChecklist;
import br.gov.pr.secid.workstation.domain.projetos.ComplianceItem;
import br.gov.pr.secid.workstation.domain.projetos.ComplianceResult;
import br.gov.pr.secid.workstation.domain.projetos.DeskNote;
import br.gov.pr.secid.workstation.domain.projetos.KitItem;
import br.gov.pr.secid.workstation.domain.projetos.ProcessKit;
import br.gov.pr.secid.workstation.domain.projetos.ProjectScenario;
import br.gov.pr.secid.workstation.domain.projetos.ProjectScheme;
import br.gov.pr.secid.workstation.domain.projetos.ProjectTask;
import br.gov.pr.secid.workstation.domain.projetos.ProjectTaskDependency;
import br.gov.pr.secid.workstation.domain.projetos.ProjectVersion;
import br.gov.pr.secid.workstation.domain.projetos.TeamDesk;
import br.gov.pr.secid.workstation.domain.rastro.DecisionTraceEdge;
import br.gov.pr.secid.workstation.domain.rastro.DecisionTraceNode;
import br.gov.pr.secid.workstation.domain.rastro.HandoffDossier;
import br.gov.pr.secid.workstation.domain.rastro.HandoffItem;
import br.gov.pr.secid.workstation.domain.rastro.SessionArchive;
import br.gov.pr.secid.workstation.domain.social.Announcement;
import br.gov.pr.secid.workstation.domain.social.Comment;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.MuralEntry;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.Reaction;
import br.gov.pr.secid.workstation.domain.social.Remix;
import br.gov.pr.secid.workstation.domain.social.SavedItem;
import br.gov.pr.secid.workstation.domain.social.Share;
import br.gov.pr.secid.workstation.domain.social.TimelineEvent;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Catálogo de entidades do domínio (fonte única, D-40): a ORDEM da lista é a ordem de criação das tabelas nas migrations
 * {@code V10+} (uma tabela só pode referenciar, inline, tabelas criadas antes; o resto vira {@code ALTER TABLE … ADD CONSTRAINT}
 * na migration da tabela referenciada). O {@code EntityCatalogTest} gera {@code docs/arquitetura/catalogo-entidades.json} daqui;
 * o {@code SchemaGenerator} (test) gera as migrations, a {@code ForeignKeyPolicy.POLICY} e as entidades JPA.
 */
public final class DomainCatalog {

    /** Tabelas que já existem antes do V10 (V1/V2 e V3 do Bloco 3) e podem ser referenciadas por qualquer migration. */
    public static final Set<String> PRE_EXISTING_TABLES = Set.of("app_meta", "users", "user_preferences", "refresh_tokens", "audit_log",
            "ai_inference_log", "feature_flags", "domain_events", "media_objects", "verification_codes");

    /** Nome do arquivo de cada migration gerada. */
    public static final Map<Integer, String> MIGRATIONS = Map.ofEntries(
            Map.entry(10, "rf28_institucional_lgpd"),
            Map.entry(11, "rf41_acervo_tarefas"),
            Map.entry(12, "rf21_criador_projetos"),
            Map.entry(13, "rf24_planejamento"),
            Map.entry(14, "rf4_decia_sessao"),
            Map.entry(15, "rf29_rastro_decisao"),
            Map.entry(16, "rf27_social"),
            Map.entry(17, "rf42_gamificacao"),
            Map.entry(18, "rf39_chancelas"),
            Map.entry(19, "rf40_balcao_loja"),
            Map.entry(20, "rf46_mensageria_atribuicao"),
            Map.entry(21, "rf43_ia_plataforma"),
            Map.entry(22, "rf29_decisao_estruturada"),
            Map.entry(24, "seg_bloco5_quarentena_midia"),
            Map.entry(36, "acervo_briefing_tarefas"));

    /**
     * FKs de tabelas que NÃO são geradas pelo catálogo (V2/Bloco 3) e que passam a existir quando a tabela-pai nasce:
     * {@code users.company_id}/{@code department_id} e {@code ai_inference_log.department_id} → RF28 (SEGURANCA §2.1).
     */
    public static final List<ExtraFk> EXTRA_FKS = List.of(
            new ExtraFk(10, "users", "company_id", "companies", "id", "RESTRICT"),
            new ExtraFk(10, "users", "department_id", "departments", "id", "RESTRICT"),
            new ExtraFk(10, "ai_inference_log", "department_id", "departments", "id", "RESTRICT"));

    public static final List<Class<?>> ENTITIES = List.of(
            // V10 — institucional + LGPD (contexto 1)
            Company.class, Department.class, DepartmentMembership.class, CuratorAppointment.class, VerificationPolicy.class,
            ApprovalRequest.class, PendingUpload.class, EmpresaProfileExtension.class, ChefeProfileExtension.class,
            PolicyDocument.class, PolicyAcceptance.class, ConsentEvent.class, UserConsent.class, DataSubjectRequest.class, DataExportRequest.class,
            // V11 — Acervo de Tarefas
            OrgEntity.class, LegalDeadlineRule.class, TaskItem.class, TaskAttachment.class, TaskVersion.class, TaskStateLog.class, Evidence.class,
            TaskSnapshot.class,
            // V12 — Criador de Projetos
            ProjectScheme.class, ProjectTask.class, ProjectTaskDependency.class, ProjectScenario.class, ProjectVersion.class,
            ComplianceChecklist.class, ComplianceItem.class, ComplianceResult.class, ProcessKit.class, KitItem.class, TeamDesk.class, DeskNote.class,
            // V13 — Planejamento
            AnnualPlan.class, PlanAxis.class, PlanAxisProject.class, Grouping.class, GroupingItem.class,
            // V14 — DECIA sessão
            DeciaSession.class, SessionParticipant.class, MessageClassification.class, SessionMessageIndex.class, MessageAttachment.class,
            Divergence.class, DivergenceReply.class, AiQuestion.class, AnalyticalSummary.class, SummaryScenario.class, FinalDecision.class,
            DecisionReview.class, ReopenRequest.class, SessionArtifact.class, Meeting.class, MeetingTranscript.class, RecordingConsent.class,
            SessionMessage.class,
            // V15 — Rastro de Decisão, Memória e Transição
            DecisionTraceNode.class, DecisionTraceEdge.class, SessionArchive.class, HandoffDossier.class, HandoffItem.class,
            // V16 — Social
            Reaction.class, Comment.class, SavedItem.class, Share.class, Remix.class, Follow.class, MuralEntry.class, Notification.class,
            Announcement.class, TimelineEvent.class,
            // V17 — Gamificação
            DeciaPointsRule.class, DeciaPointsLedgerEntry.class, AiCreditLedgerEntry.class, PointsDonation.class, CollectiveGoal.class,
            GoalParticipant.class, Highlight.class, Recognition.class, WeekPlan.class, WeekPlanDay.class, DailyTask.class, HseWeights.class,
            EfficiencyScoreSnapshot.class, HypeBand.class, ProfileHypeScore.class, HypeIgnoredEvent.class, DeliberativeProfile.class,
            RankingWeights.class, RankingEntry.class,
            // V18 — Chancelas
            Seal.class, SealPolicy.class, SealBond.class, SealProposal.class, Benefit.class, BenefitRedemption.class,
            // V19 — Balcão & Loja
            ModelOffer.class, StoreItem.class, StorePurchase.class, UserSkin.class,
            // V20 — Mensageria & Atribuição
            DirectConversation.class, DirectConversationParticipant.class, Assignment.class, DirectMessage.class,
            // V21 — IA do sistema & Plataforma
            AiQuota.class, Insight.class, FeasibilitySheet.class, MetricDefinition.class, MetricSnapshot.class, ExtractionResult.class,
            ExtractionCorrection.class, MemoryQuery.class, PipelineJob.class,
            AiProviderCircuitState.class, InstitutionalMemoryDocument.class, Citation.class, PersonalDataSource.class,
            // V22 — DECIA decisão estruturada (contexto 5b, docs/decia/03_MODELO_FUNCIONAL.md §4)
            Decision.class, DecisionParticipant.class, DecisionAlternative.class, DecisionCriterion.class, CriterionAssessment.class,
            DecisionEvidence.class, EvidenceLink.class, DecisionAssumption.class, DecisionRisk.class, DecisionScenario.class, DecisionForecast.class,
            DecisionRecommendation.class, DecisionTrigger.class, DecisionSnapshot.class, DecisionCheckpoint.class, DecisionOutcome.class,
            DecisionRetrospective.class, DecisionWorkLink.class, DecisionEvent.class,
            // V24 — Segurança Bloco 5: quarentena/antivírus de mídia (D-67). V23 é reservada à mensageria do DECIA.
            MediaScan.class,
            // V36 — Onda Acervo: briefing profissional da tarefa (auditoria 17/10/2026). V25–V35 seguem reservadas no PLANO_EXECUCAO.
            TaskBrief.class,
            // V2 — já existem (só domínio + catálogo)
            AiInferenceLog.class, DomainEventOutbox.class, FeatureFlag.class, MediaObject.class);

    private static final List<EntityDescriptor> ENTRIES = ENTITIES.stream().map(Describer::describe).toList();

    private DomainCatalog() {
    }

    /** Descritores na ordem de {@link #ENTITIES}. */
    public static List<EntityDescriptor> entries() {
        return Collections.unmodifiableList(ENTRIES);
    }

    public static EntityDescriptor byTable(String table) {
        return ENTRIES.stream().filter(e -> e.table().equals(table)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("tabela fora do catálogo: " + table));
    }

    /** FK declarada fora dos records (tabela pré-existente), com a migration em que entra. */
    public record ExtraFk(int migration, String table, String column, String refTable, String refColumn, String onDelete) {
    }
}

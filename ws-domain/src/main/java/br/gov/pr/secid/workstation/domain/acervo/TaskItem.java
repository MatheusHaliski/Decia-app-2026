package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Tarefa do acervo (= FAI WardrobeItem) — TAXONOMIA §2.1. Nasce em RF20/RF41; lida em RF21–RF23, RF29, RF34, RF40, RF44.
 * Estado pela máquina {@link TaskState}; RESTRITO/SIGILOSO nunca vai a IA externa (RF43.CA02).
 */
@DomainEntity(context = "2 Acervo de Tarefas", table = "tasks",
        rfs = {"RF20", "RF41", "RF21", "RF22", "RF23", "RF29", "RF34", "RF40", "RF44"},
        migration = 11, versioned = true, store = Store.MYSQL_OPENSEARCH,
        doc = "Tarefa (item do acervo). Dono → CASCADE; catálogos (departments, org_entities) RESTRICT; "
                + "referências que sobrevivem (bloqueio, original, projeto de origem) SET NULL.",
        indexes = {"owner_id, state", "department_id, state", "responsible_id, due_at", "state, visibility", "protocol_number",
                "legal_due_at", "original_task_id"},
        checks = {"amount_involved >= 0", "reuse_count >= 0"})
public record TaskItem(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "resumo em 3 linhas (IA)", opt = true, sql = "TEXT") String summary,
        @Attr(value = "descrição em Markdown", opt = true, sql = "MEDIUMTEXT") String descriptionMd,
        @Attr("tipo") TaskType type,
        @Attr(value = "categoria documental", opt = true) TaskCategory category,
        @Attr(value = "subcategoria (depende da categoria)", opt = true, len = 80) String subcategory,
        @Attr(value = "processos (≤ 2)", opt = true, col = "process_tags_json") Set<ProcessTag> processTags,
        @Attr(value = "naturezas (≤ 2)", opt = true, col = "nature_tags_json") Set<NatureTag> natureTags,
        @Attr(value = "classificação de acesso", def = "'INTERNO'") AccessClassification accessClass,
        @Attr(value = "formato (docx, xlsx, pdf, gdoc, url…)", opt = true, len = 20) String format,
        @Attr(value = "tamanho do esforço", opt = true) EffortSize effortSize,
        @Attr(value = "horas estimadas", opt = true, sql = "DECIMAL(8,2)") BigDecimal estimatedHours,
        @Attr(value = "valor envolvido em R$ (0 se não se aplica)", sql = "DECIMAL(16,2)", def = "0") BigDecimal amountInvolved,
        @Attr(value = "origem institucional", def = "'INTERNA'") TaskOrigin origin,
        @Attr("como entrou no acervo") SourceKind sourceKind,
        @Attr(value = "id Drive/OneDrive, URL, protocolo, messageId", opt = true, len = 500) String sourceRef,
        @Attr(value = "vinculado ou copiado (RF20.CA07)", opt = true) LinkMode linkMode,
        @Attr(value = "órgão/fornecedor", opt = true, ref = "org_entities", onDelete = OnDelete.RESTRICT) UUID orgEntityId,
        @Attr(value = "responsável (padrão dono)", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID responsibleId,
        @Attr(value = "prazo", opt = true) LocalDate dueAt,
        @Attr(value = "regra de prazo legal", opt = true, ref = "legal_deadline_rules", onDelete = OnDelete.SET_NULL) UUID legalDeadlineRuleId,
        @Attr(value = "data-base do prazo legal (RF20.CA11)", opt = true) LocalDate legalDeadlineBaseDate,
        @Attr(value = "prazo legal calculado", opt = true) LocalDate legalDueAt,
        @Attr(value = "justificativa ao sobrescrever o prazo legal", opt = true, len = 300) String legalOverrideReason,
        @Attr(value = "prioridade", def = "'MEDIA'") Priority priority,
        @Attr(value = "estado (RF41)", def = "'RASCUNHO'") TaskState state,
        @Attr(value = "tarefa que bloqueia", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID blockedByTaskId,
        @Attr(value = "pessoa aguardada", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID blockedByUserId,
        @Attr(value = "motivo do bloqueio", opt = true, len = 300) String blockReason,
        @Attr(value = "situação do documento", opt = true) DocSituation docSituation,
        @Attr(value = "data de recebimento", opt = true) LocalDate receivedAt,
        @Attr(value = "remetente", opt = true, len = 200) String senderOrigin,
        @Attr(value = "nº protocolo/processo", opt = true, len = 60) String protocolNumber,
        @Attr(value = "guarda e temporalidade", opt = true) String retentionPolicyJson,
        @Attr(value = "visibilidade", def = "'PRIVADA'") Visibility visibility,
        @Attr("favorita") boolean favorite,
        @Attr("oferecida no Balcão (RF40)") boolean offeredInCounter,
        @Attr("gerada com IA (faísca ✦)") boolean aiGenerated,
        @Attr(value = "inferência que preencheu", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "confiança por campo (RF20.CA02)", opt = true) String aiConfidenceJson,
        @Attr(value = "miniatura", opt = true, len = 500) String thumbnailUrl,
        @Attr(value = "capa", opt = true, len = 500) String coverUrl,
        @Attr(value = "modo da capa (RF38.CA02)", def = "'AUTO'") CoverMode coverMode,
        @Attr(value = "skin do card", opt = true, len = 40) String cardSkin,
        @Attr(value = "etiquetas livres", opt = true, col = "tags_json") Set<String> tags,
        @Attr(value = "anotações", opt = true, sql = "TEXT") String notes,
        @Attr(value = "tarefa original (crédito de remix/extração)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID originalTaskId,
        @Attr(value = "projeto de origem quando EXTRAIDA_DE_PROJETO", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID sourceProjectId,
        @Attr(value = "item do checklist que a originou (RF32.CA03)", opt = true, ref = "compliance_items", onDelete = OnDelete.SET_NULL) UUID checklistItemId,
        @Attr("reutilizações") int reuseCount,
        @Attr("projetos em que está") int projectUsageCount,
        @Attr("curtidas") long likesCount,
        @Attr("comentários") long commentsCount,
        @Attr("salvamentos") long savesCount,
        @Attr("compartilhamentos") long sharesCount,
        @Attr("remixes") long remixesCount,
        @Attr("visualizações") long viewsCount,
        @Attr(value = "chancelas aprovadas (cache)", opt = true) String sealIdsJson) {

    public static final int MAX_TAGS_PER_KIND = 2;

    public TaskItem {
        if (processTags != null && processTags.size() > MAX_TAGS_PER_KIND) {
            throw new IllegalArgumentException("VALIDACAO: processTags ≤ " + MAX_TAGS_PER_KIND);
        }
        if (natureTags != null && natureTags.size() > MAX_TAGS_PER_KIND) {
            throw new IllegalArgumentException("VALIDACAO: natureTags ≤ " + MAX_TAGS_PER_KIND);
        }
        if (amountInvolved != null && amountInvolved.signum() < 0) {
            throw new IllegalArgumentException("VALIDACAO: amountInvolved ≥ 0");
        }
        processTags = processTags == null ? Set.of() : Set.copyOf(processTags);
        natureTags = natureTags == null ? Set.of() : Set.copyOf(natureTags);
        tags = tags == null ? Set.of() : Set.copyOf(tags);
    }

    /** Transição de estado pela máquina do RF41; quem chama grava o {@link TaskStateLog}. */
    public TaskItem transition(TaskState to) {
        TaskState next = state.transition(to);
        return withState(next, next == TaskState.BLOQUEADA ? blockedByTaskId : null, next == TaskState.BLOQUEADA ? blockedByUserId : null,
                next == TaskState.BLOQUEADA ? blockReason : null);
    }

    /** Bloqueio exige ao menos uma causa (tarefa ou pessoa) e o motivo. */
    public TaskItem block(UUID byTaskId, UUID byUserId, String reason) {
        if (byTaskId == null && byUserId == null) {
            throw new IllegalArgumentException("VALIDACAO: bloqueio exige blockedByTaskId ou blockedByUserId");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("VALIDACAO: blockReason obrigatório");
        }
        return withState(state.transition(TaskState.BLOQUEADA), byTaskId, byUserId, reason);
    }

    public boolean allowsExternalAi() {
        return accessClass.allowsExternalAi();
    }

    private TaskItem withState(TaskState next, UUID byTask, UUID byUser, String reason) {
        return new TaskItem(id, ownerId, departmentId, title, summary, descriptionMd, type, category, subcategory, processTags, natureTags,
                accessClass, format, effortSize, estimatedHours, amountInvolved, origin, sourceKind, sourceRef, linkMode, orgEntityId, responsibleId,
                dueAt, legalDeadlineRuleId, legalDeadlineBaseDate, legalDueAt, legalOverrideReason, priority, next, byTask, byUser, reason,
                docSituation, receivedAt, senderOrigin, protocolNumber, retentionPolicyJson, visibility, favorite,
                next == TaskState.OFERECIDA || (offeredInCounter && next != TaskState.DISPONIVEL && next != TaskState.MODELO_PUBLICO),
                aiGenerated, aiInferenceId, aiConfidenceJson, thumbnailUrl, coverUrl, coverMode, cardSkin, tags, notes, originalTaskId,
                sourceProjectId, checklistItemId, reuseCount, projectUsageCount, likesCount, commentsCount, savesCount, sharesCount, remixesCount,
                viewsCount, sealIdsJson);
    }
}

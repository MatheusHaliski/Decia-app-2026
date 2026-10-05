package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.acervo.NatureTag;
import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Esquema de Projeto (= FAI Scheme) — TAXONOMIA §3.1. Nasce em RF21/RF22; lido em RF23, RF24, RF25, RF29–RF32, RF43.
 * Estado pela máquina {@link ProjectStatus}; conformidade (RF32), caminho crítico e EVM (RF43.CA09) desnormalizados.
 */
@DomainEntity(context = "3 Criador de Projetos", table = "project_schemes",
        rfs = {"RF21", "RF22", "RF23", "RF24", "RF25", "RF29", "RF30", "RF31", "RF32", "RF43"},
        migration = 12, versioned = true, store = Store.MYSQL_OPENSEARCH,
        doc = "Esquema de Projeto. Dono → CASCADE; catálogos RESTRICT; origem (remix/modelo/sessão) e agrupamentos SET NULL.",
        indexes = {"owner_id, status", "department_id, status", "company_id, exercise_year", "status, visibility", "plan_axis_id", "next_milestone_at"},
        checks = {"conformity_percent IS NULL OR conformity_percent BETWEEN 0 AND 100"})
public record ProjectScheme(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "empresa", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "emoji", opt = true, len = 16) String emoji,
        @Attr(value = "ícone (RF38 §13)", opt = true, len = 60) String iconId,
        @Attr(value = "objetivo em 1 frase (vira tema da sessão, RF29.CA01)", opt = true, len = 300) String objective,
        @Attr(value = "descrição em Markdown", opt = true, sql = "MEDIUMTEXT") String descriptionMd,
        @Attr(value = "processos (≤ 2)", opt = true, col = "process_tags_json") Set<ProcessTag> processTags,
        @Attr(value = "naturezas (≤ 2)", opt = true, col = "nature_tags_json") Set<NatureTag> natureTags,
        @Attr(value = "modo de criação", def = "'MANUAL'") CreationMode creationMode,
        @Attr(value = "origem", def = "'CRIAR_PROJETO'") SchemeOrigin origin,
        @Attr(value = "projeto original (remix/modelo)", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID originalProjectId,
        @Attr(value = "sessão DECIA de origem", opt = true, ref = "decia_sessions", onDelete = OnDelete.SET_NULL) UUID sourceSessionId,
        @Attr(value = "orientação livre para a IA", opt = true, sql = "TEXT") String aiOrientation,
        @Attr(value = "estado", def = "'RASCUNHO'") ProjectStatus status,
        @Attr(value = "fase atual", def = "'DEMANDA'") ProjectPhase currentPhase,
        @Attr(value = "prioridade", def = "'MEDIA'") Priority priority,
        @Attr(value = "visibilidade", def = "'PRIVADA'") Visibility visibility,
        @Attr(value = "exercício", opt = true) Integer exerciseYear,
        @Attr(value = "agrupamento PROGRAMA (RF25.CA02)", opt = true, ref = "groupings", onDelete = OnDelete.SET_NULL) UUID programGroupingId,
        @Attr(value = "agrupamento EXERCICIO", opt = true, ref = "groupings", onDelete = OnDelete.SET_NULL) UUID exerciseGroupingId,
        @Attr(value = "agrupamento GESTAO", opt = true, ref = "groupings", onDelete = OnDelete.SET_NULL) UUID managementGroupingId,
        @Attr(value = "eixo do plano (1 por plano, RF24.CA02)", opt = true, ref = "plan_axes", onDelete = OnDelete.SET_NULL) UUID planAxisId,
        @Attr(value = "modo da capa (RF38.CA03)", def = "'MOSAICO'") ProjectCoverMode coverMode,
        @Attr(value = "capa", opt = true, len = 500) String coverUrl,
        @Attr(value = "mosaico de miniaturas", opt = true) String mosaicJson,
        @Attr(value = "skin da Mesa (RF22)", opt = true, len = 40) String deskSkin,
        @Attr(value = "fundo da Mesa", opt = true) String deskBackgroundJson,
        @Attr(value = "% de conformidade (RF32.CA04)", opt = true, sql = "DECIMAL(5,2)") BigDecimal conformityPercent,
        @Attr("pendência bloqueante ⛔") boolean hasBlockingPending,
        @Attr(value = "ids em ordem do caminho crítico (RF21.CA08)", opt = true) String criticalPathJson,
        @Attr(value = "PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI (RF43.CA09)", opt = true) String evmJson,
        @Attr(value = "próximo marco", opt = true) LocalDate nextMilestoneAt,
        @Attr(value = "último evento DECIA", opt = true) Instant lastDeciaEventAt,
        @Attr(value = "rótulo do último evento DECIA", opt = true, len = 120) String lastDeciaEventLabel,
        @Attr("oferecido no Balcão (RF40)") boolean offeredInCounter,
        @Attr("gerado com IA") boolean aiGenerated,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr("curtidas") long likesCount,
        @Attr("comentários") long commentsCount,
        @Attr("salvamentos") long savesCount,
        @Attr("compartilhamentos") long sharesCount,
        @Attr("remixes") long remixesCount,
        @Attr("visualizações") long viewsCount,
        @Attr(value = "chancelas aprovadas (cache)", opt = true) String sealIdsJson,
        @Attr(value = "rascunho do autosave (RF21.CA14)", opt = true) String autosaveDraftJson) {

    public ProjectScheme {
        processTags = processTags == null ? Set.of() : Set.copyOf(processTags);
        natureTags = natureTags == null ? Set.of() : Set.copyOf(natureTags);
        if (processTags.size() > 2 || natureTags.size() > 2) {
            throw new IllegalArgumentException("VALIDACAO: processTags e natureTags ≤ 2");
        }
    }

    /** Transição pela máquina do RF22; reabrir projeto bloqueado exige justificativa (422 VALIDACAO). */
    public ProjectScheme transition(ProjectStatus to, String justification) {
        if (status.isLocked() && (justification == null || justification.isBlank())) {
            throw new IllegalArgumentException("VALIDACAO: reabrir projeto " + status + " exige justificativa");
        }
        ProjectStatus next = status.transition(to);
        return new ProjectScheme(id, ownerId, companyId, departmentId, title, emoji, iconId, objective, descriptionMd, processTags, natureTags,
                creationMode, origin, originalProjectId, sourceSessionId, aiOrientation, next, currentPhase, priority, visibility, exerciseYear,
                programGroupingId, exerciseGroupingId, managementGroupingId, planAxisId, coverMode, coverUrl, mosaicJson, deskSkin,
                deskBackgroundJson, conformityPercent, hasBlockingPending, criticalPathJson, evmJson, nextMilestoneAt, lastDeciaEventAt,
                lastDeciaEventLabel, offeredInCounter, aiGenerated, aiInferenceId, likesCount, commentsCount, savesCount, sharesCount,
                remixesCount, viewsCount, sealIdsJson, autosaveDraftJson);
    }
}

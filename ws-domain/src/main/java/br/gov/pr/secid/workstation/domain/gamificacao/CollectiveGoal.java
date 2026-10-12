package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Meta coletiva (= FAI Challenge) — TAXONOMIA §9.1 (RF35; widget da Mesa RF21.CA02; RF27 Destaques). */
@DomainEntity(context = "8 Gamificação", table = "collective_goals", rfs = {"RF35", "RF21", "RF27", "RF39", "RF42"}, migration = 17, versioned = true,
        doc = "Metas por empresa/departamento. Criador RESTRICT; catálogos RESTRICT.",
        indexes = {"department_id, status, period_to", "company_id, status"}, checks = {"progress BETWEEN 0 AND 1"})
public record CollectiveGoal(
        @Attr("identificador") UUID id,
        @Attr(value = "criador (chefe ou EMPRESA)", ref = "users", onDelete = OnDelete.RESTRICT) UUID creatorId,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr("critério {metricCode, operator, target}") String criterionJson,
        @Attr("início") LocalDate periodFrom,
        @Attr("fim") LocalDate periodTo,
        @Attr("pontos por participante ao atingir") int rewardPointsPerParticipant,
        @Attr(value = "modelo do reconhecimento gerado", opt = true) String recognitionTemplateJson,
        @Attr(value = "exige esforço mínimo (anti-trivial)", def = "TRUE") boolean minEffortCheck,
        @Attr(value = "progresso 0–1", sql = "DECIMAL(4,3)", def = "0") BigDecimal progress,
        @Attr(value = "estado", def = "'ABERTA'") GoalStatus status,
        @Attr(value = "atingida em", opt = true) Instant achievedAt,
        @Attr(value = "lote de lançamentos gerado", opt = true) UUID ledgerBatchId) {
}

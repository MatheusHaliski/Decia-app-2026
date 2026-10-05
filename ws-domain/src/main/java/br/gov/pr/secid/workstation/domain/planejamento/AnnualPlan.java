package br.gov.pr.secid.workstation.domain.planejamento;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.time.Instant;
import java.util.UUID;

/** Plano Anual / Trilha Estratégica (= FAI DnaScheme) — TAXONOMIA §4.1 (RF24; lido em RF11, RF21, RF39, RF44). Seis eixos. */
@DomainEntity(context = "4 Planejamento institucional", table = "annual_plans", rfs = {"RF24", "RF11", "RF21", "RF39", "RF44"}, migration = 13,
        versioned = true,
        doc = "Plano anual por escopo (empresa, departamento, pessoal). Dono → CASCADE; catálogos RESTRICT; plano de origem SET NULL.",
        indexes = {"owner_id, exercise_year", "company_id, exercise_year, status", "department_id, exercise_year"})
public record AnnualPlan(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr("escopo") PlanScope scope,
        @Attr(value = "empresa", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "exercício", sql = "SMALLINT") int exerciseYear,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "frase de identidade", opt = true, len = 300) String identityPhrase,
        @Attr(value = "derivado do plano (RF24.CA04)", opt = true, ref = "annual_plans", onDelete = OnDelete.SET_NULL) UUID derivedFromPlanId,
        @Attr(value = "estado", def = "'RASCUNHO'") PlanStatus status,
        @Attr(value = "visibilidade", def = "'DEPARTAMENTO'") Visibility visibility,
        @Attr(value = "capa", opt = true, len = 500) String coverUrl,
        @Attr(value = "fundo", opt = true) String backgroundJson,
        @Attr(value = "modo de criação", def = "'MANUAL'") CreationMode creationMode,
        @Attr(value = "explicação da IA", opt = true) String aiExplanationJson,
        @Attr("curtidas") long likesCount,
        @Attr("comentários") long commentsCount,
        @Attr("salvamentos") long savesCount,
        @Attr("compartilhamentos") long sharesCount,
        @Attr("visualizações") long viewsCount,
        @Attr(value = "chancelas (cache)", opt = true) String sealIdsJson,
        @Attr(value = "publicado em", opt = true) Instant publishedAt) {

    public static final int AXES = 6;
}

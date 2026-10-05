package br.gov.pr.secid.workstation.domain.planejamento;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.Period;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Agrupamento (= FAI SchemeGrouping) — TAXONOMIA §4.4 (RF25; lido em RF19, RF28, RF36: encerrar gestão gera dossiê). */
@DomainEntity(context = "4 Planejamento institucional", table = "groupings", rfs = {"RF25", "RF19", "RF28", "RF36"}, migration = 13, versioned = true,
        doc = "Programas, exercícios, gestões e frentes. Dono → CASCADE; catálogos RESTRICT; dossiê de encerramento SET NULL.",
        indexes = {"company_id, type, status", "department_id, type", "owner_id"})
public record Grouping(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "empresa", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("tipo") GroupingType type,
        @Attr(value = "rótulo", len = 160) String label,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr(value = "capa", opt = true, len = 500) String coverUrl,
        @Attr(value = "início do período", opt = true) LocalDate periodFrom,
        @Attr(value = "fim do período", opt = true) LocalDate periodTo,
        @Attr(value = "cor de destaque", opt = true, len = 40) String accentColor,
        @Attr(value = "situação", def = "'ATIVO'") GroupingStatus status,
        @Attr(value = "encerrado em", opt = true) Instant closedAt,
        @Attr(value = "dossiê de transição gerado ao encerrar (RF25.CA05)", opt = true, ref = "handoff_dossiers", onDelete = OnDelete.SET_NULL)
        UUID handoffDossierId) {

    public Grouping {
        if (periodFrom != null) {
            new Period(periodFrom, periodTo);   // valida PERIODO_INVALIDO
        }
    }

    public Period period() {
        return periodFrom == null ? null : new Period(periodFrom, periodTo);
    }
}

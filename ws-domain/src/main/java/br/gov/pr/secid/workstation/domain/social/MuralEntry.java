package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Entrada do Mural (RF27; comunicados RF15; impulso RF42) — TAXONOMIA §8.7; projeção Cassandra {@code timeline_by_user}. */
@DomainEntity(context = "7 Social & Descoberta", table = "mural_entries", rfs = {"RF27", "RF15", "RF35", "RF42"}, migration = 16, audit = Audit.NONE,
        store = Store.MYSQL_CASSANDRA,
        doc = "Feed institucional. Catálogos RESTRICT; ator → CASCADE.",
        indexes = {"company_id, at", "department_id, at", "boost_until"})
public record MuralEntry(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("tipo") MuralKind kind,
        @Attr(value = "tipo do alvo", opt = true) TargetType targetType,
        @Attr(value = "id do alvo", opt = true) UUID targetId,
        @Attr(value = "ator", ref = "users", onDelete = OnDelete.CASCADE) UUID actorId,
        @Attr(value = "impulsionado até (RF42 IMPULSO_MURAL)", opt = true) Instant boostUntil,
        @Attr("momento") Instant at) {
}

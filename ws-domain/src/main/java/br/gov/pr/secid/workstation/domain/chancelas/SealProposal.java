package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Proposta de chancela nova por empregado (RF39.CA06) — TAXONOMIA §6.4. */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "seal_proposals", rfs = {"RF39"}, migration = 18,
        doc = "Propostas de chancela. Proponente → CASCADE; departamento RESTRICT; chancela criada SET NULL.",
        indexes = {"department_id, status"})
public record SealProposal(
        @Attr("identificador") UUID id,
        @Attr(value = "proponente", ref = "users", onDelete = OnDelete.CASCADE) UUID proposerId,
        @Attr(value = "departamento", ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "nome sugerido", len = 120) String name,
        @Attr(value = "fundamentação", sql = "TEXT") String rationale,
        @Attr(value = "estado", def = "'PENDENTE'") SealProposalStatus status,
        @Attr(value = "chancela criada", opt = true, ref = "seals", onDelete = OnDelete.SET_NULL) UUID resultingSealId,
        @Attr(value = "quem decidiu", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID decidedBy) {
}

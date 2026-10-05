package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Destaque do mês (RF35; Mural RF27) — TAXONOMIA §9.3; critérios visíveis, curadoria humana. */
@DomainEntity(context = "8 Gamificação", table = "highlights", rfs = {"RF35", "RF27", "RF39"}, migration = 17, audit = Audit.CREATED,
        doc = "Destaques mensais por empresa/departamento. Catálogos e curador RESTRICT.",
        uniques = {"company_id, department_id, month_key, target_type, target_id"}, indexes = {"month_key, position"})
public record Highlight(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "mês (AAAA-MM)", sql = "CHAR(7)") String monthKey,
        @Attr("tipo do alvo") HighlightTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "pontuação do algoritmo (critérios visíveis)", opt = true) String algorithmScoreJson,
        @Attr(value = "curador", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID curatedBy,
        @Attr("posição") int position,
        @Attr(value = "publicado em", opt = true) Instant publishedAt) {
}

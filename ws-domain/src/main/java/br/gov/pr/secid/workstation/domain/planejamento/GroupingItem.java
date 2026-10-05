package br.gov.pr.secid.workstation.domain.planejamento;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Item de agrupamento (projeto ou tarefa) — TAXONOMIA §4.5. Alvo polimórfico sem FK. */
@DomainEntity(context = "4 Planejamento institucional", table = "grouping_items", rfs = {"RF25"}, migration = 13, audit = Audit.NONE,
        doc = "Itens do agrupamento (alvo polimórfico). Filho → CASCADE.",
        uniques = {"grouping_id, target_type, target_id"}, indexes = {"target_type, target_id"})
public record GroupingItem(
        @Attr("identificador") UUID id,
        @Attr(value = "agrupamento", ref = "groupings", onDelete = OnDelete.CASCADE) UUID groupingId,
        @Attr("tipo do alvo") GroupingTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr("adicionado em") Instant addedAt) {
}

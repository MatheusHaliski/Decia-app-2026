package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Decisão → trabalho (tarefa, projeto, marco) sem copiar dados (§4.2). Alvo polimórfico, sem FK (D-41). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_work_links", rfs = {"RF29", "RF21", "RF41"}, migration = 22,
        audit = Audit.CREATED,
        doc = "Ligações com o trabalho (filho da decisão → CASCADE); criador RESTRICT. Alvo polimórfico sem FK. Único (decisão, alvo).",
        uniques = {"decision_id, target_type, target_id"}, indexes = {"target_type, target_id"})
public record DecisionWorkLink(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr("tipo do alvo") WorkLinkTarget targetType,
        @Attr("alvo") UUID targetId,
        @Attr(value = "criado por", ref = "users", onDelete = OnDelete.RESTRICT) UUID createdByUserId) {
}

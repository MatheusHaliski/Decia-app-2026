package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Ligação evidência → alvo com posição (§4.2): a mesma evidência pode sustentar A e contradizer B. Alvo polimórfico, sem FK (D-41). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_evidence_links", rfs = {"RF29"}, migration = 22,
        doc = "Ligações (filho da evidência → CASCADE). Alvo polimórfico (target_type + target_id) sem FK. Único (evidência, alvo).",
        uniques = {"evidence_id, target_type, target_id"}, indexes = {"target_type, target_id"})
public record EvidenceLink(
        @Attr("identificador") UUID id,
        @Attr(value = "evidência", ref = "decision_evidence", onDelete = OnDelete.CASCADE) UUID evidenceId,
        @Attr("tipo do alvo") EvidenceTarget targetType,
        @Attr("alvo") UUID targetId,
        @Attr("posição (sustenta/contradiz/contexto)") EvidenceStance stance,
        @Attr(value = "nota", opt = true, len = 500) String note) {
}

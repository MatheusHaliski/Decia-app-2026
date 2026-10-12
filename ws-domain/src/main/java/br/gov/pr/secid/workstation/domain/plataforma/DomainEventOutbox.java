package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;

import java.time.Instant;
import java.util.UUID;

/** Outbox transacional (Observer AFTER_COMMIT) — TAXONOMIA §12.2; tabela do V2. Sem FK por desenho: o evento sobrevive ao agregado. */
@DomainEntity(context = "12 Plataforma", table = "domain_events", rfs = {"RF42", "RF27", "RF33", "RF38", "RF39"}, migration = 2, audit = Audit.NONE,
        doc = "V2: outbox; aggregate_id textual (UUID ou chave natural).")
public record DomainEventOutbox(
        @Attr("identificador") UUID id,
        @Attr(value = "tipo do agregado", len = 80) String aggregateType,
        @Attr(value = "id do agregado (textual)", len = 64) String aggregateId,
        @Attr(value = "tipo do evento", len = 120) String eventType,
        @Attr("payload") String payloadJson,
        @Attr("ocorrido em") Instant occurredAt,
        @Attr(value = "publicado em", opt = true) Instant publishedAt,
        @Attr(value = "tentativas", sql = "INT UNSIGNED") int attempts) {
}

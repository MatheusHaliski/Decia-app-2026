package br.gov.pr.secid.workstation.domain.social;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;
import br.gov.pr.secid.workstation.domain.common.TargetType;

import java.time.Instant;
import java.util.UUID;

/** Evento da linha do tempo do usuário — Cassandra {@code timeline_by_user} (RF27 sub-aba Seguindo) — TAXONOMIA §8.9. */
@DomainEntity(context = "7 Social & Descoberta", table = "timeline_by_user", rfs = {"RF27", "RF14"}, store = Store.CASSANDRA, audit = Audit.NONE,
        doc = "Cassandra: partição user_id, clustering at DESC.")
public record TimelineEvent(
        @Attr("usuário (partição)") UUID userId,
        @Attr("momento (clustering desc)") Instant at,
        @Attr(value = "tipo do evento", len = 60) String eventType,
        @Attr(value = "tipo do alvo", opt = true) TargetType targetType,
        @Attr(value = "id do alvo", opt = true) UUID targetId,
        @Attr(value = "payload", opt = true) String payloadJson) {
}

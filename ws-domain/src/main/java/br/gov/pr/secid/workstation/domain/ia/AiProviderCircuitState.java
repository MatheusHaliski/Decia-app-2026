package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;

/** Estado do circuit breaker por provedor — Redis — TAXONOMIA §10.3 (ARQUITETURA §3.1). */
@DomainEntity(context = "10 IA do sistema", table = "ai:circuit:{provider}", rfs = {"RF43", "RF18"}, store = Store.REDIS, audit = Audit.NONE,
        doc = "Redis: hash por provedor.")
public record AiProviderCircuitState(
        @Attr("provedor") AiProvider provider,
        @Attr("estado") CircuitState state,
        @Attr("falhas consecutivas") int failures,
        @Attr(value = "aberto em", opt = true) Instant openedAt) {
}

package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;

import java.time.Instant;

/** Feature flag — TAXONOMIA §12.4; tabela do V2 (stores opcionais e provedores nascem desligados; ai.local.only = TRUE). */
@DomainEntity(context = "12 Plataforma", table = "feature_flags", rfs = {"RF18", "RF43"}, migration = 2, pk = "flag_key", audit = Audit.NONE,
        doc = "V2: flags por chave.")
public record FeatureFlag(
        @Attr(value = "chave (PK)", len = 80) String flagKey,
        @Attr("ligada") boolean enabled,
        @Attr(value = "escopo", def = "'GLOBAL'") FeatureFlagScope scope,
        @Attr(value = "rollout gradual", opt = true) String rolloutJson,
        @Attr("alterada em") Instant updatedAt) {
}

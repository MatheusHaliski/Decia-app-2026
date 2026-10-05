package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Cota mensal de IA — Redis {@code quota:{scope}:{id}:{month}} + espelho MySQL — TAXONOMIA §10.2 (RF42.CA06, RF43). */
@DomainEntity(context = "10 IA do sistema", table = "ai_quotas", rfs = {"RF43", "RF42", "RF18"}, migration = 21, store = Store.MYSQL_REDIS,
        doc = "Espelho das cotas (contador atômico vive no Redis). Única (scope, scope_id, month_key).",
        uniques = {"scope, scope_id, month_key"})
public record AiQuota(
        @Attr("identificador") UUID id,
        @Attr("escopo") QuotaScope scope,
        @Attr("id do usuário/departamento") UUID scopeId,
        @Attr(value = "mês (AAAA-MM)", sql = "CHAR(7)") String monthKey,
        @Attr("limite mensal") int monthlyLimit,
        @Attr("consumido") int consumed,
        @Attr("créditos comprados disponíveis") int purchasedCredits,
        @Attr("reinicia em") Instant resetAt) {

    public int remaining() {
        return Math.max(0, monthlyLimit - consumed) + purchasedCredits;
    }
}

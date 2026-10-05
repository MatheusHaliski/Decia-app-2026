package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.time.Instant;
import java.util.UUID;

/** Benefício (= FAI Promotion) — TAXONOMIA §6.5 (RF39, RF35; perfil RF19; pontos RF42). Atrelado a uma chancela. */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "benefits", rfs = {"RF39", "RF35", "RF19", "RF42"}, migration = 18, versioned = true,
        doc = "Benefícios por chancela (RESTRICT: resgates dependem dele). Emissor RESTRICT.",
        indexes = {"seal_id, status", "issuer_user_id"}, checks = {"redeemed_count >= 0"})
public record Benefit(
        @Attr("identificador") UUID id,
        @Attr(value = "chancela", ref = "seals", onDelete = OnDelete.RESTRICT) UUID sealId,
        @Attr(value = "emissor", ref = "users", onDelete = OnDelete.RESTRICT) UUID issuerUserId,
        @Attr("tipo") BenefitType type,
        @Attr(value = "título", len = 160) String title,
        @Attr(value = "regras", opt = true, sql = "TEXT") String rules,
        @Attr(value = "valor (créditos, pontos…)", opt = true) String valueJson,
        @Attr(value = "início", opt = true) Instant startsAt,
        @Attr(value = "fim", opt = true) Instant expiresAt,
        @Attr(value = "cota total", opt = true) Integer totalQuota,
        @Attr(value = "limite por pessoa", def = "1") int perUserLimit,
        @Attr("resgatados") int redeemedCount,
        @Attr(value = "estado", def = "'DISPONIVEL'") BenefitStatus status,
        @Attr(value = "visibilidade", def = "'EMPRESA'") Visibility visibility) {

    public boolean hasQuota() {
        return totalQuota == null || redeemedCount < totalQuota;
    }
}

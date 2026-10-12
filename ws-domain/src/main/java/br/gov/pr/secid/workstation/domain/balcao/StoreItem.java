package br.gov.pr.secid.workstation.domain.balcao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Item da Loja Work Station (RF42.CA04) — TAXONOMIA §7.4. */
@DomainEntity(context = "11 Balcão & Loja", table = "store_items", rfs = {"RF42", "RF38", "RF40"}, migration = 19, versioned = true,
        doc = "Catálogo da loja (RESTRICT: compras dependem dele). companyId nulo = global.",
        indexes = {"kind, active", "company_id, active"}, checks = {"price_points >= 0"})
public record StoreItem(
        @Attr("identificador") UUID id,
        @Attr("tipo") StoreItemKind kind,
        @Attr(value = "referência (oferta, skin, kit…)", opt = true) UUID refId,
        @Attr(value = "título", len = 160) String title,
        @Attr("preço em DECIA Points") int pricePoints,
        @Attr(value = "estoque (nulo = ilimitado)", opt = true) Integer stock,
        @Attr(value = "disponível de", opt = true) Instant availableFrom,
        @Attr(value = "disponível até", opt = true) Instant availableUntil,
        @Attr(value = "empresa (nulo = global)", opt = true, ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "ativo", def = "TRUE") boolean active) {
}

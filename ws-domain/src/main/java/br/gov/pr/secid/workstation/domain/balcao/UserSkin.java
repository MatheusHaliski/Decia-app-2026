package br.gov.pr.secid.workstation.domain.balcao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Skin/capa adquirida pela pessoa (RF38, RF42) — TAXONOMIA §12.7. */
@DomainEntity(context = "11 Balcão & Loja", table = "user_skins", rfs = {"RF38", "RF42"}, migration = 19, audit = Audit.CREATED,
        doc = "Skins do usuário → CASCADE; compra de origem SET NULL. Única (user, kind, key).",
        uniques = {"user_id, skin_kind, skin_key"})
public record UserSkin(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("tipo") SkinKind skinKind,
        @Attr(value = "chave da skin", len = 60) String skinKey,
        @Attr(value = "como foi obtida", def = "'PADRAO'") AcquiredVia acquiredVia,
        @Attr(value = "compra de origem", opt = true, ref = "store_purchases", onDelete = OnDelete.SET_NULL) UUID purchaseId) {
}

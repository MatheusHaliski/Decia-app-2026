package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Resgate de benefício (= PromotionRedemption + CouponRight) — TAXONOMIA §6.6 (RF39, RF42); exige SealBond aprovada. */
@DomainEntity(context = "9 Chancelas & Vínculos", table = "benefit_redemptions", rfs = {"RF39", "RF42", "RF19"}, migration = 18, store = Store.MYSQL_S3,
        doc = "Resgates (idempotentes). RESTRICT em benefício, vínculo, pessoa e lançamento.",
        uniques = {"code", "idempotency_key"}, indexes = {"user_id, status", "benefit_id"})
public record BenefitRedemption(
        @Attr("identificador") UUID id,
        @Attr(value = "benefício", ref = "benefits", onDelete = OnDelete.RESTRICT) UUID benefitId,
        @Attr(value = "vínculo aprovado que habilitou", ref = "seal_bonds", onDelete = OnDelete.RESTRICT) UUID sealBondId,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "código (QR)", len = 40) String code,
        @Attr(value = "estado", def = "'EMITIDO'") RedemptionStatus status,
        @Attr(value = "resgatado em", opt = true) Instant redeemedAt,
        @Attr(value = "expira em", opt = true) Instant expiresAt,
        @Attr(value = "certificado", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID certificateMediaId,
        @Attr(value = "lançamento de pontos/créditos", opt = true, ref = "decia_points_ledger", onDelete = OnDelete.RESTRICT) UUID ledgerEntryId,
        @Attr(value = "chave idempotente", len = 120) String idempotencyKey) {
}

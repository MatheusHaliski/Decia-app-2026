package br.gov.pr.secid.workstation.domain.balcao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Compra na Loja (RF42.CA04) — TAXONOMIA §7.5; débito no extrato; idempotente. */
@DomainEntity(context = "11 Balcão & Loja", table = "store_purchases", rfs = {"RF42", "RF38"}, migration = 19, audit = Audit.CREATED,
        doc = "Compras (financeiro → RESTRICT em comprador, item e lançamento).",
        uniques = {"idempotency_key"}, indexes = {"buyer_id, created_at", "store_item_id"})
public record StorePurchase(
        @Attr("identificador") UUID id,
        @Attr(value = "comprador", ref = "users", onDelete = OnDelete.RESTRICT) UUID buyerId,
        @Attr(value = "item", ref = "store_items", onDelete = OnDelete.RESTRICT) UUID storeItemId,
        @Attr("preço pago em DECIA Points") int pricePaid,
        @Attr(value = "lançamento de débito", opt = true, ref = "decia_points_ledger", onDelete = OnDelete.RESTRICT) UUID ledgerEntryId,
        @Attr(value = "entrega {copiedTargetId, creditsAdded, skinId, boostUntil}", opt = true) String deliveryJson,
        @Attr(value = "estado", def = "'CONCLUIDA'") PurchaseStatus status,
        @Attr(value = "chave idempotente", len = 120) String idempotencyKey) {
}

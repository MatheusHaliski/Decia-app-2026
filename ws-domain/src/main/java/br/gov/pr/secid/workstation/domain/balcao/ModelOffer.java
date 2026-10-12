package br.gov.pr.secid.workstation.domain.balcao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Modelo oferecido no Balcão (= FAI "à venda") — TAXONOMIA §7.1 (RF40; lido em RF19, RF21, RF42). Preço em DECIA Points (0 = grátis). */
@DomainEntity(context = "11 Balcão & Loja", table = "model_offers", rfs = {"RF40", "RF19", "RF21", "RF42"}, migration = 19, versioned = true,
        doc = "Ofertas do Balcão (alvo polimórfico). Dono → CASCADE; quem destacou RESTRICT.",
        uniques = {"target_type, target_id, owner_id"}, indexes = {"status, shelf, visibility", "owner_id, status"},
        checks = {"price_points >= 0"})
public record ModelOffer(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr("tipo do alvo") OfferTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr("preço em DECIA Points (0 = grátis)") int pricePoints,
        @Attr(value = "licença", def = "'ATRIBUICAO'") ModelLicense license,
        @Attr(value = "descrição de uso", opt = true, len = 1000) String usageDescription,
        @Attr(value = "visibilidade", def = "'EMPRESA'") OfferVisibility visibility,
        @Attr(value = "prateleira", def = "'COMUNIDADE'") Shelf shelf,
        @Attr("repasse (RF40.CA05)") boolean isHandover,
        @Attr(value = "disponível de", opt = true) Instant availableFrom,
        @Attr(value = "disponível até", opt = true) Instant availableUntil,
        @Attr(value = "estado", def = "'ATIVA'") OfferStatus status,
        @Attr("visualizações") long viewsCount,
        @Attr("remixes") int remixCount,
        @Attr("pontos ganhos") long pointsEarned,
        @Attr(value = "destacado por (RF40.CA07)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID highlightedBy) {

    public ModelOffer {
        if (pricePoints < 0) {
            throw new IllegalArgumentException("VALIDACAO: pricePoints ≥ 0");
        }
    }
}

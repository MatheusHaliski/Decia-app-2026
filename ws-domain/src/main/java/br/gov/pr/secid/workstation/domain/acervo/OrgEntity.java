package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;

import java.util.UUID;

/** Órgão / entidade / fornecedor (= FAI Brand) — TAXONOMIA §2.6 (RF20). */
@DomainEntity(context = "2 Acervo de Tarefas", table = "org_entities", rfs = {"RF20", "RF41"}, migration = 11,
        doc = "Catálogo de órgãos, entidades e fornecedores (RESTRICT). cnpj cifrado.",
        indexes = {"name", "kind"})
public record OrgEntity(
        @Attr("identificador") UUID id,
        @Attr(value = "nome", len = 200) String name,
        @Attr(value = "CNPJ cifrado", opt = true, len = 512, encrypted = true) String cnpj,
        @Attr("natureza") OrgEntityKind kind,
        @Attr(value = "fonte dos dados", def = "'MANUAL'") OrgEntitySource source,
        @Attr(value = "referência externa (QID Wikidata, CNPJ…)", opt = true, len = 120) String externalRef,
        @Attr(value = "site", opt = true, len = 500) String websiteUrl,
        @Attr(value = "logotipo tratado", opt = true, len = 500) String logoUrl,
        @Attr("verificado") boolean verified) {
}

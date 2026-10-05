package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Extensão 1:1 do perfil EMPRESA preenchida no cadastro e conferida na validação (RF1, RF28; Q-64, Q-65) — TAXONOMIA §1.1. */
@DomainEntity(context = "1 Identidade & Acesso", table = "user_empresa_ext", rfs = {"RF1", "RF28"}, migration = 10, pk = "user_id",
        doc = "Dados declarados pelo perfil EMPRESA; confirmados viram Company na aprovação (Q-65).")
public record EmpresaProfileExtension(
        @Attr(value = "usuário (PK)", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "razão social", len = 200) String legalName,
        @Attr(value = "CNPJ cifrado (dígitos verificadores conferidos)", opt = true, len = 512, encrypted = true) String companyCnpj,
        @Attr(value = "site oficial normalizado https:// (recusa @perfil)", len = 500) String officialSite,
        @Attr(value = "ato de nomeação/portaria em restricted/", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID representationDocId) {
}

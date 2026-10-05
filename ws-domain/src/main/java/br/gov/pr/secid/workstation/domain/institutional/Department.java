package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Departamento (= FAI CelebrityProfile) — TAXONOMIA §1.5. Criado pela EMPRESA (RF28.CA02); página pública RF14; lido em RF19, RF24, RF25, RF35, RF39. */
@DomainEntity(context = "1 Identidade & Acesso", table = "departments", rfs = {"RF28", "RF14", "RF19", "RF24", "RF25", "RF35", "RF39"},
        migration = 10, versioned = true,
        doc = "Catálogo institucional: departamento de uma empresa, com chefe atual (headUserId). Inativo → página 404 (RF14.CA01).",
        uniques = {"company_id, slug"}, indexes = {"head_user_id", "company_id, active"})
public record Department(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "nome", len = 160) String name,
        @Attr(value = "sigla (SECID-UTS, CPOE…)", opt = true, len = 30) String acronym,
        @Attr(value = "slug único na empresa", len = 80) String slug,
        @Attr(value = "cor (token)", opt = true, len = 40) String color,
        @Attr(value = "monograma de 1–3 letras", opt = true, len = 3) String monogram,
        @Attr(value = "chefe atual (CHEFE_DEPARTAMENTO)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID headUserId,
        @Attr(value = "sobre", opt = true, sql = "TEXT") String about,
        @Attr(value = "capa", opt = true, len = 500) String coverUrl,
        @Attr(value = "ativo (RF14.CA01)", def = "TRUE") boolean active) {
}

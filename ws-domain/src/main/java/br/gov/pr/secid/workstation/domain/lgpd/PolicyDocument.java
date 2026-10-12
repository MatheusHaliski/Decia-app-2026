package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.UiLanguage;
import br.gov.pr.secid.workstation.domain.institutional.PolicyStatus;

import java.time.Instant;
import java.util.UUID;

/** Termos de Uso / Política de Privacidade versionados (RF1 bloco A, RF2 gate, RF3, RF18; D-15) — TAXONOMIA §1.10. */
@DomainEntity(context = "1 Identidade & Acesso", table = "policy_documents", rfs = {"RF1", "RF2", "RF3", "RF18"}, migration = 10,
        doc = "Documentos legais publicados em /termos e /privacidade. Único (document, version, language); uma VIGENTE por (document, language).",
        uniques = {"document, version, language"}, indexes = {"document, language, status"})
public record PolicyDocument(
        @Attr("identificador") UUID id,
        @Attr("documento") PolicyDocumentKind document,
        @Attr(value = "versão (independente por documento)", len = 20) String version,
        @Attr(value = "idioma (PT_BR oficial)", def = "'PT_BR'") UiLanguage language,
        @Attr(value = "início da vigência", opt = true) Instant effectiveFrom,
        @Attr(value = "resumo das mudanças mostrado no gate", opt = true, sql = "TEXT") String changelog,
        @Attr(value = "corpo em Markdown (fonte docs/legal/*.md)", sql = "MEDIUMTEXT") String bodyMd,
        @Attr(value = "situação", def = "'RASCUNHO'") PolicyStatus status,
        @Attr(value = "quem publicou", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID publishedBy,
        @Attr(value = "data de publicação", opt = true) Instant publishedAt) {
}

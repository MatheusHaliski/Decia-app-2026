package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.util.List;

/**
 * Entrada do PersonalDataRegistry (RF3 bloco C, D-18) — TAXONOMIA §12.9: única fonte da página "Quais dados temos", da exportação e
 * do plano de anonimização. Vive em código ({@code ws-application/.../lgpd/PersonalDataRegistry}); o teste-guarda de cobertura
 * confere que toda entidade com coluna de pessoa está registrada.
 */
@DomainEntity(context = "12 Plataforma", rfs = {"RF3", "RF18"}, store = Store.CODE, audit = Audit.NONE,
        doc = "Só código: registro estático de fontes de dados pessoais.")
public record PersonalDataSource(
        @Attr("categoria") PersonalDataCategory category,
        @Attr("entidades/campos (ex.: User.email, SessionMessage.authorId)") List<String> entities,
        @Attr(value = "finalidade", len = 500) String purpose,
        @Attr(value = "base legal (art. 7º II/V/IX, art. 11, art. 23)", len = 120) String legalBasis,
        @Attr(value = "retenção (texto + regra)", len = 300) String retention,
        @Attr("compartilhamentos") List<DataSharing> sharing,
        @Attr(value = "seção da exportação", len = 60) String exportSection,
        @Attr("destino na anonimização") OnAnonymization onAnonymization) {

    public PersonalDataSource {
        entities = List.copyOf(entities);
        sharing = List.copyOf(sharing);
    }
}

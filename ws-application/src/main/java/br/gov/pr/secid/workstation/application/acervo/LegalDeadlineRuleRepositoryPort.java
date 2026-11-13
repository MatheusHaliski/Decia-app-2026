package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Catálogo de prazos legais ({@code legal_deadline_rules}, V11; regras padrão na V69). Adaptador JPA: {@code JpaAcervoAdapters}. */
public interface LegalDeadlineRuleRepositoryPort {

    /** Regras ativas padrão (sem empresa) e, quando {@code companyId} não é nulo, as ativas da empresa. */
    List<LegalDeadlineRule> findActive(UUID companyId);

    Optional<LegalDeadlineRule> findById(UUID id);
}

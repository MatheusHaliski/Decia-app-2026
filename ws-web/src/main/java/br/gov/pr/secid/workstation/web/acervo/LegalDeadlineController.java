package br.gov.pr.secid.workstation.web.acervo;

import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService.LegalDeadlineRuleView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** RF20.CA11/RF41.CA04 — catálogo de prazos legais: regras padrão (lei federal) e as da empresa de quem pede, ativas e vigentes hoje. */
@RestController
@Tag(name = "RF41 Prazos legais")
public class LegalDeadlineController {
    private final LegalDeadlineService legal;

    public LegalDeadlineController(LegalDeadlineService legal) {
        this.legal = legal;
    }

    @Operation(summary = "RF41.CA04 Regras de prazo legal (categoria/subcategoria, dias corridos ou úteis, base legal)")
    @GetMapping("/api/legal-deadlines")
    public List<LegalDeadlineRuleView> legalDeadlineRules(CurrentUser user) {
        return legal.rules(user);
    }
}

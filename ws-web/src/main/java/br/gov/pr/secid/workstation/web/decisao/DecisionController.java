package br.gov.pr.secid.workstation.web.decisao;

import br.gov.pr.secid.workstation.application.decisao.DecisionCommand;
import br.gov.pr.secid.workstation.application.decisao.DecisionService;
import br.gov.pr.secid.workstation.application.decisao.DecisionService.NewDecision;
import br.gov.pr.secid.workstation.application.decisao.DecisionView;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * RF29 — API da decisão estruturada do DECIA (fase 7, docs/decia/08): criar, listar as que a pessoa vê, abrir e aplicar comandos (estrutura,
 * notas, evidência e ciclo de vida) com versão otimista. Autorização no serviço ({@code ResourceAuthorizer.requireDecision}): invisível e
 * inexistente respondem o mesmo 404; visível sem a ação do papel DACI responde 403. Erros: 400 JSON/parâmetro, 409 EDICAO_CONCORRENTE ou
 * transição inválida, 422 VALIDACAO/DECISAO_INCOMPLETA/DECISAO_AVISOS_NAO_CONFIRMADOS.
 */
@RestController
@Tag(name = "RF29 Decisões (DECIA)")
public class DecisionController {
    private final DecisionService decisions;

    public DecisionController(DecisionService decisions) {
        this.decisions = decisions;
    }

    /** Corpo da criação; {@code criteria} são os critérios do modelo escolhido (até 20). */
    public record CreateRequest(@NotNull @Size(max = 500) String question, @NotNull DecisionComplexity complexity, @NotNull DecisionLevel impact,
                                DecisionKind kind, DecisionLevel urgency, @Size(max = 60) String templateKey, Visibility visibility,
                                @Size(max = 20) List<@Size(max = 120) String> criteria) {
    }

    /** Lote de comandos sobre a versão {@code version} lida pelo cliente (tudo ou nada). */
    public record CommandsRequest(@NotNull Long version, @NotEmpty @Size(max = 50) List<@NotNull DecisionCommand> commands) {
    }

    @Operation(summary = "RF29.CA01 Criar decisão estruturada (responsável = quem cria, CONDUTOR; RASCUNHO; 422 VALIDACAO/DECISAO_SEM_EMPRESA)")
    @PostMapping("/api/decisions")
    @ResponseStatus(HttpStatus.CREATED)
    public DecisionView create(CurrentUser user, @Valid @RequestBody CreateRequest body, RequestContext ctx) {
        return decisions.create(user, new NewDecision(body.question(), body.complexity(), body.impact(), body.kind(), body.urgency(),
                body.templateKey(), body.visibility(), body.criteria()), ctx);
    }

    @Operation(summary = "RF29.CA02 Decisões que a pessoa pode ver (responsável, participante DACI ou pela visibilidade), mais recentes primeiro")
    @GetMapping("/api/decisions")
    public List<DecisionView> list(CurrentUser user, @RequestParam(defaultValue = "50") int limit) {
        return decisions.list(user, limit);
    }

    @Operation(summary = "RF29.CA02 Abrir decisão (agregado com alternativas, critérios, notas, evidência, snapshots e trilha; 404 uniforme)")
    @GetMapping("/api/decisions/{id}")
    @AuthorizedBy("requireDecision")
    public DecisionView get(CurrentUser user, @PathVariable UUID id) {
        return decisions.get(user, id);
    }

    @Operation(summary = "RF29.CA03 Aplicar comandos (estrutura, notas, evidência, transições, decidir com guarda e snapshot, reabrir, resultado); "
            + "BFLA por papel DACI (403), 409 EDICAO_CONCORRENTE, 422 DECISAO_INCOMPLETA")
    @PostMapping("/api/decisions/{id}/commands")
    @AuthorizedBy("requireDecision")
    public DecisionView commands(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody CommandsRequest body, RequestContext ctx) {
        return decisions.apply(user, id, body.version(), body.commands(), ctx);
    }
}

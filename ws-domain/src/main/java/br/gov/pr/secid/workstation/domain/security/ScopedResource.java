package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.projetos.ProjectScheme;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * O que a política precisa saber de um recurso autoral para decidir acesso (D-65): dono, escopo (empresa/departamento), visibilidade,
 * classificação e colaboradores explícitos (responsável da tarefa, membros convidados). Construído a partir do agregado pelas fábricas.
 *
 * @param collaborators pessoas com acesso explícito (veem e editam, não apagam nem gerem)
 */
public record ScopedResource(Kind kind, UUID id, UUID ownerId, UUID companyId, UUID departmentId, Visibility visibility,
                             AccessClassification classification, Set<UUID> collaborators) {

    /** Tipo do recurso — vai na mensagem de erro (404 "Tarefa não encontrada") e no teste-matriz. */
    public enum Kind {
        TASK("Tarefa"), PROJECT("Projeto"), DECISION("Decisão"), MEDIA("Arquivo"), USER("Usuário"), SESSION("Sessão");

        private final String label;

        Kind(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public ScopedResource {
        Objects.requireNonNull(kind, "kind");
        visibility = visibility == null ? Visibility.PRIVADA : visibility;
        classification = classification == null ? AccessClassification.INTERNO : classification;
        collaborators = collaborators == null ? Set.of() : Set.copyOf(collaborators);
    }

    /** Tarefa do Acervo (RF41): não carrega empresa — quem chama passa a empresa do dono para a visibilidade EMPRESA. */
    public static ScopedResource of(TaskItem t, UUID ownerCompanyId) {
        Set<UUID> collab = new HashSet<>();
        if (t.responsibleId() != null && !t.responsibleId().equals(t.ownerId())) {
            collab.add(t.responsibleId());
        }
        return new ScopedResource(Kind.TASK, t.id(), t.ownerId(), ownerCompanyId, t.departmentId(), t.visibility(), t.accessClass(), collab);
    }

    /** Projeto (RF21): sem classificação própria → INTERNO; membros explícitos chegam por {@link #withCollaborators}. */
    public static ScopedResource of(ProjectScheme p) {
        return new ScopedResource(Kind.PROJECT, p.id(), p.ownerId(), p.companyId(), p.departmentId(), p.visibility(),
                AccessClassification.INTERNO, Set.of());
    }

    /** Decisão estruturada: o dono é o responsável humano (G1); participantes DACI são tratados por {@link DecisionAccessPolicy}. */
    public static ScopedResource of(Decision d) {
        return new ScopedResource(Kind.DECISION, d.id(), d.ownerUserId(), d.companyId(), d.departmentId(), d.visibility(), d.accessClass(), Set.of());
    }

    public ScopedResource withCollaborators(Set<UUID> more) {
        Set<UUID> all = new HashSet<>(collaborators);
        all.addAll(more);
        return new ScopedResource(kind, id, ownerId, companyId, departmentId, visibility, classification, all);
    }
}

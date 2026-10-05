package br.gov.pr.secid.workstation.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Base de toda entidade persistida (D-04): id UUID (BINARY(16) no MySQL), carimbos de criação e atualização em UTC.
 * Os carimbos são preenchidos pelo próprio ciclo de vida JPA, sem depender de auditoria do Spring Data —
 * assim o módulo de domínio continua utilizável fora de um contexto Spring (testes puros).
 */
@MappedSuperclass
public abstract class AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Identidade por id: duas instâncias com o mesmo id são a mesma linha; sem id (ainda não persistida) só a própria referência. */
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        AuditableEntity other = (AuditableEntity) o;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return id != null ? Objects.hash(id) : System.identityHashCode(this);
    }
}

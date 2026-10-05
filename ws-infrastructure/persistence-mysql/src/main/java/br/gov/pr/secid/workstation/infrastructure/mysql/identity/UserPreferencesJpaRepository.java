package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserPreferencesJpaRepository extends JpaRepository<UserPreferencesEntity, UUID> {
}

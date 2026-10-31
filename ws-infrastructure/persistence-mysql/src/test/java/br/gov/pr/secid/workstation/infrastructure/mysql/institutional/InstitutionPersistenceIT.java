package br.gov.pr.secid.workstation.infrastructure.mysql.institutional;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionDirectoryPort;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Catálogo institucional (V10) lido pelo {@link JpaInstitutionDirectoryAdapter} contra MySQL 8.4 real (RF14, RF15, RF6): slug repetido em
 * duas empresas, departamentos ativos ordenados, lotação vigente × encerrada, conta não ativa fora das contagens, papel mais forte por
 * pessoa, pessoas da empresa sem a conta EMPRESA e a empresa da dona. Também o V47 (RF3): especialidades e controle de publicação em
 * {@code users}, com o CHECK do banco. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = InstitutionPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class InstitutionPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class,
            JpaInstitutionDirectoryAdapter.class})
    static class App {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4").withDatabaseName("workstation")
            .withUsername("workstation").withPassword("test-only-" + System.nanoTime());

    @Autowired
    InstitutionDirectoryPort directory;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;

    static byte[] bin(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }

    private User person(String username, ProfileType type, AccountStatus status, UUID companyId) {
        User u = new User();
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(username + "@exemplo.gov.br")));
        u.setPasswordHash("argon2-placeholder-" + UUID.randomUUID());
        u.setProfileType(type);
        u.setStatus(status);
        User saved = users.save(u);
        if (companyId != null) {
            // a lotação é só leitura no adaptador de contas (D-66): o RF28 é quem grava company_id
            jdbc.update("update users set company_id = ? where id = ?", bin(companyId), bin(saved.getId()));
        }
        return saved;
    }

    private UUID company(User owner, String slug, String name, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into companies (id, owner_user_id, legal_name, slug, about, website_url, accent_color, status) values (?,?,?,?,?,?,?,?)",
                bin(id), bin(owner.getId()), name, slug, "Sobre " + name, "https://" + slug + ".gov.br", "orange", status);
        return id;
    }

    private UUID department(UUID company, String slug, String acronym, String name, User head, boolean active) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into departments (id, company_id, name, acronym, slug, color, monogram, head_user_id, about, active) "
                        + "values (?,?,?,?,?,?,?,?,?,?)",
                bin(id), bin(company), name, acronym, slug, "blue", acronym.substring(0, 1), head == null ? null : bin(head.getId()), "Sobre", active);
        return id;
    }

    private void lota(User u, UUID department, String role, Instant ended) {
        jdbc.update("insert into department_memberships (id, user_id, department_id, role_in_dept, started_at, ended_at) values (?,?,?,?,?,?)",
                bin(UUID.randomUUID()), bin(u.getId()), bin(department), role, Timestamp.from(Instant.parse("2026-01-01T00:00:00Z")),
                ended == null ? null : Timestamp.from(ended));
    }

    @Test
    void leDepartamentosEmpresasELotacoesVigentesComContasAtivas() {
        User dona = person("inst.dona", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        UUID secid = company(dona, "inst-secid", "Secretaria das Cidades", "ATIVA");
        User outraDona = person("inst.outra", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        UUID outra = company(outraDona, "inst-outra", "Outra", "SUSPENSA");
        User chefe = person("inst.chefe", ProfileType.CHEFE_DEPARTAMENTO, AccountStatus.ACTIVE, secid);
        User ana = person("inst.ana", ProfileType.EMPREGADO, AccountStatus.ACTIVE, secid);
        User bruno = person("inst.bruno", ProfileType.EMPREGADO, AccountStatus.SUSPENDED, secid);
        User carla = person("inst.carla", ProfileType.EMPREGADO, AccountStatus.ACTIVE, secid);
        UUID uts = department(secid, "uts", "UTS", "Unidade Técnica", chefe, true);
        UUID uap = department(secid, "uap", "UAP", "Unidade de Apoio", null, true);
        department(secid, "antigo", "ANT", "Antigo", null, false);
        UUID utsOutra = department(outra, "uts", "UTS2", "Outra UTS", null, true);
        lota(chefe, uts, "MEMBRO", null);
        lota(chefe, uts, "CHEFE", null);
        lota(ana, uts, "MEMBRO", null);
        lota(ana, uap, "CURADOR", null);
        lota(bruno, uts, "MEMBRO", null);
        lota(carla, uts, "MEMBRO", Instant.parse("2026-10-01T00:00:00Z"));

        assertThat(directory.departmentsBySlug("uts")).extracting(Department::id).containsExactlyInAnyOrder(uts, utsOutra);
        Department d = directory.departmentsBySlug("uts").stream().filter(x -> x.id().equals(uts)).findFirst().orElseThrow();
        assertThat(d.acronym()).isEqualTo("UTS");
        assertThat(d.headUserId()).isEqualTo(chefe.getId());
        assertThat(d.active()).isTrue();

        Company c = directory.companyBySlug("inst-secid").orElseThrow();
        assertThat(c.id()).isEqualTo(secid);
        assertThat(c.status()).isEqualTo(CompanyStatus.ATIVA);
        assertThat(c.cnpj()).as("a projeção pública não carrega CNPJ").isNull();
        assertThat(directory.company(outra).map(Company::status)).contains(CompanyStatus.SUSPENSA);
        assertThat(directory.companyOwnedBy(dona.getId()).map(Company::slug)).contains("inst-secid");
        assertThat(directory.companyOwnedBy(ana.getId())).isEmpty();

        assertThat(directory.activeDepartmentsOf(secid)).extracting(Department::acronym).containsExactly("UAP", "UTS");
        Map<UUID, DeptRole> members = directory.activeMembers(uts, 50);
        assertThat(members).as("Bruno suspenso e Carla encerrada ficam de fora; o papel mais forte vence")
                .containsOnlyKeys(chefe.getId(), ana.getId()).containsEntry(chefe.getId(), DeptRole.CHEFE);
        assertThat(directory.activeMembers(uts, 1)).hasSize(1);
        assertThat(directory.countActiveMembers(uts)).isEqualTo(2);
        assertThat(directory.countActiveMembers(uap)).isEqualTo(1);
        assertThat(directory.countActivePeople(secid)).as("chefe, Ana e Carla; sem a conta EMPRESA e sem a suspensa").isEqualTo(3);
        assertThat(directory.activeDepartmentsOfMember(ana.getId())).extracting(Department::acronym).containsExactly("UAP", "UTS");
        assertThat(directory.activeDepartmentsOfMember(carla.getId())).isEmpty();
    }

    @Test
    void especialidadesEControleDePublicacaoDoPerfilIdaEVolta() {
        User u = person("pub.ana", ProfileType.EMPREGADO, AccountStatus.ACTIVE, null);
        assertThat(users.findById(u.getId()).orElseThrow()).satisfies(x -> {
            assertThat(x.getSpecialties()).isEmpty();
            assertThat(x.getProfileVisibility()).as("padrão do banco").isEqualTo(ProfileVisibility.AUTENTICADOS);
        });
        User loaded = users.findById(u.getId()).orElseThrow();
        loaded.setSpecialties(List.of("Gestão de contratos", "BIM", "C++"));
        loaded.setProfileVisibility(ProfileVisibility.EMPRESA);
        users.save(loaded);
        User again = users.findById(u.getId()).orElseThrow();
        assertThat(again.getSpecialties()).containsExactly("Gestão de contratos", "BIM", "C++");
        assertThat(again.getProfileVisibility()).isEqualTo(ProfileVisibility.EMPRESA);
        assertThat(jdbc.queryForObject("select json_length(specialties_json) from users where id = ?", Integer.class, bin(u.getId()))).isEqualTo(3);

        again.setSpecialties(List.of());
        users.save(again);
        assertThat(jdbc.queryForObject("select specialties_json is null from users where id = ?", Boolean.class, bin(u.getId())))
                .as("lista vazia vira NULL").isTrue();
        assertThatThrownBy(() -> jdbc.update("update users set profile_visibility = 'TODOS' where id = ?", (Object) bin(u.getId())))
                .as("CHECK ck_users_profile_visibility").isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ck_users_profile_visibility");
    }
}

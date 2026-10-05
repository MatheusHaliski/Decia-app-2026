package br.gov.pr.secid.workstation.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contexto completo (todos os módulos ws-*) subindo contra um MySQL 8.4 real do Testcontainers, com o Flyway
 * aplicando V1__baseline.sql. Sem Docker na máquina o teste é pulado (disabledWithoutDocker) — no CI o Docker existe.
 * Confere o contrato de segurança do Bloco 1: /actuator/health público, resto do Actuator fechado, 401 em JSON.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkStationApplicationIT {

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("workstation")
            .withUsername("workstation")
            .withPassword("test-only-" + System.nanoTime());   // gerada por execução, nunca versionada

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flywayAplicouOBaseline() {
        Integer applied = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1 AND version = '1'", Integer.class);
        assertThat(applied).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT meta_value FROM app_meta WHERE meta_key = 'schema.baseline'", String.class))
                .isEqualTo("bloco-1");
    }

    @Test
    void healthEPublicoEOResto401EmJson() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/actuator/info")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
        mvc.perform(get("/api/qualquer-coisa")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());   // springdoc desligado no perfil test
    }
}

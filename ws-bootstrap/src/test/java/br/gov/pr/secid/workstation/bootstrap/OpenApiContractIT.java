package br.gov.pr.secid.workstation.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato OpenAPI da API com o front (D-71). Sobe o contexto completo com o springdoc LIGADO, lê o {@code /v3/api-docs}
 * e grava a especificação normalizada em {@code contracts/openapi/openapi.json} (raiz do repositório). Dali o
 * {@code npm run api:types} gera {@code lib/api/schema.d.ts} com o openapi-typescript.
 * <p>
 * O CI roda este teste no {@code mvn verify} e falha com {@code git diff --exit-code} se a especificação ou os tipos TS
 * versionados divergirem do código (DTO/rota mudou sem regenerar). Por isso a saída é determinística: chaves de objeto
 * em ordem alfabética, sem {@code servers} (host/porta da execução), indentação fixa e quebra de linha final.
 * Sem Docker o teste é pulado; o CI confere no relatório do surefire que ele RODOU (não basta passar).
 * <p>
 * Regenerar localmente: {@code mvn -B -ntp -pl ws-bootstrap -am test -Dtest=OpenApiContractIT
 * -Dsurefire.failIfNoSpecifiedTests=false} e depois {@code npm run api:types}.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"springdoc.api-docs.enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiContractIT {

    /** Caminho relativo à raiz do repositório; o {@code package.json} (script api:types) aponta para o mesmo arquivo. */
    static final String SPEC_PATH = "contracts/openapi/openapi.json";

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("workstation")
            .withUsername("workstation")
            .withPassword("test-only-" + System.nanoTime());   // gerada por execução, nunca versionada

    private static final JsonMapper JSON = JsonMapper.builder().enable(SerializationFeature.INDENT_OUTPUT).build();

    @Autowired
    MockMvc mvc;

    @Test
    void geraAEspecificacaoOpenApiNormalizadaNoContrato() throws Exception {
        String raw = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode spec = normalize(JSON.readTree(raw));

        // guarda contra geração vazia/lixo: versão OpenAPI 3, rotas conhecidas e nada dependente da execução
        assertThat(spec.path("openapi").asString()).startsWith("3.");
        assertThat(spec.path("paths").has("/api/me/preferences")).isTrue();
        assertThat(spec.path("paths").has("/api/auth/login")).isTrue();
        assertThat(spec.has("servers")).isFalse();
        // argumentos injetados pelo servidor (CurrentUserArgumentResolver) nunca aparecem como parâmetro do cliente
        assertThat(spec.path("components").path("schemas").has("CurrentUser")).isFalse();
        assertThat(spec.path("components").path("schemas").has("RequestContext")).isFalse();
        assertThat(raw).doesNotContain("\"name\":\"ctx\"").doesNotContain("\"name\":\"user\"");

        Path target = repositoryRoot().resolve(SPEC_PATH);
        Files.createDirectories(target.getParent());
        String content = JSON.writeValueAsString(spec).replace("\r\n", "\n") + "\n";
        Files.writeString(target, content, StandardCharsets.UTF_8);
        assertThat(Files.readString(target, StandardCharsets.UTF_8)).isEqualTo(content);
    }

    @Test
    void normalizacaoOrdenaChavesERemoveServers() {
        ObjectNode in = JSON.createObjectNode();
        in.putArray("servers").addObject().put("url", "http://localhost:54321");
        in.putObject("paths").put("/b", 1).put("/a", 2);
        in.put("openapi", "3.1.0");
        ArrayNode tags = in.putArray("tags");
        tags.addObject().put("z", 1).put("a", 2);

        JsonNode out = normalize(in);

        assertThat(out.has("servers")).isFalse();
        assertThat(fieldNames(out)).containsExactly("openapi", "paths", "tags");
        assertThat(fieldNames(out.path("paths"))).containsExactly("/a", "/b");
        assertThat(fieldNames(out.path("tags").get(0))).containsExactly("a", "z");   // ordena dentro de arrays também
    }

    /** Ordena recursivamente as chaves de todo objeto e tira o que depende da execução ({@code servers}). */
    static JsonNode normalize(JsonNode root) {
        JsonNode sorted = sortKeys(root);
        if (sorted instanceof ObjectNode obj) {
            obj.remove("servers");
        }
        return sorted;
    }

    private static JsonNode sortKeys(JsonNode node) {
        if (node.isObject()) {
            List<String> names = fieldNames(node);
            names.sort(String::compareTo);
            ObjectNode out = JSON.createObjectNode();
            for (String name : names) {
                out.set(name, sortKeys(node.get(name)));
            }
            return out;
        }
        if (node.isArray()) {
            ArrayNode out = JSON.createArrayNode();
            for (JsonNode item : node) {
                out.add(sortKeys(item));   // ordem de array é semântica (parâmetros, enum): fica como veio
            }
            return out;
        }
        return node;
    }

    private static List<String> fieldNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        node.propertyNames().forEach(names::add);
        return names;
    }

    /** Sobe a partir do diretório do módulo (cwd do surefire) até achar a raiz do repositório. */
    private static Path repositoryRoot() throws IOException {
        Path dir = Path.of("").toAbsolutePath();
        while (dir != null) {
            if (Files.exists(dir.resolve("Dockerfile.backend")) && Files.exists(dir.resolve("package.json"))) {
                return dir;
            }
            dir = dir.getParent();
        }
        throw new IOException("raiz do repositório (Dockerfile.backend + package.json) não encontrada");
    }
}

package br.gov.pr.secid.workstation.domain.acervo;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** V71 — catálogo família → variante → campos: validação e paridade de códigos com lib/tasks/formats.ts. */
class DeliveryFormatsTest {
    private static final Path FRONT = Path.of("..", "lib", "tasks", "formats.ts");

    @Test
    void validaVarianteDaFamiliaChavesEValores() {
        assertThat(DeliveryFormats.validate(FormatFamily.PLANILHA, "CSV", Map.of("delimiter", "SEMICOLON", "headerRow", "true"))).isEmpty();
        assertThat(DeliveryFormats.validate(FormatFamily.PLANILHA, "DOCX", Map.of())).containsKey("formatVariant");
        assertThat(DeliveryFormats.validate(FormatFamily.PLANILHA, "xlsx", Map.of())).containsKey("formatVariant");
        assertThat(DeliveryFormats.validate(FormatFamily.DOCUMENTO, "PDF", Map.of("pages", "0"))).containsKey("formatDetails.pages");
        assertThat(DeliveryFormats.validate(FormatFamily.DOCUMENTO, "PDF", Map.of("pages", "12", "textLayer", "true"))).isEmpty();
        assertThat(DeliveryFormats.validate(FormatFamily.IMAGEM, "PNG", Map.of("cor", "azul"))).containsKey("formatDetails.cor");
        assertThat(DeliveryFormats.validate(FormatFamily.DESENHO_TECNICO, "DWG", Map.of("cadVersion", "AC9999"))).containsKey("formatDetails.cadVersion");
        assertThat(DeliveryFormats.validate(null, "PDF", Map.of("x", "y"))).containsKeys("formatVariant", "formatDetailsJson");
        // só a família, sem variante: valem os campos da família
        assertThat(DeliveryFormats.validate(FormatFamily.IMAGEM, null, Map.of("minWidth", "800"))).isEmpty();
        assertThat(DeliveryFormats.fieldsFor(FormatFamily.DADOS, "CSV")).extracting(DeliveryFormats.Field::key)
                .containsExactly("encoding", "delimiter", "headerRow", "decimal");
        assertThat(DeliveryFormats.sharedCodes()).contains("PDF", "CSV");
    }

    @Test
    void tarefaRecusaVarianteSemFamiliaOuDeOutraFamilia() {
        TaskItem t = TaskItem.create(java.util.UUID.randomUUID(), null, "Planilha", null, TaskType.PLANILHA, null,
                br.gov.pr.secid.workstation.domain.common.Priority.MEDIA, null, null, br.gov.pr.secid.workstation.domain.common.AccessClassification.INTERNO,
                br.gov.pr.secid.workstation.domain.common.Visibility.PRIVADA);
        assertThat(t.withFormat(FormatFamily.PLANILHA, "XLSX", "{\"sheets\":\"2\"}").formatVariant()).isEqualTo("XLSX");
        assertThat(t.withFormat(FormatFamily.PLANILHA, "XLSX", null).transition(TaskState.DISPONIVEL).formatFamily()).isEqualTo(FormatFamily.PLANILHA);
        assertThatThrownBy(() -> t.withFormat(null, "XLSX", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> t.withFormat(FormatFamily.IMAGEM, "XLSX", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> t.withFormat(FormatFamily.PLANILHA, null, "x".repeat(DeliveryFormats.MAX_DETAILS_JSON + 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void mesmosCodigosDoCatalogoDoFront() throws Exception {
        assumeTrue(Files.exists(FRONT), "lib/tasks/formats.ts ausente");
        String ts = Files.readString(FRONT, StandardCharsets.UTF_8);
        assertThat(list(ts, "FORMAT_FAMILIES")).containsExactlyElementsOf(Arrays.stream(FormatFamily.values()).map(Enum::name).toList());
        Set<String> pairs = new TreeSet<>();
        Matcher m = Pattern.compile("v\\(\"([A-Z0-9_]+)\", \"([A-Z_]+)\"").matcher(ts);
        while (m.find()) {
            pairs.add(m.group(2) + "/" + m.group(1));
        }
        Set<String> java = Arrays.stream(FormatFamily.values()).flatMap(f -> DeliveryFormats.variants(f).stream())
                .map(v -> v.family() + "/" + v.code()).collect(Collectors.toCollection(TreeSet::new));
        assertThat(java).isEqualTo(pairs);
    }

    private static java.util.List<String> list(String ts, String name) {
        Matcher m = Pattern.compile(name + " = \\[([^\\]]*)\\]").matcher(ts);
        assertThat(m.find()).isTrue();
        return Arrays.stream(m.group(1).split(",")).map(s -> s.strip().replace("\"", "")).filter(s -> !s.isEmpty()).toList();
    }
}

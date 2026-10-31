package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/** Lista de rótulos ↔ coluna JSON (ex.: {@code users.specialties_json}, V47): vazia vira NULL; JSON ilegível lido como vazio. */
@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<List<String>> LIST = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        return values == null || values.isEmpty() ? null : JSON.writeValueAsString(values);
    }

    @Override
    public List<String> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> out = JSON.readValue(json, LIST);
            return out == null ? List.of() : out.stream().filter(s -> s != null && !s.isBlank()).toList();
        } catch (JacksonException e) {
            return List.of();
        }
    }
}

package br.gov.pr.secid.workstation.domain.catalog;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Metadados de catálogo de um atributo (componente de record). O nome da coluna é o snake_case do componente, salvo
 * {@link #col()}; o tipo SQL é derivado do tipo Java, salvo {@link #sql()}; componentes terminados em {@code Json} ou do
 * tipo {@code Set}/{@code List} são colunas {@code JSON}. Wrappers ({@code Integer}, {@code Long}, {@code Boolean}) são
 * sempre anuláveis; os demais tipos de referência só com {@link #opt()}.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.RECORD_COMPONENT, ElementType.FIELD, ElementType.PARAMETER})
public @interface Attr {

    /** Descrição curta (vai à planilha). */
    String value();

    /** Coluna anulável. */
    boolean opt() default false;

    /** Nome da coluna quando difere do snake_case do componente. */
    String col() default "";

    /** Tipo SQL completo quando difere do padrão (ex.: {@code TEXT}, {@code DECIMAL(5,2)}). */
    String sql() default "";

    /** Tamanho de VARCHAR (padrão 255). */
    int len() default 0;

    /** Tabela referenciada pela FK (coluna {@code id}, salvo {@link #refCol()}). */
    String ref() default "";

    String refCol() default "id";

    OnDelete onDelete() default OnDelete.NONE;

    /** Valor DEFAULT literal em SQL (ex.: {@code "'RASCUNHO'"}, {@code "0"}); booleanos e inteiros NOT NULL ganham padrão automático. */
    String def() default "";

    /** Unicidade simples da coluna. */
    boolean unique() default false;

    /** Cifrado com AES-GCM antes de persistir (LGPD); a coluna recebe sufixo {@code _enc} se {@link #col()} não disser outra coisa. */
    boolean encrypted() default false;
}

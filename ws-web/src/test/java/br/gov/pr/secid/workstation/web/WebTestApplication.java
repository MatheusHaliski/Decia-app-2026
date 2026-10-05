package br.gov.pr.secid.workstation.web;

import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationExcludeFilter;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

/**
 * Raiz de configuração só para as fatias @WebMvcTest deste módulo (a aplicação real fica em ws-bootstrap).
 * O ComponentScan com o TypeExcludeFilter é o mesmo do @SpringBootApplication: é ele que deixa a fatia
 * registrar só os controllers pedidos em {@code @WebMvcTest(controllers = ...)}.
 */
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = {
        @ComponentScan.Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
        @ComponentScan.Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class)})
public class WebTestApplication {
}

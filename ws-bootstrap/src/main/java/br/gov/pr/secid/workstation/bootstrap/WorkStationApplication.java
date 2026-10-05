package br.gov.pr.secid.workstation.bootstrap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Ponto de entrada da API Work Station / DECIA. Varre todos os módulos {@code ws-*} (pacote raiz
 * {@code br.gov.pr.secid.workstation}); os adaptadores de infraestrutura só entram pelas flags {@code ws.*.enabled}.
 */
@SpringBootApplication(scanBasePackages = "br.gov.pr.secid.workstation")
@ConfigurationPropertiesScan("br.gov.pr.secid.workstation")
public class WorkStationApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkStationApplication.class, args);
    }
}

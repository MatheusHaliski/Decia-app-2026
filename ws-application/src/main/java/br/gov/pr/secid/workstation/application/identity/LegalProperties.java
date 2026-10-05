package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Versões vigentes dos Termos de Uso e da Política de Privacidade ({@code ws.legal.current-versions.*}), gravadas em
 * {@code users.terms_version}/{@code privacy_version} no cadastro. Gancho do bloco LGPD A (D-15/D-16): o
 * {@code PolicyDocument} e o {@code policy_acceptances} substituem esta propriedade depois.
 */
@ConfigurationProperties(prefix = "ws.legal")
public record LegalProperties(CurrentVersions currentVersions) {

    public LegalProperties {
        currentVersions = currentVersions == null ? new CurrentVersions(null, null) : currentVersions;
    }

    public record CurrentVersions(String terms, String privacy) {
        public CurrentVersions {
            terms = terms == null || terms.isBlank() ? "1.0" : terms.trim();
            privacy = privacy == null || privacy.isBlank() ? "1.0" : privacy.trim();
        }
    }

    public static LegalProperties defaults() {
        return new LegalProperties(null);
    }
}

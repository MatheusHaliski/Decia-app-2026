package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;
import br.gov.pr.secid.workstation.application.media.MediaUploadProperties;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.ia.AiCapability;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.mock;

/** Os beans do Bloco 5 sobem sem motor de IA nem lotações registrados e leem {@code ws.ai.*}/{@code ws.upload.*} pelos nomes do yml. */
class Bloco5ContextTest {
    static final List<AiInferenceLog> TRAIL = new ArrayList<>();

    @Configuration
    @EnableConfigurationProperties({AiControlProperties.class, MediaUploadProperties.class})
    static class Ports {
        @Bean
        AiInferenceLogPort trail() {
            return TRAIL::add;
        }

        @Bean
        UserRepositoryPort users() {
            return mock(UserRepositoryPort.class);
        }
    }

    final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Ports.class, ClockConfig.class,
            InMemoryAiBudgetCounter.class, AiBudget.class, AiGateway.class, MediaUploadInspector.class, ResourceAuthorizer.class);

    @Test
    void sobeSemMotoresELeOsLimitesConfigurados() {
        runner.withPropertyValues("ws.ai.remote-enabled=true", "ws.ai.budget.user-daily-requests=1", "ws.upload.max-image-pixels=100",
                "ws.upload.max-bytes.DOCUMENT=10").run(ctx -> {
                    assertThat(ctx).hasNotFailed().hasSingleBean(AiGateway.class).hasSingleBean(ResourceAuthorizer.class);
                    AiControlProperties ai = ctx.getBean(AiControlProperties.class);
                    assertThat(ai.remoteEnabled()).isTrue();
                    assertThat(ai.budget().userDailyRequests()).isEqualTo(1);
                    assertThat(ai.budget().companyDailyRequests()).as("padrão quando ausente").isEqualTo(5_000);
                    MediaUploadProperties up = ctx.getBean(MediaUploadProperties.class);
                    assertThat(up.maxImagePixels()).isEqualTo(100);
                    assertThat(up.maxBytesFor(DetectedType.PDF)).isEqualTo(10);
                    AiGateway g = ctx.getBean(AiGateway.class);
                    AiGateway.AiRequest req = new AiGateway.AiRequest(UUID.randomUUID(), null, null, AiCapability.INSIGHT, "RF43",
                            AccessClassification.SIGILOSO, "x", 10, null, null);
                    assertThat(catchThrowableOfType(ApiException.class, () -> g.infer(req)).code()).isEqualTo(AiGateway.CONTEUDO_RESTRITO);
                });
    }
}

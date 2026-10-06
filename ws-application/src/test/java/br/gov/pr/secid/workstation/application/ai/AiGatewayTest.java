package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.ia.AiCapability;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import br.gov.pr.secid.workstation.domain.ia.AiProvider;
import br.gov.pr.secid.workstation.domain.ia.InferenceResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** D-68/D-69 (RF43.CA02): SIGILOSO/RESTRITO nunca chegam à porta remota, mascaramento antes do remoto, orçamento → 429, trilha sem prompt. */
class AiGatewayTest {
    static final String PII = "Contato: maria.silva@exemplo.gov.br, CPF 123.456.789-09, CNPJ 12.345.678/0001-95, tel (41) 99999-1234.";
    final List<AiInferenceLog> trail = new ArrayList<>();
    final Clock clock = Clock.systemUTC();
    final AiEnginePort remote = mock(AiEnginePort.class);
    final AiEnginePort local = mock(AiEnginePort.class);
    final UUID user = UUID.randomUUID();
    final UUID company = UUID.randomUUID();

    {
        when(remote.provider()).thenReturn(AiProvider.CLAUDE);
        when(remote.remote()).thenReturn(true);
        when(remote.complete(anyString(), anyInt())).thenReturn(new AiEnginePort.Completion("ok remoto", "claude-x", 40, 10));
        when(local.provider()).thenReturn(AiProvider.LOCAL);
        when(local.remote()).thenReturn(false);
        when(local.complete(anyString(), anyInt())).thenReturn(new AiEnginePort.Completion("ok local", "local-1", null, null));
    }

    AiGateway gateway(boolean remoteEnabled, List<AiEnginePort> engines, AiControlProperties.Budget budget) {
        AiControlProperties props = new AiControlProperties(remoteEnabled, budget);
        return new AiGateway(props, engines, new AiBudget(new InMemoryAiBudgetCounter(clock), props, clock), trail::add, clock);
    }

    AiGateway gateway(boolean remoteEnabled, List<AiEnginePort> engines) {
        return gateway(remoteEnabled, engines, AiControlProperties.Budget.defaults());
    }

    AiGateway.AiRequest req(AccessClassification cls, String prompt) {
        return new AiGateway.AiRequest(user, company, null, AiCapability.RESUMO_ANALITICO, "RF43", cls, prompt, 100, null, "corr-1");
    }

    @ParameterizedTest
    @EnumSource(value = AccessClassification.class, names = {"RESTRITO", "SIGILOSO"})
    void conteudoRestritoOuSigilosoNuncaChegaAoProvedorRemoto(AccessClassification cls) {
        AiGateway.AiResult r = gateway(true, List.of(remote, local)).infer(req(cls, "parecer " + cls + " " + PII));
        verify(remote, never()).complete(anyString(), anyInt());
        assertThat(r.provider()).isEqualTo(AiProvider.LOCAL);
        assertThat(r.fallbackUsed()).as("o remoto seria usado, a classificação desviou").isTrue();
        assertThat(trail).singleElement().satisfies(l -> {
            assertThat(l.provider()).isEqualTo(AiProvider.LOCAL);
            assertThat(l.inputSummaryJson()).contains("LOCAL_CLASSIFICACAO").contains(cls.name());
        });
    }

    @Test
    void semMotorLocalOConteudoSigilosoERecusadoERegistradoComoBloqueado() {
        ApiException e = catchThrowableOfType(ApiException.class, () -> gateway(true, List.of(remote)).infer(req(AccessClassification.SIGILOSO, PII)));
        verify(remote, never()).complete(anyString(), anyInt());
        assertThat(e.status()).isEqualTo(422);
        assertThat(e.code()).isEqualTo(AiGateway.CONTEUDO_RESTRITO);
        assertThat(trail).singleElement().satisfies(l -> assertThat(l.result()).isEqualTo(InferenceResult.BLOQUEADO_SIGILO));
        // classificação ausente = RESTRITO (falha fechada)
        assertThat(catchThrowableOfType(ApiException.class, () -> gateway(true, List.of(remote)).infer(req(null, "x"))).code())
                .isEqualTo(AiGateway.CONTEUDO_RESTRITO);
        verify(remote, never()).complete(anyString(), anyInt());
    }

    @Test
    void remotoRecebeTextoMascaradoETrilhaNaoGuardaOPrompt() {
        AiGateway.AiResult r = gateway(true, List.of(remote, local)).infer(req(AccessClassification.INTERNO, PII));
        verify(remote).complete(org.mockito.ArgumentMatchers.argThat(s -> !s.contains("maria.silva") && !s.contains("123.456.789-09")
                && !s.contains("12.345.678/0001-95") && !s.contains("99999-1234") && s.contains("[EMAIL]") && s.contains("[CPF]")
                && s.contains("[CNPJ]") && s.contains("[TELEFONE]")), anyInt());
        assertThat(r.provider()).isEqualTo(AiProvider.CLAUDE);
        assertThat(r.masked()).containsEntry("EMAIL", 1).containsEntry("CPF", 1).containsEntry("CNPJ", 1).containsEntry("TELEFONE", 1);
        AiInferenceLog l = trail.get(0);
        assertThat(l.maskedFieldsJson()).isEqualTo("{\"EMAIL\":1,\"CNPJ\":1,\"CPF\":1,\"TELEFONE\":1}");
        assertThat(l.inputSummaryJson()).doesNotContain("maria").doesNotContain("123.456").contains("\"route\":\"REMOTE\"");
        assertThat(l.outputSummary()).isNull();
        assertThat(l.inputTokens()).isEqualTo(40);
        assertThat(l.correlationId()).isEqualTo("corr-1");
        assertThat(l.userId()).isEqualTo(user);
    }

    @Test
    void flagDesligadaNuncaUsaRemotoMesmoComConteudoPublico() {
        AiGateway.AiResult r = gateway(false, List.of(remote, local)).infer(req(AccessClassification.PUBLICO, "texto"));
        verify(remote, never()).complete(anyString(), anyInt());
        assertThat(r.provider()).isEqualTo(AiProvider.LOCAL);
        assertThat(r.fallbackUsed()).isFalse();
        assertThat(catchThrowableOfType(ApiException.class, () -> gateway(false, List.of()).infer(req(AccessClassification.PUBLICO, "x"))).status())
                .isEqualTo(503);
    }

    @Test
    void falhaDoRemotoCaiNoLocalOuResponde503() {
        when(remote.complete(anyString(), anyInt())).thenThrow(new IllegalStateException("timeout"));
        AiGateway.AiResult r = gateway(true, List.of(remote, local)).infer(req(AccessClassification.INTERNO, "x"));
        assertThat(r.provider()).isEqualTo(AiProvider.LOCAL);
        assertThat(trail.get(0).result()).isEqualTo(InferenceResult.FALLBACK);
        trail.clear();
        ApiException e = catchThrowableOfType(ApiException.class, () -> gateway(true, List.of(remote)).infer(req(AccessClassification.INTERNO, "x")));
        assertThat(e.status()).isEqualTo(503);
        assertThat(e.code()).isEqualTo(AiGateway.INDISPONIVEL);
        assertThat(trail.get(0).result()).isEqualTo(InferenceResult.ERRO);
    }

    @Test
    void orcamentoEstouradoResponde429ComMotivoEENaoChamaOProvedor() {
        AiGateway g = gateway(true, List.of(remote, local), new AiControlProperties.Budget(2, 1_000_000, 100, 10_000_000, "UTC"));
        g.infer(req(AccessClassification.INTERNO, "a"));
        g.infer(req(AccessClassification.INTERNO, "b"));
        ApiException e = catchThrowableOfType(ApiException.class, () -> g.infer(req(AccessClassification.INTERNO, "c")));
        assertThat(e.status()).isEqualTo(429);
        assertThat(e.code()).isEqualTo(AiBudget.ESGOTADO);
        assertThat(e.details()).containsEntry("scope", "USER").containsEntry("metric", "REQUESTS").containsKey("retryAfterSeconds");
        verify(remote, org.mockito.Mockito.times(2)).complete(anyString(), anyInt());
        assertThat(trail).hasSize(2);
    }

    @Test
    void recusaPorClassificacaoDevolveOOrcamento() {
        AiGateway g = gateway(true, List.of(remote), new AiControlProperties.Budget(1, 1_000_000, 100, 10_000_000, "UTC"));
        catchThrowableOfType(ApiException.class, () -> g.infer(req(AccessClassification.SIGILOSO, "a")));
        assertThat(g.infer(req(AccessClassification.INTERNO, "b")).provider()).as("a recusa não gastou a única requisição do dia")
                .isEqualTo(AiProvider.CLAUDE);
    }

    @Test
    void estimativaDeTokensEDefaultsDoPedido() {
        AiGateway.AiRequest r = new AiGateway.AiRequest(null, null, null, AiCapability.INSIGHT, null, AccessClassification.PUBLICO, null, 0, null, null);
        assertThat(r.prompt()).isEmpty();
        assertThat(r.maxOutputTokens()).isEqualTo(1024);
        assertThat(AiGateway.estimateTokens(req(AccessClassification.PUBLICO, "12345678"))).isEqualTo(2 + 100);
        AiGateway g = new AiGateway(null, (List<AiEnginePort>) null, new AiBudget(new InMemoryAiBudgetCounter(clock), null, clock), trail::add, clock);
        assertThat(catchThrowableOfType(ApiException.class, () -> g.infer(r)).status()).isEqualTo(503);
    }
}

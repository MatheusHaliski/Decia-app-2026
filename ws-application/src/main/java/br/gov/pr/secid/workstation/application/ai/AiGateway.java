package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.AiMode;
import br.gov.pr.secid.workstation.domain.ia.AiCapability;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import br.gov.pr.secid.workstation.domain.ia.AiProvider;
import br.gov.pr.secid.workstation.domain.ia.InferenceResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Porta única de inferência (RF43, D-68/D-69). Toda chamada de IA de qualquer RF passa por aqui, nesta ordem:
 * <ol>
 *   <li><b>Orçamento</b> ({@link AiBudget}): pessoa e empresa, requisições e tokens; estourou → {@code 429 IA_ORCAMENTO_ESGOTADO}.</li>
 *   <li><b>Classificação</b>: provedor externo só com {@code ws.ai.remote-enabled=true} E {@link AccessClassification#allowsExternalAi()}
 *       (PUBLICO/INTERNO). RESTRITO/SIGILOSO (ou classificação ausente — falha fechada) vão para o motor LOCAL; sem motor local, a chamada
 *       é recusada com {@code 422 IA_CONTEUDO_RESTRITO} e registrada como {@code BLOQUEADO_SIGILO}. A porta remota NUNCA recebe esse conteúdo.</li>
 *   <li><b>Mascaramento</b> ({@link PersonalDataMasker}) do texto antes de qualquer chamada remota.</li>
 *   <li><b>Trilha</b> ({@link AiInferenceLogPort}): uma linha por chamada com {@code masked_fields_json}, rota e tamanho — nunca o prompt
 *       nem a resposta brutos. Falha do remoto com motor local disponível → FALLBACK; sem local → {@code 503 IA_INDISPONIVEL}.</li>
 * </ol>
 */
@Service
public class AiGateway {
    public static final String CONTEUDO_RESTRITO = "IA_CONTEUDO_RESTRITO";
    public static final String INDISPONIVEL = "IA_INDISPONIVEL";
    private static final Logger log = LoggerFactory.getLogger(AiGateway.class);

    private final AiControlProperties props;
    private final List<AiEnginePort> engines;
    private final AiBudget budget;
    private final AiInferenceLogPort trail;
    private final Clock clock;

    /** Spring: motores opcionais (nenhum registrado = sem IA; os remotos chegam com o módulo ai-providers). */
    @Autowired
    public AiGateway(AiControlProperties props, ObjectProvider<AiEnginePort> engines, AiBudget budget, AiInferenceLogPort trail, Clock clock) {
        this(props, engines.orderedStream().toList(), budget, trail, clock);
    }

    public AiGateway(AiControlProperties props, List<AiEnginePort> engines, AiBudget budget, AiInferenceLogPort trail, Clock clock) {
        this.props = props == null ? AiControlProperties.defaults(false) : props;
        this.engines = engines == null ? List.of() : List.copyOf(engines);
        this.budget = budget;
        this.trail = trail;
        this.clock = clock;
    }

    /** Pedido de inferência: quem, de onde, a classificação do conteúdo e o texto (que nunca vai para log). */
    public record AiRequest(UUID userId, UUID companyId, UUID departmentId, AiCapability capability, String hostRf,
                            AccessClassification classification, String prompt, int maxOutputTokens, AiMode mode, String correlationId) {
        public AiRequest {
            prompt = prompt == null ? "" : prompt;
            maxOutputTokens = maxOutputTokens > 0 ? maxOutputTokens : 1024;
            mode = mode == null ? AiMode.ECONOMIA : mode;
        }

        /** Classificação ausente = tratada como RESTRITO (falha fechada). */
        public AccessClassification effectiveClassification() {
            return classification == null ? AccessClassification.RESTRITO : classification;
        }
    }

    /** Resposta ao RF: texto, quem respondeu, se houve fallback e o que foi mascarado (contagem). */
    public record AiResult(UUID inferenceId, String text, AiProvider provider, String model, boolean fallbackUsed, Map<String, Integer> masked) {
    }

    public AiResult infer(AiRequest req) {
        AccessClassification cls = req.effectiveClassification();
        AiBudget.Reservation reservation = budget.reserve(req.userId(), req.companyId(), estimateTokens(req));
        Optional<AiEnginePort> remote = props.remoteEnabled() && cls.allowsExternalAi()
                ? engines.stream().filter(AiEnginePort::remote).findFirst() : Optional.empty();
        Optional<AiEnginePort> local = engines.stream().filter(e -> !e.remote()).findFirst();
        boolean wantedRemote = props.remoteEnabled() && !cls.allowsExternalAi();

        if (remote.isPresent()) {
            PersonalDataMasker.Masked masked = PersonalDataMasker.mask(req.prompt());
            long start = clock.millis();
            try {
                AiEnginePort engine = remote.get();
                if (!cls.allowsExternalAi()) {
                    throw new IllegalStateException("classificação não permite IA externa");     // invariante: nunca chega aqui
                }
                AiEnginePort.Completion out = engine.complete(masked.text(), req.maxOutputTokens());
                return finish(req, reservation, engine.provider(), out, InferenceResult.OK, false, masked, "REMOTE", start);
            } catch (RuntimeException e) {
                log.warn("Provedor de IA remoto falhou (capability={}, correlationId={}): {}", req.capability(), req.correlationId(),
                        e.getClass().getSimpleName());
                if (local.isEmpty()) {
                    append(req, remote.get().provider(), null, null, InferenceResult.ERRO, false, masked, "REMOTE",
                            (int) (clock.millis() - start));
                    budget.refund(reservation);
                    throw ApiException.unavailable(INDISPONIVEL, "A IA está indisponível no momento. Tente novamente mais tarde.");
                }
                return runLocal(req, reservation, local.get(), InferenceResult.FALLBACK, true, masked, "LOCAL_FALLBACK");
            }
        }
        PersonalDataMasker.Masked none = new PersonalDataMasker.Masked(req.prompt(), Map.of());
        if (local.isPresent()) {
            return runLocal(req, reservation, local.get(), InferenceResult.OK, wantedRemote, none, wantedRemote ? "LOCAL_CLASSIFICACAO" : "LOCAL");
        }
        budget.refund(reservation);
        if (!cls.allowsExternalAi()) {
            append(req, AiProvider.LOCAL, null, null, InferenceResult.BLOQUEADO_SIGILO, false, none, "RECUSADO", 0);
            throw ApiException.unprocessable(CONTEUDO_RESTRITO, "Conteúdo " + cls.name() + " não pode ser enviado a IA externa e não há motor local.",
                    Map.of("classification", cls.name()));
        }
        // nenhum motor elegível (remoto desligado e sem motor local): também fica na trilha (Codex P2, PR #34)
        append(req, AiProvider.LOCAL, null, null, InferenceResult.ERRO, false, none, "SEM_MOTOR", 0);
        throw ApiException.unavailable(INDISPONIVEL, "A IA está indisponível no momento. Tente novamente mais tarde.");
    }

    /**
     * Chamada ao motor local (direta ou fallback). Falha do motor local vira {@code 503 IA_INDISPONIVEL} controlado, com linha ERRO na
     * trilha e estorno da reserva do orçamento — nunca um 500 que consome a cota (Codex P1, PR #34).
     */
    private AiResult runLocal(AiRequest req, AiBudget.Reservation reservation, AiEnginePort engine, InferenceResult result, boolean fallback,
                              PersonalDataMasker.Masked masked, String route) {
        long start = clock.millis();
        AiEnginePort.Completion out;
        try {
            out = engine.complete(req.prompt(), req.maxOutputTokens());
        } catch (RuntimeException e) {
            log.warn("Motor de IA local falhou (capability={}, route={}, correlationId={}): {}", req.capability(), route, req.correlationId(),
                    e.getClass().getSimpleName());
            append(req, AiProvider.LOCAL, null, null, InferenceResult.ERRO, fallback, masked, route, (int) Math.max(0, clock.millis() - start));
            budget.refund(reservation);
            throw ApiException.unavailable(INDISPONIVEL, "A IA está indisponível no momento. Tente novamente mais tarde.");
        }
        return finish(req, reservation, AiProvider.LOCAL, out, result, fallback, masked, route, start);
    }

    private AiResult finish(AiRequest req, AiBudget.Reservation reservation, AiProvider provider, AiEnginePort.Completion out, InferenceResult result,
                            boolean fallback, PersonalDataMasker.Masked masked, String route, long start) {
        int latency = (int) Math.max(0, clock.millis() - start);
        UUID id = append(req, provider, out.model(), out, result, fallback, masked, route, latency);
        long actual = (out.inputTokens() == null ? 0 : out.inputTokens()) + (out.outputTokens() == null ? 0 : out.outputTokens());
        if (actual > 0) {
            budget.settle(reservation, actual);
        }
        return new AiResult(id, out.text(), provider, out.model(), fallback, masked.counts());
    }

    private UUID append(AiRequest req, AiProvider provider, String model, AiEnginePort.Completion out, InferenceResult result, boolean fallback,
                        PersonalDataMasker.Masked masked, String route, int latencyMs) {
        UUID id = UUID.randomUUID();
        String summary = "{\"chars\":" + req.prompt().length() + ",\"classification\":\"" + req.effectiveClassification().name()
                + "\",\"route\":\"" + route + "\"}";
        trail.append(new AiInferenceLog(id, req.userId(), req.departmentId(), req.capability(), req.hostRf(), provider, model, req.mode(),
                latencyMs, out == null ? null : out.inputTokens(), out == null ? null : out.outputTokens(), null, result, fallback,
                masked.counts().isEmpty() ? null : masked.countsJson(), summary, null, null, null, null, null, req.correlationId()));
        return id;
    }

    /** Estimativa conservadora: ~4 caracteres por token na entrada + teto de saída. */
    static long estimateTokens(AiRequest req) {
        return (req.prompt().length() + 3L) / 4L + req.maxOutputTokens();
    }
}

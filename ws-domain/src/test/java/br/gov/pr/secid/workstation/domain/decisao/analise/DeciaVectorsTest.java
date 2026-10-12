package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.common.MiniJson;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRules;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato compartilhado Java × TypeScript (03_MODELO_FUNCIONAL §6): carrega {@code contracts/decia/vetores.json} (gerado pelo oráculo
 * {@code contracts/decia/gerar_vetores.py}) e confere TODOS os vetores de TODAS as seções contra a implementação de {@code decisao.analise}.
 * Números comparados por igualdade exata de {@code double} (a implementação segue a ordem de operações do oráculo). Uma seção nova no arquivo
 * sem teste aqui falha em {@link #todaSecaoDoArquivoTemTeste()}.
 */
class DeciaVectorsTest {

    private static final Map<String, Object> VECTORS = load();

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        while (dir != null && !Files.isDirectory(dir.resolve("contracts").resolve("decia"))) {
            dir = dir.getParent();
        }
        if (dir == null) {
            throw new IllegalStateException("contracts/decia/vetores.json não encontrado subindo a partir de user.dir");
        }
        try {
            return (Map<String, Object>) MiniJson.parse(Files.readString(dir.resolve("contracts/decia/vetores.json"), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static Stream<Arguments> section(String name) {
        List<Object> cases = (List<Object>) VECTORS.get(name);
        assertThat(cases).as("seção " + name).isNotEmpty();
        List<Arguments> out = new ArrayList<>();
        for (int i = 0; i < cases.size(); i++) {
            Map<String, Object> c = (Map<String, Object>) cases.get(i);
            out.add(Arguments.of(c.getOrDefault("name", name + "#" + i), c));
        }
        return out.stream();
    }

    static Stream<Arguments> scoring() {
        return section("scoring");
    }

    static Stream<Arguments> divergence() {
        return section("divergence");
    }

    static Stream<Arguments> dominance() {
        return section("dominance");
    }

    static Stream<Arguments> sensitivity() {
        return section("sensitivity");
    }

    static Stream<Arguments> evidenceStrength() {
        return section("evidenceStrength");
    }

    static Stream<Arguments> riskSeverityMatrix() {
        return section("riskSeverityMatrix");
    }

    static Stream<Arguments> decisionRisk() {
        return section("decisionRisk");
    }

    static Stream<Arguments> confidenceBand() {
        return section("confidenceBand");
    }

    static Stream<Arguments> brier() {
        return section("brier");
    }

    static Stream<Arguments> snapshotHash() {
        return section("snapshotHash");
    }

    @Test
    void todaSecaoDoArquivoTemTeste() {
        assertThat(VECTORS.keySet()).containsExactlyInAnyOrder("version", "scoring", "divergence", "dominance", "sensitivity", "evidenceStrength",
                "riskSeverityMatrix", "decisionRisk", "confidenceBand", "brier", "snapshotHash");
        assertThat(VECTORS.get("version")).isEqualTo(DecisionRules.SCORING_MODEL_VERSION);
    }

    // ------------------------------------------------------------------------------------------------------------- matriz

    @ParameterizedTest(name = "{0}")
    @MethodSource("scoring")
    void pontuacaoPonderada(String name, Map<String, Object> c) {
        WeightedScoring.Result r = WeightedScoring.score(matrix(map(c.get("input"))));
        Map<String, Object> e = map(c.get("expected"));
        assertThat(r.valid()).isEqualTo(e.get("valid"));
        assertThat(r.reason()).isEqualTo(e.get("reason"));
        assertThat(r.weightSum()).isEqualTo(dbl(e.get("weightSum")));
        assertThat(r.leader()).isEqualTo(e.get("leader"));
        assertThat(r.incomplete()).isEqualTo(e.get("incomplete"));
        List<Object> ranking = list(e.get("ranking"));
        assertThat(r.ranking()).hasSameSizeAs(ranking);
        for (int i = 0; i < ranking.size(); i++) {
            Map<String, Object> x = map(ranking.get(i));
            WeightedScoring.Ranked got = r.ranking().get(i);
            assertThat(got.alt()).isEqualTo(x.get("alt"));
            assertThat(got.score()).as(name + " score " + got.alt()).isEqualTo(dbl(x.get("score")));
            Map<String, Object> contrib = map(x.get("contributions"));
            assertThat(got.contributions().keySet()).containsExactlyElementsOf(contrib.keySet());
            contrib.forEach((k, v) -> assertThat(got.contributions().get(k)).as(name + " contribuição " + got.alt() + "." + k).isEqualTo(dbl(v)));
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("divergence")
    void divergenciaEntreAvaliadores(String name, Map<String, Object> c) {
        List<DivergenceAnalysis.Cell> got = DivergenceAnalysis.analyze(matrix(map(c.get("input"))));
        List<Object> exp = list(c.get("expected"));
        assertThat(got).hasSameSizeAs(exp);
        for (int i = 0; i < exp.size(); i++) {
            Map<String, Object> x = map(exp.get(i));
            assertThat(got.get(i)).isEqualTo(new DivergenceAnalysis.Cell(str(x.get("alt")), str(x.get("crit")), integer(x.get("range")),
                    DivergenceAnalysis.Level.valueOf(str(x.get("level")))));
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("dominance")
    void dominanciaDePareto(String name, Map<String, Object> c) {
        List<DominanceAnalysis.Dominance> got = DominanceAnalysis.analyze(matrix(map(c.get("input"))));
        List<Object> exp = list(c.get("expected"));
        assertThat(got).hasSameSizeAs(exp);
        for (int i = 0; i < exp.size(); i++) {
            Map<String, Object> x = map(exp.get(i));
            assertThat(got.get(i)).isEqualTo(new DominanceAnalysis.Dominance(str(x.get("dominant")), str(x.get("dominated")),
                    list(x.get("betterOn")).stream().map(String.class::cast).toList()));
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("sensitivity")
    void sensibilidadeDosPesos(String name, Map<String, Object> c) {
        SensitivityAnalysis.Result got = SensitivityAnalysis.analyze(matrix(map(c.get("input"))));
        Map<String, Object> e = map(c.get("expected"));
        assertThat(got.applicable()).isEqualTo(e.get("applicable"));
        assertThat(got.robust()).isEqualTo(e.get("robust"));
        assertThat(got.sensitive()).isEqualTo(e.get("sensitive"));
        List<Object> flips = list(e.get("flips"));
        assertThat(got.flips()).hasSameSizeAs(flips);
        for (int i = 0; i < flips.size(); i++) {
            Map<String, Object> x = map(flips.get(i));
            assertThat(got.flips().get(i)).as(name + " inversão " + i).isEqualTo(new SensitivityAnalysis.Flip(str(x.get("criterion")),
                    dbl(x.get("fromPct")), dbl(x.get("toPct")), dbl(x.get("delta")), str(x.get("newLeader"))));
        }
    }

    // ------------------------------------------------------------------------------------------------- evidência e risco

    @ParameterizedTest(name = "{0}")
    @MethodSource("evidenceStrength")
    void forcaDaEvidencia(String name, Map<String, Object> c) {
        Map<String, Object> in = map(c.get("input"));
        List<EvidenceStrength.Item> items = new ArrayList<>();
        for (Object o : list(in.get("evidence"))) {
            Map<String, Object> ev = map(o);
            List<EvidenceStrength.Link> links = list(ev.get("links")).stream().map(DeciaVectorsTest::map)
                    .map(l -> new EvidenceStrength.Link(str(l.get("alt")), EvidenceStance.valueOf(str(l.get("stance"))))).toList();
            items.add(new EvidenceStrength.Item(EvidenceNature.valueOf(str(ev.get("nature"))), RelevanceLevel.valueOf(str(ev.get("reliability"))),
                    str(ev.get("source")), Boolean.TRUE.equals(ev.get("superseded")), links));
        }
        EvidenceStrength.Result got = EvidenceStrength.of(str(in.get("alt")), items);
        Map<String, Object> e = map(c.get("expected"));
        assertThat(got.level().name()).isEqualTo(e.get("level"));
        assertThat(got.support()).isEqualTo(dbl(e.get("support")));
        assertThat(got.contra()).isEqualTo(dbl(e.get("contra")));
        assertThat(got.reason()).isEqualTo(e.get("reason"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("riskSeverityMatrix")
    void matrizDeSeveridade(String name, Map<String, Object> c) {
        assertThat(RiskSeverity.of(Likelihood.valueOf(str(c.get("likelihood"))), DecisionLevel.valueOf(str(c.get("impact")))).name())
                .as(c.get("likelihood") + " × " + c.get("impact")).isEqualTo(c.get("expected"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("decisionRisk")
    void riscoDaDecisao(String name, Map<String, Object> c) {
        Map<String, Object> in = map(c.get("input"));
        List<RiskSeverity.Risk> risks = list(in.get("risks")).stream().map(DeciaVectorsTest::map)
                .map(r -> new RiskSeverity.Risk(Likelihood.valueOf(str(r.get("likelihood"))), DecisionLevel.valueOf(str(r.get("impact"))),
                        RiskStatus.valueOf(str(r.get("status"))), (String) r.get("alt"))).toList();
        List<RiskSeverity.Assumption> assumptions = list(in.getOrDefault("assumptions", List.of())).stream().map(DeciaVectorsTest::map)
                .map(a -> new RiskSeverity.Assumption(DecisionLevel.valueOf(str(a.get("importance"))), AssumptionStatus.valueOf(str(a.get("status")))))
                .toList();
        Optional<DecisionLevel> got = RiskSeverity.decisionRisk(str(in.get("alt")), risks, assumptions);
        assertThat(got.map(Enum::name).orElse("NAO_AVALIADO")).isEqualTo(c.get("expected"));
    }

    // --------------------------------------------------------------------------------------------- confiança e previsão

    @ParameterizedTest(name = "{0}")
    @MethodSource("confidenceBand")
    void faixaDeConfianca(String name, Map<String, Object> c) {
        assertThat(ConfidenceBand.of(integer(c.get("pct"))).name()).isEqualTo(c.get("expected"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("brier")
    void brierDasPrevisoes(String name, Map<String, Object> c) {
        List<Calibration.Forecast> forecasts = list(c.get("input")).stream().map(DeciaVectorsTest::map)
                .map(f -> new Calibration.Forecast(integer(f.get("probabilityPct")), ForecastResolution.valueOf(str(f.get("resolution"))))).toList();
        Calibration.BrierResult got = Calibration.brier(forecasts);
        Map<String, Object> e = map(c.get("expected"));
        assertThat(got.n()).isEqualTo(integer(e.get("n")));
        assertThat(got.brier()).isEqualTo(dbl(e.get("brier")));
    }

    // --------------------------------------------------------------------------------------------------------- snapshot

    @ParameterizedTest(name = "{0}")
    @MethodSource("snapshotHash")
    void hashDoSnapshotByteAByte(String name, Map<String, Object> c) {
        String canonical = SnapshotCanonicalizer.canonical(c.get("input"));
        assertThat(canonical).isEqualTo(c.get("canonical"));
        assertThat(SnapshotCanonicalizer.sha256(canonical)).isEqualTo(c.get("sha256"));
    }

    // ---------------------------------------------------------------------------------------------------------- helpers

    private static MatrixInput matrix(Map<String, Object> in) {
        List<MatrixInput.Criterion> criteria = list(in.get("criteria")).stream().map(DeciaVectorsTest::map)
                .map(x -> new MatrixInput.Criterion(str(x.get("key")), dbl(x.get("weightPct")))).toList();
        List<MatrixInput.Alternative> alternatives = list(in.get("alternatives")).stream().map(DeciaVectorsTest::map)
                .map(x -> new MatrixInput.Alternative(str(x.get("key")), "ATIVA".equals(x.getOrDefault("status", "ATIVA")))).toList();
        List<MatrixInput.Assessment> assessments = list(in.get("assessments")).stream().map(DeciaVectorsTest::map)
                .map(x -> new MatrixInput.Assessment(str(x.get("alt")), str(x.get("crit")), integer(x.get("score")), str(x.get("by")))).toList();
        return new MatrixInput(Boolean.TRUE.equals(in.get("weightingEnabled")), criteria, alternatives, assessments);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object o) {
        return (Map<String, Object>) o;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> list(Object o) {
        return (List<Object>) o;
    }

    private static String str(Object o) {
        return (String) o;
    }

    private static int integer(Object o) {
        return ((BigDecimal) o).intValueExact();
    }

    private static Double dbl(Object o) {
        return o == null ? null : ((BigDecimal) o).doubleValue();
    }
}

package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Força da evidência da alternativa selecionada ou líder (§6.5; limiares DESIGN PROPOSAL). Peso de confiabilidade ALTA 3 · MEDIA 2 · BAIXA 1,
 * OPINIAO vale metade, evidência substituída não conta. FORTE: apoio ≥ 6, ≥ 2 fontes distintas entre as que sustentam e contra &lt; apoio/2;
 * MODERADA: apoio ≥ 3 e contra &lt; apoio; resto FRACA — sem apoio nem contra, FRACA com motivo {@code SEM_EVIDENCIA}. Indicador separado da
 * confiança humana e da pontuação do modelo (G10).
 */
public final class EvidenceStrength {

    public static final String SEM_EVIDENCIA = "SEM_EVIDENCIA";

    private EvidenceStrength() {
    }

    public enum Level { FRACA, MODERADA, FORTE }

    /** Ligação já resolvida para uma alternativa (link direto ou via avaliação dela). */
    public record Link(String alt, EvidenceStance stance) {
    }

    /** Evidência com as ligações relevantes; {@code source} identifica a fonte para contar independência. */
    public record Item(EvidenceNature nature, RelevanceLevel reliability, String source, boolean superseded, List<Link> links) {
        public Item {
            links = List.copyOf(links);
        }
    }

    public record Result(Level level, double support, double contra, String reason) {
        /** Força ≥ MODERADA (item de prontidão §6.7). */
        public boolean atLeastModerate() {
            return level != Level.FRACA;
        }
    }

    public static Result of(String alt, List<Item> evidence) {
        double sup = 0;
        double con = 0;
        Set<String> sources = new HashSet<>();
        for (Item e : evidence) {
            if (e.superseded()) {
                continue;
            }
            for (Link link : e.links()) {
                if (!Objects.equals(link.alt(), alt)) {
                    continue;
                }
                double wgt = e.reliability().weight() * (e.nature() == EvidenceNature.OPINIAO ? 0.5 : 1);
                if (link.stance() == EvidenceStance.SUSTENTA) {
                    sup += wgt;
                    sources.add(e.source());
                } else if (link.stance() == EvidenceStance.CONTRADIZ) {
                    con += wgt;
                }
            }
        }
        if (sup == 0 && con == 0) {
            return new Result(Level.FRACA, 0, 0, SEM_EVIDENCIA);
        }
        Level lvl;
        if (sup >= 6 && sources.size() >= 2 && con < sup / 2) {
            lvl = Level.FORTE;
        } else if (sup >= 3 && con < sup) {
            lvl = Level.MODERADA;
        } else {
            lvl = Level.FRACA;
        }
        return new Result(lvl, sup, con, null);
    }
}

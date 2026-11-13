import { afterEach, describe, expect, it } from "vitest";
import { buildDemoProject } from "../fixtures";
import { discardProposalDraft, listProposalDrafts, loadProposalDraft, PROPOSAL_DRAFT_TTL_MS, proposalDraftHref, saveProposalDraft } from "./drafts";
import { EXAMPLE_OFICIO } from "./examples";
import { extractDemand } from "./extract";
import { proposeScheme } from "./proposal";
import { summarizeProject } from "./overview";

const NOW = new Date("2026-11-12T12:00:00");
const facts = extractDemand(EXAMPLE_OFICIO, { now: NOW });
const proposal = proposeScheme(facts, { now: NOW, sourceLabel: "Ofício nº 123/2026", sourceKind: "COLAR" });

describe("rascunho do Autopiloto (nada persistido até salvar)", () => {
  afterEach(() => listProposalDrafts(0).forEach((d) => discardProposalDraft(d.id)));

  it("guarda, lê, atualiza no mesmo id, lista e descarta; endereço da Mesa em modo rascunho", () => {
    const t0 = NOW.getTime();
    const id = saveProposalDraft({ proposal, facts }, { now: t0 });
    expect(id).toMatch(/^[a-z0-9]{12}$/);
    expect(loadProposalDraft(id, t0 + 1000)).toMatchObject({ id, createdAt: t0, updatedAt: t0, proposal: { title: proposal.title } });
    const again = saveProposalDraft({ proposal: { ...proposal, title: "Outro título" } }, { id, now: t0 + 5000 });
    expect(again).toBe(id);
    const d = loadProposalDraft(id, t0 + 6000)!;
    expect(d).toMatchObject({ createdAt: t0, updatedAt: t0 + 5000, proposal: { title: "Outro título" } });
    expect(d.facts?.text).toBe(facts.text); // a leitura da demanda continua junto
    expect(listProposalDrafts(t0 + 6000).map((x) => x.id)).toEqual([id]);
    expect(proposalDraftHref(id)).toBe(`/desk?draft=${id}`);
    discardProposalDraft(id);
    expect(loadProposalDraft(id, t0 + 7000)).toBeNull();
  });

  it("vence em 24 h (e some); id inválido ou conteúdo corrompido não abre nada", () => {
    const t0 = NOW.getTime();
    const id = saveProposalDraft({ proposal }, { now: t0 });
    expect(loadProposalDraft(id, t0 + PROPOSAL_DRAFT_TTL_MS + 1)).toBeNull();
    expect(listProposalDrafts(t0)).toEqual([]);
    expect(loadProposalDraft("../etc", t0)).toBeNull();
    expect(loadProposalDraft(null, t0)).toBeNull();
  });
});

describe("resumo do projeto para a Mesa e a visão geral", () => {
  it("projeto da aula: % concluído pela duração, próximo marco, término de 14 dias e IDC/IDP do valor agregado", () => {
    const s = summarizeProject(buildDemoProject(), "2026-11-12");
    expect(s.tasks).toEqual({ total: 7, done: 2 });
    expect(s.progress).toBe(Math.round((3 * 100 + 3 * 100 + 4 * 50 + 1 * 30) / (3 + 3 + 4 + 2 + 5 + 2 + 1)));
    expect(s.nextMilestone).toEqual({ title: "Entrega v1.0", date: "2026-11-16", source: "TAP" });
    expect(s.finish).toMatchObject({ days: 14, date: "2026-11-16", criticalCodes: ["T01", "T03", "T05", "T06", "T07"] });
    expect(s.cpi).toBeCloseTo(0.8939, 3);
    expect(s.spi).toBeCloseTo(0.5517, 3);
    expect(s.findings.critical).toBeGreaterThan(0);
    expect(s.openRisks).toBe(3);
  });
});

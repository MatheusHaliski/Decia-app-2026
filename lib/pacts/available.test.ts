import { describe, expect, it } from "vitest";
import { availability } from "./available";
import { DEMO_PACT_IDS, buildDemoPacts } from "./fixtures";
import { demoOrg } from "./org";

const NOW = new Date("2026-11-12T15:00:00Z");
const org = demoOrg();
const s = buildDemoPacts(NOW);
const pact = (id: string) => s.pacts.find((p) => p.id === id)!;
const P = DEMO_PACT_IDS;

describe("o que cada pessoa pode fazer agora (botões da tela)", () => {
  it("solicitante: aceitar a contraproposta, responder esclarecimento, cancelar; não recusa nem entrega", () => {
    const a = availability(org, pact(P.parecer), "u-pessoa");
    expect(a.accept).toEqual([{ proposalId: `${P.parecer}-r2`, as: "SOLICITANTE" }]);
    expect(a).toMatchObject({ refuse: false, cancel: true, deliver: false, ask: false });
    expect(a.propose).toEqual(["SOLICITANTE"]);
  });

  it("executor nomeado: só o aceite pessoal; chefia destinatária: exceção ao limite", () => {
    expect(availability(org, pact(P.parecer), "u-rita").accept).toEqual([{ proposalId: `${P.parecer}-r2`, as: "EXECUTOR" }]);
    const chefe = availability(org, pact(P.rampas), "u-chefe");
    expect(chefe.accept).toEqual([{ proposalId: `${P.rampas}-r1`, as: "DESTINATARIO" }]);
    expect(chefe).toMatchObject({ limitException: true, refuse: true, ask: true });
  });

  it("acompanhamento: entrega só do executor; validação, desbloqueio e reconhecimento só de quem pediu", () => {
    expect(availability(org, pact(P.planta), "u-bruno")).toMatchObject({ deliver: true, checkin: true, milestone: true, completeMilestone: [`${P.planta}-m2`] });
    expect(availability(org, pact(P.planta), "u-pessoa")).toMatchObject({ deliver: false, renegotiate: ["SOLICITANTE"], escalate: true });
    expect(availability(org, pact(P.painel), "u-chefe")).toMatchObject({ confirmUnblock: true, recognize: true, validate: false });
    expect(availability(org, pact(P.planilha), "u-pessoa")).toMatchObject({ escalate: false, resolve: [] });
    expect(availability(org, pact(P.planilha), "u-secretaria").resolve).toEqual([`${P.planilha}-x1`]);
    expect(availability(org, pact(P.vistoria), "u-pessoa")).toMatchObject({ cancel: false, remind: false, escalate: false });
    expect(availability(org, pact(P.planta), null).accept).toEqual([]);
  });
});

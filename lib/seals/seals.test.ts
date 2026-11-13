import { describe, expect, it, vi } from "vitest";
import { createMemoryLedger, DEFAULT_RULES } from "@/lib/points/ledger";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { createMemoryStoreRepository } from "@/lib/store/repository";
import { evaluatePolicy, sealOpen, suggestSeals } from "./criteria";
import { buildDemoSeals, CHEFE_ISSUER, DEMO_PLAN_ID, demoSealTargets, EMPRESA_ISSUER } from "./fixtures";
import { canCreateSeal, canRedeemBenefits, canSeeReviewQueue } from "./permissions";
import { createMemorySealsRepository, redemptionCode, type SealForm } from "./repository";
import type { SealActor, SealTarget } from "./types";

const NOW = new Date("2026-11-12T12:00:00Z");
const EMPRESA: SealActor = { id: EMPRESA_ISSUER.id, profile: "EMPRESA", name: EMPRESA_ISSUER.name, department: null };
const CHEFE: SealActor = { id: CHEFE_ISSUER.id, profile: "CHEFE", name: CHEFE_ISSUER.name, department: "CPOE" };
const CURADOR: SealActor = { id: "curadoria.exemplo", profile: "CURADOR", name: "Curadoria Exemplo", department: "CPOE" };
const PESSOA: SealActor = { id: "u-pessoa", profile: "EMPREGADO", name: "Pessoa Exemplo", department: "SECID-UTS" };
const ADMIN: SealActor = { id: "admin.exemplo", profile: "ADMIN", name: "Administração", department: "SECID-UTS" };

function setup(onApproved = vi.fn()) {
  const ledger = createMemoryLedger();
  const store = createMemoryStoreRepository({ ledger });
  const targets = demoSealTargets(({ type, id }) => (type === "PROJETO" && id === DEMO_PROJECT_ID ? 4 : 0));
  const repo = createMemorySealsRepository({ ledger, store, onApproved }, buildDemoSeals(NOW, targets));
  const target = (id: string) => targets.find((t) => t.id === id)!;
  return { ledger, store, repo, target, onApproved };
}

const FORM: SealForm = {
  name: "Ata exemplar", tier: "TAREFA", excellence: false, availableFrom: "2026-11-01", availableUntil: "2026-12-31", usageLimit: 10, mode: "AUTO",
  criteria: [{ criterion: "PRAZO_CUMPRIDO", threshold: null }, { criterion: "REACOES_MIN", threshold: 2 }],
  benefits: [{ type: "PONTOS_BONUS", totalQuota: null }, { type: "CREDITOS_IA", credits: 5, totalQuota: 20 }],
};

describe("critérios calculados pelo sistema e sugestão ✦ (RF39.CA03, CA04)", () => {
  it("os fatos vêm dos dados do projeto de exemplo; a política confere cada critério com o valor e o mínimo", () => {
    const { target } = setup();
    const project = target(DEMO_PROJECT_ID);
    expect(project.facts).toEqual({ conformityPct: 71, traceComplete: false, deadlineMet: true, reactions: 7, reuses: 4, decisionValidated: false, pending: 6 });
    expect(target(`${DEMO_PROJECT_ID}:tA`).facts).toMatchObject({ conformityPct: 100, traceComplete: true, deadlineMet: true, pending: 0 });
    // tP foi revisada pela mesma pessoa responsável: rastro incompleto
    expect(target(`${DEMO_PROJECT_ID}:tP`).facts.traceComplete).toBe(false);
    const report = evaluatePolicy({ mode: "REVISAO", criteria: [{ criterion: "CONFORMIDADE_MIN", threshold: 80 }, { criterion: "PRAZO_CUMPRIDO", threshold: null }] }, project.facts);
    expect(report.results).toEqual([
      { criterion: "CONFORMIDADE_MIN", threshold: 80, value: 71, met: false },
      { criterion: "PRAZO_CUMPRIDO", threshold: null, value: true, met: true },
    ]);
    expect([report.met, report.total, report.allMet]).toEqual([1, 2, false]);
  });

  it("sugere até 3 chancelas abertas do mesmo tier, pela fração de critérios atendidos, sempre na mesma ordem", () => {
    const { repo, target } = setup();
    const project = target(DEMO_PROJECT_ID);
    const a = suggestSeals(project, repo.seals(), NOW);
    const b = suggestSeals(project, repo.seals(), NOW);
    expect(a.map((s) => [s.seal.id, s.confidence, s.basis])).toEqual([["ch-projeto-conforme", 33, "MODELO_MATCH"], ["ch-excelencia", 33, "MODELO_MATCH"]]);
    expect(b.map((s) => s.seal.id)).toEqual(a.map((s) => s.seal.id));
    expect(suggestSeals(target(DEMO_PLAN_ID), repo.seals(), NOW).map((s) => [s.seal.id, s.basis, s.confidence])).toEqual([["ch-plano-integrado", "PLANO_MATCH", 100]]);
    expect(sealOpen({ ...repo.seal("ch-excelencia")!, usageCount: 3 }, NOW)).toBe("LIMITE_ESGOTADO");
    expect(sealOpen(repo.seal("ch-excelencia")!, new Date("2027-01-02T12:00:00Z"))).toBe("FORA_DO_CICLO");
  });
});

describe("criador de chancela (RF39.CA01, CA02)", () => {
  it("EMPRESA e CHEFE criam com política e benefícios; EMPREGADO, CURADOR e ADMIN recebem ACESSO_NEGADO", () => {
    const { repo } = setup();
    const r = repo.createSeal(CHEFE, FORM, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seal).toMatchObject({ issuerKind: "CHEFE", issuerId: CHEFE.id, department: "CPOE", usageCount: 0, policy: { mode: "AUTO" } });
    expect(r.benefits.map((b) => [b.type, b.credits])).toEqual([["PONTOS_BONUS", null], ["CREDITOS_IA", 5]]);
    expect(repo.createSeal(EMPRESA, { ...FORM, name: "Ata exemplar da Secretaria" }, NOW)).toMatchObject({ ok: true, seal: { issuerKind: "EMPRESA", department: null } });
    for (const actor of [PESSOA, CURADOR, ADMIN]) expect(repo.createSeal(actor, FORM, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect([canCreateSeal("EMPRESA"), canCreateSeal("CHEFE"), canCreateSeal("EMPREGADO"), canCreateSeal("CURADOR")]).toEqual([true, true, false, false]);
  });

  it("valida nome, ciclo (PERIODO_INVALIDO), limite, critérios e benefícios", () => {
    const { repo } = setup();
    expect(repo.createSeal(CHEFE, { ...FORM, availableUntil: "2026-10-01" }, NOW)).toEqual({ ok: false, reason: "PERIODO_INVALIDO", field: "period" });
    expect(repo.createSeal(CHEFE, { ...FORM, name: "  " }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "name" });
    expect(repo.createSeal(CHEFE, { ...FORM, usageLimit: 0 }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "usageLimit" });
    expect(repo.createSeal(CHEFE, { ...FORM, criteria: [] }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "criteria" });
    expect(repo.createSeal(CHEFE, { ...FORM, criteria: [{ criterion: "CONFORMIDADE_MIN", threshold: 120 }] }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "criteria" });
    expect(repo.createSeal(CHEFE, { ...FORM, benefits: [{ type: "CREDITOS_IA", credits: 0, totalQuota: null }] }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "benefits" });
    expect(repo.createSeal(CHEFE, { ...FORM, benefits: [{ type: "CERTIFICADO", totalQuota: 3, expiresAt: "2026-01-01" }] }, NOW)).toEqual({ ok: false, reason: "PERIODO_INVALIDO", field: "benefits" });
    expect(repo.createSeal(CHEFE, { ...FORM, name: "Referência técnica" }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "name" });
  });
});

describe("concessão por vínculo sugerido, por política ou por premiação (RF39.CA03–CA05, CA08)", () => {
  it("política AUTO com critérios atendidos aprova sozinha; REVISAO vai para a fila; critério não atendido não concede", () => {
    const { repo, target, onApproved } = setup();
    const created = repo.createSeal(CHEFE, FORM, NOW);
    if (!created.ok) throw new Error("seal");
    const tA = target(`${DEMO_PROJECT_ID}:tA`);
    const auto = repo.grant(CHEFE, { sealId: created.seal.id, target: tA, mode: "POLITICA" }, NOW);
    expect(auto).toMatchObject({ ok: true, bond: { status: "APROVADA", basis: "POLITICA", autoIssued: true, issuerId: CHEFE.id } });
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(repo.seal(created.seal.id)!.usageCount).toBe(1);
    // projeto: conformidade 71 % < 80 % → a política não concede
    expect(repo.grant(CHEFE, { sealId: "ch-projeto-conforme", target: target(DEMO_PROJECT_ID), mode: "POLITICA" }, NOW)).toEqual({ ok: false, reason: "CRITERIOS_NAO_ATENDIDOS" });
    const plan = repo.grant(EMPRESA, { sealId: "ch-plano-integrado", target: { ...target(DEMO_PLAN_ID), id: "plano-2", title: "Plano 2" }, mode: "POLITICA" }, NOW);
    expect(plan).toMatchObject({ ok: true, bond: { status: "EM_REVISAO", autoIssued: false } });
  });

  it("vínculo sugerido vai para a revisão com a confiança; um vínculo ativo por item e emissor; tier e emissor conferidos", () => {
    const { repo, target } = setup();
    const project = target(DEMO_PROJECT_ID);
    const r = repo.grant(CHEFE, { sealId: "ch-projeto-conforme", target: project, mode: "SUGESTAO", confidence: 33 }, NOW);
    expect(r).toMatchObject({ ok: true, bond: { status: "EM_REVISAO", basis: "MODELO_MATCH", confidence: 33, requestedBy: CHEFE.id } });
    expect(repo.grant(CHEFE, { sealId: "ch-projeto-conforme", target: project, mode: "SUGESTAO" }, NOW)).toEqual({ ok: false, reason: "CHANCELA_DUPLICADA" });
    expect(repo.grant(CHEFE, { sealId: "ch-referencia-tecnica", target: project, mode: "SUGESTAO" }, NOW)).toEqual({ ok: false, reason: "TIER_INCOMPATIVEL" });
    expect(repo.grant(CHEFE, { sealId: "ch-excelencia", target: project, mode: "SUGESTAO" }, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(repo.grant(PESSOA, { sealId: "ch-projeto-conforme", target: project, mode: "SUGESTAO" }, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
  });

  it("premiação aprova na hora, inclusive pelo curador do departamento; o limite do ciclo vira LIMITE_ESGOTADO", () => {
    const { repo, target } = setup();
    const tA = target(`${DEMO_PROJECT_ID}:tA`);
    const other: SealTarget = { ...tA, id: "outra-tarefa", title: "Outra" };
    expect(repo.grant(CURADOR, { sealId: "ch-referencia-tecnica", target: tA, mode: "PREMIACAO" }, NOW)).toMatchObject({ ok: true, bond: { status: "APROVADA", basis: "PREMIACAO", requestedBy: CURADOR.id } });
    expect(repo.grant(CURADOR, { sealId: "ch-tarefa-exemplar", target: other, mode: "PREMIACAO" }, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    const project = target(DEMO_PROJECT_ID);
    expect(repo.grant(EMPRESA, { sealId: "ch-excelencia", target: project, mode: "PREMIACAO" }, NOW).ok).toBe(true);
    expect(repo.grant(EMPRESA, { sealId: "ch-excelencia", target: { ...project, id: "p2" }, mode: "PREMIACAO" }, NOW).ok).toBe(true);
    expect(repo.grant(EMPRESA, { sealId: "ch-excelencia", target: { ...project, id: "p3" }, mode: "PREMIACAO" }, NOW)).toEqual({ ok: false, reason: "LIMITE_ESGOTADO" });
  });
});

describe("fila de revisão (RF39.CA04, CA07; RF28.CA03)", () => {
  it("CHEFE e CURADOR do departamento veem e revisam a fila das próprias chancelas; EMPRESA a dela; ADMIN só lê", () => {
    const { repo } = setup();
    expect(repo.reviewQueue(CHEFE).map((b) => b.id)).toEqual(["bd-tarefa-tp"]);
    expect(repo.reviewQueue(CURADOR).map((b) => b.id)).toEqual(["bd-tarefa-tp"]);
    expect(repo.reviewQueue(EMPRESA).map((b) => b.id)).toEqual(["bd-plano"]);
    expect(repo.reviewQueue(ADMIN).map((b) => b.id).sort()).toEqual(["bd-plano", "bd-tarefa-tp"]);
    expect(repo.review(ADMIN, "bd-plano", "APROVAR")).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(repo.review(PESSOA, "bd-tarefa-tp", "APROVAR")).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(repo.review(CHEFE, "bd-plano", "APROVAR")).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect([canSeeReviewQueue("EMPREGADO"), canSeeReviewQueue("CURADOR"), canSeeReviewQueue("ADMIN")]).toEqual([false, true, true]);
  });

  it("recusar exige motivo e vai para Recusadas; aprovar libera os benefícios aos envolvidos; não revisa duas vezes", () => {
    const { repo, onApproved } = setup();
    expect(repo.review(CURADOR, "bd-tarefa-tp", "RECUSAR", "   ")).toEqual({ ok: false, reason: "MOTIVO_OBRIGATORIO" });
    const rejected = repo.review(CURADOR, "bd-tarefa-tp", "RECUSAR", "Revisão feita pela própria responsável", NOW);
    expect(rejected).toMatchObject({ ok: true, bond: { status: "REJEITADA", reviewNote: "Revisão feita pela própria responsável", reviewedBy: CURADOR.id } });
    expect(repo.rejected(CHEFE).map((b) => b.id)).toEqual(["bd-tarefa-tp", "bd-projeto"]);
    expect(repo.review(CHEFE, "bd-tarefa-tp", "APROVAR")).toEqual({ ok: false, reason: "ESTADO_INVALIDO" });
    expect(repo.benefitsFor("u-pessoa", NOW).some((o) => o.seal.id === "ch-plano-integrado")).toBe(false);
    expect(repo.review(EMPRESA, "bd-plano", "APROVAR", "", NOW)).toMatchObject({ ok: true, bond: { status: "APROVADA" } });
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(repo.benefitsFor("u-pessoa", NOW).filter((o) => o.seal.id === "ch-plano-integrado").map((o) => [o.benefit.type, o.state])).toEqual([["PRIORIDADE_REVISAO", "DISPONIVEL"]]);
  });

  it("conflito de interesse: o curador envolvido no item não revisa", () => {
    const { repo, target } = setup();
    const created = repo.createSeal(CHEFE, { ...FORM, name: "Plano de departamento", tier: "PLANO", mode: "REVISAO" }, NOW);
    if (!created.ok) throw new Error("seal");
    const plan = target(DEMO_PLAN_ID);
    const g = repo.grant(CHEFE, { sealId: created.seal.id, target: plan, mode: "SUGESTAO" }, NOW);
    if (!g.ok) throw new Error(g.reason);
    expect(repo.review(CURADOR, g.bond.id, "APROVAR")).toEqual({ ok: false, reason: "CONFLITO_DE_INTERESSE" });
    expect(repo.review(CHEFE, g.bond.id, "APROVAR").ok).toBe(true);
  });
});

describe("benefícios liberados e resgate (RF39.CA09, CA10)", () => {
  it("bônus de pontos pelo award BENEFICIO_BONUS (valor da regra) e créditos de IA no saldo da Loja; resgate idempotente", () => {
    const { ledger, store, repo } = setup();
    const offers = repo.benefitsFor("u-pessoa", NOW);
    expect(offers.map((o) => [o.benefit.id, o.state])).toEqual([["bf-bonus-tarefa", "DISPONIVEL"], ["bf-ia-tarefa", "DISPONIVEL"]]);
    const bonus = repo.redeem(PESSOA, { benefitId: "bf-bonus-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "rk1" }, NOW);
    expect(bonus.ok).toBe(true);
    expect(ledger.balance("u-pessoa")).toBe(DEFAULT_RULES.BENEFICIO_BONUS.points);
    expect(ledger.entries("u-pessoa")[0]!.event).toBe("BENEFICIO_BONUS");
    const replay = repo.redeem(PESSOA, { benefitId: "bf-bonus-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "rk1" }, NOW);
    expect(replay.ok && replay.replay).toBe(true);
    expect(ledger.balance("u-pessoa")).toBe(DEFAULT_RULES.BENEFICIO_BONUS.points);
    expect(repo.redeem(PESSOA, { benefitId: "bf-bonus-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "rk2" }, NOW)).toEqual({ ok: false, reason: "LIMITE_ESGOTADO" });
    expect(repo.benefitsFor("u-pessoa", NOW).find((o) => o.benefit.id === "bf-bonus-tarefa")!.state).toBe("RESGATADO");
    const ia = repo.redeem(PESSOA, { benefitId: "bf-ia-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "rk3" }, NOW);
    expect(ia.ok && ia.redemption.aiCreditEntryId).toBeTruthy();
    expect(store.aiCredits("u-pessoa")).toBe(10);
    expect(repo.redemptions("u-pessoa").map((r) => r.benefitId)).toEqual(["bf-ia-tarefa", "bf-bonus-tarefa"]);
    expect(redemptionCode("x")).toMatch(/^CH-[0-9A-Z]{7}$/);
  });

  it("sem chancela aprovada no item, ou fora dos envolvidos: CHANCELA_INVALIDA; quem não tem saldo próprio não resgata", () => {
    const { repo } = setup();
    expect(repo.redeem(CHEFE, { benefitId: "bf-bonus-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "a" }, NOW)).toEqual({ ok: false, reason: "CHANCELA_INVALIDA" });
    expect(repo.redeem(PESSOA, { benefitId: "bf-capacitacao", bondId: "bd-tarefa-tp", idempotencyKey: "b" }, NOW)).toEqual({ ok: false, reason: "CHANCELA_INVALIDA" });
    expect(repo.redeem(PESSOA, { benefitId: "bf-ia-projeto", bondId: "bd-projeto", idempotencyKey: "c" }, NOW)).toEqual({ ok: false, reason: "CHANCELA_INVALIDA" });
    expect(repo.redeem(EMPRESA, { benefitId: "bf-bonus-tarefa", bondId: "bd-tarefa-ta", idempotencyKey: "d" }, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect([canRedeemBenefits("EMPREGADO"), canRedeemBenefits("EMPRESA"), canRedeemBenefits("ADMIN")]).toEqual([true, false, false]);
  });

  it("emissor publica benefício na própria chancela; cota esgotada e prazo vencido bloqueiam o resgate", () => {
    const { repo } = setup();
    expect(repo.publishBenefit(CHEFE, "ch-tarefa-exemplar", { type: "CERTIFICADO", totalQuota: 1 }, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    const pub = repo.publishBenefit(EMPRESA, "ch-tarefa-exemplar", { type: "CERTIFICADO", totalQuota: 1 }, NOW);
    expect(pub.ok).toBe(true);
    if (!pub.ok) return;
    expect(repo.redeem(PESSOA, { benefitId: pub.benefit.id, bondId: "bd-tarefa-ta", idempotencyKey: "x1" }, NOW).ok).toBe(true);
    const ana: SealActor = { id: "u-ana", profile: "EMPREGADO", name: "Ana", department: "SECID-UTS" };
    expect(repo.redeem(ana, { benefitId: pub.benefit.id, bondId: "bd-tarefa-ta", idempotencyKey: "x2" }, NOW)).toEqual({ ok: false, reason: "LIMITE_ESGOTADO" });
    const late = repo.publishBenefit(EMPRESA, "ch-tarefa-exemplar", { type: "CAPACITACAO", totalQuota: null, expiresAt: "2026-11-20" }, NOW);
    if (!late.ok) throw new Error("benefit");
    expect(repo.redeem(ana, { benefitId: late.benefit.id, bondId: "bd-tarefa-ta", idempotencyKey: "x3" }, new Date("2026-11-21T12:00:00Z"))).toEqual({ ok: false, reason: "BENEFICIO_EXPIRADO" });
    expect(repo.publishBenefit(EMPRESA, "ch-tarefa-exemplar", { type: "VITRINE_DIRETA", totalQuota: null }, NOW)).toEqual({ ok: false, reason: "VALIDACAO", field: "benefits" });
  });
});

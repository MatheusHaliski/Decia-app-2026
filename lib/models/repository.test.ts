import { describe, expect, it } from "vitest";
import { createMemoryLedger } from "@/lib/points/ledger";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { browseModels, departmentsOf, EMPTY_FILTERS, myOffers } from "./browse";
import { buildDemoOffers } from "./fixtures";
import { MODEL_MAX_PRICE, offerAsModel, type OfferAuthor } from "./offer";
import { createMemoryModelsRepository, creditAuthorForReuse, licenseKeyOf } from "./repository";
import { draftFromTemplate, licenseCopies, sectionsOf, templatesOf } from "./use";

const NOW = new Date("2026-11-12T12:00:00Z");
const PESSOA: OfferAuthor = { id: "u-pessoa", name: "Pessoa Exemplo", department: "SECID-UTS", profile: "EMPREGADO", canEarnPoints: true };
const tpl = (id: string) => AREA_TEMPLATES.find((t) => t.id === id)!;

function setup(balances: Record<string, number> = {}) {
  const ledger = createMemoryLedger();
  for (const [u, n] of Object.entries(balances)) ledger.award({ userId: u, event: "CREDITO_AUTOR_MODELO", points: n, ref: { type: "licenca", id: `seed-${u}` } }, NOW);
  const repo = createMemoryModelsRepository({ ledger, seed: buildDemoOffers(NOW) });
  return { ledger, repo };
}

describe("Balcão de Modelos — oferecer (RF40.CA01)", () => {
  it("oferece um modelo de tarefa na Comunidade, com área e departamento de origem; recusa a mesma origem ativa", () => {
    const { repo } = setup();
    const r = offerAsModel({ source: { type: "TASK_TEMPLATE", template: tpl("area.software.plano-de-testes") }, author: PESSOA, pricePoints: 12, license: "ATRIBUICAO", usageDescription: "Plano que usei no SEI" }, repo, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.offer).toMatchObject({ kind: "TAREFA", shelf: "COMUNIDADE", sealName: null, area: "SOFTWARE", department: "SECID-UTS", status: "ATIVA", reuseCount: 0, title: tpl("area.software.plano-de-testes").title });
    expect(offerAsModel({ source: { type: "TASK_TEMPLATE", template: tpl("area.software.plano-de-testes") }, author: PESSOA, pricePoints: 0, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "OFERTA_DUPLICADA" });
    expect(repo.withdraw(r.offer.id, "u-outra")).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(repo.withdraw(r.offer.id, PESSOA.id).ok).toBe(true);
    // retirada: pode oferecer de novo
    expect(offerAsModel({ source: { type: "TASK_TEMPLATE", template: tpl("area.software.plano-de-testes") }, author: PESSOA, pricePoints: 0, license: "COPIA_LIVRE" }, repo, NOW).ok).toBe(true);
    expect(myOffers(repo.list(), PESSOA.id).map((o) => o.status).sort()).toEqual(["ATIVA", "RETIRADA"]);
  });

  it("valida perfil, preço (0–50, inteiro; conta sem saldo só grátis), título, licença e kit", () => {
    const { repo } = setup();
    const source = { type: "TASK_TEMPLATE" as const, template: tpl("area.juridico.parecer-juridico") };
    expect(offerAsModel({ source, author: { ...PESSOA, profile: "CURADOR" }, pricePoints: 0, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "ACESSO_NEGADO" });
    expect(offerAsModel({ source, author: PESSOA, pricePoints: MODEL_MAX_PRICE + 1, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "PRECO_INVALIDO" });
    expect(offerAsModel({ source, author: PESSOA, pricePoints: 2.5, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "PRECO_INVALIDO" });
    const empresa: OfferAuthor = { id: "secretaria.exemplo", name: "Secretaria Exemplo", department: null, profile: "EMPRESA", canEarnPoints: false };
    expect(offerAsModel({ source, author: empresa, pricePoints: 5, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "PRECO_SEM_SALDO" });
    expect(offerAsModel({ source, author: empresa, pricePoints: 0, license: "COPIA_LIVRE" }, repo, NOW).ok).toBe(true);
    expect(offerAsModel({ source, author: PESSOA, pricePoints: 0, license: "COPIA_LIVRE", title: "   " }, repo, NOW)).toEqual({ ok: false, reason: "TITULO_OBRIGATORIO" });
    expect(offerAsModel({ source: { type: "KIT", templates: [tpl("area.juridico.parecer-juridico")] }, author: PESSOA, pricePoints: 0, license: "COPIA_LIVRE" }, repo, NOW)).toEqual({ ok: false, reason: "KIT_VAZIO" });
    const project = buildDemoProject();
    const p = offerAsModel({ source: { type: "PROJECT", project }, author: PESSOA, pricePoints: 0, license: "SOMENTE_LEITURA" }, repo, NOW);
    expect(p.ok && [p.offer.kind, p.offer.area, p.offer.title]).toEqual(["PROJETO", "SOFTWARE", project.title]);
  });
});

describe("Balcão de Modelos — reutilizar com crédito ao autor (RF40.CA03, RF42.CA05)", () => {
  it("modelo pago: debita quem usa e credita o autor uma única vez; usar de novo não cobra e conta a reutilização", () => {
    const { ledger, repo } = setup({ "u-pessoa": 100 });
    const before = repo.get("mo-tr")!;
    const r = repo.reuse({ offerId: "mo-tr", userId: "u-pessoa", reuseKey: "r1" }, NOW);
    expect(r.ok && [r.charged, r.own]).toEqual([20, false]);
    expect(ledger.balance("u-pessoa")).toBe(80);
    expect(ledger.balance("u-bruno")).toBe(20);
    const credit = ledger.entries("u-bruno")[0]!;
    expect([credit.event, credit.delta, credit.ref]).toEqual(["CREDITO_AUTOR_MODELO", 20, { type: "licenca", id: licenseKeyOf("mo-tr", "u-pessoa") }]);
    expect(repo.hasLicense("mo-tr", "u-pessoa")).toBe(true);
    const again = repo.reuse({ offerId: "mo-tr", userId: "u-pessoa", reuseKey: "r2" }, NOW);
    expect(again.ok && again.charged).toBe(0);
    expect(ledger.balance("u-pessoa")).toBe(80);
    expect(ledger.balance("u-bruno")).toBe(20);
    const after = repo.get("mo-tr")!;
    expect(after.reuseCount).toBe(before.reuseCount + 2);
    expect(after.pointsEarned).toBe(before.pointsEarned + 20);
    expect(repo.licenses("u-pessoa").map((g) => [g.offerId, g.pricePaid])).toEqual([["mo-tr", 20]]);
  });

  it("o crédito ao autor é idempotente por reutilização paga; o mesmo clique não conta duas vezes", () => {
    const { ledger, repo } = setup({ "u-pessoa": 100 });
    const offer = repo.get("mo-adr")!;
    const key = licenseKeyOf(offer.id, "u-pessoa");
    expect(creditAuthorForReuse(ledger, offer, key, offer.pricePoints, NOW).ok).toBe(true);
    expect(creditAuthorForReuse(ledger, offer, key, offer.pricePoints, NOW)).toEqual({ ok: false, reason: "DUPLICADO" });
    expect(ledger.balance(offer.authorId)).toBe(offer.pricePoints);
    // a reutilização que chega depois do crédito (reenvio) não credita outra vez
    const r = repo.reuse({ offerId: offer.id, userId: "u-pessoa", reuseKey: "k" }, NOW);
    expect(r.ok && r.charged).toBe(offer.pricePoints);
    expect(ledger.balance(offer.authorId)).toBe(offer.pricePoints);
    const replay = repo.reuse({ offerId: offer.id, userId: "u-pessoa", reuseKey: "k" }, NOW);
    expect(replay.ok && replay.replay).toBe(true);
    expect(repo.get(offer.id)!.reuseCount).toBe(offer.reuseCount + 1);
  });

  it("sem saldo: SALDO_INSUFICIENTE e nada muda; grátis só conta; autor não paga nem conta; retirada fica indisponível", () => {
    const { ledger, repo } = setup({ "u-pessoa": 5 });
    expect(repo.reuse({ offerId: "mo-kit-contratacao", userId: "u-pessoa", reuseKey: "a" }, NOW)).toEqual({ ok: false, reason: "SALDO_INSUFICIENTE", balance: 5, price: 30 });
    expect(ledger.balance("u-carla")).toBe(0);
    const free = repo.reuse({ offerId: "mo-etp", userId: "u-pessoa", reuseKey: "b" }, NOW);
    expect(free.ok && [free.charged, free.license]).toEqual([0, null]);
    expect(repo.get("mo-etp")!.reuseCount).toBe(15);
    expect(ledger.entries("u-ana")).toEqual([]);
    const own = repo.reuse({ offerId: "mo-riscos", userId: "chefe.exemplo", reuseKey: "c" }, NOW);
    expect(own.ok && own.own).toBe(true);
    expect(repo.get("mo-riscos")!.reuseCount).toBe(7);
    expect(repo.reuse({ offerId: "mo-tr", userId: null, actorId: "secretaria.exemplo", reuseKey: "d" }, NOW)).toEqual({ ok: false, reason: "SEM_SALDO_PROPRIO", price: 20 });
    repo.withdraw("mo-riscos", "chefe.exemplo");
    expect(repo.reuse({ offerId: "mo-riscos", userId: "u-pessoa", reuseKey: "e" }, NOW)).toEqual({ ok: false, reason: "ITEM_INDISPONIVEL" });
    expect(repo.reuse({ offerId: "nao-existe", userId: "u-pessoa", reuseKey: "f" }, NOW)).toEqual({ ok: false, reason: "NAO_ENCONTRADO" });
  });

  it("pela Loja compra só a licença: paga e credita o autor sem contar reutilização; usar depois sai sem custo", () => {
    const { ledger, repo } = setup({ "u-pessoa": 100 });
    const id = "mo-kit-entrega-software";
    const before = repo.get(id)!;
    const r = repo.acquireLicense(id, "u-pessoa", NOW);
    expect(r.ok && r.charged).toBe(25);
    expect(repo.get(id)!.reuseCount).toBe(before.reuseCount);
    expect(ledger.balance("u-diego")).toBe(25);
    const again = repo.acquireLicense(id, "u-pessoa", NOW);
    expect(again.ok && again.charged).toBe(0);
    const use = repo.reuse({ offerId: id, userId: "u-pessoa", reuseKey: "z" }, NOW);
    expect(use.ok && use.charged).toBe(0);
    expect(repo.get(id)!.reuseCount).toBe(before.reuseCount + 1);
    expect(ledger.balance("u-pessoa")).toBe(75);
    expect(repo.acquireLicense(id, "u-diego", NOW)).toMatchObject({ ok: true, own: true, charged: 0 });
  });

  it("visualização conta uma vez por pessoa (o autor não conta); chancela leva à prateleira Chancelados", () => {
    const { repo } = setup();
    const views = repo.get("mo-adr")!.viewsCount;
    repo.view("mo-adr", "u-pessoa");
    repo.view("mo-adr", "u-pessoa");
    repo.view("mo-adr", "u-diego");
    expect(repo.get("mo-adr")!.viewsCount).toBe(views + 1);
    repo.markSealed("mo-adr", "Referência técnica");
    expect(repo.get("mo-adr")).toMatchObject({ shelf: "CHANCELADO", sealName: "Referência técnica", authorId: "u-diego" });
  });
});

describe("Balcão de Modelos — prateleiras, busca e uso (RF40.CA02, CA04)", () => {
  it("separa Chancelados e Comunidade, busca sem acento e filtra por tipo, área, departamento e preço", () => {
    const offers = buildDemoOffers(NOW);
    expect(browseModels(offers, "CHANCELADO", EMPTY_FILTERS).map((o) => o.id)).toEqual(["mo-etp", "mo-tr", "mo-kit-contratacao"]);
    expect(browseModels(offers, "COMUNIDADE", { ...EMPTY_FILTERS, kind: "KIT" }).map((o) => o.id)).toEqual(["mo-kit-entrega-software"]);
    expect(browseModels(offers, "TODAS", { ...EMPTY_FILTERS, q: "decisao arquitetura" }).map((o) => o.id)).toEqual(["mo-adr"]);
    expect(browseModels(offers, "TODAS", { ...EMPTY_FILTERS, area: "JURIDICO" }).map((o) => o.id)).toEqual(["mo-parecer"]);
    expect(browseModels(offers, "TODAS", { ...EMPTY_FILTERS, department: "ASCOM" }).map((o) => o.id)).toEqual(["mo-campanha"]);
    expect(browseModels(offers, "TODAS", { ...EMPTY_FILTERS, price: "GRATIS" }).every((o) => o.pricePoints === 0)).toBe(true);
    expect(browseModels(offers, "TODAS", EMPTY_FILTERS, "recentes")[0]!.id).toBe("mo-kit-entrega-software");
    expect(browseModels(offers, "TODAS", EMPTY_FILTERS, "titulo")[0]!.title).toBe("Correção de defeito com análise de causa raiz");
    expect(departmentsOf(offers)).toEqual(["ASCOM", "ASJUR", "CPOE", "SECID-UTS"]);
  });

  it("toda oferta DEMO aponta para modelos que existem; o rascunho segue a licença", () => {
    for (const o of buildDemoOffers(NOW)) {
      if (o.source.type === "PROJECT") expect(templatesOf(o)).toEqual([]);
      else expect(templatesOf(o).length).toBe(o.source.type === "KIT" ? o.source.templateIds.length : 1);
    }
    const etp = tpl("area.administracao.estudo-tecnico-preliminar");
    const attributed = draftFromTemplate(etp, { license: "ATRIBUICAO" }, "Baseado no modelo de Ana Exemplo");
    expect(attributed.descriptionMd!.endsWith("Baseado no modelo de Ana Exemplo")).toBe(true);
    expect(attributed.criteria).toEqual(etp.criteria);
    expect(draftFromTemplate(etp, { license: "COPIA_LIVRE" }, "x").descriptionMd).toBe(etp.descriptionMd);
    expect(licenseCopies({ license: "SOMENTE_LEITURA" })).toBe(false);
    expect(sectionsOf("## A\nx\n\n## B\ny")).toEqual(["A", "B"]);
  });
});

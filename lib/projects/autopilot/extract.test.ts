import { describe, expect, it } from "vitest";
import { EXAMPLE_OFICIO } from "./examples";
import { classifyDemand, deliverableTypeOf, extractDemand, type DemandFacts } from "./extract";
import { fold } from "./text";

const NOW = new Date("2026-11-12T12:00:00");
const at = (f: DemandFacts, span?: { start: number; end: number }) => (span ? f.text.slice(span.start, span.end) : undefined);

describe("ofício de exemplo", () => {
  const f = extractDemand(EXAMPLE_OFICIO, { now: NOW });

  it("remetente, assinatura, destinatário, assunto, objetivo, nº do ofício e data — cada um com o trecho de origem", () => {
    expect(f.sender).toMatchObject({ value: "Diretoria de Tecnologia da Informação" });
    expect(at(f, f.sender?.span)).toBe("Diretoria de Tecnologia da Informação");
    expect(f.signatory?.value).toBe("Beltrana de Souza — Diretora de Tecnologia da Informação");
    expect(f.recipient?.value).toBe("Coordenação de Projetos Estratégicos – CPE");
    expect(f.subject?.value).toBe("Implantação do sistema de protocolo digital");
    expect(f.objective?.value).toBe("Reduzir o tempo de tramitação dos processos");
    expect(f.reference?.value).toBe("Ofício nº 123/2026 – SECID/DTI");
    expect(at(f, f.reference?.span)).toBe("Ofício nº 123/2026 – SECID/DTI");
    expect(f.referenceDate.value).toBe("2026-11-10");
  });

  it("prazo 'até 30/06/2027' com o trecho; valor R$ 850.000,00", () => {
    expect(f.deadline).toMatchObject({ date: "2027-06-30", kind: "DATA" });
    expect(at(f, f.deadline?.span)).toBe("30/06/2027");
    expect(f.amounts.map((a) => a.value)).toEqual([850_000]);
    expect(at(f, f.amounts[0]!.span)).toBe("R$ 850.000,00");
  });

  it("entregas da lista introduzida por ':' e da frase do pedido, sem repetir o assunto, cada uma com o tipo", () => {
    expect(f.deliverables.map((d) => [d.text, d.type])).toEqual([
      ["Implantação do sistema de protocolo digital nas 12 unidades regionais", "IMPLANTACAO"],
      ["Elaborar o estudo técnico preliminar (ETP)", "ESTUDO"],
      ["Contratar a solução de software", "CONTRATACAO"],
      ["Migrar os processos em papel do último exercício", "MIGRACAO"],
      ["Capacitar os servidores das unidades regionais", "CAPACITACAO"],
    ]);
    expect(at(f, f.deliverables[1]!.span)).toBe("elaborar o estudo técnico preliminar (ETP)");
  });

  it("partes interessadas (demandante, destinatário, controle externo, público), restrições e riscos por palavra-chave", () => {
    const byName = Object.fromEntries(f.stakeholders.map((s) => [s.name, s.role]));
    expect(byName).toMatchObject({
      "Diretoria de Tecnologia da Informação": "DEMANDANTE",
      "Coordenação de Projetos Estratégicos – CPE": "DESTINATARIO",
      "Tribunal de Contas do Estado": "CONTROLE",
      "Secretaria de Estado das Cidades": "OUTRO",
      Cidadãos: "PUBLICO",
      Servidores: "PUBLICO",
    });
    // sem duplicar a coordenação (com e sem a sigla) nem o "Governo do Estado" guarda-chuva
    expect(f.stakeholders.filter((s) => s.name.startsWith("Coordenação"))).toHaveLength(1);
    expect(f.stakeholders.some((s) => s.name.startsWith("Governo"))).toBe(false);
    expect(f.constraints.map((c) => c.text)).toEqual([
      "Contratar a solução de software, conforme a Lei nº 14.133/2021",
      "O valor estimado é de R$ 850.000,00 (oitocentos e cinquenta mil reais), com dotação orçamentária prevista para 2027",
      "O sistema deverá observar a LGPD (Lei nº 13.709/2018) no tratamento dos dados pessoais dos cidadãos",
    ]);
    expect(f.risks.map((r) => r.key)).toEqual(["CONTRATACAO", "ORCAMENTO", "LGPD", "INTEGRACAO", "CONTROLE_EXTERNO", "ADESAO"]);
    expect(fold(at(f, f.risks.find((r) => r.key === "CONTROLE_EXTERNO")!.span)!)).toBe("tribunal de contas");
  });

  it("classificação TI (sistema, software, digital) com as evidências", () => {
    expect(f.kind.value).toBe("TI");
    expect(f.kind.scores.TI).toBeGreaterThan(f.kind.scores.AQUISICAO);
    expect(f.kind.evidence.map((e) => fold(f.text.slice(e.start, e.end)))).toEqual(expect.arrayContaining(["sistema", "software", "digital"]));
  });
});

describe("outras demandas", () => {
  it("e-mail com cabeçalho, marcadores e prazo relativo em dias úteis contado da data da mensagem", () => {
    const email = [
      "De: Ana Exemplo <ana@exemplo.gov.br>",
      "Para: Coordenadoria de Obras",
      "Assunto: Reforma da sede regional de Maringá",
      "Data: 05/11/2026",
      "",
      "Prezados, precisamos da reforma da sede regional, URGENTE. As entregas são:",
      "• memorial descritivo da reforma",
      "• orçamento de referência pelo SINAPI",
      "- executar a obra com a empresa contratada",
      "",
      "O prazo é de 90 (noventa) dias úteis. Orçamento máximo de R$ 1,2 milhão.",
    ].join("\n");
    const f = extractDemand(email, { now: NOW });
    expect(f.sender?.value).toBe("Ana Exemplo");
    expect(f.recipient?.value).toBe("Coordenadoria de Obras");
    expect(f.subject?.value).toBe("Reforma da sede regional de Maringá");
    expect(f.referenceDate.value).toBe("2026-11-05");
    expect(f.deadline).toMatchObject({ kind: "DIAS_UTEIS", amount: 90, from: "2026-11-05" });
    expect(f.amounts.map((a) => a.value)).toEqual([1_200_000]);
    expect(f.kind.value).toBe("OBRA");
    expect(f.deliverables.map((d) => d.text)).toEqual(["Memorial descritivo da reforma", "Orçamento de referência pelo SINAPI", "Executar a obra com a empresa contratada"]);
    expect(f.risks.map((r) => r.key)).toEqual(expect.arrayContaining(["PRAZO_CURTO", "ORCAMENTO", "FORNECEDOR", "CLIMA_OBRA"]));
  });

  it("valores em R$ com milhar, centavos, 'mil' e 'milhões'", () => {
    const f = extractDemand("Custos: R$ 12.345,67; R$ 350 mil; R$ 2 milhões; R$ 90.", { now: NOW });
    expect(f.amounts.map((a) => a.value)).toEqual([12_345.67, 350_000, 2_000_000, 90]);
  });

  it("lista numerada de ações vira entregas; lista de PROBLEMAS (sem verbo de entrega) não", () => {
    const f = extractDemand([
      "Principais problemas observados:",
      "- lentidão no atendimento ao público",
      "- filas nas unidades",
      "",
      "Para resolver, a equipe deverá:",
      "1. Mapear o processo de atendimento",
      "2. Elaborar o procedimento operacional padrão",
      "3. Treinar os atendentes",
    ].join("\n"), { now: NOW });
    expect(f.deliverables.map((d) => [d.text, d.type])).toEqual([
      ["Mapear o processo de atendimento", "ESTUDO"],
      ["Elaborar o procedimento operacional padrão", "DOCUMENTO"],
      ["Treinar os atendentes", "CAPACITACAO"],
    ]);
  });

  it("classificação: normativo, aquisição, capacitação, serviço e 'outra' quando nada casa", () => {
    const kind = (s: string) => classifyDemand(fold(s)).value;
    expect(kind("Minuta de decreto que regulamenta o teletrabalho, com parecer jurídico")).toBe("NORMATIVO");
    // comprar computadores por pregão é aquisição (a TI aparece, com menos peso)
    expect(kind("Aquisição de 200 computadores por pregão eletrônico, com termo de referência")).toBe("AQUISICAO");
    expect(classifyDemand(fold("Aquisição de 200 computadores por pregão eletrônico")).scores.TI).toBeGreaterThan(0);
    expect(kind("Aquisição de mobiliário e equipamentos por pregão, com termo de referência")).toBe("AQUISICAO");
    expect(kind("Curso de capacitação e oficinas de formação para gestores")).toBe("CAPACITACAO");
    expect(kind("Serviços continuados de limpeza e vigilância")).toBe("SERVICO");
    expect(kind("Organizar a festa de fim de ano")).toBe("OUTRA");
  });

  it("tipo da entrega pelo verbo, pela nominalização e pelo objeto", () => {
    expect(deliverableTypeOf("Elaborar o termo de referência")).toBe("DOCUMENTO");
    expect(deliverableTypeOf("Elaborar o estudo técnico preliminar")).toBe("ESTUDO");
    expect(deliverableTypeOf("Contratação da empresa")).toBe("CONTRATACAO");
    expect(deliverableTypeOf("Construir a nova sede")).toBe("OBRA");
    expect(deliverableTypeOf("Coisa sem verbo")).toBe("OUTRO");
  });

  it("texto vazio não quebra: data de referência é hoje e não há fatos", () => {
    const f = extractDemand("   ", { now: NOW });
    expect(f.referenceDate.value).toBe("2026-11-12");
    expect(f.deliverables).toEqual([]);
    expect(f.kind.value).toBe("OUTRA");
  });
});

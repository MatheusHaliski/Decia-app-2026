import { describe, expect, it } from "vitest";
import { compileMinutes, extractFollowUp, isDecision, isPending } from "./minutes";
import { matchPerson, type PersonRef } from "./people";
import { checkTranscriptFile, parseTranscript, splitSentences } from "./transcript";

const BASE = "2026-11-12"; // quinta-feira
const MEMBERS: PersonRef[] = [
  { userId: "u-pessoa", name: "Pessoa Exemplo" },
  { userId: "u-ana", name: "Ana Exemplo" },
  { userId: "u-bruno", name: "Bruno Exemplo" },
  { userId: "u-carla", name: "Carla Exemplo" },
  { userId: "u-diego", name: "Diego Exemplo" },
];
const compile = (text: string, file?: string) => compileMinutes(parseTranscript(text, file, MEMBERS.map((m) => m.name)), { members: MEMBERS, baseDate: BASE });

const TRANSCRIPT = `Pauta: 1) Contratação do suporte; 2) Migração da infraestrutura; 3) Calendário de testes
Participantes: Pessoa Exemplo, Ana Exemplo, Bruno Exemplo, Carla Exemplo

Ana Exemplo: Bom dia. Primeiro ponto: contratação do suporte.
Bruno Exemplo: O teste de carga passou com o dobro do pico.
Ana Exemplo: Então fica aprovado por unanimidade contratar o Fornecedor Beta.
Carla Exemplo: Eu fico com a revisão do contrato até 20/11.
[10:42] Pessoa Exemplo: @bruno publicar o relatório do teste de carga em 6 dias úteis.
Ana Exemplo: Bruno vai preparar o plano de migração até sexta.
Bruno Exemplo: A Ana fica responsável pela comunicação aos usuários.
Ana Exemplo: Decidiu-se adiar a migração do banco para dezembro.
Carla Exemplo: A data do treinamento ainda não foi definida.
Encaminhamento: atualizar o cronograma — responsável: Diego — prazo: 30/11.
Bruno Exemplo: Fulano vai ver isso até amanhã. Isso vai ser difícil.
Carla Exemplo: A Ana vai gostar da proposta.`;

describe("ata compilada da transcrição colada", () => {
  const draft = compile(TRANSCRIPT);

  it("participantes casados com os membros, falas por pessoa e estatísticas", () => {
    expect(draft.participants.map((p) => p.userId)).toEqual(["u-ana", "u-bruno", "u-carla", "u-pessoa"]);
    const ana = draft.speeches.find((s) => s.userId === "u-ana")!;
    expect(ana.utterances.map((u) => u.text)).toContain("Decidiu-se adiar a migração do banco para dezembro.");
    expect(draft.stats.speakers).toBe(4);
  });

  it("pauta: lista numerada e 'Primeiro ponto' (sem repetir o mesmo item)", () => {
    expect(draft.agenda.map((a) => a.text)).toEqual(["Contratação do suporte", "Migração da infraestrutura", "Calendário de testes"]);
  });

  it("decisões com o trecho de origem; negativa vira pendência", () => {
    expect(draft.decisions.map((d) => d.text)).toEqual([
      "Então fica aprovado por unanimidade contratar o Fornecedor Beta.",
      "Decidiu-se adiar a migração do banco para dezembro.",
    ]);
    expect(draft.decisions[0]!.source).toMatchObject({ speaker: "Ana Exemplo", line: 6 });
    expect(draft.pending.map((p) => p.text)).toEqual(["A data do treinamento ainda não foi definida."]);
  });

  it("encaminhamentos com responsável (nome, @menção, 'eu', 'responsável:') e prazo (absoluto e relativo)", () => {
    const rows = draft.followUps.map((f) => [f.action, f.responsible.status === "CASADO" ? f.responsible.userId : f.responsible.status, f.due?.date ?? null]);
    expect(rows).toEqual([
      ["Revisão do contrato", "u-carla", "2026-11-20"],
      ["Publicar o relatório do teste de carga", "u-bruno", "2026-11-23"],
      ["Preparar o plano de migração", "u-bruno", "2026-11-13"],
      ["Comunicação aos usuários", "u-ana", null],
      ["Atualizar o cronograma", "u-diego", "2026-11-30"],
      ["Ver isso", "A_DEFINIR", "2026-11-13"],
    ]);
    const fulano = draft.followUps.at(-1)!;
    expect(fulano.responsible).toEqual({ status: "A_DEFINIR", raw: "Fulano" });
    expect(fulano.source?.text).toBe("Fulano vai ver isso até amanhã.");
    expect(draft.followUps.every((f) => f.accepted === null)).toBe(true);
  });

  it("sem compromisso: 'Isso vai…' e verbo fraco sem prazo ('Ana vai gostar…') não viram encaminhamento", () => {
    expect(draft.followUps.some((f) => /dif[ií]cil|gostar/.test(f.action))).toBe(false);
  });
});

describe("formatos de arquivo", () => {
  it("WebVTT do Teams (<v Nome>), falas seguidas da mesma pessoa juntas", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
<v Ana Exemplo>Bom dia a todos.</v>

00:00:04.500 --> 00:00:09.000
<v Ana Exemplo>Fica aprovado o novo calendário.</v>

00:00:09.500 --> 00:00:12.000
<v Bruno Exemplo>Eu vou enviar a planilha até sexta-feira.</v>`;
    const parsed = parseTranscript(vtt, "reuniao.vtt");
    expect(parsed.format).toBe("VTT");
    expect(parsed.segments.map((s) => [s.speaker, s.text])).toEqual([
      ["Ana Exemplo", "Bom dia a todos. Fica aprovado o novo calendário."],
      ["Bruno Exemplo", "Eu vou enviar a planilha até sexta-feira."],
    ]);
    const draft = compile(vtt, "reuniao.vtt");
    expect(draft.decisions).toHaveLength(1);
    expect(draft.followUps[0]).toMatchObject({ action: "Enviar a planilha", responsible: { status: "CASADO", userId: "u-bruno" }, due: { date: "2026-11-13" } });
  });

  it("SubRip (.srt) com 'Nome: fala'", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
Carla Exemplo: Decidimos manter o fornecedor atual.

2
00:00:03,500 --> 00:00:06,000
Carla Exemplo: Diego fica responsável por avisar o financeiro até 25/11.`;
    const draft = compile(srt, "ata.srt");
    expect(draft.decisions.map((d) => d.text)).toEqual(["Decidimos manter o fornecedor atual."]);
    expect(draft.followUps[0]).toMatchObject({ action: "Avisar o financeiro", responsible: { status: "CASADO", userId: "u-diego" }, due: { date: "2026-11-25", kind: "ABSOLUTA" } });
  });

  it("arquivo conferido pelo conteúdo: extensão, tamanho, binário, cabeçalho WEBVTT, blocos do SRT", () => {
    expect(checkTranscriptFile("a.pdf", 10, "x")).toBe("EXTENSAO_NAO_ACEITA");
    expect(checkTranscriptFile("a.txt", 2_000_000, "x")).toBe("ARQUIVO_GRANDE");
    expect(checkTranscriptFile("a.txt", 3, "  ")).toBe("ARQUIVO_VAZIO");
    expect(checkTranscriptFile("a.txt", 4, "\u0000PNG")).toBe("ARQUIVO_BINARIO");
    expect(checkTranscriptFile("a.vtt", 4, "oi\n00:00")).toBe("VTT_SEM_CABECALHO");
    expect(checkTranscriptFile("a.srt", 4, "só texto")).toBe("SRT_INVALIDO");
    expect(checkTranscriptFile("a.txt", 4, "Ana: oi")).toBeNull();
  });
});

describe("regras de reconhecimento", () => {
  it("responsável: nome completo, primeiro nome único, @menção, sobrenome ambíguo, desconhecido", () => {
    expect(matchPerson("Carla Exemplo", MEMBERS)).toMatchObject({ status: "CASADO", userId: "u-carla" });
    expect(matchPerson("Dra. Carla", MEMBERS)).toMatchObject({ status: "CASADO", userId: "u-carla" });
    expect(matchPerson("@carla.exemplo", MEMBERS)).toMatchObject({ status: "CASADO", userId: "u-carla" });
    expect(matchPerson("@CarlaExemplo", MEMBERS)).toMatchObject({ status: "CASADO", userId: "u-carla" });
    expect(matchPerson("Exemplo", MEMBERS)).toMatchObject({ status: "AMBIGUO" });
    expect(matchPerson("Zé", MEMBERS)).toEqual({ status: "A_DEFINIR", raw: "Zé" });
  });
  it("'fica a cargo de', 'cabe a' e 'fica com a X a tarefa de'", () => {
    expect(extractFollowUp("Fica a cargo da Carla levantar os custos até o dia 18.", null, MEMBERS, BASE)).toMatchObject({ action: "Levantar os custos", responsible: { userId: "u-carla" }, due: { date: "2026-11-18" } });
    expect(extractFollowUp("Cabe ao Bruno revisar o parecer.", null, MEMBERS, BASE)).toMatchObject({ action: "Revisar o parecer", responsible: { userId: "u-bruno" }, due: null });
  });
  it("'eu vou' sem prazo é conversa; 'eu me comprometo' sem prazo é compromisso", () => {
    expect(extractFollowUp("Eu vou pensar sobre isso.", "Ana Exemplo", MEMBERS, BASE)).toBeNull();
    expect(extractFollowUp("Eu me comprometo a revisar o termo.", "Ana Exemplo", MEMBERS, BASE)).toMatchObject({ responsible: { userId: "u-ana" }, due: null });
  });
  it("decisão e pendência", () => {
    expect(isDecision("Foi aprovada a proposta B.")).toBe(true);
    expect(isDecision("Ficou acordado que o piloto começa em janeiro.")).toBe(true);
    expect(isDecision("Ainda não foi decidido o fornecedor.")).toBe(false);
    expect(isPending("Ainda não foi decidido o fornecedor.")).toBe(true);
    expect(isPending("O orçamento fica pendente.")).toBe(true);
  });
  it("frases: não quebra em abreviação", () => {
    expect(splitSentences("A Dra. Ana falou. Depois o Sr. Bruno; enfim.")).toEqual(["A Dra. Ana falou.", "Depois o Sr. Bruno;", "enfim."]);
  });
});

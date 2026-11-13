import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import { RULES, REFERENCES } from "./rules";
import type { BlockKind, Finding, TextGenre } from "./types";

interface Opts { genre?: TextGenre; kind?: BlockKind }
const run = (text: string, o: Opts = {}) =>
  analyzeDocument([{ id: "b1", kind: o.kind ?? "PARAGRAFO", text }], { revision: 1, policyVersion: 1, genre: o.genre ?? "TECNICO", docType: "LIVRE", language: "pt-BR" }).findings;
const only = (text: string, ruleId: string, o: Opts = {}) => run(text, o).filter((f) => f.ruleId === ruleId);
/** aplica a correção segura do achado no texto */
const fix = (text: string, f: Finding) => text.slice(0, f.start) + (f.replacement ?? "") + text.slice(f.end);
const one = (text: string, ruleId: string, o: Opts = {}) => {
  const list = only(text, ruleId, o);
  expect(list, `${ruleId} em «${text}»`).toHaveLength(1);
  return list[0]!;
};

describe("crase", () => {
  it("antes de verbo: «à partir» → «a partir»", () => {
    const t = "A equipe começou à partir de março.";
    const f = one(t, "CRASE_VERBO");
    expect(f).toMatchObject({ excerpt: "à", severity: "ERRO", certainty: "DEMONSTRAVEL" });
    expect(fix(t, f)).toBe("A equipe começou a partir de março.");
    expect(only("A equipe começou a partir de março.", "CRASE_VERBO")).toEqual([]);
  });

  it("antes de pronome que não admite artigo; «à uma hora» é correto", () => {
    const t = "Entreguei o documento à esta comissão.";
    expect(fix(t, one(t, "CRASE_PRONOME"))).toBe("Entreguei o documento a esta comissão.");
    expect(only("A reunião começa à uma hora.", "CRASE_PRONOME")).toEqual([]);
    expect(only("Entreguei o documento a esta comissão.", "CRASE_PRONOME")).toEqual([]);
  });

  it("antes de palavra masculina: expressão fixa tem correção; nome comum só alternativas", () => {
    const t = "Fomos à pé até o prédio.";
    expect(fix(t, one(t, "CRASE_MASCULINO"))).toBe("Fomos a pé até o prédio.");
    const f = one("Encaminhei o pedido à protocolo.", "CRASE_MASCULINO");
    expect(f.replacement).toBeNull();
    expect(f.suggestions).toEqual(["a", "ao"]);
    expect(only("Fomos à reunião do conselho.", "CRASE_MASCULINO")).toEqual([]);
    expect(only("A equipe está à disposição.", "CRASE_MASCULINO")).toEqual([]);
  });

  it("à + plural: aponta, sem correção automática", () => {
    const f = one("Compareci à reuniões do conselho.", "CRASE_PLURAL");
    expect(f.replacement).toBeNull();
    expect(f.suggestions).toEqual(["às", "a"]);
    expect(only("Compareci às reuniões do conselho.", "CRASE_PLURAL")).toEqual([]);
  });

  it("locuções: «à medida que» e «às vezes»; «todas as vezes» não", () => {
    const t = "A medida que o projeto avança, surgem dúvidas.";
    expect(fix(t, one(t, "CRASE_LOCUCAO"))).toBe("À medida que o projeto avança, surgem dúvidas.");
    const v = "As vezes o sistema falha.";
    const f = one(v, "CRASE_LOCUCAO");
    expect(fix(v, f)).toBe("Às vezes o sistema falha.");
    expect(f.certainty).toBe("HIPOTESE");
    expect(only("Todas as vezes que o sistema falha, há registro.", "CRASE_LOCUCAO")).toEqual([]);
    expect(only("À medida que o projeto avança, surgem dúvidas.", "CRASE_LOCUCAO")).toEqual([]);
  });

  it("«devido à» antes de feminino singular; plural sem artigo é correto", () => {
    const t = "O atraso ocorreu devido a falta de pessoal.";
    expect(fix(t, one(t, "CRASE_DEVIDO"))).toBe("O atraso ocorreu devido à falta de pessoal.");
    expect(only("O atraso ocorreu devido a falhas no sistema.", "CRASE_DEVIDO")).toEqual([]);
  });
});

describe("concordância", () => {
  it("nominal de número: «os documento» e «o documentos»", () => {
    const t = "Os documento foram enviados.";
    const f = one(t, "CONCORDANCIA_NOMINAL");
    expect(fix(t, f)).toBe("Os documentos foram enviados.");
    expect(f.suggestions).toContain("O documento");
    const u = "O documentos chegaram.";
    expect(fix(u, one(u, "CONCORDANCIA_NOMINAL"))).toBe("Os documentos chegaram.");
    expect(only("Os documentos foram enviados.", "CONCORDANCIA_NOMINAL")).toEqual([]);
    expect(only("O lápis caiu da mesa.", "CONCORDANCIA_NOMINAL")).toEqual([]);
  });

  it("plural seguro: -ão de -ção vira -ções; -el/-il conforme a tônica", () => {
    const t = "As reunião terminaram.";
    expect(fix(t, one(t, "CONCORDANCIA_NOMINAL"))).toBe("As reuniões terminaram.");
    const n = "Os nível de acesso mudaram.";
    expect(fix(n, one(n, "CONCORDANCIA_NOMINAL"))).toBe("Os níveis de acesso mudaram.");
  });

  it("gênero do determinante pelo sufixo do nome: «o reunião»", () => {
    const t = "O reunião foi adiada.";
    expect(fix(t, one(t, "CONCORDANCIA_GENERO"))).toBe("A reunião foi adiada.");
    expect(only("A reunião foi adiada.", "CONCORDANCIA_GENERO")).toEqual([]);
    expect(only("O personagem central saiu.", "CONCORDANCIA_GENERO")).toEqual([]);
  });

  it("nome + particípio: número e gênero", () => {
    const t = "Os documentos analisado estão no anexo.";
    expect(fix(t, one(t, "CONCORDANCIA_ADJETIVO"))).toBe("Os documentos analisados estão no anexo.");
    const g = "A reunião realizado ontem terminou cedo.";
    expect(fix(g, one(g, "CONCORDANCIA_ADJETIVO"))).toBe("A reunião realizada ontem terminou cedo.");
    expect(only("Os documentos analisados estão no anexo.", "CONCORDANCIA_ADJETIVO")).toEqual([]);
  });

  it("verbal: sujeito plural × verbo singular e o contrário", () => {
    const t = "Os servidores participou da reunião.";
    const f = one(t, "CONCORDANCIA_VERBAL");
    expect(fix(t, f)).toBe("Os servidores participaram da reunião.");
    expect(f.certainty).toBe("DEMONSTRAVEL");
    const u = "O servidor participaram da reunião.";
    expect(fix(u, one(u, "CONCORDANCIA_VERBAL"))).toBe("O servidor participou da reunião.");
    expect(only("Os servidores participaram da reunião.", "CONCORDANCIA_VERBAL")).toEqual([]);
  });

  it("verbal: coletivo partitivo e sujeito composto não são apontados; atração pelo complemento é hipótese", () => {
    expect(only("A maioria dos servidores participaram.", "CONCORDANCIA_VERBAL")).toEqual([]);
    expect(only("O servidor e o gestor participaram.", "CONCORDANCIA_VERBAL")).toEqual([]);
    const t = "O relatório dos auditores apontaram falhas.";
    const f = one(t, "CONCORDANCIA_VERBAL");
    expect(fix(t, f)).toBe("O relatório dos auditores apontou falhas.");
    expect(f.certainty).toBe("HIPOTESE");
  });

  it("pronome sujeito × pessoa do verbo", () => {
    const t = "Eles participou da reunião.";
    expect(fix(t, one(t, "CONCORDANCIA_PRONOME"))).toBe("Eles participaram da reunião.");
    const n = "Nós foi ao evento.";
    expect(fix(n, one(n, "CONCORDANCIA_PRONOME"))).toBe("Nós fomos ao evento.");
    expect(only("Eles participaram da reunião.", "CONCORDANCIA_PRONOME")).toEqual([]);
  });

  it("haver existencial e fazer (tempo) são impessoais", () => {
    const t = "Haviam muitos problemas no sistema.";
    expect(fix(t, one(t, "VERBO_IMPESSOAL"))).toBe("Havia muitos problemas no sistema.");
    const f = "Fazem dois anos que o sistema foi implantado.";
    expect(fix(f, one(f, "VERBO_IMPESSOAL"))).toBe("Faz dois anos que o sistema foi implantado.");
    expect(only("Os servidores haviam saído cedo.", "VERBO_IMPESSOAL")).toEqual([]);
    expect(only("Havia muitos problemas no sistema.", "VERBO_IMPESSOAL")).toEqual([]);
  });
});

describe("regência", () => {
  it("assistir (ver) pede «a» — hipótese, porque «assistir o paciente» (ajudar) é correto", () => {
    const t = "Os gestores assistiram o seminário.";
    const f = one(t, "REGENCIA_ASSISTIR");
    expect(fix(t, f)).toBe("Os gestores assistiram ao seminário.");
    expect(f.certainty).toBe("HIPOTESE");
    expect(only("Os gestores assistiram ao seminário.", "REGENCIA_ASSISTIR")).toEqual([]);
  });

  it("obedecer a", () => {
    const t = "Todos devem obedecer o regulamento.";
    expect(fix(t, one(t, "REGENCIA_OBEDECER"))).toBe("Todos devem obedecer ao regulamento.");
    expect(only("Todos devem obedecer ao regulamento.", "REGENCIA_OBEDECER")).toEqual([]);
  });

  it("preferir … a (sem «do que» e sem «mais»)", () => {
    const t = "Prefiro trabalhar do que esperar.";
    expect(fix(t, one(t, "REGENCIA_PREFERIR"))).toBe("Prefiro trabalhar a esperar.");
    const m = "Prefiro mais o atendimento presencial.";
    expect(fix(m, one(m, "REGENCIA_PREFERIR"))).toBe("Prefiro o atendimento presencial.");
    expect(only("Prefiro trabalhar a esperar.", "REGENCIA_PREFERIR")).toEqual([]);
    expect(only("Prefiro que você venha amanhã.", "REGENCIA_PREFERIR")).toEqual([]);
  });

  it("implicar (acarretar) sem «em»", () => {
    const t = "A medida implica em custos.";
    expect(fix(t, one(t, "REGENCIA_IMPLICAR"))).toBe("A medida implica custos.");
    const u = "Isso implica no aumento do prazo.";
    expect(fix(u, one(u, "REGENCIA_IMPLICAR"))).toBe("Isso implica o aumento do prazo.");
    expect(only("A medida implica custos.", "REGENCIA_IMPLICAR")).toEqual([]);
    expect(only("Ele se implicou em fraudes.", "REGENCIA_IMPLICAR")).toEqual([]);
  });
});

describe("usos, pleonasmos e estilo", () => {
  it("«onde» só para lugar: tempo é demonstrável, situação é hipótese", () => {
    const t = "No período onde o sistema caiu, nada foi registrado.";
    const f = one(t, "ONDE_TEMPO");
    expect(fix(t, f)).toBe("No período em que o sistema caiu, nada foi registrado.");
    expect(f.certainty).toBe("DEMONSTRAVEL");
    expect(one("Na reunião onde decidimos o prazo.", "ONDE_TEMPO").certainty).toBe("HIPOTESE");
    expect(only("No prédio onde funciona a secretaria.", "ONDE_TEMPO")).toEqual([]);
  });

  it("«a nível de»: só alternativas (depende do sentido); «ao nível do mar» é correto", () => {
    const f = one("A nível de sistema ainda há falhas.", "A_NIVEL_DE");
    expect(f.replacement).toBeNull();
    expect(f.suggestions).toEqual(["Em nível de", "No âmbito de", "Quanto a"]);
    expect(only("A cidade fica ao nível do mar.", "A_NIVEL_DE")).toEqual([]);
  });

  it("pleonasmos com correção", () => {
    const t = "O valor subiu para cima e criou um elo de ligação há dez anos atrás.";
    const list = only(t, "PLEONASMO");
    expect(list.map((f) => f.replacement)).toEqual(["subiu", "elo", "há dez anos"]);
    expect(only("O valor subiu dez por cento.", "PLEONASMO")).toEqual([]);
  });

  it("palavra duplicada", () => {
    const t = "O relatório de de auditoria.";
    expect(fix(t, one(t, "PALAVRA_DUPLICADA"))).toBe("O relatório de auditoria.");
    expect(only("Aprendeu pouco a pouco.", "PALAVRA_DUPLICADA")).toEqual([]);
  });

  it("repetição próxima aponta a segunda ocorrência e liga à primeira", () => {
    const f = one("O sistema registrou falhas e depois o sistema parou.", "REPETICAO_PROXIMA");
    expect(f.excerpt).toBe("sistema");
    expect(f.related?.[0]?.excerpt).toBe("sistema");
    expect(only("O sistema registrou falhas graves durante a madrugada de domingo, quando a equipe de plantão estava reduzida e o monitoramento automático não alertou ninguém; só na segunda o sistema voltou.", "REPETICAO_PROXIMA")).toEqual([]);
  });

  it("frase longa (> 40 palavras)", () => {
    const long = `${Array.from({ length: 44 }, (_, i) => `palavra${i}`).join(" ")}.`;
    expect(one(long, "FRASE_LONGA").vars).toMatchObject({ count: 44, limit: 40 });
    expect(only("Uma frase curta e direta.", "FRASE_LONGA")).toEqual([]);
  });

  it("espaço antes de pontuação e espaço duplo", () => {
    const t = "O prazo acabou . Veja ( anexo).";
    const list = only(t, "ESPACO_ANTES_PONTUACAO");
    expect(list.map((f) => f.replacement)).toEqual([".", "("]);
    const d = "O  prazo acabou.";
    expect(fix(d, one(d, "ESPACO_DUPLO"))).toBe("O prazo acabou.");
    expect(only("O prazo acabou. Veja (anexo).", "ESPACO_ANTES_PONTUACAO")).toEqual([]);
  });

  it("registro informal só em gênero técnico/acadêmico e fora de aspas", () => {
    const t = "Enviamos pra equipe e vc confirma.";
    expect(only(t, "REGISTRO_INFORMAL").map((f) => f.replacement)).toEqual(["para", "você"]);
    expect(only(t, "REGISTRO_INFORMAL", { genre: "NARRATIVO" })).toEqual([]);
    expect(only("O cidadão escreveu: “vc demora pra responder”.", "REGISTRO_INFORMAL")).toEqual([]);
  });
});

describe("pessoa e voz (aba Morfossintaxe)", () => {
  it("tratamento misturado: corrige o minoritário (empate fica com «você»)", () => {
    const t = "Você pode enviar o arquivo. Caso tenhas dúvidas, ligue.";
    const f = one(t, "TRATAMENTO_MISTO");
    expect(f).toMatchObject({ excerpt: "tenhas", replacement: "tenha", tab: "MORFOSSINTAXE" });
    expect(only("Você pode enviar o arquivo. Caso tenha dúvidas, ligue.", "TRATAMENTO_MISTO")).toEqual([]);
  });

  it("tratamento: maioria «tu» marca o «você», sem correção automática; fala entre aspas não conta", () => {
    const list = only("Você pode enviar. Caso tenhas dúvidas, tu podes ligar.", "TRATAMENTO_MISTO");
    expect(list.map((f) => f.excerpt)).toEqual(["Você"]);
    expect(list[0]!.replacement).toBeNull();
    expect(only("Você deve ler o parecer. O cidadão disse: “tu vais ver”.", "TRATAMENTO_MISTO")).toEqual([]);
  });

  it("excesso de voz passiva (mais da metade das frases)", () => {
    const t = "Foram analisados os processos. Foram entrevistados os servidores. A amostra foi definida por sorteio. A equipe revisou os dados.";
    const f = one(t, "VOZ_PASSIVA");
    expect(f.vars).toMatchObject({ count: 3, total: 4, pct: 75 });
    expect(only("A equipe analisou os processos. Os servidores responderam. A amostra foi definida por sorteio. A equipe revisou os dados.", "VOZ_PASSIVA")).toEqual([]);
  });
});

describe("escopo das regras", () => {
  it("fala entre aspas não é corrigida; citação longa e referências não recebem regra gramatical", () => {
    expect(only("O diretor disse: “os servidores participou de tudo”.", "CONCORDANCIA_VERBAL")).toEqual([]);
    expect(run("Os servidores participou da reunião.", { kind: "CITACAO" }).filter((f) => f.tab === "GRAMATICA")).toEqual([]);
  });

  it("todo achado traz regra do catálogo, referência sem edição/página e confiança", () => {
    const findings = run("Os servidores participou à partir de março, devido a falta de pessoal.");
    expect(findings.length).toBeGreaterThan(2);
    for (const f of findings) {
      const rule = RULES[f.ruleId]!;
      expect(rule).toBeDefined();
      expect(REFERENCES[rule.reference]!.verified).toBe(false);
      expect(REFERENCES[rule.reference]!.citation).not.toMatch(/\bp\.\s*\d|\d+\.\s*ed\./);
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
      expect(f.origin).toBe("HEURISTICA");
    }
  });
});

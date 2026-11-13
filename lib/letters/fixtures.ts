/**
 * Peças DEMO do Letters (dados fictícios em português, com erros de propósito para o copiloto apontar). Vivem só na
 * memória da aba do navegador; não existe API de peças ainda (RF52: PieceController planejado).
 */
import type { AutonomyMode } from "@/lib/ai/autonomy";
import { createPiece, type LetterPiece } from "./pieces";
import type { LetterBlock } from "./types";

export const LETTERS_DEMO_USER = "u-pessoa";

type B = Omit<LetterBlock, "id">;
const h1 = (text: string): B => ({ kind: "TITULO", level: 1, text });
const h2 = (text: string): B => ({ kind: "TITULO", level: 2, text });
const p = (text: string): B => ({ kind: "PARAGRAFO", text });

export const DEMO_REPORT_BLOCKS: B[] = [
  h1("Relatório técnico — Auditoria do sistema de protocolo digital"),
  h2("1 Introdução"),
  p("Este relatório apresenta os resultados da auditoria realizada no sistema de protocolo digital da Secretaria entre março e junho de 2026. A auditoria foi solicitada pela Diretoria de Tecnologia à partir de reclamações registradas na ouvidoria. Segundo Silva (2020), a rastreabilidade dos documentos é condição para a transparência administrativa."),
  h2("2 Objetivo"),
  p("O objetivo é verificar se os servidores obedecem o fluxo de tramitação definido no manual e se o sistema registra corretamente cada movimentação dos processo."),
  h2("3 Metodologia"),
  p("Foram analisados 1.200 processos. Foram entrevistados doze servidores. Os dados foram coletados no sistema e foram comparados com os registros em papel. A amostra foi definida por sorteio. Haviam muitos processos sem despacho no período onde o sistema ficou indisponível."),
  h2("4 Resultados"),
  p("Os servidores participou das capacitações, mas a nível de sistema ainda há falhas. O tempo médio de tramitação implica em atrasos para o cidadão, conforme a literatura (SOUZA, 2019, p. 45). Segundo o relatório anterior (COSTA, 2018), o problema persiste. Em suma, os processo digitais ainda dependem de conferência manual, o que encarece o serviço e exige que a equipe assista os usuários e ainda prefira o atendimento presencial do que o eletrônico, situação que se repete há três anos atrás em todas as unidades da Secretaria, inclusive nas regionais do interior do estado."),
  h2("5 Conclusão"),
  p("Conclui-se que o sistema precisa de ajustes. Recomenda-se a revisão do fluxo e um elo de ligação entre a ouvidoria e a equipe técnica [5]."),
  h2("Referências"),
  {
    kind: "REFERENCIAS",
    text: [
      "SILVA, João. Gestão documental no setor público. São Paulo: Atlas, 2020.",
      "SOUZA, Maria. Tempo de tramitação e eficiência administrativa. Revista de Administração Pública, v. 55, n. 2, p. 30-52, 2021. DOI: 10.1590/0034-761220200123.",
      "Pereira, Ana. Protocolo eletrônico: guia prático. Brasília: Enap, 2019.",
      "BRASIL. Lei nº 12.527, de 18 de novembro de 2011. Regula o acesso a informações. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm.",
    ].join("\n"),
  },
];

export const DEMO_OFICIO_BLOCKS: B[] = [
  p("Ofício nº 45/2026 – DTI"),
  p("Curitiba, 10 de novembro de 2026."),
  p("Ao Senhor\nDiretor-Geral da Secretaria"),
  p("Senhor Diretor-Geral,"),
  p("Encaminho, para conhecimento, o relatório da auditoria do sistema de protocolo digital. Informo que você poderá consultar os anexos no sistema. Caso tenhas dúvidas, a equipe está à disposição para esclarecer os pontos pendentes."),
  p("Atenciosamente,"),
  p("Pessoa Exemplo\nDiretora de Tecnologia"),
];

export const DEMO_PARECER_BLOCKS: B[] = [
  h1("Parecer nº 12/2026"),
  p("Ementa: adesão à ata de registro de preços para aquisição de computadores."),
  h2("1 Relatório"),
  p("Trata-se de consulta sobre a possibilidade de adesão à ata de registro de preços nº 8/2026. O processo foi instruído com a pesquisa de preços e o termo de referência."),
  h2("2 Análise"),
  p("A adesão é admitida desde que demonstrada a vantagem econômica. Os documentos apresentados comprovam a vantagem, devido a diferença de preço em relação à média de mercado."),
];

export const DEMO_NARRATIVE_BLOCKS: B[] = [
  h1("Exercício narrativo — A última sessão"),
  p("Marta morreu na primavera de 1998, pouco depois de concluir o arquivo da repartição. O velório reuniu todos os colegas da seção."),
  p("Vinte anos depois, Marta abriu a porta da sala de reuniões e cumprimentou os novos servidores. Ninguém comentou o fato."),
];

export function buildDemoPieces(now: Date, mode: AutonomyMode = "SOB_SOLICITACAO"): LetterPiece[] {
  const at = (days: number) => new Date(now.getTime() + days * 86_400_000);
  return [
    createPiece({ id: "relatorio-auditoria-protocolo", title: "Relatório técnico — Auditoria do protocolo digital", docType: "RELATORIO_TECNICO", ownerId: LETTERS_DEMO_USER, now: at(-2), blocks: DEMO_REPORT_BLOCKS, mode }),
    createPiece({ id: "oficio-45-2026", title: "Ofício nº 45/2026 — Encaminhamento do relatório", docType: "OFICIO", ownerId: LETTERS_DEMO_USER, now: at(-1), blocks: DEMO_OFICIO_BLOCKS, mode }),
    createPiece({ id: "parecer-12-2026", title: "Parecer nº 12/2026 — Adesão à ata de registro de preços", docType: "PARECER", ownerId: LETTERS_DEMO_USER, now: at(-5), blocks: DEMO_PARECER_BLOCKS, mode }),
    createPiece({ id: "exercicio-narrativo", title: "Exercício narrativo — A última sessão", docType: "LIVRE", genre: "NARRATIVO", ownerId: LETTERS_DEMO_USER, now: at(-9), blocks: DEMO_NARRATIVE_BLOCKS, mode }),
  ];
}

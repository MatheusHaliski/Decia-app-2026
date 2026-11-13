import { it } from "vitest";
import { analyzeMorphology } from "./morph";
import { tokenize } from "./tokenize";

const show = (text: string) => {
  const { tokens } = analyzeMorphology(text);
  console.log(text + "\n  " + tokens.filter(t => t.kind !== "PONTUACAO").map(t => `${t.text}/${t.pos ?? "AMB(" + t.candidates.map(c => c.pos.slice(0,4) + c.p).join(",") + ")"}${t.verb ? "[" + [t.verb.lemma, t.verb.tempo ?? t.verb.tempos.join("|"), t.verb.modo ?? t.verb.modos.join("|"), t.verb.pessoa ?? "", t.verb.numero ?? "", t.verb.forma ?? ""].join(",") + "]" : ""}${t.confidence < 1 ? ":" + t.confidence : ""}`).join(" "));
};

it("explore", () => {
  const s = tokenize("O Sr. Silva chegou às 10h. Ele disse: “Os dados do relatório (p. 12) são 3,5% maiores.” Depois, saiu! Acesso em: 12 mar. 2024. Fim.");
  console.log(s.sentences.map(x => x.text));
  console.log(s.tokens.map(t => `${t.text}|${t.kind}${t.contraction ? "(" + t.contraction.join("+") + ")" : ""}`).join(" "));
  show("O relatório apresenta os resultados da auditoria realizada pela equipe técnica.");
  show("Os servidores participou da reunião e o gestor analisou os documento.");
  show("A equipe começou a trabalhar à partir de março, devido a falta de recursos.");
  show("Não o encontrei no sistema. Se houver falhas, o controle será revisto.");
  show("O uso do sistema implica em custos que a equipe não previu.");
  show("Eu como pouco. Nossa, que dia! Segundo o autor, o segundo relatório é melhor.");
  show("Haviam muitos problemas na fase onde os testes foram feitos.");
  show("Para realizar a análise, é preciso que o servidor apresente os dados quando for solicitado.");
  show("Encaminho o relatório para conhecimento e providências.");
  show("A medida que o projeto avança, as vezes surgem dúvidas.");
});

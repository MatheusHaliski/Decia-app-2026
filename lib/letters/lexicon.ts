/**
 * Léxico fechado do português (RF53.CA01): artigos, preposições, conjunções, pronomes, advérbios, numerais e
 * interjeições, com as ambiguidades clássicas ("a" artigo/preposição/pronome, "que" conjunção/pronome, "um"
 * artigo/numeral…) como leituras concorrentes com probabilidade a priori. O contexto decide em `morph.ts`.
 * Inclui também exceções de sufixo (palavras que "parecem" verbo, advérbio ou adjetivo e não são).
 */
import type { PartOfSpeech } from "./types";

export interface Reading {
  pos: PartOfSpeech;
  p: number;
  sub?: string;
}

const LEX = new Map<string, Reading[]>();

function add(words: string, ...readings: Reading[]) {
  for (const w of words.split(/\s+/).filter(Boolean)) LEX.set(w, [...(LEX.get(w) ?? []), ...readings]);
}
const r = (pos: PartOfSpeech, p: number, sub?: string): Reading => ({ pos, p, sub });

/* Artigos (e as ambiguidades com preposição/pronome/numeral) */
add("o os", r("ARTIGO", 0.6, "definido"), r("PRONOME", 0.4, "oblíquo"));
add("a", r("ARTIGO", 0.5, "definido"), r("PREPOSICAO", 0.35, "essencial"), r("PRONOME", 0.15, "oblíquo"));
add("as", r("ARTIGO", 0.6, "definido"), r("PRONOME", 0.4, "oblíquo"));
add("um uma", r("ARTIGO", 0.65, "indefinido"), r("NUMERAL", 0.35, "cardinal"));
add("uns umas", r("ARTIGO", 0.7, "indefinido"), r("PRONOME", 0.3, "indefinido"));

/* Preposições essenciais e acidentais */
add("ante após com contra de desde em entre para perante por sem sob sobre trás per", r("PREPOSICAO", 0.95, "essencial"));
add("durante mediante exceto salvo", r("PREPOSICAO", 0.85, "acidental"), r("ADJETIVO", 0.15));
add("até", r("PREPOSICAO", 0.8, "essencial"), r("ADVERBIO", 0.2));
add("segundo", r("NUMERAL", 0.4, "ordinal"), r("PREPOSICAO", 0.35, "acidental"), r("SUBSTANTIVO", 0.25));
add("conforme", r("CONJUNCAO", 0.5, "conformativa"), r("PREPOSICAO", 0.5, "acidental"));
add("consoante", r("PREPOSICAO", 0.6, "acidental"), r("CONJUNCAO", 0.4));
add("via", r("SUBSTANTIVO", 0.4), r("PREPOSICAO", 0.3, "acidental"), r("VERBO", 0.3));

/* Conjunções */
add("e nem mas porém contudo todavia entretanto ou portanto porque porquanto embora enquanto conquanto pois", r("CONJUNCAO", 0.95));
add("senão", r("CONJUNCAO", 0.8), r("SUBSTANTIVO", 0.2));
add("que", r("CONJUNCAO", 0.5, "integrante"), r("PRONOME", 0.5, "relativo"));
add("se", r("PRONOME", 0.55, "oblíquo"), r("CONJUNCAO", 0.45, "condicional"));
add("como", r("CONJUNCAO", 0.55, "comparativa"), r("ADVERBIO", 0.45, "interrogativo"));
add("quando", r("CONJUNCAO", 0.7, "temporal"), r("ADVERBIO", 0.3, "interrogativo"));
add("caso", r("SUBSTANTIVO", 0.6), r("CONJUNCAO", 0.4, "condicional"));
add("ora", r("CONJUNCAO", 0.5, "alternativa"), r("ADVERBIO", 0.5));
add("logo", r("ADVERBIO", 0.6), r("CONJUNCAO", 0.4, "conclusiva"));
add("quer", r("VERBO", 0.8), r("CONJUNCAO", 0.2, "alternativa"));

/* Advérbios */
add(
  "não sim já ainda sempre nunca jamais também tampouco demais quase apenas somente aqui ali lá cá aí acolá além aquém atrás " +
    "adiante dentro perto longe acima abaixo embaixo debaixo através hoje ontem amanhã agora depois antes cedo tarde então assim " +
    "talvez decerto porventura aliás inclusive sobretudo outrossim ademais sequer enfim afinal deveras quiçá eis tão",
  r("ADVERBIO", 0.95),
);
add("fora", r("ADVERBIO", 0.5), r("VERBO", 0.3), r("PREPOSICAO", 0.2));
add("muito pouco", r("ADVERBIO", 0.5), r("PRONOME", 0.5, "indefinido"));
add("bastante", r("ADVERBIO", 0.5), r("PRONOME", 0.3, "indefinido"), r("ADJETIVO", 0.2));
add("bem", r("ADVERBIO", 0.85), r("SUBSTANTIVO", 0.15));
add("mal", r("ADVERBIO", 0.7), r("SUBSTANTIVO", 0.3));
add("mais menos", r("ADVERBIO", 0.9, "intensidade"), r("PRONOME", 0.1, "indefinido"));
add("tanto", r("ADVERBIO", 0.5), r("PRONOME", 0.5, "indefinido"));
add("só", r("ADVERBIO", 0.55), r("ADJETIVO", 0.45));
add("meio", r("SUBSTANTIVO", 0.4), r("ADVERBIO", 0.3), r("NUMERAL", 0.3, "fracionário"));
add("breve", r("ADJETIVO", 0.6), r("ADVERBIO", 0.4));
add("onde aonde donde", r("ADVERBIO", 0.7, "relativo"), r("PRONOME", 0.3, "relativo"));
add("primeiro", r("NUMERAL", 0.8, "ordinal"), r("ADVERBIO", 0.2));

/* Pronomes */
add("eu tu ele ela nós vós eles elas", r("PRONOME", 0.95, "pessoal reto"));
add("me te lhe lhes vos mim ti si comigo contigo consigo conosco convosco lo la los las", r("PRONOME", 0.95, "pessoal oblíquo"));
add("você vocês", r("PRONOME", 0.95, "tratamento"));
add("senhor senhora senhores senhoras", r("SUBSTANTIVO", 0.6), r("PRONOME", 0.4, "tratamento"));
add("meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossos nossas vosso vossa vossos vossas", r("PRONOME", 0.95, "possessivo"));
add("nossa", r("PRONOME", 0.9, "possessivo"), r("INTERJEICAO", 0.1));
add("este esta estes estas isto esse essa esses essas isso aquele aquela aqueles aquelas aquilo tal tais", r("PRONOME", 0.95, "demonstrativo"));
add("mesmo", r("PRONOME", 0.6, "demonstrativo"), r("ADVERBIO", 0.4));
add("mesma mesmos mesmas", r("PRONOME", 0.9, "demonstrativo"));
add("próprio própria próprios próprias", r("PRONOME", 0.5, "demonstrativo"), r("ADJETIVO", 0.5));
add(
  "algum alguma alguns algumas nenhum nenhuma nenhuns nenhumas todo toda todos todas tudo nada ninguém alguém outrem outro outra " +
    "outros outras vários várias cada qualquer quaisquer muita muitos muitas pouca poucos poucas tanta tantos tantas",
  r("PRONOME", 0.95, "indefinido"),
);
add("certo certa", r("PRONOME", 0.5, "indefinido"), r("ADJETIVO", 0.5));
add("certos certas", r("PRONOME", 0.7, "indefinido"), r("ADJETIVO", 0.3));
add("quem qual quais", r("PRONOME", 0.95, "relativo/interrogativo"));
add("cujo cuja cujos cujas", r("PRONOME", 0.95, "relativo"));
add("quanto", r("PRONOME", 0.6, "relativo/interrogativo"), r("ADVERBIO", 0.4));
add("quanta quantos quantas", r("PRONOME", 0.95, "relativo/interrogativo"));

/* Numerais */
add(
  "zero dois duas três quatro cinco seis sete oito nove dez onze doze treze catorze quatorze quinze dezesseis dezessete dezoito " +
    "dezenove vinte trinta quarenta cinquenta sessenta setenta oitenta noventa cem cento duzentos duzentas trezentos trezentas " +
    "quatrocentos quinhentos seiscentos setecentos oitocentos novecentos mil milhão milhões bilhão bilhões trilhão",
  r("NUMERAL", 0.95, "cardinal"),
);
add(
  "primeira primeiros primeiras terceiro terceira terceiros terceiras quinto sexto sétimo sétima oitavo nono nona décimo décima " +
    "vigésimo trigésimo centésimo milésimo",
  r("NUMERAL", 0.9, "ordinal"),
);
add("segunda", r("NUMERAL", 0.6, "ordinal"), r("SUBSTANTIVO", 0.4));
add("quarto quarta quinta sexta oitava", r("NUMERAL", 0.5, "ordinal"), r("SUBSTANTIVO", 0.5));
add("dobro triplo duplo", r("NUMERAL", 0.8, "multiplicativo"), r("ADJETIVO", 0.2));
add("metade terço", r("NUMERAL", 0.5, "fracionário"), r("SUBSTANTIVO", 0.5));

/* Interjeições */
add("ah oh ai ui olá oi oba opa ufa puxa eita psiu ei hein uau oxalá xi credo", r("INTERJEICAO", 0.95));
add("viva", r("INTERJEICAO", 0.4), r("VERBO", 0.3), r("ADJETIVO", 0.3));
add("bravo", r("ADJETIVO", 0.6), r("INTERJEICAO", 0.4));
add("tomara", r("INTERJEICAO", 0.5), r("VERBO", 0.5));

/* Exceções de sufixo: parecem verbo/advérbio/adjetivo e são substantivos (ou o contrário) */
add("lugar mar par bar lar mulher colher prazer lazer açúcar radar", r("SUBSTANTIVO", 0.95));
add("ser", r("VERBO", 0.9), r("SUBSTANTIVO", 0.1));
add("poder dever parecer", r("VERBO", 0.5), r("SUBSTANTIVO", 0.5));
add(
  "familiar militar escolar popular similar particular celular titular auxiliar singular polar solar nuclear linear modular " +
    "molecular exemplar elementar parlamentar secular vulgar estelar regular circular complementar regulamentar",
  r("ADJETIVO", 0.7), r("SUBSTANTIVO", 0.3),
);
add("melhor pior", r("ADJETIVO", 0.75), r("ADVERBIO", 0.25));
add("maior menor superior inferior anterior posterior interior exterior ulterior", r("ADJETIVO", 0.85), r("SUBSTANTIVO", 0.15));
add("comando bando dividendo adendo referendo remendo", r("SUBSTANTIVO", 0.9));
add("brando lindo tremendo horrendo estupendo infindo bem-vindo", r("ADJETIVO", 0.9));
add("mente", r("SUBSTANTIVO", 0.6), r("VERBO", 0.4));
add("semente", r("SUBSTANTIVO", 0.95));
add("demente veemente clemente", r("ADJETIVO", 0.9));
add("lei rei", r("SUBSTANTIVO", 0.95));
add("verão porão", r("SUBSTANTIVO", 0.6), r("VERBO", 0.4));
add("classe impasse", r("SUBSTANTIVO", 0.95));
add("interesse", r("SUBSTANTIVO", 0.75), r("VERBO", 0.25));
add("era", r("VERBO", 0.75), r("SUBSTANTIVO", 0.25));
add("são", r("VERBO", 0.85), r("ADJETIVO", 0.15));
add("estado", r("SUBSTANTIVO", 0.6), r("VERBO", 0.4));
add("dado dados", r("SUBSTANTIVO", 0.6), r("VERBO", 0.4));
add("feito", r("VERBO", 0.5), r("ADJETIVO", 0.3), r("SUBSTANTIVO", 0.2));
add("visto", r("VERBO", 0.5), r("SUBSTANTIVO", 0.3), r("ADJETIVO", 0.2));
add("posto", r("SUBSTANTIVO", 0.5), r("VERBO", 0.5));
add("parte partes", r("SUBSTANTIVO", 0.9), r("VERBO", 0.1));
add("tema temas sistema sistemas problema problemas programa programas", r("SUBSTANTIVO", 0.85), r("VERBO", 0.15));
add("objetivo objetivos", r("SUBSTANTIVO", 0.6), r("ADJETIVO", 0.4));
add("preciso completo expresso vivo pago", r("ADJETIVO", 0.55), r("VERBO", 0.45));

/**
 * Formas verbais regulares que também são substantivos comuns ("o controle", "a consulta", "o registro"): recebem as
 * duas leituras e o contexto decide. As demais formas conhecidas do analisador ficam só como verbo.
 */
export const NOUN_HOMOGRAPHS: ReadonlySet<string> = new Set(
  (
    "ajuda ajuste alcance alerta busca consulta conta controle demanda destaque detalhe entrega espera estima fala informe limite " +
    "lista marca monte mostra nota pesquisa prova escolha coleta compra levante leve oriente passe chama cobra pratica " +
    "uso estudo trabalho registro processo projeto documento contrato aumento apoio envio anexo aviso destino inicio resumo " +
    "desempenho emprego encontro ensino fundamento ganho impacto incentivo manifesto marco motivo passo preparo protocolo reforço " +
    "regulamento relato resto voto consumo parto começo conto fecho gosto jogo olho trato arquivo avanço respaldo sustento " +
    "comunicado resultado pedido sentido partido cuidado contratado interessado convidado empregado encarregado delegado " +
    "significado aprovado convocado indicado"
  ).split(" "),
);

/** Leituras lexicais da forma (minúsculas, com acento), ou undefined. */
export function lexicon(lower: string): Reading[] | undefined {
  return LEX.get(lower);
}

/** Classes fechadas puras (o token não recebe leitura verbal/nominal do analisador de sufixos). */
export const CLOSED_CLASS: ReadonlySet<PartOfSpeech> = new Set(["ARTIGO", "PREPOSICAO", "CONJUNCAO", "PRONOME", "NUMERAL", "INTERJEICAO", "ADVERBIO"]);

/** Pronomes pessoais retos e de tratamento usados como sujeito, com pessoa/número. */
export const SUBJECT_PRONOUNS: Readonly<Record<string, { pessoa: 1 | 2 | 3; numero: "SG" | "PL" }>> = {
  eu: { pessoa: 1, numero: "SG" },
  tu: { pessoa: 2, numero: "SG" },
  ele: { pessoa: 3, numero: "SG" },
  ela: { pessoa: 3, numero: "SG" },
  você: { pessoa: 3, numero: "SG" },
  nós: { pessoa: 1, numero: "PL" },
  vós: { pessoa: 2, numero: "PL" },
  eles: { pessoa: 3, numero: "PL" },
  elas: { pessoa: 3, numero: "PL" },
  vocês: { pessoa: 3, numero: "PL" },
};

export const CLITICS = new Set(["me", "te", "se", "lhe", "lhes", "nos", "vos", "o", "a", "os", "as", "lo", "la", "los", "las", "no", "na"]);

/** Determinantes plurais (artigo, demonstrativo, possessivo, indefinido) para a concordância nominal. */
export const PLURAL_DETERMINERS = new Set([
  "os", "as", "uns", "umas", "estes", "estas", "esses", "essas", "aqueles", "aquelas", "meus", "minhas", "teus", "tuas", "seus", "suas",
  "nossos", "nossas", "vossos", "vossas", "alguns", "algumas", "vários", "várias", "muitos", "muitas", "poucos", "poucas", "todos",
  "todas", "outros", "outras", "certos", "certas", "tantos", "tantas", "quantos", "quantas", "dos", "das", "aos", "às", "pelos", "pelas",
  "nos", "nas", "desses", "dessas", "destes", "destas", "daqueles", "daquelas", "nesses", "nessas", "nestes", "nestas", "naqueles", "naquelas",
]);

/** Determinantes singulares (para a concordância verbal "o servidor participaram"). */
export const SINGULAR_ARTICLES = new Set(["o", "a", "um", "uma", "este", "esta", "esse", "essa", "aquele", "aquela", "meu", "minha", "seu", "sua", "nosso", "nossa"]);
export const PLURAL_ARTICLES = new Set(["os", "as", "uns", "umas", "estes", "estas", "esses", "essas", "aqueles", "aquelas", "meus", "minhas", "seus", "suas", "nossos", "nossas", "alguns", "algumas", "vários", "várias", "muitos", "muitas", "todos", "todas"]);

/** Formas de ser/estar/ficar (auxiliares da voz passiva analítica e de predicativo). */
export const PASSIVE_AUX_LEMMAS = new Set(["ser", "ser|ir", "estar", "ficar"]);
/** Auxiliares de tempos compostos e locuções verbais. */
export const AUX_LEMMAS = new Set(["ser", "ser|ir", "estar", "ter", "haver", "ficar", "ir", "poder", "dever", "precisar", "querer", "costumar", "começar", "acabar", "vir", "manter"]);

/**
 * Verbos do português (RF53 "tempos e modos"): tabela dos irregulares mais frequentes + analisador das conjugações
 * regulares a partir de um léxico de radicais (verbos comuns em relatórios, pareceres e ofícios). Devolve TODAS as
 * leituras possíveis; quem chama só afirma tempo/modo quando as leituras concordam (ver `verbFeatures`).
 */
import type { FormaNominal, Modo, Numero, Tempo, VerbFeatures, VerbReading } from "./types";

const TENSE: Record<string, { tempo: Tempo; modo: Modo }> = {
  P: { tempo: "PRESENTE", modo: "INDICATIVO" },
  F: { tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO" },
  I: { tempo: "PRETERITO_IMPERFEITO", modo: "INDICATIVO" },
  M: { tempo: "PRETERITO_MAIS_QUE_PERFEITO", modo: "INDICATIVO" },
  Fp: { tempo: "FUTURO_DO_PRESENTE", modo: "INDICATIVO" },
  Ft: { tempo: "FUTURO_DO_PRETERITO", modo: "INDICATIVO" },
  Sp: { tempo: "PRESENTE", modo: "SUBJUNTIVO" },
  Si: { tempo: "PRETERITO_IMPERFEITO", modo: "SUBJUNTIVO" },
  Sf: { tempo: "FUTURO", modo: "SUBJUNTIVO" },
};
const NOMINAL: Record<string, FormaNominal> = { INF: "INFINITIVO", GER: "GERUNDIO", PART: "PARTICIPIO" };

/** "P3s" → presente do indicativo, 3ª do singular; "INF" → infinitivo. */
function decode(lemma: string, code: string): VerbReading {
  const nominal = NOMINAL[code];
  if (nominal) return { lemma, forma: nominal };
  const m = code.match(/^(Fp|Ft|Sp|Si|Sf|P|F|I|M)([123])([sp])$/);
  if (!m) throw new Error(`código verbal inválido: ${code}`);
  const tm = TENSE[m[1]!]!;
  return { lemma, tempo: tm.tempo, modo: tm.modo, pessoa: Number(m[2]) as 1 | 2 | 3, numero: m[3] === "s" ? "SG" : "PL" };
}

/* ── Irregulares ─────────────────────────────────────────────────────────────────────────────────────────── */

const IRREGULAR: Record<string, string> = {
  ser: "sou:P1s és:P2s é:P3s somos:P1p sois:P2p são:P3p era:I1s era:I3s eras:I2s éramos:I1p eram:I3p seria:Ft1s seria:Ft3s seriam:Ft3p seríamos:Ft1p será:Fp3s serão:Fp3p serei:Fp1s seremos:Fp1p serás:Fp2s seja:Sp1s seja:Sp3s sejam:Sp3p sejamos:Sp1p sejas:Sp2s ser:INF sendo:GER sido:PART",
  "ser|ir": "fui:F1s foste:F2s foi:F3s fomos:F1p foram:F3p fora:M1s fora:M3s fôramos:M1p fosse:Si1s fosse:Si3s fosses:Si2s fôssemos:Si1p fossem:Si3p for:Sf1s for:Sf3s fores:Sf2s formos:Sf1p forem:Sf3p",
  ir: "vou:P1s vais:P2s vai:P3s vamos:P1p ides:P2p vão:P3p ia:I1s ia:I3s ias:I2s íamos:I1p iam:I3p irá:Fp3s irão:Fp3p irei:Fp1s iremos:Fp1p iria:Ft1s iria:Ft3s iriam:Ft3p vá:Sp1s vá:Sp3s vás:Sp2s ir:INF indo:GER ido:PART",
  estar: "estou:P1s estás:P2s está:P3s estamos:P1p estão:P3p estava:I1s estava:I3s estavas:I2s estávamos:I1p estavam:I3p estive:F1s estiveste:F2s esteve:F3s estivemos:F1p estiveram:F3p estará:Fp3s estarão:Fp3p estaria:Ft1s estaria:Ft3s estariam:Ft3p esteja:Sp1s esteja:Sp3s estejam:Sp3p estivesse:Si1s estivesse:Si3s estivessem:Si3p estiver:Sf1s estiver:Sf3s estiverem:Sf3p estar:INF estando:GER estado:PART",
  ter: "tenho:P1s tens:P2s tem:P3s temos:P1p têm:P3p tinha:I1s tinha:I3s tinhas:I2s tínhamos:I1p tinham:I3p tive:F1s tiveste:F2s teve:F3s tivemos:F1p tiveram:F3p terá:Fp3s terão:Fp3p terei:Fp1s teria:Ft1s teria:Ft3s teriam:Ft3p tenha:Sp1s tenha:Sp3s tenham:Sp3p tenhas:Sp2s tivesse:Si1s tivesse:Si3s tivessem:Si3p tiver:Sf1s tiver:Sf3s tiverem:Sf3p ter:INF tendo:GER tido:PART",
  haver: "hei:P1s hás:P2s há:P3s havemos:P1p hão:P3p havia:I1s havia:I3s haviam:I3p houve:F3s houveram:F3p haverá:Fp3s haverão:Fp3p haveria:Ft1s haveria:Ft3s haveriam:Ft3p haja:Sp1s haja:Sp3s hajam:Sp3p houvesse:Si1s houvesse:Si3s houvessem:Si3p houver:Sf1s houver:Sf3s houverem:Sf3p haver:INF havendo:GER havido:PART",
  fazer: "faço:P1s fazes:P2s faz:P3s fazemos:P1p fazem:P3p fazia:I1s fazia:I3s faziam:I3p fiz:F1s fizeste:F2s fez:F3s fizemos:F1p fizeram:F3p fará:Fp3s farão:Fp3p farei:Fp1s faria:Ft1s faria:Ft3s fariam:Ft3p faça:Sp1s faça:Sp3s façam:Sp3p fizesse:Si1s fizesse:Si3s fizessem:Si3p fizer:Sf1s fizer:Sf3s fizerem:Sf3p fazer:INF fazendo:GER feito:PART",
  poder: "posso:P1s podes:P2s pode:P3s podemos:P1p podem:P3p podia:I1s podia:I3s podiam:I3p pude:F1s pôde:F3s pudemos:F1p puderam:F3p poderá:Fp3s poderão:Fp3p poderia:Ft1s poderia:Ft3s poderiam:Ft3p possa:Sp1s possa:Sp3s possam:Sp3p pudesse:Si1s pudesse:Si3s pudessem:Si3p puder:Sf1s puder:Sf3s puderem:Sf3p poder:INF podendo:GER podido:PART",
  dizer: "digo:P1s dizes:P2s diz:P3s dizemos:P1p dizem:P3p dizia:I1s dizia:I3s diziam:I3p disse:F1s disse:F3s disseste:F2s dissemos:F1p disseram:F3p dirá:Fp3s dirão:Fp3p diria:Ft1s diria:Ft3s diriam:Ft3p diga:Sp1s diga:Sp3s digam:Sp3p dissesse:Si1s dissesse:Si3s disser:Sf1s disser:Sf3s dizer:INF dizendo:GER dito:PART",
  ver: "vejo:P1s vês:P2s vê:P3s vemos:P1p veem:P3p vêem:P3p via:I1s via:I3s viam:I3p vi:F1s viste:F2s viu:F3s vimos:F1p viram:F3p verá:Fp3s verão:Fp3p veria:Ft1s veria:Ft3s veja:Sp1s veja:Sp3s vejam:Sp3p visse:Si1s visse:Si3s vissem:Si3p vir:Sf1s vir:Sf3s virem:Sf3p ver:INF vendo:GER visto:PART",
  vir: "venho:P1s vens:P2s vem:P3s vimos:P1p vêm:P3p vinha:I1s vinha:I3s vinham:I3p vim:F1s vieste:F2s veio:F3s viemos:F1p vieram:F3p virá:Fp3s virão:Fp3p viria:Ft1s viria:Ft3s venha:Sp1s venha:Sp3s venham:Sp3p viesse:Si1s viesse:Si3s viessem:Si3p vier:Sf1s vier:Sf3s vierem:Sf3p vir:INF vindo:GER vindo:PART",
  dar: "dou:P1s dás:P2s dá:P3s damos:P1p dão:P3p dava:I1s dava:I3s davam:I3p dei:F1s deste:F2s deu:F3s demos:F1p deram:F3p dará:Fp3s darão:Fp3p daria:Ft1s daria:Ft3s dê:Sp1s dê:Sp3s deem:Sp3p dêem:Sp3p desse:Si1s desse:Si3s dessem:Si3p der:Sf1s der:Sf3s derem:Sf3p dar:INF dando:GER dado:PART",
  saber: "sei:P1s sabes:P2s sabe:P3s sabemos:P1p sabem:P3p sabia:I1s sabia:I3s sabiam:I3p soube:F1s soube:F3s souberam:F3p saberá:Fp3s saberia:Ft3s saiba:Sp1s saiba:Sp3s saibam:Sp3p soubesse:Si3s souber:Sf3s saber:INF sabendo:GER sabido:PART",
  querer: "quero:P1s queres:P2s quer:P3s queremos:P1p querem:P3p queria:I1s queria:I3s queriam:I3p quis:F1s quis:F3s quiseram:F3p quererá:Fp3s quereria:Ft3s queira:Sp1s queira:Sp3s queiram:Sp3p quisesse:Si3s quiser:Sf3s quiserem:Sf3p querer:INF querendo:GER querido:PART",
  requerer: "requeiro:P1s requer:P3s requerem:P3p requereu:F3s requereram:F3p requeria:I3s requererá:Fp3s requeira:Sp3s requeiram:Sp3p requeresse:Si3s requerer:INF requerendo:GER requerido:PART",
  pôr: "ponho:P1s pões:P2s põe:P3s pomos:P1p põem:P3p punha:I1s punha:I3s punham:I3p pus:F1s pôs:F3s pusemos:F1p puseram:F3p porá:Fp3s porão:Fp3p poria:Ft3s ponha:Sp1s ponha:Sp3s ponham:Sp3p pusesse:Si3s puser:Sf3s pôr:INF pondo:GER posto:PART",
  trazer: "trago:P1s trazes:P2s traz:P3s trazemos:P1p trazem:P3p trazia:I3s traziam:I3p trouxe:F1s trouxe:F3s trouxeram:F3p trará:Fp3s trarão:Fp3p traria:Ft3s traga:Sp1s traga:Sp3s tragam:Sp3p trouxesse:Si3s trouxer:Sf3s trazer:INF trazendo:GER trazido:PART",
  seguir: "sigo:P1s segues:P2s segue:P3s seguimos:P1p seguem:P3p seguia:I3s seguiam:I3p segui:F1s seguiu:F3s seguiram:F3p seguirá:Fp3s seguiria:Ft3s siga:Sp1s siga:Sp3s sigam:Sp3p seguisse:Si3s seguir:INF seguindo:GER seguido:PART",
  ler: "leio:P1s lês:P2s lê:P3s lemos:P1p leem:P3p lia:I3s liam:I3p li:F1s leu:F3s leram:F3p lerá:Fp3s leria:Ft3s leia:Sp1s leia:Sp3s leiam:Sp3p lesse:Si3s ler:INF lendo:GER lido:PART",
  crer: "creio:P1s crê:P3s creem:P3p cria:I3s creu:F3s creia:Sp3s crer:INF crendo:GER crido:PART",
  caber: "caibo:P1s cabe:P3s cabem:P3p cabia:I3s coube:F3s couberam:F3p caberá:Fp3s caberia:Ft3s caiba:Sp3s caibam:Sp3p coubesse:Si3s couber:Sf3s caber:INF cabendo:GER cabido:PART",
  valer: "valho:P1s vale:P3s valem:P3p valia:I3s valeu:F3s valeram:F3p valerá:Fp3s valeria:Ft3s valha:Sp3s valham:Sp3p valesse:Si3s valer:INF valendo:GER valido:PART",
  perder: "perco:P1s perde:P3s perdem:P3p perdia:I3s perdeu:F3s perderam:F3p perderá:Fp3s perderia:Ft3s perca:Sp3s percam:Sp3p perdesse:Si3s perder:INF perdendo:GER perdido:PART",
  pedir: "peço:P1s pede:P3s pedem:P3p pedia:I3s pediu:F3s pediram:F3p pedirá:Fp3s pediria:Ft3s peça:Sp1s peça:Sp3s peçam:Sp3p pedisse:Si3s pedir:INF pedindo:GER pedido:PART",
  medir: "meço:P1s mede:P3s medem:P3p media:I3s mediu:F3s mediram:F3p medirá:Fp3s meça:Sp3s meçam:Sp3p medisse:Si3s medir:INF medindo:GER medido:PART",
  ouvir: "ouço:P1s ouve:P3s ouvem:P3p ouvia:I3s ouviu:F3s ouviram:F3p ouvirá:Fp3s ouça:Sp3s ouçam:Sp3p ouvisse:Si3s ouvir:INF ouvindo:GER ouvido:PART",
  sair: "saio:P1s sai:P3s saímos:P1p saem:P3p saía:I3s saíam:I3p saí:F1s saiu:F3s saíram:F3p sairá:Fp3s sairia:Ft3s saia:Sp3s saiam:Sp3p saísse:Si3s sair:INF saindo:GER saído:PART",
  cair: "caio:P1s cai:P3s caem:P3p caía:I3s caiu:F3s caíram:F3p cairá:Fp3s caia:Sp3s caísse:Si3s cair:INF caindo:GER caído:PART",
  subir: "subo:P1s sobe:P3s sobem:P3p subia:I3s subiu:F3s subiram:F3p subirá:Fp3s suba:Sp3s subam:Sp3p subisse:Si3s subir:INF subindo:GER subido:PART",
  preferir: "prefiro:P1s prefere:P3s preferem:P3p preferia:I3s preferiu:F3s preferiram:F3p preferirá:Fp3s preferiria:Ft3s prefira:Sp1s prefira:Sp3s prefiram:Sp3p preferisse:Si3s preferir:INF preferindo:GER preferido:PART",
  sugerir: "sugiro:P1s sugere:P3s sugerem:P3p sugeria:I3s sugeriu:F3s sugeriram:F3p sugerirá:Fp3s sugira:Sp3s sugiram:Sp3p sugerisse:Si3s sugerir:INF sugerindo:GER sugerido:PART",
  repetir: "repito:P1s repete:P3s repetem:P3p repetia:I3s repetiu:F3s repetiram:F3p repetirá:Fp3s repita:Sp3s repitam:Sp3p repetisse:Si3s repetir:INF repetindo:GER repetido:PART",
  servir: "sirvo:P1s serve:P3s servem:P3p servia:I3s serviu:F3s serviram:F3p servirá:Fp3s sirva:Sp3s sirvam:Sp3p servisse:Si3s servir:INF servindo:GER servido:PART",
  sentir: "sinto:P1s sente:P3s sentem:P3p sentia:I3s sentiu:F3s sentiram:F3p sentirá:Fp3s sinta:Sp3s sintam:Sp3p sentisse:Si3s sentir:INF sentindo:GER sentido:PART",
  conseguir: "consigo:P1s consegue:P3s conseguem:P3p conseguia:I3s conseguiu:F3s conseguiram:F3p conseguirá:Fp3s consiga:Sp3s consigam:Sp3p conseguisse:Si3s conseguir:INF conseguindo:GER conseguido:PART",
  prosseguir: "prossigo:P1s prossegue:P3s prosseguem:P3p prosseguiu:F3s prossiga:Sp3s prosseguir:INF prosseguindo:GER prosseguido:PART",
  descobrir: "descubro:P1s descobre:P3s descobrem:P3p descobriu:F3s descobriram:F3p descubra:Sp3s descobrir:INF descobrindo:GER descoberto:PART",
  cobrir: "cubro:P1s cobre:P3s cobrem:P3p cobriu:F3s cubra:Sp3s cobrir:INF cobrindo:GER coberto:PART",
  abrir: "abro:P1s abre:P3s abrem:P3p abria:I3s abriu:F3s abriram:F3p abrirá:Fp3s abra:Sp3s abram:Sp3p abrisse:Si3s abrir:INF abrindo:GER aberto:PART",
  escrever: "escrevo:P1s escreve:P3s escrevem:P3p escrevia:I3s escreveu:F3s escreveram:F3p escreverá:Fp3s escreva:Sp3s escrevesse:Si3s escrever:INF escrevendo:GER escrito:PART",
  descrever: "descrevo:P1s descreve:P3s descrevem:P3p descrevia:I3s descreveu:F3s descreveram:F3p descreverá:Fp3s descreva:Sp3s descrevesse:Si3s descrever:INF descrevendo:GER descrito:PART",
  morrer: "morro:P1s morre:P3s morrem:P3p morria:I3s morreu:F3s morreram:F3p morrerá:Fp3s morra:Sp3s morresse:Si3s morrer:INF morrendo:GER morrido:PART morto:PART",
};

/** Compostos de ter/vir/pôr com acentuação própria (mantém, propõe…). */
const COMPOUND_PREFIXES: Record<string, readonly string[]> = {
  ter: ["man", "ob", "con", "de", "re", "abs", "en"],
  pôr: ["pro", "com", "dis", "ex", "im", "su", "re", "pres", "trans", "contra"],
  ver: ["pre", "re", "ante"],
  vir: ["inter", "pro", "ad", "con", "sobre"],
  fazer: ["satis", "re", "des"],
  dizer: ["contra", "pre"],
};

function compoundForm(base: string, prefix: string, form: string): string {
  if (base === "ter" || base === "vir") {
    if (form === "tem" || form === "vem") return `${prefix}${form.slice(0, -2)}ém`;
    if (form === "tens" || form === "vens") return `${prefix}${form.slice(0, -3)}éns`;
    return prefix + form;
  }
  // pôr: o acento diferencial some nos compostos (propor), mas "põe" e "pôs" mantêm o til/circunflexo
  if (form === "pôr") return `${prefix}por`;
  return prefix + form;
}

const IRREGULAR_FORMS: ReadonlyMap<string, VerbReading[]> = (() => {
  const map = new Map<string, VerbReading[]>();
  const put = (form: string, reading: VerbReading) => map.set(form, [...(map.get(form) ?? []), reading]);
  for (const [lemma, spec] of Object.entries(IRREGULAR)) {
    for (const pair of spec.split(" ")) {
      const [form, code] = pair.split(":") as [string, string];
      put(form, decode(lemma, code));
      for (const prefix of COMPOUND_PREFIXES[lemma] ?? []) put(compoundForm(lemma, prefix, form), decode(compoundForm(lemma, prefix, lemma), code));
    }
  }
  return map;
})();

/* ── Regulares ───────────────────────────────────────────────────────────────────────────────────────────── */

type Conj = "1" | "2" | "3" | "3u" | "3z";

/** Verbos regulares frequentes em textos técnicos e administrativos (infinitivo). */
const REGULAR_VERBS = `
abordar acarretar acatar acompanhar acrescentar adequar adotar afirmar ajudar ajustar alcançar alertar alinhar alterar
ampliar analisar anexar apoiar apontar apresentar aprimorar aprovar aplicar apurar arquivar assegurar assinalar assinar
atestar atualizar aumentar autorizar avaliar avançar avisar buscar calcular cancelar caracterizar centralizar chegar citar
classificar cobrar coletar começar comentar comparar compartilhar completar comprovar comunicar concentrar concordar
configurar confirmar considerar consolidar constatar consultar contar contemplar contestar continuar contratar controlar
convocar coordenar criar cuidar declarar dedicar deixar delegar deliberar demandar demonstrar denunciar desempenhar
destacar destinar detalhar determinar diagnosticar direcionar disponibilizar divulgar documentar efetuar elaborar
eliminar empregar encaminhar encarar encerrar encontrar enfrentar ensinar entrar entregar enviar especificar esperar
estimar estruturar estudar evidenciar evitar examinar executar explicar expressar facilitar falar fechar ficar finalizar
fiscalizar formalizar formular fundamentar ganhar gerar gerenciar homologar identificar ilustrar impactar implantar
implementar implicar incentivar incorporar indicar informar iniciar instalar integrar interpretar investigar justificar
levantar levar liberar limitar listar localizar manifestar marcar melhorar mencionar mitigar modificar monitorar montar
mostrar motivar mudar necessitar negociar notar notificar observar ocupar operar organizar orientar otimizar padronizar
pagar participar passar pensar pesquisar planejar pontuar praticar precisar preparar preservar prestar priorizar
processar programar projetar protocolar provar publicar quantificar realizar reavaliar recomendar recuperar reforçar
registrar regulamentar reiterar relacionar relatar reportar representar resguardar respaldar ressaltar restar resultar
retomar revisar revogar salientar salvar selecionar sinalizar sistematizar situar solicitar superar sustentar tentar
tomar trabalhar tramitar transformar tratar usar utilizar validar verificar visar votar acabar apurar atuar avaliar
encontrar gostar morar mandar comprar jogar olhar achar lembrar chamar pagar
atender absorver acontecer aparecer aprender atender beber compreender conceder conhecer correr crescer decorrer depender
dever devolver eleger entender envolver escolher esclarecer estabelecer exercer favorecer fornecer fortalecer interromper
merecer obedecer desobedecer ocorrer oferecer parecer perceber permanecer pertencer prevalecer proceder promover receber
reconhecer recorrer remeter resolver responder submeter suspender viver comprometer converter preencher
abastecer enriquecer estender surpreender transcorrer descer correr
abrir admitir agir assistir assumir atingir competir consistir consumir cumprir decidir definir demitir desistir dirigir
discutir dividir dormir emitir exigir existir garantir imprimir insistir interagir investir omitir partir permitir
persistir presidir presumir proibir punir reagir redigir refletir repartir residir resistir resumir reunir subsistir
suprimir surgir transmitir unir inserir corrigir aplaudir progredir
concluir constituir construir contribuir diminuir distribuir excluir incluir influir instituir obstruir possuir
restituir substituir usufruir atribuir
conduzir deduzir induzir introduzir produzir reduzir traduzir reproduzir
`;

const STEMS: ReadonlyMap<string, Set<Conj>> = (() => {
  const map = new Map<string, Set<Conj>>();
  const add = (stem: string, conj: Conj) => map.set(stem, new Set([...(map.get(stem) ?? []), conj]));
  for (const inf of REGULAR_VERBS.split(/\s+/).filter(Boolean)) {
    const stem = inf.slice(0, -2);
    if (inf.endsWith("ar")) add(stem, "1");
    else if (inf.endsWith("er")) add(stem, "2");
    else if (/uzir$/.test(inf)) add(stem, "3z");
    else if (/uir$/.test(inf) && !/guir$/.test(inf)) add(stem, "3u");
    else if (inf.endsWith("ir")) add(stem, "3");
  }
  return map;
})();

/** Terminações por conjugação → códigos (todas as leituras). */
const ENDINGS: Record<Conj, Record<string, string[]>> = {
  "1": {
    o: ["P1s"], as: ["P2s"], a: ["P3s"], amos: ["P1p", "F1p"], am: ["P3p"],
    ei: ["F1s"], aste: ["F2s"], ou: ["F3s"], aram: ["F3p", "M3p"],
    ava: ["I1s", "I3s"], avas: ["I2s"], ávamos: ["I1p"], avam: ["I3p"],
    ara: ["M1s", "M3s"], ará: ["Fp3s"], arás: ["Fp2s"], arei: ["Fp1s"], aremos: ["Fp1p"], arão: ["Fp3p"],
    aria: ["Ft1s", "Ft3s"], aríamos: ["Ft1p"], ariam: ["Ft3p"],
    e: ["Sp1s", "Sp3s"], es: ["Sp2s"], emos: ["Sp1p"], em: ["Sp3p"],
    asse: ["Si1s", "Si3s"], ássemos: ["Si1p"], assem: ["Si3p"],
    ar: ["INF", "Sf1s", "Sf3s"], armos: ["Sf1p"], arem: ["Sf3p"],
    ando: ["GER"], ado: ["PART"], ada: ["PART"], ados: ["PART"], adas: ["PART"],
  },
  "2": {
    o: ["P1s"], es: ["P2s"], e: ["P3s"], emos: ["P1p", "F1p"], em: ["P3p"],
    i: ["F1s"], este: ["F2s"], eu: ["F3s"], eram: ["F3p", "M3p"],
    ia: ["I1s", "I3s"], ias: ["I2s"], íamos: ["I1p"], iam: ["I3p"],
    era: ["M1s", "M3s"], erá: ["Fp3s"], erás: ["Fp2s"], erei: ["Fp1s"], eremos: ["Fp1p"], erão: ["Fp3p"],
    eria: ["Ft1s", "Ft3s"], eríamos: ["Ft1p"], eriam: ["Ft3p"],
    a: ["Sp1s", "Sp3s"], as: ["Sp2s"], amos: ["Sp1p"], am: ["Sp3p"],
    esse: ["Si1s", "Si3s"], êssemos: ["Si1p"], essem: ["Si3p"],
    er: ["INF", "Sf1s", "Sf3s"], ermos: ["Sf1p"], erem: ["Sf3p"],
    endo: ["GER"], ido: ["PART"], ida: ["PART"], idos: ["PART"], idas: ["PART"],
  },
  "3": {
    o: ["P1s"], es: ["P2s"], e: ["P3s"], imos: ["P1p", "F1p"], em: ["P3p"],
    i: ["F1s"], iste: ["F2s"], iu: ["F3s"], iram: ["F3p", "M3p"],
    ia: ["I1s", "I3s"], ias: ["I2s"], íamos: ["I1p"], iam: ["I3p"],
    ira: ["M1s", "M3s"], irá: ["Fp3s"], irás: ["Fp2s"], irei: ["Fp1s"], iremos: ["Fp1p"], irão: ["Fp3p"],
    iria: ["Ft1s", "Ft3s"], iríamos: ["Ft1p"], iriam: ["Ft3p"],
    a: ["Sp1s", "Sp3s"], as: ["Sp2s"], amos: ["Sp1p"], am: ["Sp3p"],
    isse: ["Si1s", "Si3s"], íssemos: ["Si1p"], issem: ["Si3p"],
    ir: ["INF", "Sf1s", "Sf3s"], irmos: ["Sf1p"], irem: ["Sf3p"],
    indo: ["GER"], ido: ["PART"], ida: ["PART"], idos: ["PART"], idas: ["PART"],
  },
  "3u": {
    o: ["P1s"], is: ["P2s"], i: ["P3s"], ímos: ["P1p", "F1p"], em: ["P3p"],
    í: ["F1s"], iu: ["F3s"], íram: ["F3p", "M3p"],
    ía: ["I1s", "I3s"], íamos: ["I1p"], íam: ["I3p"],
    irá: ["Fp3s"], irão: ["Fp3p"], iria: ["Ft1s", "Ft3s"], iriam: ["Ft3p"],
    a: ["Sp1s", "Sp3s"], am: ["Sp3p"], ísse: ["Si1s", "Si3s"], íssem: ["Si3p"],
    ir: ["INF", "Sf1s", "Sf3s"], írem: ["Sf3p"], indo: ["GER"], ído: ["PART"], ída: ["PART"], ídos: ["PART"], ídas: ["PART"],
  },
  "3z": {
    o: ["P1s"], es: ["P2s"], "": ["P3s"], imos: ["P1p", "F1p"], em: ["P3p"],
    i: ["F1s"], iu: ["F3s"], iram: ["F3p", "M3p"],
    ia: ["I1s", "I3s"], iam: ["I3p"], irá: ["Fp3s"], irão: ["Fp3p"], iria: ["Ft1s", "Ft3s"], iriam: ["Ft3p"],
    a: ["Sp1s", "Sp3s"], am: ["Sp3p"], isse: ["Si1s", "Si3s"], issem: ["Si3p"],
    ir: ["INF", "Sf1s", "Sf3s"], irem: ["Sf3p"], indo: ["GER"], ido: ["PART"], ida: ["PART"], idos: ["PART"], idas: ["PART"],
  },
};

const ENDING_LIST: readonly { conj: Conj; ending: string; codes: string[] }[] = (Object.entries(ENDINGS) as [Conj, Record<string, string[]>][])
  .flatMap(([conj, map]) => Object.entries(map).map(([ending, codes]) => ({ conj, ending, codes })))
  .sort((a, b) => b.ending.length - a.ending.length);

/** Radicais alternativos por ortografia: verifique → verific, cheguei → cheg, comece → começ, conheço → conhec, exijo → exig. */
function stemVariants(stem: string, conj: Conj, ending: string): string[] {
  const out = [stem];
  const front = /^[eéiíê]/.test(ending);
  if (conj === "1" && front) {
    if (stem.endsWith("qu")) out.push(stem.slice(0, -2) + "c");
    if (stem.endsWith("gu")) out.push(stem.slice(0, -2) + "g");
    if (stem.endsWith("c")) out.push(stem.slice(0, -1) + "ç");
  }
  if ((conj === "2" || conj === "3") && !front) {
    if (stem.endsWith("ç")) out.push(stem.slice(0, -1) + "c");
    if (stem.endsWith("j")) out.push(stem.slice(0, -1) + "g");
  }
  return out;
}

/** Leituras regulares de uma forma (minúsculas). Vazio se o radical não estiver no léxico. */
export function regularReadings(form: string): VerbReading[] {
  const out: VerbReading[] = [];
  let matchedLen = -1;
  for (const { conj, ending, codes } of ENDING_LIST) {
    // a terminação mais longa que casou decide (as de mesmo tamanho de outras conjugações ainda contam)
    if (matchedLen >= 0 && ending.length < matchedLen) break;
    if (!form.endsWith(ending)) continue;
    const stem = form.slice(0, form.length - ending.length);
    if (stem.length < 2) continue;
    for (const s of stemVariants(stem, conj, ending)) {
      const conjs = STEMS.get(s);
      if (!conjs?.has(conj)) continue;
      const inf = s + (conj === "1" ? "ar" : conj === "2" ? "er" : "ir");
      for (const c of codes) out.push(decode(inf, c));
      matchedLen = ending.length;
    }
  }
  return out;
}

/** Todas as leituras verbais conhecidas da forma (irregular primeiro, depois regular). */
export function verbReadings(form: string): VerbReading[] {
  const lower = form.toLowerCase();
  const irregular = IRREGULAR_FORMS.get(lower);
  if (irregular) return irregular;
  return regularReadings(lower);
}

export const isKnownVerbForm = (form: string) => verbReadings(form).length > 0;

/** Traços afirmados: só o que todas as leituras compartilham; tempos/modos alternativos ficam listados. */
export function verbFeatures(readings: readonly VerbReading[]): VerbFeatures | undefined {
  if (!readings.length) return undefined;
  const same = <K extends keyof VerbReading>(k: K): VerbReading[K] | undefined => {
    const v = readings[0]![k];
    return readings.every((r) => r[k] === v) ? v : undefined;
  };
  const lemmas = [...new Set(readings.flatMap((r) => r.lemma.split("|")))];
  const tempos = [...new Set(readings.map((r) => r.tempo).filter((x): x is Tempo => !!x))];
  const modos = [...new Set(readings.map((r) => r.modo).filter((x): x is Modo => !!x))];
  return {
    lemma: lemmas.join("|"),
    tempo: same("tempo"),
    modo: same("modo"),
    pessoa: same("pessoa"),
    numero: same("numero") as Numero | undefined,
    forma: same("forma"),
    tempos,
    modos,
  };
}

/** Forma da 3ª pessoa no outro número, quando conhecida (participou ↔ participaram; é ↔ são). */
export function swapThirdPersonNumber(form: string): string | null {
  const lower = form.toLowerCase();
  const readings = verbReadings(lower).filter((r) => r.pessoa === 3 && r.tempo && r.modo);
  if (!readings.length) return null;
  const target = readings[0]!;
  const wanted: Numero = target.numero === "SG" ? "PL" : "SG";
  for (const lemma of target.lemma.split("|")) {
    const hit = generate(lemma, { ...target, numero: wanted });
    if (hit) return hit;
  }
  return null;
}

/** Gera a forma de um lema/tempo/pessoa a partir das tabelas (inverso de `verbReadings`). */
export function generate(lemma: string, r: Omit<VerbReading, "lemma">): string | null {
  for (const [form, readings] of IRREGULAR_FORMS) {
    if (readings.some((x) => x.lemma.split("|").includes(lemma) && x.tempo === r.tempo && x.modo === r.modo && x.pessoa === r.pessoa && x.numero === r.numero && x.forma === r.forma)) return form;
  }
  const conjOf = (inf: string): Conj | null => {
    const stem = inf.slice(0, -2);
    const set = STEMS.get(stem);
    if (!set) return null;
    return [...set][0] ?? null;
  };
  const conj = conjOf(lemma);
  if (!conj) return null;
  const stem = lemma.slice(0, -2);
  for (const [ending, codes] of Object.entries(ENDINGS[conj])) {
    for (const c of codes) {
      const d = decode(lemma, c);
      if (d.tempo === r.tempo && d.modo === r.modo && d.pessoa === r.pessoa && d.numero === r.numero && d.forma === r.forma) {
        // ortografia: 1ª conj. com c/g/ç antes de e/i
        let s = stem;
        if (conj === "1" && /^[eéiíê]/.test(ending)) {
          if (s.endsWith("c")) s = s.slice(0, -1) + "qu";
          else if (s.endsWith("g")) s = s.slice(0, -1) + "gu";
          else if (s.endsWith("ç")) s = s.slice(0, -1) + "c";
        }
        return s + ending;
      }
    }
  }
  return null;
}

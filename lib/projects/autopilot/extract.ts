/**
 * Leitura determinística da demanda bruta (RF30.CA01; RF43 D-12): remetente/órgão, assinatura, destinatário (departamento
 * provável), assunto, objetivo, nº do ofício/processo, data do documento, prazo, valores (R$), entregas, partes interessadas,
 * restrições, riscos por palavra-chave e a classificação da demanda (TI, obra, serviço, aquisição, normativo, capacitação).
 * Nada aqui chama modelo externo: são regras sobre o texto, e CADA fato guarda o trecho de origem (`span`) para a tela mostrar
 * de onde veio. O que a pessoa corrige perde a marca de proposta (✦) — `edited`.
 */
import { findDeadlines, findReferenceDate, todayIso, type DeadlineKind, type IsoDate } from "./dates";
import { capitalize, clip, fold, HEADER_LINE, lineSpans, normalizeDemandText, overlaps, segmentsOf, similarity, titleCaseIfUpper, type Segment, type Span } from "./text";

export const DEMAND_KINDS = ["TI", "OBRA", "SERVICO", "AQUISICAO", "NORMATIVO", "CAPACITACAO", "OUTRA"] as const;
export type DemandKind = (typeof DEMAND_KINDS)[number];

/** Tipo de entrega — decide a fase, a estimativa de três pontos e a ordem dentro da fase (`recipes.ts`). */
export const DELIVERABLE_TYPES = ["ESTUDO", "DOCUMENTO", "REVISAO", "APROVACAO", "CONTRATACAO", "DESENVOLVIMENTO", "OBRA", "IMPLANTACAO", "MIGRACAO", "CAPACITACAO", "COMUNICACAO", "SERVICO", "OUTRO"] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const RISK_KEYS = ["PRAZO_CURTO", "CONTRATACAO", "ORCAMENTO", "LGPD", "INTEGRACAO", "CONTROLE_EXTERNO", "FORNECEDOR", "ADESAO", "CLIMA_OBRA", "SANCAO"] as const;
export type RiskKey = (typeof RISK_KEYS)[number];

export type StakeholderRole = "DEMANDANTE" | "DESTINATARIO" | "CONTROLE" | "PUBLICO" | "OUTRO";

/** Fato extraído: valor + trecho de origem; `edited` = a pessoa mudou (deixa de ser só proposta ✦). */
export interface Fact<T> { value: T; span?: Span; edited?: boolean }
export interface DeadlineFact { date: IsoDate; kind: DeadlineKind; amount?: number; from?: IsoDate; span?: Span; edited?: boolean }
export interface DeliverableFact { id: string; text: string; type: DeliverableType; due?: IsoDate; span?: Span; edited?: boolean }
export interface StakeholderFact { id: string; name: string; role: StakeholderRole; span?: Span; edited?: boolean }
export interface AmountFact { id: string; value: number; label: string; span?: Span; edited?: boolean }
export interface ConstraintFact { id: string; text: string; span?: Span; edited?: boolean }
export interface RiskFact { id: string; key: RiskKey; title: string; probability: number; impactLevel: number; span?: Span; edited?: boolean }

export interface DemandFacts {
  /** texto normalizado a que os `span` se referem */
  text: string;
  /** data do documento (ou do dia da leitura): base dos prazos relativos */
  referenceDate: Fact<IsoDate>;
  sender?: Fact<string>;
  signatory?: Fact<string>;
  /** destinatário — departamento provável (RF30.CA01) */
  recipient?: Fact<string>;
  subject?: Fact<string>;
  objective?: Fact<string>;
  /** nº do ofício, memorando, processo ou protocolo */
  reference?: Fact<string>;
  deadline?: DeadlineFact;
  kind: { value: DemandKind; scores: Record<DemandKind, number>; evidence: Span[]; edited?: boolean };
  amounts: AmountFact[];
  deliverables: DeliverableFact[];
  stakeholders: StakeholderFact[];
  constraints: ConstraintFact[];
  risks: RiskFact[];
}

// ------------------------------------------------------------------ vocabulário (sem acento: casado em `fold(texto)`)

/** Verbos de entrega (infinitivo) → tipo. */
const VERBS: Record<string, DeliverableType> = {
  elaborar: "DOCUMENTO", redigir: "DOCUMENTO", minutar: "DOCUMENTO", documentar: "DOCUMENTO", produzir: "DOCUMENTO", preparar: "DOCUMENTO",
  emitir: "DOCUMENTO", apresentar: "DOCUMENTO", definir: "ESTUDO", planejar: "ESTUDO", estruturar: "ESTUDO", levantar: "ESTUDO",
  mapear: "ESTUDO", diagnosticar: "ESTUDO", estudar: "ESTUDO", analisar: "REVISAO", avaliar: "REVISAO", revisar: "REVISAO", validar: "REVISAO",
  aprovar: "APROVACAO", homologar: "APROVACAO", contratar: "CONTRATACAO", adquirir: "CONTRATACAO", licitar: "CONTRATACAO", comprar: "CONTRATACAO",
  desenvolver: "DESENVOLVIMENTO", criar: "DESENVOLVIMENTO", integrar: "DESENVOLVIMENTO", modernizar: "DESENVOLVIMENTO", digitalizar: "DESENVOLVIMENTO",
  testar: "DESENVOLVIMENTO", construir: "OBRA", reformar: "OBRA", ampliar: "OBRA", pavimentar: "OBRA", implantar: "IMPLANTACAO", implementar: "IMPLANTACAO",
  instalar: "IMPLANTACAO", disponibilizar: "IMPLANTACAO", substituir: "IMPLANTACAO", atualizar: "IMPLANTACAO", adequar: "IMPLANTACAO",
  migrar: "MIGRACAO", capacitar: "CAPACITACAO", treinar: "CAPACITACAO", publicar: "COMUNICACAO", divulgar: "COMUNICACAO", comunicar: "COMUNICACAO",
  encaminhar: "COMUNICACAO", executar: "SERVICO", realizar: "SERVICO", prestar: "SERVICO", fornecer: "SERVICO", manter: "SERVICO", fiscalizar: "SERVICO",
  monitorar: "SERVICO", organizar: "SERVICO", promover: "SERVICO", regulamentar: "DOCUMENTO", providenciar: "SERVICO",
};
/** Nominalizações ("a implantação do sistema") → tipo; só valem seguidas de de/do/da/dos/das. */
const NOUNS: Record<string, DeliverableType> = {
  elaboracao: "DOCUMENTO", redacao: "DOCUMENTO", emissao: "DOCUMENTO", definicao: "ESTUDO", levantamento: "ESTUDO", mapeamento: "ESTUDO",
  diagnostico: "ESTUDO", estudo: "ESTUDO", analise: "REVISAO", avaliacao: "REVISAO", revisao: "REVISAO", aprovacao: "APROVACAO",
  homologacao: "APROVACAO", contratacao: "CONTRATACAO", aquisicao: "CONTRATACAO", licitacao: "CONTRATACAO", desenvolvimento: "DESENVOLVIMENTO",
  criacao: "DESENVOLVIMENTO", integracao: "DESENVOLVIMENTO", modernizacao: "DESENVOLVIMENTO", digitalizacao: "DESENVOLVIMENTO",
  construcao: "OBRA", reforma: "OBRA", ampliacao: "OBRA", pavimentacao: "OBRA", implantacao: "IMPLANTACAO", implementacao: "IMPLANTACAO",
  instalacao: "IMPLANTACAO", disponibilizacao: "IMPLANTACAO", substituicao: "IMPLANTACAO", atualizacao: "IMPLANTACAO", adequacao: "IMPLANTACAO",
  migracao: "MIGRACAO", capacitacao: "CAPACITACAO", treinamento: "CAPACITACAO", publicacao: "COMUNICACAO", divulgacao: "COMUNICACAO",
  execucao: "SERVICO", realizacao: "SERVICO", prestacao: "SERVICO", fornecimento: "SERVICO", manutencao: "SERVICO", fiscalizacao: "SERVICO",
  regulamentacao: "DOCUMENTO",
};
/** Palavras do objeto que refinam o tipo (ex.: "elaborar o estudo técnico" é ESTUDO; "elaborar o termo de referência" é DOCUMENTO). */
const OBJECT_HINTS: [RegExp, DeliverableType][] = [
  [/\b(estudo tecnico preliminar|etp|estudo de viabilidade|diagnostico|levantamento|pesquisa)\b/, "ESTUDO"],
  [/\b(parecer|analise juridica|analise de conformidade)\b/, "REVISAO"],
  [/\b(licitacao|pregao|contratacao|aquisicao)\b/, "CONTRATACAO"],
  [/\b(capacitacao|treinamento|curso|oficina)\b/, "CAPACITACAO"],
  [/\b(migracao|migrar)\b/, "MIGRACAO"],
];

const CLOSE_WORDS = /^\s*(atenciosamente|respeitosamente|cordialmente|att\.?|abs\.?|saudacoes|grato|grata|obrigad[oa])\b/;
const SALUTATION = /^\s*(a sua senhoria|a sua excelencia|ao senhor|a senhora|ao\(a\)|ao ilustrissimo|a ilustrissima|ao excelentissimo|a excelentissima|exm[oa]\.?|ilm[oa]\.?|prezad[oa]s?|senhor|senhora|caro|cara)\b/;
const ORG_WORDS = "secretaria|diretoria|coordenacao|coordenadoria|departamento|divisao|gerencia|superintendencia|prefeitura|camara|assembleia|tribunal|procuradoria|controladoria|defensoria|ministerio|assessoria|gabinete|nucleo|comite|comissao|conselho|agencia|instituto|fundacao|universidade|companhia|ouvidoria|corregedoria|unidade|governo|setor|servico|autarquia|empresa";
const ORG_START = new RegExp(`^\\s*(${ORG_WORDS})\\b`);
const ORG_ANY = new RegExp(`\\b(${ORG_WORDS})\\b`, "g");
const CONNECTORS = new Set(["de", "do", "da", "dos", "das", "e", "em"]);
const CONTROL_BODY = /\b(tribunal de contas|tce|tcu|controladoria|ministerio publico|procuradoria|corregedoria|auditoria)\b/;
const PUBLIC_GROUPS: [RegExp, string][] = [
  [/\bcidadaos\b/, "Cidadãos"], [/\bservidores\b/, "Servidores"], [/\busuarios\b/, "Usuários"], [/\bpopulacao\b/, "População"],
  [/\bmunicipes\b/, "Munícipes"], [/\bfornecedor(?:es)?\b/, "Fornecedores"], [/\bempresa contratada\b/, "Empresa contratada"],
  [/\bcontribuintes\b/, "Contribuintes"], [/\b(?:alunos|estudantes)\b/, "Estudantes"], [/\bpacientes\b/, "Pacientes"],
];

const KIND_KEYWORDS: Record<Exclude<DemandKind, "OUTRA">, [RegExp, number][]> = {
  TI: [
    [/\bsistemas?\b/g, 3], [/\bsoftware\b/g, 3], [/\baplicativos?\b/g, 3], [/\bplataforma\b/g, 2], [/\bdigita(?:l|is)\b/g, 2], [/\bbanco de dados\b/g, 3],
    [/\bdados\b/g, 1], [/\bnuvem\b/g, 3], [/\b(?:ti|tic)\b/g, 3], [/\btecnologia da informacao\b/g, 3], [/\b(?:site|portal|internet|web)\b/g, 2],
    [/\bintegracao\b/g, 1], [/\bapi\b/g, 2], [/\bseguranca da informacao\b/g, 3], [/\b(?:computadores|hardware|licencas?)\b/g, 2], [/\bciberseguranca\b/g, 3],
  ],
  OBRA: [
    [/\bobras?\b/g, 3], [/\bconstrucao\b/g, 3], [/\breforma\b/g, 3], [/\bedificac(?:ao|oes)\b/g, 3], [/\bpavimentacao\b/g, 3], [/\bengenharia\b/g, 2],
    [/\b(?:art|sinapi|projeto executivo|projeto basico de engenharia)\b/g, 3], [/\b(?:terreno|alvenaria|drenagem|ponte|predio|canteiro)\b/g, 2],
  ],
  SERVICO: [
    [/\bservicos? continuados?\b/g, 3], [/\bprestacao de servicos?\b/g, 2], [/\batendimento\b/g, 2], [/\bmanutencao\b/g, 2], [/\b(?:limpeza|vigilancia|terceirizacao)\b/g, 3],
    [/\bprocesso de trabalho\b/g, 3], [/\bfluxo\b/g, 1], [/\brotina\b/g, 1], [/\bcentral de atendimento\b/g, 3], [/\bsuporte\b/g, 1],
  ],
  AQUISICAO: [
    [/\baquisicao\b/g, 3], [/\badquirir\b/g, 3], [/\bcompras?\b/g, 2], [/\blicitacao\b/g, 2], [/\bpregao\b/g, 3], [/\bcontratac(?:ao|oes)\b/g, 2],
    [/\bcontratar\b/g, 2], [/\bata de registro de precos\b/g, 3], [/\btermo de referencia\b/g, 2], [/\b(?:etp|estudo tecnico preliminar)\b/g, 2],
    [/\b14\.133\b/g, 2], [/\b(?:dispensa|inexigibilidade)\b/g, 2], [/\b(?:equipamentos|materiais|mobiliario|veiculos)\b/g, 2],
  ],
  NORMATIVO: [
    [/\bdecreto\b/g, 2], [/\bportaria\b/g, 2], [/\bresolucao\b/g, 2], [/\binstrucao normativa\b/g, 3], [/\bregulamento\b/g, 3], [/\bregulamentar\b/g, 3],
    [/\bminuta\b/g, 2], [/\bnormativ[oa]s?\b/g, 3], [/\bparecer juridico\b/g, 2], [/\bregimento\b/g, 3], [/\bprojeto de lei\b/g, 3],
  ],
  CAPACITACAO: [
    [/\bcapacitac(?:ao|oes)\b/g, 3], [/\bcapacitar\b/g, 3], [/\btreinamentos?\b/g, 3], [/\btreinar\b/g, 2], [/\bcursos?\b/g, 2], [/\boficinas?\b/g, 2],
    [/\bformacao\b/g, 2], [/\bworkshops?\b/g, 2],
  ],
};
/** Desempate: a ordem do enum. */
const KIND_ORDER: readonly DemandKind[] = ["TI", "OBRA", "NORMATIVO", "AQUISICAO", "SERVICO", "CAPACITACAO", "OUTRA"];

/** Riscos por palavra-chave: título (conteúdo do projeto, pt-BR), probabilidade e impacto qualitativo (1–5) iniciais — editáveis. */
export const RISK_RULES: Record<RiskKey, { cue: RegExp; title: string; probability: number; impactLevel: number }> = {
  PRAZO_CURTO: { cue: /\burgen(?:te|cia)\b|\bimediat[oa]\b|\bmaior brevidade\b|\bprazo exiguo\b|\bimpreterivelmente\b/, title: "Prazo curto para atender a demanda", probability: 0.5, impactLevel: 4 },
  CONTRATACAO: { cue: /\blicitac(?:ao|oes)\b|\blicitar\b|\bpregao\b|\bcontratac(?:ao|oes)\b|\bcontratar\b|\b14\.133\b|\bdispensa\b|\binexigibilidade\b/, title: "Atraso ou fracasso do processo de contratação", probability: 0.4, impactLevel: 4 },
  ORCAMENTO: { cue: /\bdotac(?:ao|oes) orcamentaria|\borcament|\bdisponibilidade financeira\b|\brecursos? financeiros?\b/, title: "Indisponibilidade orçamentária ou corte de recursos", probability: 0.3, impactLevel: 4 },
  LGPD: { cue: /\blgpd\b|\bdados pessoais\b|\b13\.709\b|\bsigil|\bconfidencia/, title: "Tratamento de dados pessoais em desacordo com a LGPD", probability: 0.3, impactLevel: 4 },
  INTEGRACAO: { cue: /\bintegrac(?:ao|oes)\b|\bintegrar\b|\blegad[oa]s?\b|\bmigrac(?:ao|oes)\b|\bmigrar\b|\binteroperab/, title: "Falha na integração ou na migração de dados de sistemas legados", probability: 0.4, impactLevel: 3 },
  CONTROLE_EXTERNO: { cue: CONTROL_BODY, title: "Apontamento dos órgãos de controle", probability: 0.2, impactLevel: 4 },
  FORNECEDOR: { cue: /\bfornecedor(?:es)?\b|\bempresa contratada\b|\bterceiriz|\bprestador(?:a|es)?\b/, title: "Dependência de fornecedor externo", probability: 0.3, impactLevel: 3 },
  ADESAO: { cue: /\bcapacitac(?:ao|oes)\b|\bcapacitar\b|\btreinament|\btreinar\b|\bresistencia\b|\badesao\b|\bmudanca de cultura\b/, title: "Baixa adesão das pessoas à nova solução", probability: 0.3, impactLevel: 3 },
  CLIMA_OBRA: { cue: /\bobras?\b|\bconstruc(?:ao|oes)\b|\breforma\b|\bpavimentac/, title: "Chuvas e condições do terreno atrasam a obra", probability: 0.4, impactLevel: 3 },
  SANCAO: { cue: /\bmultas?\b|\bsanc(?:ao|oes)\b|\bpenalidade|\bresponsabilizac/, title: "Sanção por descumprimento do prazo", probability: 0.2, impactLevel: 5 },
};

const CONSTRAINT_CUE = /\b(lei|decreto|portaria|resolucao|instrucao normativa|lgpd|abnt|nbr|iso)\b|\bdevera(?:o)? (?:observar|atender|respeitar|seguir|cumprir)\b|\bem conformidade\b|\bconforme (?:a|o) (?:lei|decreto|resolucao|norma|portaria)\b|\bvedad[oa]s?\b|\bproibid[oa]s?\b|\bnao poder(?:a|ao)\b|\bobrigatori[oa]s?\b|\blimite de\b|\bteto de\b|\bno maximo\b|\bdotacao orcamentaria\b|\borcamento (?:maximo|disponivel|previsto)\b|\bacessibilidade\b/;
const OBJECTIVE_CUE = /\b(?:com o objetivo de|com a finalidade de|com vistas a|visando a?o?|a fim de|tendo em vista|para fins de)\s+/;
const REFERENCE = /\b(oficio(?:\s+circular)?|memorando(?:\s+circular)?|memo|processo(?:\s+(?:sei|administrativo|eletronico))?|protocolo|e-?protocolo|requerimento|despacho|edital|sei)\s*(?:n[º°o]?\.?\s*|numero\s*)?[:\-]?\s*(\d[\d.\/\-]*\d|\d+)(?:\s*[–\-]\s*([a-z][a-z0-9\/\-]{1,30}))?/;
const AMOUNT = /r\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?:\s*(mil|milhao|milhoes|bilhao|bilhoes)\b)?/g;

// ------------------------------------------------------------------ extração

export interface ExtractOptions { now: Date }

export function extractDemand(raw: string, opts: ExtractOptions): DemandFacts {
  const text = normalizeDemandText(raw);
  const f = fold(text);
  const lines = lineSpans(text);
  const segments = segmentsOf(text);
  const ref = findReferenceDate(text);
  const referenceDate: Fact<IsoDate> = ref ? { value: ref.date, span: { start: ref.start, end: ref.end } } : { value: todayIso(opts.now) };

  const headerValue = (re: RegExp): Fact<string> | undefined => {
    for (const ln of lines) {
      const m = re.exec(fold(ln.text));
      if (!m) continue;
      const startInLine = m.index + m[0].length;
      const value = ln.text.slice(startInLine).trim();
      if (!value) continue;
      const lead = ln.text.slice(startInLine).length - ln.text.slice(startInLine).trimStart().length;
      return { value, span: { start: ln.start + startInLine + lead, end: ln.end } };
    }
    return undefined;
  };

  // --- cabeçalho de mensagem/memorando
  const fromHeader = headerValue(/^\s*(?:de|from|remetente)\s*:\s*/);
  const toHeader = headerValue(/^\s*(?:para|to|destinatario)\s*:\s*/);
  const subject = headerValue(/^\s*(?:assunto|subject|objeto)\s*:\s*/);

  // --- blocos: cabeçalho do ofício (antes do vocativo/nº), destinatário (depois de "A Sua Senhoria"), assinatura (depois de "Atenciosamente")
  const firstBody = lines.findIndex((l) => SALUTATION.test(fold(l.text)) || /^\s*(oficio|memorando|processo)\b/.test(fold(l.text)) || HEADER_LINE.test(l.text));
  const headerLines = lines.slice(0, firstBody < 0 ? Math.min(6, lines.length) : firstBody).filter((l) => isOrgLine(l.text));
  const salutationIdx = lines.findIndex((l) => /^\s*(a sua senhoria|a sua excelencia|ao senhor|a senhora|ao\(a\)|ao ilustrissimo|a ilustrissima|ao excelentissimo|a excelentissima|exm[oa]\.?|ilm[oa]\.?)\b/.test(fold(l.text)));
  const addressee: typeof lines = [];
  if (salutationIdx >= 0) {
    for (let i = salutationIdx; i < lines.length && i < salutationIdx + 6; i++) {
      const l = lines[i]!;
      if (!l.text.trim() || HEADER_LINE.test(l.text)) break;
      addressee.push(l);
    }
  }
  const closeIdx = lines.findIndex((l) => CLOSE_WORDS.test(fold(l.text)));
  const signature = closeIdx >= 0 ? lines.slice(closeIdx + 1).filter((l) => l.text.trim()).slice(0, 4) : [];

  const asFact = (l: { start: number; end: number; text: string }): Fact<string> => {
    const lead = l.text.length - l.text.trimStart().length;
    return { value: titleCaseIfUpper(l.text.trim()), span: { start: l.start + lead, end: l.end } };
  };
  const signatureOrg = signature.find((l) => isOrgLine(l.text));
  let sender: Fact<string> | undefined = headerLines.length ? asFact(headerLines[headerLines.length - 1]!) : signatureOrg ? asFact(signatureOrg) : undefined;
  if (!sender && fromHeader) sender = { value: fromHeader.value.replace(/\s*<[^>]*>\s*/g, " ").replace(/^["']|["']$/g, "").trim() || fromHeader.value, span: fromHeader.span };
  let signatory: Fact<string> | undefined;
  const nameLine = signature.find((l) => !isOrgLine(l.text) && /\p{L}/u.test(l.text));
  if (nameLine) {
    const role = signature[signature.indexOf(nameLine) + 1];
    const value = role && !isOrgLine(role.text) ? `${nameLine.text.trim()} — ${role.text.trim()}` : nameLine.text.trim();
    signatory = { value, span: { start: nameLine.start + (nameLine.text.length - nameLine.text.trimStart().length), end: role && !isOrgLine(role.text) ? role.end : nameLine.end } };
  } else if (fromHeader && sender?.span?.start !== fromHeader.span?.start) {
    signatory = { value: fromHeader.value.replace(/\s*<[^>]*>\s*/g, " ").trim(), span: fromHeader.span };
  }

  let recipient: Fact<string> | undefined;
  const addresseeOrg = addressee.find((l) => isOrgLine(l.text));
  if (addresseeOrg) recipient = asFact(addresseeOrg);
  else if (toHeader) recipient = { value: toHeader.value.replace(/\s*<[^>]*>\s*/g, " ").trim(), span: toHeader.span };
  else {
    // "Solicitamos à Coordenação de …"
    const m = new RegExp(`\\b(?:solicit\\w*|encaminh\\w*|requer\\w*)\\s+(?:a|ao|as|aos)\\s+(?=(?:${ORG_WORDS})\\b)`).exec(f);
    if (m) {
      const org = orgNameAt(text, m.index + m[0].length);
      if (org) recipient = { value: org.name, span: { start: org.start, end: org.end } };
    }
  }

  // --- referência (nº do ofício/processo)
  let reference: Fact<string> | undefined;
  const rm = REFERENCE.exec(f);
  if (rm) {
    const end = rm.index + rm[0].length;
    reference = { value: text.slice(rm.index, end).replace(/\s+/g, " ").trim(), span: { start: rm.index, end } };
  }

  // --- prazos: o da demanda é o mais distante (o fim); os que caem na oração de uma entrega viram prazo dela
  const deadlines = findDeadlines(text, referenceDate.value);
  const finalDeadline = [...deadlines].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.start - b.start))[0];
  const deadline: DeadlineFact | undefined = finalDeadline
    ? { date: finalDeadline.date, kind: finalDeadline.kind, amount: finalDeadline.amount, from: finalDeadline.from, span: { start: finalDeadline.start, end: finalDeadline.end } }
    : undefined;

  // --- objetivo
  let objective: Fact<string> | undefined;
  for (const s of segments) {
    if (s.header) continue;
    const m = OBJECTIVE_CUE.exec(f.slice(s.start, s.end));
    if (!m) continue;
    const start = s.start + m.index + m[0].length;
    const end = clauseEnd(f, start, s.end);
    const value = clip(text.slice(start, end), 160).replace(/[.;:,]$/, "");
    if (value.length >= 8) {
      objective = { value: capitalize(value), span: { start, end } };
      break;
    }
  }
  if (!objective && subject) objective = { value: subject.value, span: subject.span };

  // --- entregas
  const deliverables = extractDeliverables(text, f, segments, subject?.value);
  for (const d of deliverables) {
    const seg = segments.find((s) => d.span && s.start <= d.span.start && d.span.end <= s.end);
    const own = seg ? deadlines.filter((x) => overlaps(x, seg)) : [];
    if (own.length && own.length < deadlines.length) d.due = own[own.length - 1]!.date;
  }

  // --- valores
  const amounts: AmountFact[] = [];
  for (const m of f.matchAll(AMOUNT)) {
    const int = Number(m[1]!.replace(/\./g, ""));
    const dec = m[2] ? Number(`0.${m[2].padEnd(2, "0")}`) : 0;
    const mult = !m[3] ? 1 : m[3] === "mil" ? 1e3 : m[3].startsWith("milh") ? 1e6 : 1e9;
    const value = Math.round((int + dec) * mult * 100) / 100;
    if (!(value > 0)) continue;
    const seg = segments.find((s) => s.start <= m.index && m.index < s.end);
    const label = seg ? clip(seg.text, 90) : clip(text.slice(m.index, m.index + 60), 60);
    if (amounts.some((a) => a.value === value)) continue;
    amounts.push({ id: `v${amounts.length + 1}`, value, label, span: { start: m.index, end: m.index + m[0].length } });
  }

  // --- partes interessadas
  const stakeholders: StakeholderFact[] = [];
  const addStk = (name: string, role: StakeholderRole, span?: Span) => {
    const clean = name.replace(/\s+/g, " ").replace(/[\s,;:.–-]+$/u, "").trim();
    if (clean.length < 3 || stakeholders.some((s) => sameName(s.name, clean))) return;
    stakeholders.push({ id: `s${stakeholders.length + 1}`, name: clean, role, span });
  };
  if (sender) addStk(sender.value, "DEMANDANTE", sender.span);
  if (recipient) addStk(recipient.value, "DESTINATARIO", recipient.span);
  for (const m of f.matchAll(ORG_ANY)) {
    // "Governo do Estado…" é o guarda-chuva, não uma parte interessada do projeto
    if (m[1] === "governo") continue;
    const org = orgNameAt(text, m.index);
    if (!org || org.words < 3) continue;
    addStk(org.name, CONTROL_BODY.test(fold(org.name)) ? "CONTROLE" : "OUTRO", { start: org.start, end: org.end });
  }
  for (const [re, name] of PUBLIC_GROUPS) {
    const m = re.exec(f);
    if (m) addStk(name, "PUBLICO", { start: m.index, end: m.index + m[0].length });
  }

  // --- restrições
  const constraints: ConstraintFact[] = [];
  for (const s of segments) {
    if (s.header) continue;
    if (!CONSTRAINT_CUE.test(f.slice(s.start, s.end))) continue;
    const value = clip(s.text.replace(/^[\d.)\s-]+(?=\p{L})/u, ""), 180).replace(/[;,:.]+$/u, "");
    if (constraints.some((c) => similarity(c.text, value) >= 0.8)) continue;
    constraints.push({ id: `c${constraints.length + 1}`, text: capitalize(value), span: { start: s.start, end: s.end } });
    if (constraints.length >= 8) break;
  }

  // --- riscos por palavra-chave
  const risks: RiskFact[] = [];
  for (const key of RISK_KEYS) {
    const rule = RISK_RULES[key];
    const m = rule.cue.exec(f);
    if (!m) continue;
    risks.push({ id: `k${risks.length + 1}`, key, title: rule.title, probability: rule.probability, impactLevel: rule.impactLevel, span: { start: m.index, end: m.index + m[0].length } });
  }

  return {
    text, referenceDate, sender, signatory, recipient, subject, objective, reference, deadline,
    kind: classifyDemand(f), amounts, deliverables, stakeholders, constraints, risks,
  };
}

/** Classificação por palavras-chave com peso; empate pela ordem TI → obra → normativo → aquisição → serviço → capacitação. */
export function classifyDemand(foldedText: string): DemandFacts["kind"] {
  const scores = Object.fromEntries(DEMAND_KINDS.map((k) => [k, 0])) as Record<DemandKind, number>;
  const evidence: Record<DemandKind, Span[]> = Object.fromEntries(DEMAND_KINDS.map((k) => [k, []])) as unknown as Record<DemandKind, Span[]>;
  for (const [kind, rules] of Object.entries(KIND_KEYWORDS) as [Exclude<DemandKind, "OUTRA">, [RegExp, number][]][]) {
    for (const [re, weight] of rules) {
      for (const m of foldedText.matchAll(re)) {
        scores[kind] += weight;
        if (evidence[kind].length < 8 && !evidence[kind].some((e) => overlaps(e, { start: m.index, end: m.index + m[0].length }))) {
          evidence[kind].push({ start: m.index, end: m.index + m[0].length });
        }
      }
    }
  }
  let best: DemandKind = "OUTRA";
  for (const k of KIND_ORDER) if (k !== "OUTRA" && scores[k] > (best === "OUTRA" ? 0 : scores[best])) best = k;
  return { value: best, scores, evidence: [...evidence[best]].sort((a, b) => a.start - b.start) };
}

/** Tipo de uma entrega pelo verbo (ou nominalização) e pelas palavras do objeto. */
export function deliverableTypeOf(text: string): DeliverableType {
  const f = fold(text);
  for (const [re, type] of OBJECT_HINTS) if (re.test(f)) return type;
  const first = /^\s*([a-z]+)/.exec(f)?.[1] ?? "";
  if (VERBS[first]) return VERBS[first];
  if (NOUNS[first]) return NOUNS[first];
  for (const w of f.split(/[^a-z]+/)) {
    if (VERBS[w]) return VERBS[w];
    if (NOUNS[w]) return NOUNS[w];
  }
  return "OUTRO";
}

// ------------------------------------------------------------------ auxiliares

/** Mesmo órgão/grupo: igual sem acento e sem a sigla final ("… – CPE"), ou com as mesmas palavras. */
function sameName(a: string, b: string): boolean {
  const base = (s: string) => fold(s).replace(/\s+[–—-]\s+\S+$/u, "").trim();
  return base(a) === base(b) || similarity(base(a), base(b)) >= 0.8;
}

function isOrgLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 6 || t.length > 110) return false;
  const f = fold(t);
  return ORG_START.test(f) && !/[.!?]$/.test(t.replace(/\s*[–-]\s*[A-Z0-9/]+$/, "")) && !/\b(solicit|encaminh|informamos|vimos)\w*/.test(f);
}

/** Nome do órgão a partir da palavra-chave em `at`: palavras com inicial maiúscula ou conectivos, até a pontuação. */
function orgNameAt(text: string, at: number): { name: string; start: number; end: number; words: number } | null {
  const re = /[\p{L}\-'’]+|[^\p{L}\s]|\s+/gu;
  re.lastIndex = at;
  let end = at;
  let words = 0;
  let lastWordEnd = at;
  let m: RegExpExecArray | null;
  let first = true;
  while ((m = re.exec(text))) {
    const tok = m[0];
    if (/^\s+$/.test(tok)) {
      if (tok.includes("\n")) break;
      continue;
    }
    if (!/^\p{L}/u.test(tok)) break;
    const low = fold(tok);
    const cap = /^\p{Lu}/u.test(tok);
    if (first) {
      first = false;
    } else if (!cap && !CONNECTORS.has(low)) break;
    words += 1;
    end = m.index + tok.length;
    if (!CONNECTORS.has(low)) lastWordEnd = end;
    if (words > 12) break;
  }
  end = lastWordEnd;
  if (end <= at) return null;
  const name = titleCaseIfUpper(text.slice(at, end).replace(/\s+/g, " ").trim());
  return { name, start: at, end, words };
}

/** Fim da oração a partir de `from`: vírgula, ponto e vírgula, dois-pontos, ponto final ou fim do segmento. */
function clauseEnd(f: string, from: number, segEnd: number): number {
  const rest = f.slice(from, segEnd);
  const m = /[,;:]|\.(?=\s|$)|\s+(?:com o objetivo|com a finalidade|a fim de|visando|conforme|em atendimento|nos termos|observad[oa])\b/.exec(rest);
  return m ? from + m.index : segEnd;
}

const VERB_RE = new RegExp(`\\b(${Object.keys(VERBS).join("|")})\\b`, "g");
const NOUN_RE = new RegExp(`\\b(${Object.keys(NOUNS).join("|")})\\s+(?:de|do|da|dos|das)\\b`, "g");
const STARTS_ACTION = new RegExp(`^(?:${Object.keys(VERBS).join("|")})\\b|^(?:${Object.keys(NOUNS).join("|")})\\s+(?:de|do|da|dos|das)\\b`);
/** Linha que introduz uma lista de ENTREGAS ("O projeto deverá contemplar:", "Solicitamos as seguintes providências:"). */
const DELIVERABLE_INTRO = /\b(contempl\w*|abrang\w*|inclu\w*|entregas?|produtos?|atividades|acoes|etapas|escopo|itens|providencias|seguintes|necessari\w*|devera\w*|solicit\w*|compreend\w*)\b/;

function extractDeliverables(text: string, f: string, segments: readonly Segment[], subject?: string): DeliverableFact[] {
  const out: DeliverableFact[] = [];
  const push = (start: number, end: number) => {
    let s = start;
    let e = end;
    while (s < e && /[\s"“(]/.test(text[s]!)) s++;
    while (e > s && /[\s.;:,"”)]/.test(text[e - 1]!)) e--;
    // fecha parênteses abertos ("(ETP)")
    if ((text.slice(s, e).match(/\(/g)?.length ?? 0) > (text.slice(s, e).match(/\)/g)?.length ?? 0) && text[e] === ")") e++;
    const value = clip(text.slice(s, e), 140);
    if (value.length < 6 || out.length >= 12) return;
    if (subject && similarity(value, subject) >= 0.75) return;
    if (out.some((d) => similarity(d.text, value) >= 0.7)) return;
    out.push({ id: `d${out.length + 1}`, text: capitalize(value), type: deliverableTypeOf(value), span: { start: s, end: e } });
  };
  for (const seg of segments) {
    if (seg.header) continue;
    const local = f.slice(seg.start, seg.end);
    const startsAction = STARTS_ACTION.test(local);
    // item de lista: entrega quando começa por ação, ou quando é item curto de uma lista introduzida por ":" que fala de entregas
    const intro = seg.intro ? f.slice(seg.intro.start, seg.intro.end) : "";
    if (seg.list && (startsAction || (seg.intro && DELIVERABLE_INTRO.test(intro) && seg.end - seg.start <= 180))) {
      push(seg.start, seg.start + clauseEndList(local));
      continue;
    }
    // parágrafo: ações dentro da oração (antes da deixa de objetivo, que é o porquê e não o quê)
    const goal = OBJECTIVE_CUE.exec(local);
    const limit = goal ? goal.index : local.length;
    const hits: { at: number }[] = [];
    for (const m of local.matchAll(VERB_RE)) if (m.index < limit) hits.push({ at: m.index });
    for (const m of local.matchAll(NOUN_RE)) if (m.index < limit) hits.push({ at: m.index });
    hits.sort((a, b) => a.at - b.at);
    for (const h of hits) {
      const abs = seg.start + h.at;
      push(abs, clauseEnd(f, abs, seg.start + limit));
    }
  }
  return out;
}

/** Item de lista: vai até o fim do item (sem o ";" ou "." final); corta antes de "conforme…", que é restrição. */
function clauseEndList(local: string): number {
  const m = /,\s*(?:conforme|nos termos|observad[oa]|em conformidade)\b|;|\.(?=\s|$)/.exec(local);
  return m ? m.index : local.length;
}

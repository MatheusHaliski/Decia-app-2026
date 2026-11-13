/**
 * Tipos comuns da extração de dados de desenhos CAD/BIM (RF34 + RF70). Tudo roda no navegador: o arquivo é lido em memória,
 * medido por funções puras (lib/cad/**) e nada vai a servidor. A "IA" só interpreta os números calculados aqui (D-12).
 *
 * Um quantitativo normalizado (`TakeoffRow`) tem item, unidade (m · m² · m³ · un), quantidade, origem (camada, bloco, tipo IFC
 * ou malha), confiança com o motivo e alertas. As perdas de fidelidade (o que foi descartado, aproximado ou achatado) são
 * listadas antes de qualquer aceite (RF70.CA06).
 */

export const CAD_FORMATS = ["DXF", "IFC", "GLB", "DWG"] as const;
export type CadFormat = (typeof CAD_FORMATS)[number];

export const QTY_UNITS = ["m", "m2", "m3", "un"] as const;
export type QtyUnit = (typeof QTY_UNITS)[number];

export const CONFIDENCES = ["ALTA", "MEDIA", "BAIXA"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/** Classe do item de obra (vem do nome da camada/bloco, do tipo IFC ou do nome da malha/material). */
export const ITEM_KINDS = [
  "FUNDACAO", "PILAR", "VIGA", "LAJE", "ESCADA", "PAREDE", "COBERTURA", "PORTA", "JANELA", "GUARDA_CORPO", "AMBIENTE", "PISO", "FORRO",
  "REVESTIMENTO", "LUMINARIA", "TOMADA", "INTERRUPTOR", "LOUCA", "TUBULACAO", "ELETRODUTO", "MOBILIARIO", "COTA", "TEXTO", "EIXO", "OUTRO",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Etapas da obra, na ordem do cronograma. */
export const STAGES = ["CANTEIRO", "FUNDACAO", "ESTRUTURA", "ALVENARIA", "COBERTURA", "INSTALACOES", "REVESTIMENTOS", "LIMPEZA"] as const;
export type StageId = (typeof STAGES)[number];

/** Alerta traduzível: `cad.alert.<code>` com as variáveis calculadas. */
export interface CadAlert {
  code: string;
  vars?: Record<string, string | number>;
}

export interface RowSource {
  format: Exclude<CadFormat, "DWG">;
  /** de onde veio: camada (comprimento/área), bloco (contagem), ambiente, hachura, tipo IFC, malha ou linha derivada */
  what: "CAMADA" | "CONTORNO" | "BLOCO" | "AMBIENTE" | "HACHURA" | "IFC" | "MALHA" | "DERIVADA";
  /** camada, nome do bloco, tipo IFC (IfcWall…) ou nome da malha — dado do arquivo, mostrado como está */
  ref: string;
  /** grandeza lida (ex.: "NetSideArea" no IFC) */
  measure?: string;
}

export interface TakeoffRow {
  /** estável entre recálculos (as correções da pessoa se ligam a ele) */
  id: string;
  kind: ItemKind;
  /** rótulo do arquivo (camada, bloco, material, ambiente, malha) — dado do usuário, mostrado como está */
  label: string;
  unit: QtyUnit;
  quantity: number;
  source: RowSource;
  confidence: Confidence;
  /** motivos da confiança e avisos da linha */
  alerts: CadAlert[];
  /** entra na planilha e no cronograma por padrão */
  included: boolean;
  /** quebra por camada (DXF) ou pavimento (IFC) */
  breakdown?: { label: string; quantity: number }[];
  /** dimensões (portas e janelas do IFC): largura × altura em metros e quantas */
  sizes?: { w: number; h: number; n: number }[];
  /** informação do arquivo que ajuda a identificar a linha (materiais da malha, pavimento do ambiente) — mostrada como está */
  detail?: string;
  /** linha calculada a partir de outra (paredes: comprimento ÷ fator × pé-direito) */
  formula?: { code: string; vars: Record<string, string | number> };
  /** a pessoa corrigiu a quantidade (valor original guardado) — RF34.CA04 */
  corrected?: { from: number };
}

/** Perda de fidelidade listada antes do aceite (RF70.CA06). */
export interface CadLoss {
  kind: "DESCARTADO" | "APROXIMADO" | "ACHATADO";
  code: string;
  n: number;
  /** detalhe vindo do arquivo (tipos de entidade, extensões) */
  detail?: string;
}

/** Fato numérico da leitura (contagens) que a "IA" pode citar. */
export interface CadFact {
  code: string;
  n: number;
}

export interface UnitInfo {
  /** unidade de comprimento do desenho (fator para metro) */
  id: string;
  toMeters: number;
  /** ARQUIVO = declarada no arquivo; SUPOSTA = deduzida da extensão do desenho; ESCOLHIDA = a pessoa escolheu; PADRAO = norma do formato */
  origin: "ARQUIVO" | "SUPOSTA" | "ESCOLHIDA" | "PADRAO";
}

export interface Takeoff {
  format: CadFormat;
  rows: TakeoffRow[];
  alerts: CadAlert[];
  losses: CadLoss[];
  facts: CadFact[];
  unit: UnitInfo | null;
  /** a unidade pode ser trocada pela pessoa (DXF e GLB) */
  unitEditable: boolean;
}

/** Erro de leitura com código estável (mensagem em `cad.error.<code>`). */
export interface ReadError {
  code: ReadErrorCode;
  vars?: Record<string, string | number>;
}

export type ReadErrorCode =
  | "ARQUIVO_VAZIO"
  | "TIPO_NAO_PERMITIDO"
  | "TIPO_DIVERGENTE"
  | "ARQUIVO_GRANDE"
  | "EXCESSIVO"
  | "MALFORMADO"
  | "DXF_BINARIO"
  | "GLTF_JSON"
  | "IFC_COMPACTADO"
  | "GLB_VERSAO"
  | "PDF"
  | "LEITURA";

export class CadReadError extends Error {
  readonly code: ReadErrorCode;
  readonly vars?: Record<string, string | number>;
  constructor(code: ReadErrorCode, vars?: Record<string, string | number>) {
    super(code);
    this.name = "CadReadError";
    this.code = code;
    this.vars = vars;
  }
}

import { describe, expect, it } from "vitest";
import { classifyName, isUnnamedLayer } from "./classify";
import { decodeDxfText, parseDxf, stripMtext } from "./dxf";
import { bulgeArc, polyMeasure } from "./geometry";
import { parseCad } from "./read";
import { takeoffOf, DEFAULT_TAKEOFF_OPTIONS } from "./takeoff";

/* ── montagem de DXF ASCII no próprio teste ── */
type V = string | number;
const g = (...pairs: [number, V][]) => pairs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n");
const header = (insunits: number | null) =>
  g([0, "SECTION"], [2, "HEADER"], [9, "$ACADVER"], [1, "AC1027"], ...(insunits === null ? [] : ([[9, "$INSUNITS"], [70, insunits]] as [number, V][])), [0, "ENDSEC"]);
const join = (...parts: string[]) => parts.filter(Boolean).join("\n");
const tables = (layers: string[]) =>
  join(g([0, "SECTION"], [2, "TABLES"], [0, "TABLE"], [2, "LAYER"], [70, layers.length]), ...layers.map((l) => g([0, "LAYER"], [2, l], [70, 0], [62, 7], [6, "CONTINUOUS"])), g([0, "ENDTAB"], [0, "ENDSEC"]));
const blocks = (names: string[]) =>
  join(g([0, "SECTION"], [2, "BLOCKS"]), ...names.map((n) => g([0, "BLOCK"], [8, "0"], [2, n], [70, 0], [10, 0], [20, 0], [30, 0], [0, "LINE"], [8, "0"], [10, 0], [20, 0], [11, 800], [21, 0], [0, "ENDBLK"])), g([0, "ENDSEC"]));
const entities = (items: string[]) => join(g([0, "SECTION"], [2, "ENTITIES"]), ...items, g([0, "ENDSEC"], [0, "EOF"]));
const dxf = (opts: { insunits?: number | null; layers?: string[]; blocks?: string[]; items: string[] }) =>
  [header(opts.insunits === undefined ? 4 : opts.insunits), tables(opts.layers ?? []), blocks(opts.blocks ?? []), entities(opts.items)].join("\n") + "\n";

const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => g([0, "LINE"], [8, layer], [10, x1], [20, y1], [30, 0], [11, x2], [21, y2], [31, 0]);
const lw = (layer: string, pts: [number, number, number?][], closed: boolean) =>
  g([0, "LWPOLYLINE"], [8, layer], [90, pts.length], [70, closed ? 1 : 0], ...pts.flatMap(([x, y, b]) => [[10, x], [20, y], ...(b ? [[42, b]] : [])] as [number, V][]));
const insert = (layer: string, block: string, x: number, y: number, extra: [number, V][] = []) => g([0, "INSERT"], [8, layer], [2, block], [10, x], [20, y], [30, 0], ...extra);
const text = (layer: string, s: string, x: number, y: number) => g([0, "TEXT"], [8, layer], [10, x], [20, y], [30, 0], [40, 200], [1, s]);
const rect = (x: number, y: number, w: number, h: number): [number, number][] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

const parse = (text: string) => parseDxf(text);
const byId = (rows: { id: string }[], id: string) => rows.find((r) => r.id === id);

describe("geometria das polilinhas (bulge)", () => {
  it("retângulo pelo laço: 5 × 4 = 20; segmento com bulge 1 é meia-volta (área π/2, comprimento π)", () => {
    expect(polyMeasure(rect(0, 0, 5, 4).map(([x, y]) => ({ x, y })), [], true)).toEqual({ length: 18, area: 20 });
    const arc = bulgeArc({ x: 0, y: 0 }, { x: 2, y: 0 }, 1);
    expect(arc.length).toBeCloseTo(Math.PI, 10);
    expect(arc.segArea).toBeCloseTo(Math.PI / 2, 10);
    // quadrado 2 × 2 anti-horário com o lado de baixo virando semicírculo para fora: 4 + π/2
    const m = polyMeasure([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }], [1, 0, 0, 0], true);
    expect(m.area).toBeCloseTo(4 + Math.PI / 2, 10);
    expect(m.length).toBeCloseTo(6 + Math.PI, 10);
    // horário com bulge negativo: mesma área em módulo
    const cw = polyMeasure([{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 0 }], [0, 0, 0, -1], true);
    expect(Math.abs(cw.area)).toBeCloseTo(4 + Math.PI / 2, 10);
  });
});

describe("classificação pelo nome", () => {
  it("camadas e blocos usuais (pt e AIA), sem falsos positivos de prefixo", () => {
    expect(classifyName("ARQ-PAREDE")).toBe("PAREDE");
    expect(classifyName("A-WALL")).toBe("PAREDE");
    expect(classifyName("PAREDE A CONSTRUIR")).toBe("PAREDE");
    expect(classifyName("Porta de giro 80x210")).toBe("PORTA");
    expect(classifyName("IMPORTADO")).toBe("OUTRO");
    expect(classifyName("S-COLS")).toBe("PILAR");
    expect(classifyName("EST-TUBULAO")).toBe("FUNDACAO");
    expect(classifyName("ELE-LUMINARIAS")).toBe("LUMINARIA");
    expect(classifyName("A-ANNO-DIMS")).toBe("COTA");
    expect(classifyName("Defpoints")).toBe("EIXO");
    expect(classifyName("xyz", "ARQ-ESQUADRIAS")).toBe("JANELA");
    expect(isUnnamedLayer("0")).toBe(true);
    expect(isUnnamedLayer("Layer1")).toBe(true);
    expect(isUnnamedLayer("ARQ-PAREDE")).toBe(false);
  });
});

describe("DXF: leitura e quantitativo", () => {
  const planta = dxf({
    insunits: 4,
    layers: ["ARQ-AMBIENTE", "ARQ-PAREDE", "ARQ-PORTAS", "ARQ-ESQUADRIA", "PISO-CERAMICO", "COTAS", "0"],
    blocks: ["PORTA 80", "JANELA_120"],
    items: [
      // ambiente: retângulo fechado 5 m × 4 m em mm, com o nome dentro
      lw("ARQ-AMBIENTE", rect(0, 0, 5000, 4000), true),
      text("ARQ-AMBIENTE", "SALA", 2500, 2000),
      text("ARQ-AMBIENTE", "A = 20,00 m²", 2500, 1500),
      // paredes em linha dupla: 2 × (5 + 4) m = 18 m de linhas
      line("ARQ-PAREDE", 0, 0, 5000, 0),
      line("ARQ-PAREDE", 0, 150, 5000, 150),
      line("ARQ-PAREDE", 0, 0, 0, 4000),
      line("ARQ-PAREDE", 150, 0, 150, 4000),
      // blocos: 3 portas + MINSERT 2 colunas de janela
      insert("ARQ-PORTAS", "PORTA 80", 100, 0),
      insert("ARQ-PORTAS", "PORTA 80", 900, 0),
      insert("0", "PORTA 80", 1800, 0),
      insert("ARQ-ESQUADRIA", "JANELA_120", 3000, 4000, [[70, 2], [71, 1]]),
      // linha solta na camada 0
      line("0", 6000, 0, 7000, 0),
      // ambiente aberto (vão de 0,5 m) com nome dentro
      lw("ARQ-AMBIENTE", [[6000, 0], [9000, 0], [9000, 3000], [6000, 3000], [6000, 500]], false),
      text("ARQ-AMBIENTE", "COZINHA", 7500, 1500),
      // hachura de piso com furo: 3 × 2 m − 1 × 1 m = 5 m²
      g([0, "HATCH"], [8, "PISO-CERAMICO"], [10, 0], [20, 0], [30, 0], [2, "ANSI31"], [70, 0], [71, 0], [91, 2],
        [92, 3], [72, 0], [73, 1], [93, 4], [10, 10000], [20, 0], [10, 13000], [20, 0], [10, 13000], [20, 2000], [10, 10000], [20, 2000], [97, 0],
        [92, 2], [72, 0], [73, 1], [93, 4], [10, 11000], [20, 500], [10, 12000], [20, 500], [10, 12000], [20, 1500], [10, 11000], [20, 1500], [97, 0],
        [75, 0], [76, 1], [98, 0]),
      // cotas: 4 m escrita como "5,00" (não bate) e outra como "4,00" (bate em metros)
      g([0, "DIMENSION"], [8, "COTAS"], [2, "*D1"], [10, 0], [20, -500], [11, 2000], [21, -500], [70, 1], [1, "5,00"], [13, 0], [23, 0], [14, 4000], [24, 0], [42, 4000]),
      g([0, "DIMENSION"], [8, "COTAS"], [2, "*D2"], [10, 0], [20, -800], [11, 2000], [21, -800], [70, 1], [1, "4,00"], [13, 0], [23, 0], [14, 4000], [24, 0], [42, 4000]),
      // sem suporte e espaço do papel
      g([0, "SOLID"], [8, "0"], [10, 0], [20, 0], [11, 1], [21, 0], [12, 0], [22, 1], [13, 1], [23, 1]),
      g([0, "LINE"], [67, 1], [8, "CARIMBO"], [10, 0], [20, 0], [11, 100000], [21, 0]),
    ],
  });

  it("lê camadas, $INSUNITS (mm), ambientes, blocos, hachura com furo, cotas e o que não tem suporte", () => {
    const a = parse(planta);
    expect(a.version).toBe("AC1027");
    expect(a.insUnits).toBe(4);
    expect(a.layers.map((l) => l.name)).toEqual(expect.arrayContaining(["ARQ-AMBIENTE", "ARQ-PAREDE", "0"]));
    expect(a.rooms).toHaveLength(1);
    expect(a.rooms[0]).toMatchObject({ name: "SALA", layer: "ARQ-AMBIENTE", area: 20_000_000, declaredM2: 20 });
    expect(a.openRooms[0]).toMatchObject({ name: "COZINHA", layer: "ARQ-AMBIENTE" });
    expect(a.openRooms[0]!.gap).toBeCloseTo(500, 6);
    expect(a.layerStats["ARQ-PAREDE"]!.length).toBe(18_000);
    expect(a.layerStats["PISO-CERAMICO"]!.hatchArea).toBeCloseTo(5_000_000, 3);
    expect(a.inserts.find((i) => i.block === "JANELA_120")!.count).toBe(2);
    expect(a.dimensions.count).toBe(2);
    expect(a.unsupported).toEqual({ SOLID: 1 });
    expect(a.paperSpace).toBe(1);
    // o polígono do ambiente vira ambiente, não área solta da camada
    expect(a.layerStats["ARQ-AMBIENTE"]!.closedArea).toBe(0);
  });

  it("quantitativo normalizado em metros: 20 m² do ambiente, linhas por camada, parede derivada, blocos e alertas", () => {
    const t = takeoffOf({ format: "DXF", fileName: "planta.dxf", sizeBytes: 1, dxf: parse(planta) }, DEFAULT_TAKEOFF_OPTIONS);
    expect(t.unit).toEqual({ id: "mm", toMeters: 0.001, origin: "ARQUIVO" });
    const room = byId(t.rows, "dxf:room:0")!;
    expect(room).toMatchObject({ kind: "AMBIENTE", label: "SALA", unit: "m2", confidence: "ALTA", included: true });
    expect(room.quantity).toBeCloseTo(20, 10);
    const wallLines = byId(t.rows, "dxf:len:ARQ-PAREDE")!;
    expect(wallLines).toMatchObject({ unit: "m", included: false, kind: "PAREDE" });
    expect(wallLines.quantity).toBeCloseTo(18, 10);
    // (18 m ÷ 2) × 2,80 m = 25,2 m² de alvenaria — premissa explícita, confiança média
    const wall = byId(t.rows, "dxf:wall:ARQ-PAREDE")!;
    expect(wall.quantity).toBeCloseTo(25.2, 10);
    expect(wall).toMatchObject({ unit: "m2", included: true, confidence: "MEDIA", formula: { code: "PAREDE_AREA", vars: { lines: 18, factor: 2, height: 2.8 } } });
    expect(byId(t.rows, "dxf:block:PORTA 80")).toMatchObject({ kind: "PORTA", unit: "un", quantity: 3, included: true, breakdown: [{ label: "ARQ-PORTAS", quantity: 2 }, { label: "0", quantity: 1 }] });
    expect(byId(t.rows, "dxf:block:JANELA_120")).toMatchObject({ kind: "JANELA", quantity: 2 });
    const floor = byId(t.rows, "dxf:hatch:PISO-CERAMICO")!;
    expect(floor.kind).toBe("PISO");
    expect(floor.quantity).toBeCloseTo(5, 6);
    const zero = byId(t.rows, "dxf:len:0")!;
    expect(zero.confidence).toBe("MEDIA");
    expect(zero.alerts.map((x) => x.code)).toContain("LINHA_CAMADA_SEM_NOME");
    const codes = t.alerts.map((x) => x.code);
    expect(codes).toEqual(expect.arrayContaining(["CAMADA_SEM_NOME", "POLILINHA_ABERTA_AMBIENTE", "COTA_SOBRESCRITA", "BLOCOS_NAO_EXPLODIDOS"]));
    expect(codes).not.toContain("UNIDADE_AUSENTE");
    expect(t.alerts.filter((x) => x.code === "COTA_SOBRESCRITA")).toEqual([{ code: "COTA_SOBRESCRITA", vars: { text: "5,00", measure: 4 } }]);
    expect(t.alerts.find((x) => x.code === "POLILINHA_ABERTA_AMBIENTE")!.vars).toMatchObject({ name: "COZINHA", gap: 0.5 });
    expect(t.losses).toEqual(expect.arrayContaining([
      { kind: "DESCARTADO", code: "ENTIDADES_SEM_SUPORTE", n: 1, detail: "SOLID ×1" },
      { kind: "DESCARTADO", code: "ESPACO_PAPEL", n: 1 },
    ]));
    expect(t.facts.find((f) => f.code === "AMBIENTES")!.n).toBe(1);
  });

  it("pé-direito e linha simples mudam a parede derivada; a unidade escolhida muda tudo", () => {
    const parsed = { format: "DXF" as const, fileName: "p.dxf", sizeBytes: 1, dxf: parse(planta) };
    const single = takeoffOf(parsed, { unit: null, wallHeightM: 3, wallDoubleLine: false });
    expect(byId(single.rows, "dxf:wall:ARQ-PAREDE")!.quantity).toBeCloseTo(54, 10);
    const cm = takeoffOf(parsed, { ...DEFAULT_TAKEOFF_OPTIONS, unit: "cm" });
    expect(cm.unit).toMatchObject({ id: "cm", origin: "ESCOLHIDA" });
    expect(byId(cm.rows, "dxf:room:0")!.quantity).toBeCloseTo(2000, 6);
    // a área escrita (20 m²) não bate mais com a calculada
    expect(byId(cm.rows, "dxf:room:0")!.alerts.map((a) => a.code)).toContain("LINHA_AREA_ESCRITA_DIFERE");
  });

  it("sem $INSUNITS: supõe a unidade pela extensão do desenho e avisa (confiança cai)", () => {
    const t = takeoffOf({ format: "DXF", fileName: "x.dxf", sizeBytes: 1, dxf: parse(dxf({ insunits: null, layers: ["PISO"], items: [lw("PISO", rect(0, 0, 12000, 8000), true)] })) });
    expect(t.unit).toMatchObject({ id: "mm", origin: "SUPOSTA" });
    expect(t.alerts[0]).toEqual({ code: "UNIDADE_AUSENTE", vars: { unit: "mm", extent: 12000 } });
    const row = byId(t.rows, "dxf:area:PISO")!;
    expect(row.quantity).toBeCloseTo(96, 10);
    expect(row.confidence).toBe("MEDIA");
    expect(row.alerts.map((a) => a.code)).toContain("LINHA_UNIDADE_SUPOSTA");
  });

  it("POLYLINE + VERTEX antigo, círculo, arco, MTEXT formatado e polilinha fechada só na geometria", () => {
    const a = parse(dxf({
      insunits: 6,
      items: [
        g([0, "POLYLINE"], [8, "LAJE"], [66, 1], [10, 0], [20, 0], [30, 0], [70, 1]),
        g([0, "VERTEX"], [8, "LAJE"], [10, 0], [20, 0], [30, 0]),
        g([0, "VERTEX"], [8, "LAJE"], [10, 4], [20, 0], [30, 0]),
        g([0, "VERTEX"], [8, "LAJE"], [10, 4], [20, 3], [30, 0]),
        g([0, "VERTEX"], [8, "LAJE"], [10, 0], [20, 3], [30, 0]),
        g([0, "SEQEND"], [8, "LAJE"]),
        g([0, "CIRCLE"], [8, "EST-PILAR"], [10, 20], [20, 20], [30, 0], [40, 1]),
        g([0, "ARC"], [8, "GUARDA-CORPO"], [10, 0], [20, 0], [30, 0], [40, 2], [50, 0], [51, 90]),
        g([0, "MTEXT"], [8, "ARQ-AMBIENTE"], [10, 30], [20, 30], [30, 0], [40, 0.2], [1, "{\\fArial|b1;SALA}\\PDE ESTAR"]),
        lw("FORRO", [[40, 0], [42, 0], [42, 2], [40, 2], [40, 0]], false),
      ],
    }));
    expect(a.layerStats.LAJE!.closedArea).toBe(12);
    expect(a.layerStats.LAJE!.length).toBe(14);
    expect(a.layerStats["EST-PILAR"]!.length).toBeCloseTo(2 * Math.PI, 10);
    expect(a.layerStats["EST-PILAR"]!.closedArea).toBeCloseTo(Math.PI, 10);
    expect(a.layerStats["GUARDA-CORPO"]!.length).toBeCloseTo(Math.PI, 10);
    expect(a.layerStats.FORRO!.closedArea).toBe(4);
    expect(a.implicitClosed).toBe(1);
    expect(stripMtext("{\\fArial|b1;SALA}\\PDE ESTAR")).toBe("SALA DE ESTAR");
    expect(decodeDxfText("\\U+00C1REA %%c50")).toBe("ÁREA Ø50");
  });
});

describe("DXF no formato que o AutoCAD 2018 grava", () => {
  // marcadores de subclasse (100), handles (5), dono (330), atributo com objeto embutido (101), dados de padrão e sementes
  // depois dos contornos da hachura, cota alinhada com a marca 32 (bloco só da cota) e CRLF no fim das linhas
  const R2018 = [
    "999\r\nexportado por teste",
    g([0, "SECTION"], [2, "HEADER"], [9, "$ACADVER"], [1, "AC1032"], [9, "$DWGCODEPAGE"], [3, "ANSI_1252"], [9, "$INSUNITS"], [70, 4], [9, "$MEASUREMENT"], [70, 1], [0, "ENDSEC"]),
    g([0, "SECTION"], [2, "TABLES"], [0, "TABLE"], [2, "LAYER"], [5, "2"], [330, "0"], [100, "AcDbSymbolTable"], [70, 2],
      [0, "LAYER"], [5, "10"], [330, "2"], [100, "AcDbSymbolTableRecord"], [100, "AcDbLayerTableRecord"], [2, "ARQ-PISO"], [70, 0], [62, 7], [6, "Continuous"], [370, -3], [390, "F"],
      [0, "LAYER"], [5, "11"], [330, "2"], [100, "AcDbSymbolTableRecord"], [100, "AcDbLayerTableRecord"], [2, "ELE-LUMINARIA"], [70, 1], [62, -2], [6, "Continuous"],
      [0, "ENDTAB"], [0, "ENDSEC"]),
    g([0, "SECTION"], [2, "BLOCKS"],
      [0, "BLOCK"], [5, "20"], [330, "1F"], [100, "AcDbEntity"], [8, "0"], [100, "AcDbBlockBegin"], [2, "LUM-SOBREPOR"], [70, 2], [10, 0], [20, 0], [30, 0], [3, "LUM-SOBREPOR"], [1, ""],
      [0, "ATTDEF"], [5, "21"], [330, "1F"], [100, "AcDbEntity"], [8, "0"], [100, "AcDbText"], [10, 0], [20, 0], [30, 0], [40, 100], [1, ""], [100, "AcDbAttributeDefinition"], [3, "POT"], [2, "POTENCIA"], [70, 0],
      [0, "ENDBLK"], [5, "22"], [330, "1F"], [100, "AcDbEntity"], [8, "0"], [100, "AcDbBlockEnd"],
      [0, "ENDSEC"]),
    g([0, "SECTION"], [2, "ENTITIES"],
      // hachura de 4 × 3 m com contorno de arestas (3 retas + 1 arco de 180° para fora no lado de cima)
      [0, "HATCH"], [5, "30"], [330, "1F"], [100, "AcDbEntity"], [8, "ARQ-PISO"], [100, "AcDbHatch"], [10, 0], [20, 0], [30, 0], [210, 0], [220, 0], [230, 1],
      [2, "SOLID"], [70, 1], [71, 0], [91, 1],
      [92, 1], [93, 4],
      [72, 1], [10, 0], [20, 0], [11, 4000], [21, 0],
      [72, 1], [10, 4000], [20, 0], [11, 4000], [21, 3000],
      [72, 2], [10, 2000], [20, 3000], [40, 2000], [50, 0], [51, 180], [73, 1],
      [72, 1], [10, 0], [20, 3000], [11, 0], [21, 0],
      [97, 0], [75, 1], [76, 1], [47, 0.04], [98, 1], [10, 2000], [20, 1500], [450, 0], [451, 0], [460, 0], [461, 0], [452, 0], [462, 0], [453, 0], [470, "LINEAR"],
      // luminárias com atributos (um deles com objeto embutido) e SEQEND
      [0, "INSERT"], [5, "40"], [330, "1F"], [100, "AcDbEntity"], [8, "ELE-LUMINARIA"], [100, "AcDbBlockReference"], [66, 1], [2, "LUM-SOBREPOR"], [10, 1000], [20, 1000], [30, 0],
      [0, "ATTRIB"], [5, "41"], [330, "40"], [100, "AcDbEntity"], [8, "ELE-LUMINARIA"], [100, "AcDbText"], [10, 1000], [20, 1000], [30, 0], [40, 100], [1, "2x18W"], [100, "AcDbAttribute"], [2, "POTENCIA"], [70, 0],
      [101, "Embedded Object"], [10, 1000], [20, 1000], [1, "2x18W"],
      [0, "SEQEND"], [5, "42"], [330, "40"], [100, "AcDbEntity"], [8, "ELE-LUMINARIA"],
      [0, "INSERT"], [5, "43"], [330, "1F"], [100, "AcDbEntity"], [8, "ELE-LUMINARIA"], [100, "AcDbBlockReference"], [2, "LUM-SOBREPOR"], [10, 3000], [20, 1000], [30, 0],
      // cota alinhada de 4 m, tipo 33 (1 + 32), sem texto sobrescrito
      [0, "DIMENSION"], [5, "50"], [330, "1F"], [100, "AcDbEntity"], [8, "COTAS"], [100, "AcDbDimension"], [280, 0], [2, "*D5"], [10, 4000], [20, -500], [30, 0], [11, 2000], [21, -500], [31, 0],
      [70, 33], [71, 5], [42, 4000], [3, "ISO-25"], [100, "AcDbAlignedDimension"], [13, 0], [23, 0], [33, 0], [14, 4000], [24, 0], [34, 0],
      [0, "ENDSEC"]),
    g([0, "SECTION"], [2, "OBJECTS"], [0, "DICTIONARY"], [5, "C"], [330, "0"], [100, "AcDbDictionary"], [3, "ACAD_GROUP"], [350, "D"], [0, "ENDSEC"], [0, "EOF"]),
  ].join("\n").replace(/\n/g, "\r\n");

  it("lê camadas congeladas/desligadas, hachura com arco, blocos com atributos e cota sem alerta", () => {
    const a = parse(R2018);
    expect(a.version).toBe("AC1032");
    expect(a.layers.find((l) => l.name === "ELE-LUMINARIA")).toEqual({ name: "ELE-LUMINARIA", off: true, frozen: true });
    // 4 × 3 m + semicírculo de raio 2 m para fora: 12 + 2π m²
    expect(a.layerStats["ARQ-PISO"]!.hatchArea).toBeCloseTo(12_000_000 + 2 * Math.PI * 1_000_000, 0);
    expect(a.inserts).toEqual([{ block: "LUM-SOBREPOR", layer: "ELE-LUMINARIA", count: 2, anonymous: false }]);
    expect(a.blockDefs).toBe(1);
    expect(a.dimensions).toMatchObject({ count: 1, overrides: [], measured: [4000] });
    expect(a.unsupported).toEqual({});
    const t = takeoffOf({ format: "DXF", fileName: "r2018.dxf", sizeBytes: 1, dxf: a });
    expect(byId(t.rows, "dxf:block:LUM-SOBREPOR")).toMatchObject({ kind: "LUMINARIA", quantity: 2, included: true, confidence: "ALTA" });
    expect(byId(t.rows, "dxf:hatch:ARQ-PISO")!.quantity).toBeCloseTo(12 + 2 * Math.PI, 6);
    expect(t.alerts.map((x) => x.code)).toEqual(["BLOCOS_NAO_EXPLODIDOS"]);
  });
});

describe("DXF: arquivos recusados (RF70.CA05)", () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  it("linha de código inválida é arquivo malformado; DXF binário pede o ASCII", () => {
    const bad = parseCad("x.dxf", enc("  0\nSECTION\n  2\nENTITIES\nabc\nLINE\n"));
    expect(bad).toEqual({ ok: false, error: { code: "MALFORMADO", vars: { format: "DXF", line: 5 } } });
    expect(parseCad("x.dxf", enc("AutoCAD Binary DXF\r\n\u001a\u0000..."))).toEqual({ ok: false, error: { code: "DXF_BINARIO" } });
  });

  it("conteúdo DXF com extensão .ifc é tipo divergente; extensão fora da lista é recusada", () => {
    expect(parseCad("planta.ifc", enc(dxf({ items: [] })))).toEqual({ ok: false, error: { code: "TIPO_DIVERGENTE", vars: { detected: "DXF", ext: "ifc" } } });
    expect(parseCad("foto.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toEqual({ ok: false, error: { code: "TIPO_NAO_PERMITIDO", vars: { ext: "png" } } });
  });
});

import { describe, expect, it } from "vitest";
import { decodeStepString, parseIfc, StepFile } from "./ifc";
import { parseCad } from "./read";
import { takeoffOf } from "./takeoff";

const ifc = (data: string, schema = "IFC4") => `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');
FILE_NAME('obra.ifc','2026-11-12T10:00:00',('Ana'),('SECID; obras'),'','teste','');
FILE_SCHEMA(('${schema}'));
ENDSEC;
DATA;
${data}
ENDSEC;
END-ISO-10303-21;
`;

/** IFC mínimo: unidades em mm, 2 pavimentos, 2 paredes (uma sem volume), 1 laje com quantidades, 1 porta 0,80 × 2,10. */
const MINIMO = ifc(`#1=IFCPROJECT('0001',$,'Obra',$,$,$,$,$,#2);
#2=IFCUNITASSIGNMENT((#3,#4,#5));
#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#4=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#5=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
/* pavimentos */
#10=IFCBUILDINGSTOREY('s1',$,'T\\X2\\00E9\\X0\\rreo',$,$,$,$,$,.ELEMENT.,0.);
#11=IFCBUILDINGSTOREY('s2',$,'Superior',$,$,$,$,$,.ELEMENT.,3000.);
#20=IFCWALLSTANDARDCASE('w1',$,'Parede 1',$,$,$,$,$,$);
#21=IFCWALL('w2',$,'Parede 2; ''externa''',$,$,$,$,$,.STANDARD.);
#22=IFCSLAB('l1',$,'Laje 1',$,$,$,$,$,.FLOOR.);
#23=IFCDOOR('d1',$,'Porta 1',$,$,$,$,$,2100.,800.,.DOOR.,$,$);
#30=IFCQUANTITYLENGTH('Length',$,$,5000.,$);
#31=IFCQUANTITYAREA('NetSideArea',$,$,12.5,$);
#32=IFCQUANTITYVOLUME('NetVolume',$,$,1.75,$);
#33=IFCELEMENTQUANTITY('q1',$,'Qto_WallBaseQuantities',$,$,(#30,#31,#32));
#34=IFCRELDEFINESBYPROPERTIES('r1',$,$,$,(#20),#33);
#35=IFCQUANTITYAREA('NetSideArea',$,$,10.,$);
#36=IFCELEMENTQUANTITY('q2',$,'Qto_WallBaseQuantities',$,$,(#35));
#37=IFCRELDEFINESBYPROPERTIES('r2',$,$,$,(#21),#36);
#40=IFCQUANTITYAREA('NetArea',$,$,20.,$);
#41=IFCQUANTITYVOLUME('NetVolume',$,$,3.,$);
#42=IFCELEMENTQUANTITY('q3',$,'Qto_SlabBaseQuantities',$,$,(#40,
  #41));
#43=IFCRELDEFINESBYPROPERTIES('r3',$,$,$,(#22),#42);
#50=IFCRELCONTAINEDINSPATIALSTRUCTURE('c1',$,$,$,(#20,#22,#23),#10);
#51=IFCRELCONTAINEDINSPATIALSTRUCTURE('c2',$,$,$,(#21),#11);
#60=IFCMATERIAL('Alvenaria de bloco cer\\X2\\00E2\\X0\\mico',$,$);
#61=IFCRELASSOCIATESMATERIAL('m1',$,$,$,(#20,#21),#60);
#62=IFCMATERIAL('Concreto',$,$);
#63=IFCRELASSOCIATESMATERIAL('m2',$,$,$,(#22),#62);`);

const byId = <T extends { id: string }>(rows: T[], id: string) => rows.find((r) => r.id === id);

describe("STEP (ISO 10303-21)", () => {
  it("decodifica texto IFC: \\X2\\ (UTF-16), \\X\\ (latin-1), \\S\\, aspas dobradas e barra", () => {
    expect(decodeStepString("T\\X2\\00E9\\X0\\rreo")).toBe("Térreo");
    expect(decodeStepString("cora\\X\\E7\\X\\E3o")).toBe("coração");
    expect(decodeStepString("\\S\\i")).toBe("é");
    expect(decodeStepString("d''\\\\agua")).toBe("d'\\agua");
  });

  it("indexa #id=TIPO(...) com ; dentro de texto, comentários e registro em várias linhas", () => {
    const f = new StepFile(MINIMO);
    expect(f.schema).toBe("IFC4");
    expect(f.typeOf(21)).toBe("IFCWALL");
    expect(f.args(21)![2]).toBe("Parede 2; 'externa'");
    expect(f.args(42)![5]).toEqual([{ r: 40 }, { r: 41 }]);
    expect(f.args(3)).toEqual([null, { e: "LENGTHUNIT" }, { e: "MILLI" }, { e: "METRE" }]);
    expect(f.ofType("IFCBUILDINGSTOREY")).toEqual([10, 11]);
  });
});

describe("IFC: elementos, quantidades, pavimento e material", () => {
  it("2 paredes + 1 laje com quantidades, porta pelos atributos, unidades em mm convertidas", () => {
    const a = parseIfc(MINIMO);
    expect(a.units).toMatchObject({ length: 0.001, area: 1, volume: 1, declared: true });
    expect(a.storeys.map((s) => s.name)).toEqual(["Térreo", "Superior"]);
    expect(a.storeys[1]!.elevation).toBeCloseTo(3, 10);
    expect(a.hasElementQuantities).toBe(true);
    const w1 = a.elements.find((e) => e.id === 20)!;
    expect(w1).toMatchObject({ kind: "PAREDE", storey: "Térreo", material: "Alvenaria de bloco cerâmico" });
    expect(w1.quantities.Length!.value).toBeCloseTo(5, 10);
    const door = a.elements.find((e) => e.id === 23)!;
    expect(door).toMatchObject({ kind: "PORTA", storey: "Térreo", material: null });
    expect(door.width).toBeCloseTo(0.8, 10);
    expect(door.height).toBeCloseTo(2.1, 10);

    const t = takeoffOf({ format: "IFC", fileName: "obra.ifc", sizeBytes: 1, ifc: a });
    expect(t.unit).toEqual({ id: "mm", toMeters: 0.001, origin: "ARQUIVO" });
    const walls = "ifc:PAREDE|Alvenaria de bloco cerâmico";
    expect(byId(t.rows, `${walls}:un`)).toMatchObject({ unit: "un", quantity: 2, confidence: "ALTA", source: { ref: "IfcWallStandardCase, IfcWall" } });
    const wallArea = byId(t.rows, `${walls}:m2`)!;
    expect(wallArea).toMatchObject({ unit: "m2", quantity: 22.5, confidence: "ALTA", included: true, source: { measure: "NetSideArea" } });
    expect(wallArea.breakdown).toEqual([{ label: "Térreo", quantity: 12.5 }, { label: "Superior", quantity: 10 }]);
    // volume só na parede 1: parcial (1 de 2), fora da planilha (alvenaria vai por m²)
    expect(byId(t.rows, `${walls}:m3`)).toMatchObject({ quantity: 1.75, confidence: "MEDIA", included: false, alerts: [{ code: "LINHA_IFC_PARCIAL", vars: { n: 1, total: 2 } }] });
    const slab = "ifc:LAJE|Concreto";
    expect(byId(t.rows, `${slab}:m2`)).toMatchObject({ quantity: 20, included: true });
    expect(byId(t.rows, `${slab}:m3`)).toMatchObject({ quantity: 3, included: true });
    const door2 = byId(t.rows, "ifc:PORTA|:un")!;
    expect(door2).toMatchObject({ quantity: 1, included: true, sizes: [{ w: 0.8, h: 2.1, n: 1 }] });
    expect(byId(t.rows, "ifc:PORTA|:m2")!.quantity).toBeCloseTo(1.68, 10);
    expect(t.alerts.map((x) => x.code)).toEqual(["IFC_SEM_MATERIAL"]);
    expect(t.losses).toEqual([{ kind: "DESCARTADO", code: "GEOMETRIA_IFC", n: 4 }]);
  });

  it("cobertura com lajes .ROOF. agregadas: 1 cobertura com a área das partes; propriedade como reserva; espaço e proxy", () => {
    const a = parseIfc(ifc(`#1=IFCPROJECT('p',$,'P',$,$,$,$,$,#2);
#2=IFCUNITASSIGNMENT((#3));
#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#9=IFCBUILDINGSTOREY('s',$,'Cobertura',$,$,$,$,$,.ELEMENT.,6.);
#10=IFCROOF('r',$,'Telhado',$,$,$,$,$,.GABLE_ROOF.);
#11=IFCSLAB('a',$,'Agua 1',$,$,$,$,$,.ROOF.);
#12=IFCSLAB('b',$,'Agua 2',$,$,$,$,$,.ROOF.);
#13=IFCRELAGGREGATES('ag',$,$,$,#10,(#11,#12));
#14=IFCQUANTITYAREA('NetArea',$,$,15.,$);
#15=IFCELEMENTQUANTITY('q',$,'Qto_SlabBaseQuantities',$,$,(#14));
#16=IFCRELDEFINESBYPROPERTIES('d',$,$,$,(#11,#12),#15);
#17=IFCRELCONTAINEDINSPATIALSTRUCTURE('c',$,$,$,(#10,#20,#30),#9);
#20=IFCSPACE('sp',$,'101',$,$,$,$,'Sala de reuni\\X2\\00E3\\X0\\o',.ELEMENT.,.SPACE.,$);
#21=IFCPROPERTYSINGLEVALUE('Area',$,IFCAREAMEASURE(32.5),$);
#22=IFCPROPERTYSET('ps',$,'PSet_Revit_Dimensions',$,(#21));
#23=IFCRELDEFINESBYPROPERTIES('d2',$,$,$,(#20),#22);
#30=IFCBUILDINGELEMENTPROXY('x',$,'Objeto',$,$,$,$,$,$);
#40=IFCMEMBER('m',$,'Montante',$,$,$,$,$,$);`, "IFC2X3"));
    expect(a.elements.filter((e) => e.partOf === 10).map((e) => e.id)).toEqual([11, 12]);
    expect(a.elements.find((e) => e.id === 11)!.storey).toBe("Cobertura");
    const t = takeoffOf({ format: "IFC", fileName: "c.ifc", sizeBytes: 1, ifc: a });
    expect(byId(t.rows, "ifc:COBERTURA|:un")).toMatchObject({ quantity: 1 });
    expect(byId(t.rows, "ifc:COBERTURA|:m2")).toMatchObject({ quantity: 30, included: true, confidence: "ALTA" });
    expect(byId(t.rows, "ifc:space:20:m2")).toMatchObject({ kind: "AMBIENTE", label: "Sala de reunião", quantity: 32.5, confidence: "MEDIA", detail: "Cobertura", alerts: [{ code: "LINHA_IFC_PROPRIEDADE" }] });
    expect(t.alerts.map((x) => x.code)).toEqual(expect.arrayContaining(["IFC_PROXY", "IFC_SEM_MATERIAL"]));
    expect(t.losses).toContainEqual({ kind: "DESCARTADO", code: "TIPOS_NAO_TRATADOS", n: 1, detail: "IFCMEMBER ×1" });
  });

  it("sem IfcElementQuantity só as contagens são confiáveis (alerta); pés convertidos para metro", () => {
    const a = parseIfc(ifc(`#1=IFCPROJECT('p',$,'P',$,$,$,$,$,#2);
#2=IFCUNITASSIGNMENT((#3));
#3=IFCCONVERSIONBASEDUNIT(#4,.LENGTHUNIT.,'FOOT',#5);
#4=IFCDIMENSIONALEXPONENTS(1,0,0,0,0,0,0);
#5=IFCMEASUREWITHUNIT(IFCLENGTHMEASURE(0.3048),#6);
#6=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#10=IFCCOLUMN('c1',$,'P1',$,$,$,$,$,$);
#11=IFCCOLUMN('c2',$,'P2',$,$,$,$,$,$);`));
    expect(a.units.length).toBeCloseTo(0.3048, 10);
    const t = takeoffOf({ format: "IFC", fileName: "p.ifc", sizeBytes: 1, ifc: a });
    expect(t.unit).toMatchObject({ id: "ft", origin: "ARQUIVO" });
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0]).toMatchObject({ kind: "PILAR", unit: "un", quantity: 2, included: false });
    expect(t.alerts.map((x) => x.code)).toEqual(expect.arrayContaining(["IFC_SEM_QUANTIDADES", "IFC_SEM_PAVIMENTO"]));
  });

  it("arquivo truncado ou sem cabeçalho STEP é malformado (nada é lido pela metade)", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(parseCad("obra.ifc", enc(MINIMO.slice(0, MINIMO.indexOf("#42="))))).toEqual({ ok: false, error: { code: "MALFORMADO", vars: { format: "IFC" } } });
    expect(parseCad("obra.ifc", enc("ISO-10303-21;\nDATA;\n#1=IFCWALL(;\n"))).toMatchObject({ ok: false, error: { code: "MALFORMADO" } });
    const ok = parseCad("obra.ifc", enc(MINIMO));
    expect(ok.ok && ok.value.format).toBe("IFC");
  });
});

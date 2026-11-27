import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { acceptAttribute, ACCEPTED_TYPES, isAcceptedExtension, isAcceptedFile } from "./accepted";
import { acceptedAlternatives, adviseFile, askedCodes, familyCodes, gotLabel, splitPicked } from "./fileAdvice";
import { FORMAT_VARIANTS, variantOf } from "./formats";

describe("tipos aceitos pelo servidor (lista única)", () => {
  it("espelha o DetectedType do backend (mesmos códigos e extensões)", () => {
    const java = fs.readFileSync(path.join(process.cwd(), "ws-application/src/main/java/br/gov/pr/secid/workstation/application/media/DetectedType.java"), "utf8");
    const backend = [...java.matchAll(/^\s{4}([A-Z0-9_]+)\("[^"]+", Category\.\w+, List\.of\(([^)]*)\)\)/gm)].map((m) => ({ code: m[1], exts: m[2]!.match(/"([a-z0-9]+)"/g)!.map((x) => x.replace(/"/g, "")) }));
    expect(backend.length).toBeGreaterThan(0);
    expect(ACCEPTED_TYPES.map((x) => ({ code: x.code, exts: [...x.extensions] }))).toEqual(backend);
  });
  it("extensão decide; sem extensão, o MIME; accept lista extensões e MIMEs", () => {
    expect(isAcceptedFile("laudo.PDF")).toBe(true);
    expect(isAcceptedFile("filme.mp4", "application/pdf")).toBe(false);
    expect(isAcceptedFile("notas.txt", "text/plain")).toBe(true);
    expect(isAcceptedFile("semext", "image/png")).toBe(true);
    expect(isAcceptedFile("programa.exe")).toBe(false);
    expect(isAcceptedExtension("dwg")).toBe(true);
    expect(acceptAttribute()).toContain(".ifc");
    expect(acceptAttribute(true).split(",").every((x) => /^(\.(png|jpg|jpeg|jpe|gif|webp)|image\/)/.test(x))).toBe(true);
  });
  it("o catálogo de formatos deriva `detected` desta lista", () => {
    for (const v of FORMAT_VARIANTS) expect(v.detected).toBe(v.extensions.some(isAcceptedExtension));
    expect(variantOf("PLANILHA", "XLS")?.detected).toBe(false);
    expect(variantOf("IMAGEM", "SVG")?.detected).toBe(false);
    expect(variantOf("DESENHO_TECNICO", "DWG")?.detected).toBe(true);
  });
});

describe("orientação na escolha de arquivos", () => {
  const drawing = { family: "DESENHO_TECNICO" as const, variant: "" as const, details: {} };
  it("TXT num pedido de desenho técnico diverge; vídeo é recusado pelo servidor; alternativas da família", () => {
    expect(adviseFile({ name: "notas.txt", type: "text/plain" }, drawing)).toEqual({ name: "notas.txt", notAccepted: false, got: "TXT", mismatch: true });
    expect(adviseFile({ name: "visita.mp4", type: "video/mp4" }, drawing)).toEqual({ name: "visita.mp4", notAccepted: true, got: "MP4", mismatch: true });
    expect(acceptedAlternatives(drawing)).toEqual(["DWG", "DXF", "IFC", "GLB", "PDF"]);
    expect(askedCodes(drawing)).toBe("DWG/DXF/IFC/GLB/PDF");
    expect(familyCodes("DOCUMENTO")).not.toContain("PDF_A");
  });
  it("JPG é aceito, mas diverge do desenho; PDF de prancha atende", () => {
    expect(adviseFile({ name: "foto.jpg", type: "image/jpeg" }, drawing)).toMatchObject({ notAccepted: false, mismatch: true, got: "JPG" });
    expect(adviseFile({ name: "prancha.pdf", type: "application/pdf" }, drawing)).toMatchObject({ notAccepted: false, mismatch: false });
  });
  it("sem formato pedido: só a regra do tipo; família sem variante aceita cai na lista geral", () => {
    expect(adviseFile({ name: "a.exe" })).toMatchObject({ notAccepted: true, mismatch: false, got: "EXE" });
    expect(acceptedAlternatives({ family: "AUDIO_VIDEO", variant: "", details: {} })).toContain("PDF");
    expect(acceptedAlternatives({ family: "DADOS", variant: "", details: {} })).toEqual(["JSON", "XML", "CSV"]);
    expect(acceptedAlternatives(null)).toContain("JPG");
    expect(askedCodes({ family: "DOCUMENTO", variant: "PDF_A", details: {} })).toBe("PDF/A");
    expect(gotLabel({ name: "semnada" })).toBe("?");
  });
  it("separa a escolha em aceitos e recusados", () => {
    const r = splitPicked([{ name: "a.pdf" }, { name: "b.exe" }, { name: "c.png" }, { name: "d.svg" }]);
    expect(r.ok.map((f) => f.name)).toEqual(["a.pdf", "c.png"]);
    expect(r.refused.map((f) => f.name)).toEqual(["b.exe", "d.svg"]);
  });
});

import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { writeZip } from "@/lib/letters/io/zip";
import type { TaskView } from "@/lib/tasks/client";
import { applyFix, concreteSuggestion, projectChecks, renderMsg, taskChecks } from "./checks";
import { buildXlsx } from "./demo";
import { buildCloudTree, categoryOf, flattenTree, providerOf, readLocalTree, treeTotals, type LocalDirHandle } from "./files";
import { assignWindow, showWindow, defaultLayout, gridColumns, MIN_RATIO, normalizeLayout, resizeAt, resizeToPoint, separatorValue, withCount } from "./layout";
import { iframeSandbox, pdfFacts, previewCandidates, previewKindOf, stepZoom } from "./preview";
import { projectFacts, responsibleOf, subjectFromView, taskFacts } from "./subject";
import ptBR from "@/lib/i18n/messages/pt-BR.json";
import { parseViewerParam, withViewer } from "./url";
import { classifyFormatCode, columnIndex, columnLetters, formatCell, readXlsxTop, serialToIso, XlsxError } from "./xlsx";

const ID = "22222222-2222-4222-8222-222222222222";

describe("URL do visualizador", () => {
  it("lê tarefa/projeto e ignora o que não é alvo válido", () => {
    expect(parseViewerParam("tarefa:abc-1")).toEqual({ kind: "tarefa", id: "abc-1" });
    expect(parseViewerParam("PROJETO:p_1")).toEqual({ kind: "projeto", id: "p_1" });
    expect(parseViewerParam("tarefa:<script>")).toBeNull();
    expect(parseViewerParam("decisao:1")).toBeNull();
    expect(parseViewerParam("tarefa")).toBeNull();
    expect(parseViewerParam(null)).toBeNull();
  });
  it("troca só o parâmetro ver e preserva os demais", () => {
    expect(withViewer("?filtro=em-andamento", { kind: "tarefa", id: "t1" })).toBe("?filtro=em-andamento&ver=tarefa:t1");
    expect(withViewer("?filtro=x&ver=tarefa:t1", null)).toBe("?filtro=x");
    expect(withViewer("ver=projeto:p", null)).toBe("");
  });
});

describe("janelas segmentadas", () => {
  it("normaliza o que veio do armazenamento", () => {
    expect(normalizeLayout(null)).toEqual(defaultLayout());
    const l = normalizeLayout({ count: 3, panes: ["previa", "previa", "xyz"], ratios: [0.5, 0.5] });
    expect(l.count).toBe(3);
    expect(new Set(l.panes).size).toBe(3);
    expect(l.panes[0]).toBe("previa");
    expect(l.ratios.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
  });
  it("trocar a janela de um painel troca de lugar com o painel que já a mostra", () => {
    const l = defaultLayout(2); // resumo | previa
    expect(assignWindow(l, 0, "previa").panes).toEqual(["previa", "resumo"]);
    expect(assignWindow(l, 1, "melhorias").panes).toEqual(["resumo", "melhorias"]);
    expect(withCount(l, 3).panes).toEqual(["resumo", "previa", "melhorias"]);
  });
  it("divisor: só os vizinhos mudam, respeitando o mínimo, e a soma continua 1", () => {
    const r = resizeAt([0.5, 0.5], 0, 0.1);
    expect(r).toEqual([0.6, 0.4]);
    const max = resizeAt([0.5, 0.5], 0, 1);
    expect(max[0]).toBeCloseTo(1 - MIN_RATIO, 5);
    expect(max[1]).toBeCloseTo(MIN_RATIO, 5);
    const three = resizeAt([0.333, 0.333, 0.334], 1, -0.05);
    expect(three[0]).toBe(0.333);
    expect(three.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
    expect(resizeToPoint([0.5, 0.5], 0, 0.7)).toEqual([0.7, 0.3]);
    expect(separatorValue([0.25, 0.5, 0.25], 1)).toBe(75);
    expect(gridColumns([0.5, 0.5])).toBe("minmax(0,0.5fr) 0.75rem minmax(0,0.5fr)");
  });
});

describe("árvore da nuvem e do computador", () => {
  const atts = [
    { id: "a1", fileName: "fachada.png", mimeType: "image/png", sizeBytes: 1000, createdAt: "2026-11-01T10:00:00Z" },
    { id: "a2", fileName: "orcamento.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 500 },
    { id: "a3", fileName: "foto-viga.jpg", mimeType: "image/jpeg", sizeBytes: 2000 },
    { id: "a4", fileName: "pagina.html", mimeType: "text/html", sizeBytes: 10 },
  ];
  it("agrupa anexos por tipo, separa evidências e vínculos por provedor", () => {
    const tree = buildCloudTree(atts, [{ id: "e1", attachmentId: "a3", caption: "Fissura" }], {
      sourceKind: "GOOGLE_SHEETS", sourceRef: "https://docs.google.com/spreadsheets/d/1", references: [{ label: "Norma", url: "https://abnt.org.br/x" }, { label: "ruim", url: "javascript:alert(1)" }],
    });
    expect(tree.map((n) => n.labelKey)).toEqual(["cardviewer.files.attachments", "cardviewer.files.evidences", "cardviewer.files.links"]);
    expect(tree[0]!.children!.map((c) => c.name)).toEqual(["IMAGEM", "PAGINA_WEB", "PLANILHA"]);
    expect(tree[1]!.children![0]).toMatchObject({ name: "foto-viga.jpg", evidenceCaption: "Fissura" });
    expect(tree[2]!.children!.map((c) => c.name)).toEqual(["GOOGLE", "WEB"]);
    expect(flattenTree(tree).filter((x) => x.node.kind === "link")).toHaveLength(2);
    expect(treeTotals(tree)).toEqual({ files: 6, bytes: 3510 });
    expect(buildCloudTree([], [])).toEqual([]);
  });
  it("categorias e provedores", () => {
    expect(categoryOf("a.DWG", "")).toBe("DESENHO");
    expect(categoryOf("x", "application/pdf")).toBe("DOCUMENTO");
    expect(providerOf("MS_EXCEL")).toBe("MICROSOFT");
    expect(providerOf(null, "https://contoso.sharepoint.com/x")).toBe("MICROSOFT");
    expect(providerOf(null, "https://www.icloud.com/x")).toBe("APPLE_ICLOUD");
  });
  it("lê a pasta local sem conteúdo, pula ocultos e para no teto", async () => {
    const file = (name: string, size: number) => ({ kind: "file" as const, name, getFile: async () => new File(["x".repeat(size)], name, { type: "text/plain", lastModified: Date.UTC(2026, 0, 1) }) });
    const dir = (name: string, items: (ReturnType<typeof file> | LocalDirHandle)[]): LocalDirHandle => ({
      kind: "directory", name, values: async function* () { yield* items; },
    });
    const root = dir("obra", [file("b.txt", 3), file(".DS_Store", 1), dir("fotos", [file("1.jpg", 5), dir("fundo", [file("z.txt", 1)])]), file("a.txt", 2)]);
    const r = await readLocalTree(root);
    expect(r.nodes.map((n) => n.name)).toEqual(["fotos", "a.txt", "b.txt"]);
    expect(r.nodes[1]).toMatchObject({ size: 2, date: "2026-01-01T00:00:00.000Z" });
    expect(r.truncated).toBe(false);
    const small = await readLocalTree(root, { maxDepth: 1, maxEntries: 2 });
    expect(small.truncated).toBe(true);
    expect(small.count).toBe(2);
  });
});

describe("prévia", () => {
  it("decide o tipo pelo MIME e pela extensão juntos", () => {
    expect(previewKindOf("a.png", "image/png")).toBe("IMAGEM");
    expect(previewKindOf("a.svg", "image/svg+xml")).toBe("SVG");
    expect(previewKindOf("a.png", "text/html")).toBe("OUTRO");
    expect(previewKindOf("p.html", "text/html")).toBe("HTML");
    expect(previewKindOf("p.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("XLSX");
    expect(previewKindOf("p.xlsm", "")).toBe("MACRO");
    expect(previewKindOf("p.pdf", "application/pdf")).toBe("PDF");
    expect(previewKindOf("p.pdf", "text/html")).toBe("OUTRO");
  });
  it("candidatos: imagens primeiro, só https, sem anexo indisponível", () => {
    const c = previewCandidates([{ id: "1", fileName: "a.pdf", mimeType: "application/pdf" }, { id: "2", fileName: "b.png", mimeType: "image/png" }, { id: "3", fileName: "c.png", available: false }],
      [{ label: "Site", url: "https://example.org" }, { url: "http://inseguro.org" }]);
    expect(c.map((x) => x.id)).toEqual(["a:2", "a:1", "u:https://example.org"]);
  });
  it("sandbox: nuvem sem scripts por padrão; site externo nunca roda script; nunca allow-same-origin", () => {
    expect(iframeSandbox("NUVEM", false)).toBe("");
    expect(iframeSandbox("NUVEM", true)).toBe("allow-scripts");
    expect(iframeSandbox("LINK", true)).toBe("");
    expect(stepZoom("fit", 1, 0.5)).toBe(0.63);
    expect(stepZoom(8, 1)).toBe(8);
  });
});

describe("planilha .xlsx (fotografia do topo)", () => {
  const rows = [["Item", "Qtd", "Valor"], ...Array.from({ length: 29 }, (_, i) => [`Item ${i + 1}`, i + 1, (i + 1) * 2.5])];
  it("lê a primeira aba visível, textos compartilhados, números e mesclagens (comprimido e armazenado)", async () => {
    for (const compress of [true, false]) {
      const bytes = await buildXlsx("Orçamento", rows, { compress, merges: ["A1:B1"] });
      const s = await readXlsxTop(bytes);
      expect(s.sheetName).toBe("Orçamento");
      expect(s.rows).toBe(20);
      expect(s.totalRows).toBe(30);
      expect(s.cols).toBe(3);
      expect(s.grid[0]![0]).toMatchObject({ value: { kind: "text", text: "Item" }, colSpan: 2, rowSpan: 1 });
      expect(s.grid[0]![1]!.covered).toBe(true);
      expect(s.grid[2]![2]!.value).toEqual({ kind: "number", value: 5, format: "general" });
    }
  });
  it("aba oculta é pulada; fórmula mostra o valor em cache e nunca é executada; datas e % pelo estilo", async () => {
    const XML = '<?xml version="1.0" encoding="UTF-8"?>';
    const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const bytes = await writeZip([
      { name: "[Content_Types].xml", data: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>` },
      { name: "xl/workbook.xml", data: `${XML}<workbook ${NS}><workbookPr/><sheets><sheet name="Oculta" sheetId="1" state="hidden" r:id="rId1"/><sheet name="Visível" sheetId="2" r:id="rId2"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>` },
      { name: "xl/styles.xml", data: `${XML}<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>` },
      { name: "xl/worksheets/sheet1.xml", data: `${XML}<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>segredo</t></is></c></row></sheetData></worksheet>` },
      { name: "xl/worksheets/sheet2.xml", data: `${XML}<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Data</t></is></c><c r="B1" s="1"><v>46000</v></c><c r="C1" s="2"><v>0.125</v></c><c r="D1"><f>SUM(1,2)</f><v>3</v></c><c r="E1"><f>NOW()</f></c><c r="F1" t="b"><v>1</v></c><c r="G1" t="e"><v>#DIV/0!</v></c></row></sheetData></worksheet>` },
    ]);
    const s = await readXlsxTop(bytes);
    expect(s.sheetName).toBe("Visível");
    const r = s.grid[0]!;
    expect(r[0]!.value).toEqual({ kind: "text", text: "Data" });
    expect(r[1]!.value).toEqual({ kind: "date", iso: "2025-12-09", time: false });
    expect(formatCell(r[2]!.value, "pt-BR")).toBe("12,5%");
    expect(r[3]).toMatchObject({ formula: true, value: { kind: "number", value: 3 } });
    expect(r[4]).toMatchObject({ formula: true, value: { kind: "empty" } });
    expect(s.formulasWithoutCache).toBe(1);
    expect(formatCell(r[5]!.value, "pt-BR")).toBe("TRUE");
    expect(formatCell(r[6]!.value, "pt-BR")).toBe("#DIV/0!");
  });
  it("recusa com motivo: zip inválido, macro, criptografia e bomba de descompressão", async () => {
    const code = async (b: Uint8Array) => readXlsxTop(b).then(() => "ok", (e: XlsxError) => e.code);
    expect(await code(new TextEncoder().encode("não é zip"))).toBe("ZIP_INVALIDO");
    expect(await code(await buildXlsx("A", [["x"]], { extra: [{ name: "xl/vbaProject.bin", data: "macro" }] }))).toBe("MACRO");
    const ole = new Uint8Array(64);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(await code(ole)).toBe("CRIPTOGRAFADO");
    // bomba: o diretório central declara 100 MB descomprimidos numa entrada
    const bomb = await buildXlsx("A", [["x"]], { compress: false });
    const view = new DataView(bomb.buffer, bomb.byteOffset, bomb.byteLength);
    for (let p = 0; p < bomb.length - 4; p++) if (view.getUint32(p, true) === 0x02014b50) { view.setUint32(p + 24, 100 * 1024 * 1024, true); break; }
    expect(await code(bomb)).toBe("BOMBA");
  });
  it("utilitários A1, formatos e datas", () => {
    expect(columnLetters(0)).toBe("A");
    expect(columnLetters(27)).toBe("AB");
    expect(columnIndex("AB")).toBe(27);
    expect(classifyFormatCode("dd/mm/yyyy")).toEqual({ kind: "date", time: false });
    expect(classifyFormatCode("#,##0.00")).toEqual({ kind: "number", format: "thousands2" });
    expect(classifyFormatCode('"R$" #,##0')).toEqual({ kind: "number", format: "thousands" });
    expect(serialToIso(1)).toBe("1900-01-01");
    expect(serialToIso(45658)).toBe("2025-01-01");
  });
});

const view = (over: Partial<TaskView> = {}): TaskView => ({
  id: ID, version: 3, title: "Vistoria da obra da escola", type: "DOCUMENTO", category: "VISTORIA_RELATORIO_FOTOGRAFICO", priority: "ALTA", state: "EM_USO",
  accessClass: "INTERNO", visibility: "EMPRESA", objective: "Registrar 12 pontos até 30/11", dueAt: "2026-11-20", acceptanceCriteria: [{ text: "Fotos com data", done: true }, { text: "Laudo assinado", done: false }],
  ...over,
});

describe("resumo preciso (só números do sistema)", () => {
  it("tarefa: prazos com dias restantes, prazo legal e progresso dos critérios", () => {
    const facts = taskFacts(subjectFromView(view({ legalDueAt: "2026-11-18", legalDeadlineRuleId: "r1" })), "2026-11-15");
    const due = facts.find((f) => f.id === "due");
    expect(due).toMatchObject({ type: "deadline", days: 5, status: "PROXIMA" });
    expect(facts.find((f) => f.id === "legalDue")).toMatchObject({ days: 3, legal: true, from: "cardviewer.from.legalDueRule" });
    expect(facts.find((f) => f.id === "effectiveDue")).toMatchObject({ date: "2026-11-18", legal: true });
    expect(facts.find((f) => f.id === "criteria")).toMatchObject({ done: 1, total: 2, percent: 50 });
    expect(facts.every((f) => f.from.startsWith("cardviewer.from."))).toBe(true);
    const closed = taskFacts(subjectFromView(view({ state: "CONCLUIDA" })), "2026-11-25");
    expect(closed.find((f) => f.id === "due")).toMatchObject({ status: "FECHADA", days: -5 });
  });
  it("projeto da Mesa: números do motor (CPM, IDC/IDP, EAC)", () => {
    const m = buildDemoProject();
    const facts = projectFacts({ kind: "projeto", source: "DEMO", variant: "MESA", model: m }, "2026-11-10");
    const ids = facts.map((f) => f.id);
    for (const id of ["phase", "progress", "criticalPath", "cpi", "spi", "eac", "openRisks", "pendingChanges"]) expect(ids).toContain(id);
    expect(facts.find((f) => f.id === "openRisks")).toMatchObject({ value: m.risks.filter((r) => r.status === "ABERTO").length });
  });
});

describe("Melhorias ✦ (CI determinístico)", () => {
  it("tarefa: ordena por gravidade e acrescenta prazos, arquivos, evidências e descrição", () => {
    const r = taskChecks({ subject: subjectFromView(view({ dueAt: "2026-11-10", responsibleId: undefined })), today: "2026-11-15", files: { attachments: 0, evidences: 0 } });
    const verdicts = r.checks.map((c) => c.verdict);
    expect([...verdicts].sort((a, b) => ["FALHOU", "ATENCAO", "PASSOU"].indexOf(a) - ["FALHOU", "ATENCAO", "PASSOU"].indexOf(b))).toEqual(verdicts);
    const by = (id: string) => r.checks.find((c) => c.id === id);
    expect(by("prazoSituacao")).toMatchObject({ verdict: "FALHOU", detail: { vars: { days: 5 } } });
    expect(by("responsavel")?.verdict).toBe("FALHOU");
    expect(by("anexos")?.verdict).toBe("ATENCAO");
    expect(by("evidencias")?.verdict).toBe("ATENCAO");
    expect(by("descricao")?.verdict).toBe("ATENCAO");
    expect(by("q.titulo")?.verdict).toBe("PASSOU");
    expect(r.counts.FALHOU + r.counts.ATENCAO + r.counts.PASSOU).toBe(r.checks.length);
    expect(by("prazoSituacao")?.where.href).toBe(`/tasks/${ID}/edit`);
  });
  it("conclusão com critério pendente falha; prazo legal sem regra pede atenção; DEMO não cobra arquivos", () => {
    const r = taskChecks({ subject: subjectFromView(view({ state: "CONCLUIDA", legalDueAt: "2026-12-01" })), today: "2026-11-15", files: null });
    expect(r.checks.find((c) => c.id === "criteriosConclusao")?.verdict).toBe("FALHOU");
    expect(r.checks.find((c) => c.id === "prazoLegalRegra")?.verdict).toBe("ATENCAO");
    expect(r.checks.find((c) => c.id === "anexos")).toBeUndefined();
    expect(r.checks.find((c) => c.id === "prazoSituacao")).toBeUndefined();
  });
  it("aplicar sugestão gera o PUT a partir da versão atual", () => {
    const body = applyFix(view(), { kind: "ADD_CRITERION", text: "Testes passam" });
    expect(body.version).toBe(3);
    expect(body.acceptanceCriteria?.at(-1)).toEqual({ text: "Testes passam", done: false });
    expect(applyFix(view(), { kind: "SET_ACCESS", accessClass: "RESTRITO" }).accessClass).toBe("RESTRITO");
  });
  it("projeto: indicadores do motor + Espelho de Conformidade, com link para a aba certa", () => {
    const m = buildDemoProject();
    const r = projectChecks({ kind: "projeto", source: "DEMO", variant: "MESA", model: m });
    expect(r.checks.some((c) => c.id === "espelho")).toBe(true);
    const metric = r.checks.find((c) => c.metric);
    expect(metric?.where.href).toMatch(new RegExp(`^/projects/${m.id}/edit`));
    expect(r.checks.find((c) => c.id === "espelho")?.where.href).toBe(`/projects/${m.id}/mirror`);
  });
});

describe("formato família → variante", () => {
  it("formato do arquivo pela extensão e pelo MIME; desconhecido é nulo", async () => {
    const { formatOfFile } = await import("./files");
    expect(formatOfFile("a.xlsx", "")).toEqual({ family: "PLANILHA", variant: "XLSX", estimated: true });
    expect(formatOfFile("semext", "image/png")).toEqual({ family: "IMAGEM", variant: "PNG", estimated: true });
    expect(formatOfFile("a.xyz", "")).toBeNull();
    // o formato detectado pelo servidor vale mais que a extensão (um .xlsx que é PDF por dentro)
    expect(formatOfFile("a.xlsx", "", { formatFamily: "DOCUMENTO", formatVariant: "PDF" })).toEqual({ family: "DOCUMENTO", variant: "PDF", estimated: false });
    expect(formatOfFile("a.gif", "", { formatFamily: "IMAGEM", formatVariant: null })).toEqual({ family: "IMAGEM", variant: "", estimated: false });
    expect(formatOfFile("a.xlsx", "", { formatFamily: "INVALIDA" })).toMatchObject({ estimated: true });
  });
  it("aponta anexo em formato diferente do pedido", async () => {
    const { formatMismatch } = await import("./checks");
    const asked = { family: "PLANILHA" as const, variant: "XLSX" as const, details: {} };
    expect(formatMismatch(asked, [{ fileName: "a.xlsx" }, { fileName: "b.csv" }])).toEqual({ asked: "XLSX", wrong: ["b.csv"], right: 1 });
    expect(formatMismatch({ family: "DOCUMENTO", variant: "PDF_A", details: {} }, [{ fileName: "x.pdf" }])?.wrong).toEqual([]);
    expect(formatMismatch({ family: "", variant: "", details: {} }, [{ fileName: "a.xlsx" }])).toBeNull();
    const r = taskChecks({ subject: subjectFromView(view({ extensions: { fileFormat: "family=PLANILHA&variant=XLSX" } })), today: "2026-11-15", files: { attachments: 1, evidences: 0, list: [{ fileName: "b.csv" }] } });
    expect(r.checks.find((c) => c.id === "formatoAnexo")?.verdict).toBe("ATENCAO");
  });
});

/** tradução mínima com o catálogo pt-BR (para comparar textos renderizados) */
const tr = (k: string, v: Record<string, string | number> = {}) =>
  ((ptBR as Record<string, string>)[k] ?? k).replace(/\{(\w+)\}/g, (_, n: string) => String(v[n] ?? `{${n}}`));

describe("sugestões concretas (nunca repetem o achado)", () => {
  const subjects = [
    subjectFromView(view({ objective: "", descriptionMd: "", acceptanceCriteria: [], deliverables: [], area: undefined })),
    subjectFromView(view({ objective: "melhorar", dueAt: undefined, area: "ENGENHARIA", extensions: {} })),
    subjectFromView(view({ formatFamily: "PLANILHA", formatVariant: "CSV", formatDetailsJson: JSON.stringify({ encoding: "UTF8" }), acceptanceCriteria: [{ text: "Um", done: false }] })),
    subjectFromView(view({ dueAt: "2026-11-14", responsibleId: undefined, state: "BLOQUEADA" })),
  ];
  it("em toda verificação, a sugestão (quando existe) difere do achado", () => {
    for (const subject of subjects) {
      const r = taskChecks({ subject, today: "2026-11-15", files: { attachments: 0, evidences: 0 } });
      for (const c of r.checks) {
        if (!c.suggestion) continue;
        expect(renderMsg(tr, c.suggestion)).not.toBe(renderMsg(tr, c.detail));
        expect(c.suggestion.key).not.toBe(c.detail.key);
      }
    }
  });
  it("objetivo pré-redigido do título, tipo e prazo; sem título, nenhuma sugestão", () => {
    const s = subjectFromView(view({ objective: "" }));
    const q = { id: "objetivo", group: "ESSENCIAL" as const, status: "FALTA" as const };
    expect(renderMsg(tr, concreteSuggestion(q, s)!)).toBe("Proposta de objetivo: “Documento “Vistoria da obra da escola” entregue até 2026-11-20, com todos os critérios de aceite atendidos.”");
    expect(concreteSuggestion(q, subjectFromView(view({ objective: "", dueAt: undefined })))?.key).toBe("criador2.sug.objectiveNoDue");
    expect(concreteSuggestion(q, subjectFromView(view({ title: "  " })))).toBeUndefined();
  });
  it("critério sugerido pelo formato pedido; sem formato, omite; correção vira texto acionável", () => {
    const csv = subjectFromView(view({ formatFamily: "PLANILHA", formatVariant: "CSV" }));
    const q = { id: "criterios", group: "ESSENCIAL" as const, status: "AVISO" as const };
    expect(renderMsg(tr, concreteSuggestion(q, csv)!)).toBe("Critério sugerido pelo formato pedido: “Entregue em CSV”.");
    expect(concreteSuggestion(q, subjectFromView(view()))).toBeUndefined();
    const fix = { ...q, id: "swTestes", fixes: [{ kind: "ADD_CRITERION" as const, text: "Testes passam" }] };
    expect(renderMsg(tr, concreteSuggestion(fix, csv)!)).toBe("Acrescente o critério: “Testes passam”.");
    expect(concreteSuggestion({ id: "titulo", group: "ESSENCIAL", status: "AVISO" }, csv)).toBeUndefined();
  });
  it("plural do prazo: 1 dia e hoje com texto próprio", () => {
    const one = taskChecks({ subject: subjectFromView(view({ dueAt: "2026-11-14" })), today: "2026-11-15", files: null }).checks.find((c) => c.id === "prazoSituacao")!;
    expect(renderMsg(tr, one.detail)).toBe("Vencida há 1 dia.");
    const today = taskChecks({ subject: subjectFromView(view({ dueAt: "2026-11-15" })), today: "2026-11-15", files: null }).checks.find((c) => c.id === "prazoSituacao")!;
    expect(renderMsg(tr, today.detail)).toBe("Vence hoje.");
    const many = taskChecks({ subject: subjectFromView(view({ dueAt: "2026-11-10" })), today: "2026-11-15", files: null }).checks.find((c) => c.id === "prazoSituacao")!;
    expect(renderMsg(tr, many.detail)).toBe("Vencida há 5 dias.");
  });
  it("formato pedido nas colunas da API (V71) vale para o aviso de anexo divergente", () => {
    const r = taskChecks({ subject: subjectFromView(view({ formatFamily: "PLANILHA", formatVariant: "XLSX" })), today: "2026-11-15", files: { attachments: 1, evidences: 0, list: [{ fileName: "b.csv" }] } });
    expect(r.checks.find((c) => c.id === "formatoAnexo")?.verdict).toBe("ATENCAO");
  });
});

describe("responsável, abas e PDF", () => {
  it("responsável: designado, autor marcado ou nenhum — a mesma regra no visualizador e na página", () => {
    expect(responsibleOf({ responsibleId: "abcdef1234", responsibleName: null, ownerId: "x", ownerName: null })).toMatchObject({ kind: "DESIGNADO", vars: { name: "#abcdef12" } });
    expect(responsibleOf({ responsibleId: null, responsibleName: null, ownerId: "o1", ownerName: "Pessoa Exemplo" })).toMatchObject({ kind: "AUTOR", vars: { name: "Pessoa Exemplo" } });
    expect(responsibleOf({ responsibleId: null, responsibleName: null, ownerId: null, ownerName: null }).kind).toBe("NENHUM");
    const fact = taskFacts(subjectFromView(view({ responsibleId: undefined, ownerId: "11111111-aaaa" })), "2026-11-15").find((f) => f.id === "responsible");
    expect(fact).toMatchObject({ type: "label", key: "criador2.viewer.responsibleOwner" });
  });
  it("showWindow: a janela que já está num painel não muda nada; a outra entra no último painel", () => {
    const l = defaultLayout(2);
    expect(showWindow(l, "resumo")).toBe(l);
    expect(showWindow(l, "melhorias").panes).toEqual(["resumo", "melhorias"]);
    expect(showWindow(defaultLayout(3), "arquivos").panes).toEqual(["resumo", "previa", "arquivos"]);
  });
  it("ficha do PDF a partir dos detalhes do servidor; ausente fica nulo, nunca inventado", () => {
    expect(pdfFacts(JSON.stringify({ pages: "12", textLayer: "true", encrypted: "false" }), "PDF_A")).toEqual({ pages: 12, textLayer: true, encrypted: false, pdfA: true, fromServer: true });
    expect(pdfFacts(null)).toEqual({ pages: null, textLayer: null, encrypted: null, pdfA: false, fromServer: false });
    expect(pdfFacts("{quebrado").pages).toBeNull();
    expect(pdfFacts(JSON.stringify({ pages: "-3" })).pages).toBeNull();
    const c = previewCandidates([{ id: "9", fileName: "x.pdf", mimeType: "application/pdf", formatDetailsJson: "{\"pages\":\"2\"}", formatVariant: "PDF" }]);
    expect(c[0]).toMatchObject({ kind: "PDF", formatDetailsJson: "{\"pages\":\"2\"}" });
  });
});

"use client";
/**
 * Bancada de extração de desenhos CAD/BIM (RF34 + RF70), reutilizada em `/tasks/extrair` (arquivo avulso) e
 * `/tasks/[id]/extrair` (a partir de uma tarefa DESENHO_TECNICO/DOCUMENTO). O arquivo (.dxf, .ifc, .glb; .dwg só identificado)
 * é lido NESTE navegador por funções puras de `lib/cad` — nada é enviado a servidor. Abas Quantitativos · Planilha
 * orçamentária · Cronograma, com correções da pessoa, preços e produtividades de EXEMPLO editáveis, perdas de fidelidade
 * listadas, painel ✦ que só resume os números calculados e "Criar tarefa com isto": monta o rascunho do criador
 * (`saveTaskDraft`) e abre `/tasks/new?rascunho=<id>`, onde a pessoa revisa antes de salvar.
 */
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Card, ErrorState, LoadingState, Tabs, useToast } from "@/components/ui";
import { aiNotes } from "@/lib/cad/assistant";
import { budgetCsv, buildBudget, csvOptionsFor, DEFAULT_BDI_PERCENT, examplePriceTable, toCsv, type PriceTable } from "@/lib/cad/budget";
import { buildTaskDraft, type DraftTarget } from "@/lib/cad/draft";
import { checkSize, extensionOf, HEAD_BYTES, parseCad, sniffFormat, type ParsedCad } from "@/lib/cad/read";
import { buildSchedule, nextMonday } from "@/lib/cad/schedule";
import { applyEdits, builtAreaM2, crossChecks, DEFAULT_TAKEOFF_OPTIONS, takeoffOf, type RowEdit } from "@/lib/cad/takeoff";
import type { TaskFile } from "@/lib/cad/taskFiles";
import type { CadFormat, ReadError, StageId } from "@/lib/cad/types";
import type { LengthUnitId } from "@/lib/cad/units";
import { draftHref, saveTaskDraft } from "@/lib/tasks/drafts";
import { AiPanel } from "./AiPanel";
import { BudgetTab } from "./BudgetTab";
import { downloadText, exportName } from "./download";
import { FilePicker } from "./FilePicker";
import { QuantitiesTab } from "./QuantitiesTab";
import { ReadSummary } from "./ReadSummary";
import { ScheduleTab } from "./ScheduleTab";
import { useCadText } from "./useCadText";

export interface ExtractWorkbenchProps {
  /** tarefa de origem (rota /tasks/[id]/extrair): vai junto no rascunho */
  sourceTask?: { id: string; title: string } | null;
  /** anexos da tarefa que a bancada sabe ler */
  attachments?: readonly TaskFile[];
  /** baixa os bytes de um anexo (só depois de conferir o tamanho) */
  fetchAttachment?: (f: TaskFile) => Promise<Blob>;
}

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; name: string }
  | { kind: "error"; name: string; error: ReadError }
  | { kind: "ready"; parsed: ParsedCad };

type TabSlug = "quantitativos" | "planilha" | "cronograma";
const TARGET: Record<TabSlug, DraftTarget> = { quantitativos: "QUANTITATIVOS", planilha: "PLANILHA", cronograma: "CRONOGRAMA" };
const EXT_FORMAT: Record<string, CadFormat | undefined> = { dxf: "DXF", ifc: "IFC", glb: "GLB", dwg: "DWG" };

export function ExtractWorkbench({ sourceTask = null, attachments, fetchAttachment }: ExtractWorkbenchProps) {
  const text = useCadText();
  const { t, intl, locale } = text;
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [unit, setUnit] = useState<LengthUnitId | null>(null);
  const [wallHeightM, setWallHeightM] = useState(DEFAULT_TAKEOFF_OPTIONS.wallHeightM);
  const [wallDoubleLine, setWallDoubleLine] = useState(DEFAULT_TAKEOFF_OPTIONS.wallDoubleLine);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [prices, setPrices] = useState<PriceTable>(examplePriceTable);
  const [bdi, setBdi] = useState(DEFAULT_BDI_PERCENT);
  const [start, setStart] = useState("");
  const [teams, setTeams] = useState<Partial<Record<StageId, number>>>({});
  const [tab, setTab] = useState<TabSlug>("quantitativos");
  const [aiAsked, setAiAsked] = useState(false);
  const token = useRef(0);

  /** Lê um arquivo: reconhece pelo conteúdo, confere o teto ANTES de ler tudo e só então mede. */
  const readBlob = useCallback(async (name: string, blob: Blob) => {
    const mine = ++token.current;
    const stale = () => mine !== token.current;
    setPhase({ kind: "reading", name });
    setEdits({});
    setUnit(null);
    setAiAsked(false);
    setTab("quantitativos");
    try {
      const head = new Uint8Array(await blob.slice(0, HEAD_BYTES).arrayBuffer());
      const sniff = sniffFormat(name, head);
      if (!sniff.ok) return void (stale() || setPhase({ kind: "error", name, error: sniff.error }));
      const big = checkSize(sniff.value, blob.size);
      if (big) return void (stale() || setPhase({ kind: "error", name, error: big }));
      const bytes = sniff.value === "DWG" ? head : new Uint8Array(await blob.arrayBuffer());
      await new Promise((r) => setTimeout(r, 0)); // deixa a tela mostrar "lendo" antes do cálculo
      const out = parseCad(name, bytes, blob.size);
      if (stale()) return;
      if (!out.ok) setPhase({ kind: "error", name, error: out.error });
      else {
        setPhase({ kind: "ready", parsed: out.value });
        setStart((s) => s || nextMonday(new Date()));
      }
    } catch {
      if (!stale()) setPhase({ kind: "error", name, error: { code: "LEITURA" } });
    }
  }, []);

  /** Anexo da tarefa: confere o teto pelo tamanho informado ANTES de baixar; os bytes vêm do servidor do Work Station. */
  const readAttachment = useCallback(async (f: TaskFile) => {
    if (!fetchAttachment) return;
    const format = EXT_FORMAT[extensionOf(f.name)];
    const big = format && f.sizeBytes !== null ? checkSize(format, f.sizeBytes) : null;
    if (big) return setPhase({ kind: "error", name: f.name, error: big });
    const mine = ++token.current;
    setPhase({ kind: "reading", name: f.name });
    try {
      const blob = await fetchAttachment(f);
      if (mine === token.current) await readBlob(f.name, blob);
    } catch {
      if (mine === token.current) setPhase({ kind: "error", name: f.name, error: { code: "LEITURA" } });
    }
  }, [fetchAttachment, readBlob]);

  const parsed = phase.kind === "ready" ? phase.parsed : null;
  const takeoff = useMemo(() => (parsed ? takeoffOf(parsed, { unit, wallHeightM, wallDoubleLine }) : null), [parsed, unit, wallHeightM, wallDoubleLine]);
  const rows = useMemo(() => (takeoff ? applyEdits(takeoff.rows, edits) : []), [takeoff, edits]);
  const checks = useMemo(() => crossChecks(rows), [rows]);
  const area = useMemo(() => builtAreaM2(rows), [rows]);
  const budget = useMemo(() => buildBudget(rows, prices, bdi, area), [rows, prices, bdi, area]);
  // o início padrão (próxima segunda) é gravado quando o arquivo termina de ser lido; antes disso não há cronograma
  const schedule = useMemo(() => (start ? buildSchedule(rows, { start, teams, builtAreaM2: area }) : null), [rows, start, teams, area]);
  const notes = useMemo(
    () => (aiAsked && parsed && takeoff && schedule ? aiNotes({ fileName: parsed.fileName, takeoff, rows, budget, schedule, checks }) : null),
    [aiAsked, parsed, takeoff, rows, budget, schedule, checks],
  );

  const edit = (rowId: string, e: RowEdit) => setEdits((cur) => ({ ...cur, [rowId]: { ...cur[rowId], ...e } }));
  const undo = (rowId: string) =>
    setEdits((cur) => {
      const next = { ...cur };
      const e = { ...next[rowId] };
      delete e.quantity;
      if (e.included === undefined) delete next[rowId];
      else next[rowId] = e;
      return next;
    });

  const csvOpts = csvOptionsFor(locale);
  const exportBudget = () => {
    if (!parsed) return;
    const csv = budgetCsv(budget, {
      header: [t("cad.budget.col.code"), t("cad.budget.col.stage"), t("cad.budget.col.service"), t("cad.budget.col.origin"), t("cad.budget.col.unit"),
        t("cad.budget.col.quantity"), t("cad.budget.col.unitPrice"), t("cad.budget.col.total")],
      group: (g) => t(`cad.group.${g}`),
      service: (l) => (l.service ? t(`cad.service.${l.service}`) : t("cad.budget.noService", { kind: l.kind ? t(`cad.kind.${l.kind}`) : "" })),
      unit: (u) => text.unit(u),
      subtotal: (g) => t("cad.budget.subtotal", { group: t(`cad.group.${g}`) }),
      direct: t("cad.budget.direct"),
      bdi: t("cad.budget.bdiLine", { bdi: text.n2.format(budget.bdiPercent) }),
      total: t("cad.budget.total"),
      note: t("cad.budget.exampleNote"),
    }, csvOpts);
    if (downloadText(exportName(parsed.fileName, t("cad.budget.fileSuffix")), csv)) toast({ title: t("cad.budget.exported"), tone: "sucesso" });
  };
  const exportQuantities = () => {
    if (!parsed) return;
    const table: (string | number | null)[][] = [[t("cad.q.col.item"), t("cad.q.col.label"), t("cad.q.col.origin"), t("cad.q.col.unit"), t("cad.q.col.quantity"), t("cad.q.col.confidence"), t("cad.q.col.inBudget")]];
    for (const r of rows) table.push([text.kind(r), r.label, t(`cad.source.${r.source.what}`, { ref: r.source.ref }), text.unit(r.unit), r.quantity, t(`cad.conf.${r.confidence}`), r.included ? t("common.yes") : t("common.no")]);
    if (downloadText(exportName(parsed.fileName, t("cad.q.fileSuffix")), toCsv(table, csvOpts))) toast({ title: t("cad.q.exported"), tone: "sucesso" });
  };

  const createTask = () => {
    if (!parsed || !takeoff || !schedule || parsed.format === "DWG" || !rows.length) return;
    const draft = buildTaskDraft({
      fileName: parsed.fileName, format: parsed.format, target: TARGET[tab], unit: takeoff.unit, rows, budget, schedule,
      alerts: [...takeoff.alerts, ...checks], sourceTask, alertText: text.alert, extractedAt: new Date().toISOString().slice(0, 10),
    }, t, intl);
    const id = saveTaskDraft({ draft, origin: { kind: "CAD", label: parsed.fileName, ...(sourceTask ? { ref: sourceTask.id } : {}) } });
    router.push(draftHref(id));
  };

  const status =
    phase.kind === "reading" ? t("cad.wb.reading", { name: phase.name })
      : phase.kind === "error" ? t(`cad.error.${phase.error.code}.title`)
        : phase.kind === "ready" ? t("cad.wb.ready", { name: phase.parsed.fileName, rows: rows.length })
          : "";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]" data-testid="cad-workbench">
      <p className="sr-only" role="status" aria-live="polite" data-testid="cad-status">{status}</p>
      <FilePicker onFile={(f) => void readBlob(f.name, f)} busy={phase.kind === "reading"} compact={phase.kind !== "idle"} attachments={attachments}
        onAttachment={fetchAttachment ? (f) => void readAttachment(f) : undefined} />

      {phase.kind === "reading" ? <LoadingState label={t("cad.wb.reading", { name: phase.name })} /> : null}

      {phase.kind === "error" ? (
        <ErrorState
          title={t(`cad.error.${phase.error.code}.title`)}
          description={`${phase.name} — ${t(`cad.error.${phase.error.code}.hint`, phase.error.vars)}`}
          code={phase.error.code}
        />
      ) : null}

      {parsed?.format === "DWG" ? (
        <Card padding="md" data-testid="cad-dwg">
          <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("cad.dwg.title")}</h2>
          <p className="mt-1 text-[length:var(--ws-text-body)]">
            <span className="font-semibold [overflow-wrap:anywhere]">{parsed.fileName}</span> · {text.dwg(parsed.dwg)}
          </p>
          <p className="mt-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cad.dwg.explain")}</p>
          <ol className="mt-2 grid list-decimal gap-1 pl-5 text-[length:var(--ws-text-body-sm)]">
            <li>{t("cad.dwg.howDxf")}</li>
            <li>{t("cad.dwg.howIfc")}</li>
            <li>{t("cad.dwg.howThen")}</li>
          </ol>
        </Card>
      ) : null}

      {parsed && takeoff && parsed.format !== "DWG" ? (
        <>
          <ReadSummary parsed={parsed} takeoff={takeoff} checks={checks} unitChoice={unit} onUnit={setUnit} text={text} />
          <AiPanel notes={notes} onAsk={() => setAiAsked(true)} disabled={!rows.length} text={text} />
          <Tabs
            label={t("cad.tabs.label")}
            param={null}
            value={tab}
            onChange={(s) => setTab(s as TabSlug)}
            tabs={[
              { slug: "quantitativos", label: t("cad.tab.quantitativos"), badge: <span className="text-ws-text-muted">({rows.length})</span> },
              { slug: "planilha", label: t("cad.tab.planilha") },
              { slug: "cronograma", label: t("cad.tab.cronograma") },
            ]}
          >
            {(active) =>
              active === "planilha" ? (
                <BudgetTab budget={budget} fileName={parsed.fileName} text={text}
                  onPrice={(key, cents) => setPrices((cur) => {
                    const next = { ...cur };
                    if (cents === null) {
                      const fallback = examplePriceTable()[key];
                      if (fallback === undefined) delete next[key];
                      else next[key] = fallback;
                    } else next[key] = cents;
                    return next;
                  })}
                  onBdi={(v) => setBdi(v)} onReset={() => { setPrices(examplePriceTable()); setBdi(DEFAULT_BDI_PERCENT); }} onCsv={exportBudget} />
              ) : active === "cronograma" ? (
                schedule ? <ScheduleTab schedule={schedule} fileName={parsed.fileName} text={text} onStart={setStart} onTeams={(stage, n) => setTeams((cur) => ({ ...cur, [stage]: n }))} /> : null
              ) : (
                <QuantitiesTab format={parsed.format} fileName={parsed.fileName} rows={rows} onEdit={edit} onUndo={undo} wallHeightM={wallHeightM} wallDoubleLine={wallDoubleLine}
                  onWallHeight={setWallHeightM} onWallDoubleLine={setWallDoubleLine} onCsv={exportQuantities} text={text} />
              )
            }
          </Tabs>

          <Card tone="soft" padding="md" data-testid="cad-create">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t("cad.create.target", { type: t(`cad.create.type.${TARGET[tab]}`) })}</p>
                <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cad.create.hint")}</p>
              </div>
              <Button variant="primary" icon="criar-tarefa" onClick={createTask} disabled={!rows.length} data-testid="cad-create-task">
                {t("cad.create.button")}
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

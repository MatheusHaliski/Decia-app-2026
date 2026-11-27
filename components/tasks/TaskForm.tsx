"use client";
/**
 * Criador e edição de tarefa (RF4, RF12; auditoria 17/10/2026). Campos comuns a qualquer profissão; extensões só da área escolhida,
 * nenhuma obrigatória. Erros do servidor por campo (422) ficam junto do campo; conflito de versão (409) preserva o que foi digitado
 * e oferece recarregar. Sair com alterações não salvas pede confirmação (nada é gravado em armazenamento local: pode ser sigiloso).
 *
 * Profissão preferida (RF81, D-147): só no criador (tela pessoal) e só para o dono, o campo de estudo vem pré-selecionado a partir
 * da profissão das preferências — marcado "a partir da sua profissão — só você vê" e trocável. Com ele a área, os modelos, as
 * extensões e a checagem se adaptam. A lente sugerida só fica gravada na tarefa (`extensions.studyField`) se a pessoa confirmar ou
 * usar um modelo do campo (princípio 1 de INTEGRACAO_POR_PROFISSAO.md: vira atributo do item só com confirmação).
 *
 * Rascunho entregue por outra tela (`?rascunho=<id>`, `lib/tasks/drafts.ts`): o criador abre preenchido, diz de onde veio, permite
 * descartar e apaga o rascunho depois de salvar.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FileTypeIcon } from "@/components/fileicons/FileTypeIcon";
import { FileTypeSelect } from "@/components/fileicons/FileTypeSelect";
import { kindOfExtension } from "@/components/fileicons/kinds";
import { useSearchParams } from "next/navigation";
import { Button, Card, Checkbox, Field, Input, Link, Select, Textarea, cn, useToast } from "@/components/ui";
import { api, ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { isOccupationCode } from "@/lib/preferences/types";
import {
  ACCESS_CLASSES, AREA_EXTENSIONS, attachmentsApi, legalDeadlinesApi, PRIORITIES, TASK_TYPE_NAMES, VISIBILITIES, WORK_AREAS, tasksApi,
  type AccessClassName, type Criterion, type Deliverable, type LegalDeadlineRuleView, type PriorityName, type Reference, type TaskCategoryName,
  type TaskRequest, type TaskTypeName, type TaskView, type VisibilityName, type WorkArea,
} from "@/lib/tasks/client";
import { emptyFormat, formatFromView, formatToRequest, type FormatChoice } from "@/lib/tasks/formats";
import {
  DOC_SITUATIONS, EFFORT_SIZES, emptyExtra, emptyLegal, firstErrorField, MAX_TAGS, NATURE_TAGS, packExtra, PROCESS_TAGS, sectionProgress,
  suggestEffort, TASK_CATEGORIES, TASK_ORIGINS, TASK_SECTIONS, unpackExtra, validateTaskForm,
  type DocSituationName, type EffortSizeName, type LegalChoice, type NatureTagName, type ProcessTagName, type TaskExtra, type TaskFormValues,
  type TaskOriginName, type TaskSectionId,
} from "@/lib/tasks/formRules";
import { formatIsoDate, legalDueDate, localTodayIso } from "@/lib/tasks/legalDeadline";
import { MAX_ATTACHMENT_BYTES } from "./Attachments";
import { focusSection, sectionDomId, TaskFormNav } from "./TaskFormNav";
import { FormatPicker } from "./FormatPicker";
import { AttachmentFormat } from "./AttachmentFormat";
import { FileDrop } from "./FileDrop";
import { acceptedAlternatives, adviseFile, askedCodes, splitPicked } from "@/lib/tasks/fileAdvice";
import { dueDateWarning } from "@/lib/tasks/quality";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { AREA_DEFAULT_ACCESS, AREA_DEFAULT_TYPE, fieldByCode, GUIDED_TASK_KEY, STUDY_FIELD_KEY } from "@/lib/tasks/areas";
import { discardTaskDraft, loadTaskDraft, type TaskDraftHandoff } from "@/lib/tasks/drafts";
import type { QuickFix } from "@/lib/tasks/quality";
import { applyTemplate, type TaskDraft, type TaskTemplate } from "@/lib/tasks/templates";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { ImportFrom } from "@/components/connectors/ImportFrom";
import { TaskAssist } from "./TaskAssist";

interface FormState {
  title: string;
  type: TaskTypeName | "";
  category: TaskCategoryName | "";
  area: WorkArea | "";
  objective: string;
  descriptionMd: string;
  priority: PriorityName;
  dueAt: string;
  /** responsável persistido; só muda quando a pessoa usa a opção (nunca por depender de /api/me ter respondido) */
  responsibleId: string;
  accessClass: AccessClassName;
  visibility: VisibilityName;
  deliverables: Deliverable[];
  criteria: Criterion[];
  references: Reference[];
  /** extensões da área, lente e tarefa-guia (as chaves reservadas do Acervo ficam em `extra`, o formato em `format`) */
  extensions: Record<string, string>;
  /** campos do Acervo sem coluna no contrato (subcategoria, natureza, processo, esforço, origem, participantes, justificativa) */
  extra: TaskExtra;
  /** formato da entrega: família → variante → detalhes */
  format: FormatChoice;
  /** prazo legal escolhido no criador (gravado pela rota própria logo depois de criar) */
  legal: LegalChoice;
}

const emptyForm = (): FormState => ({
  title: "", type: "", category: "", area: "", objective: "", descriptionMd: "", priority: "MEDIA", dueAt: "", responsibleId: "",
  accessClass: "INTERNO", visibility: "PRIVADA", deliverables: [], criteria: [], references: [], extensions: {}, extra: emptyExtra(),
  format: emptyFormat(), legal: emptyLegal(),
});
const empty: FormState = emptyForm();

function fromView(v: TaskView): FormState {
  const { extra, rest } = unpackExtra(v.extensions);
  return {
    title: v.title ?? "", type: v.type ?? "", category: v.category ?? "", area: v.area ?? "", objective: v.objective ?? "", descriptionMd: v.descriptionMd ?? "",
    priority: v.priority ?? "MEDIA", dueAt: v.dueAt ?? "", responsibleId: v.responsibleId ?? "", accessClass: v.accessClass ?? "INTERNO",
    visibility: v.visibility ?? "PRIVADA", deliverables: (v.deliverables as Deliverable[]) ?? [], criteria: (v.acceptanceCriteria as Criterion[]) ?? [],
    references: (v.references as Reference[]) ?? [], extensions: rest, extra, format: formatFromView(v), legal: emptyLegal(),
  };
}

const FIELD_MEMORY = "ws.tasks.studyField";
const toDraft = (f: FormState): TaskDraft => ({
  title: f.title, type: f.type, area: f.area, objective: f.objective, descriptionMd: f.descriptionMd, priority: f.priority, dueAt: f.dueAt,
  accessClass: f.accessClass, visibility: f.visibility, deliverables: f.deliverables.map((d) => d.text), criteria: f.criteria.map((c) => c.text),
  references: f.references, extensions: f.extensions, startAt: f.extra.startAt,
});
const fromDraft = (d: TaskDraft, f: FormState): FormState => ({
  ...f, title: d.title, type: d.type, area: d.area, objective: d.objective, descriptionMd: d.descriptionMd, priority: d.priority, dueAt: d.dueAt,
  accessClass: d.accessClass, visibility: d.visibility, deliverables: d.deliverables.map((text) => ({ text })),
  criteria: d.criteria.map((text) => ({ text, done: f.criteria.find((c) => c.text === text)?.done ?? false })), references: d.references, extensions: d.extensions,
});

const str = (v: unknown, max: number): string | undefined => (typeof v === "string" ? v.slice(0, max) : undefined);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const strings = (v: unknown, max: number): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, max)).slice(0, 50) : undefined);

/**
 * Rascunho entregue por outra tela → formulário. O conteúdo vem do armazenamento da aba: cada campo é conferido (tipo, enum, tamanho)
 * antes de entrar; o que faltar fica com o padrão. Área sem tipo ganha o tipo mais comum da área (como ao escolher a área).
 */
function formFromHandoff(d: Partial<TaskDraft>, f: FormState = empty): FormState {
  const area = oneOf(WORK_AREAS, d.area) ?? f.area;
  const type = oneOf(TASK_TYPE_NAMES, d.type) ?? (f.type || (area ? AREA_DEFAULT_TYPE[area] : ""));
  const accessClass = oneOf(ACCESS_CLASSES, d.accessClass) ?? (area && AREA_DEFAULT_ACCESS[area] && f.accessClass === "INTERNO" ? AREA_DEFAULT_ACCESS[area]! : f.accessClass);
  const refs = Array.isArray(d.references)
    ? d.references.filter((r): r is Reference => !!r && typeof r === "object" && typeof r.url === "string").map((r) => ({ label: String(r.label ?? "").slice(0, 300), url: r.url.slice(0, 500) })).slice(0, 50)
    : undefined;
  const ext = d.extensions && typeof d.extensions === "object"
    ? Object.fromEntries(Object.entries(d.extensions).filter(([k, v]) => /^[a-z][a-zA-Z0-9]{1,30}$/.test(k) && typeof v === "string").map(([k, v]) => [k, (v as string).slice(0, 500)]))
    : undefined;
  const split = ext ? unpackExtra(ext) : null;
  const hasReserved = !!ext && Object.keys(ext).some((k) => !(k in (split?.rest ?? {})));
  return {
    ...f,
    title: str(d.title, 200) ?? f.title,
    type,
    area,
    objective: str(d.objective, 500) ?? f.objective,
    descriptionMd: str(d.descriptionMd, 20_000) ?? f.descriptionMd,
    priority: oneOf(PRIORITIES, d.priority) ?? f.priority,
    dueAt: typeof d.dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.dueAt) ? d.dueAt : f.dueAt,
    accessClass,
    visibility: oneOf(VISIBILITIES, d.visibility) ?? f.visibility,
    deliverables: strings(d.deliverables, 300)?.map((text) => ({ text })) ?? f.deliverables,
    criteria: strings(d.criteria, 300)?.map((text) => ({ text, done: false })) ?? f.criteria,
    references: refs ?? f.references,
    extensions: split ? { ...f.extensions, ...split.rest } : f.extensions,
    extra: split && hasReserved ? split.extra : f.extra,
    format: ext?.fileFormat ? formatFromView({ extensions: ext }) : f.format,
  };
}

/** De onde veio a lente (campo de estudo) do formulário: sugerida pela profissão preferida e ainda não confirmada, ou escolhida. */
interface LensState { fromProfession: boolean; confirmed: boolean }

export interface TaskFormProps {
  mode: "create" | "edit";
  initial?: TaskView;
  onSaved: (task: TaskView) => void;
  /** modelo pedido pela URL (`/tasks/new?modelo=<id>`) */
  templateId?: string | null;
  /** rascunho entregue por outra tela; sem a prop, o criador lê `?rascunho=<id>` da URL */
  draftId?: string | null;
}

export function TaskForm({ mode, initial, onSaved, templateId, draftId: draftIdProp }: TaskFormProps) {
  const { t, intl, locale } = useI18n();
  const { toast } = useToast();
  const search = useSearchParams();
  const draftId = mode === "create" ? (draftIdProp !== undefined ? draftIdProp : search?.get("rascunho") ?? null) : null;
  const { prefs, ready: prefsReady } = usePreferences();
  const { profile } = useViewer();
  // a profissão preferida é da pessoa logada e só age no criador dela (tela pessoal), nunca na edição de uma tarefa existente
  const profession = mode === "create" && profile !== "VISITANTE" && isOccupationCode(prefs.preferredOccupation) ? prefs.preferredOccupation : null;
  const [me, setMe] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => (initial ? fromView(initial) : empty));
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initial ? fromView(initial) : empty));
  const [version, setVersion] = useState<number | undefined>(initial?.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [studyField, setStudyField] = useState<string | null>(() => initial?.extensions?.[STUDY_FIELD_KEY] ?? null);
  const [lens, setLens] = useState<LensState>({ fromProfession: false, confirmed: false });
  /** a lente já foi decidida (pela pessoa, pelo rascunho, pelo modelo da URL ou pela memória): a profissão não sobrescreve */
  const lensDecided = useRef(Boolean(initial?.extensions?.[STUDY_FIELD_KEY]));
  const [draftOrigin, setDraftOrigin] = useState<TaskDraftHandoff["origin"] | null>(null);
  const [draftMissing, setDraftMissing] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;
  /** arquivos escolhidos no criador: enviados como anexos logo depois de criar (o anexo precisa da tarefa) */
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  /** situação do envio de cada arquivo escolhido (índice na lista), depois de criar a tarefa */
  const [fileStatus, setFileStatus] = useState<Record<number, "enviando" | "enviado" | "erro">>({});
  /** sem sessão (laboratório DEMO ou API fora do ar): salvar exige conta — avisado logo no início */
  const [noSession, setNoSession] = useState(false);
  const [rules, setRules] = useState<LegalDeadlineRuleView[] | null>(null);
  const [rulesError, setRulesError] = useState(false);
  /** pedido de foco no primeiro campo com erro (muda a cada envio recusado) */
  const [focusReq, setFocusReq] = useState<{ field: string; n: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const today = localTodayIso();

  // rascunho entregue por outra tela (`?rascunho=`): lido depois da montagem (o armazenamento é da aba, não existe no servidor)
  const draftRead = useRef<string | null>(null);
  useEffect(() => {
    if (!draftId || draftRead.current === draftId) return;
    draftRead.current = draftId;
    const handoff = loadTaskDraft(draftId);
    if (!handoff) {
      setDraftMissing(true);
      return;
    }
    setDraftMissing(false);
    setDraftOrigin(handoff.origin);
    setForm((f) => formFromHandoff(handoff.draft, f));
    const lensFromDraft = handoff.draft.extensions?.[STUDY_FIELD_KEY];
    if (lensFromDraft && fieldByCode(lensFromDraft)) {
      lensDecided.current = true;
      setStudyField(lensFromDraft);
      setLens({ fromProfession: false, confirmed: false });
    }
    // o rascunho já traz a área de outra profissão: a lente da profissão preferida não se aplica a ele
    const own = fieldByCode(profession);
    if (own && handoff.draft.area && handoff.draft.area !== own.area) lensDecided.current = true;
  }, [draftId, profession]);

  // campo de estudo lembrado neste navegador POR CONTA (chave com o id de quem está logado: nunca passa para a próxima pessoa
  // que usar o mesmo navegador); a tarefa grava o que foi usado. Com profissão preferida, ela vale antes da memória.
  const fieldMemoryKey = me ? `${FIELD_MEMORY}:${me}` : null;
  useEffect(() => {
    if (!fieldMemoryKey || initial) return;
    try {
      window.localStorage.removeItem(FIELD_MEMORY); // chave antiga, sem dono: apaga
      if (studyField || lensDecided.current || !prefsReady || profession) return;
      const saved = window.localStorage.getItem(fieldMemoryKey);
      if (saved && fieldByCode(saved)) {
        lensDecided.current = true;
        setStudyField(saved);
      }
    } catch { /* armazenamento indisponível */ }
  }, [fieldMemoryKey, prefsReady, profession]); // quando a conta e as preferências são conhecidas

  // profissão preferida → campo de estudo pré-selecionado (só no criador, só para o dono, só se a lente ainda não foi decidida e a
  // área já escolhida não for de outra profissão); marcado na tela e trocável
  useEffect(() => {
    if (!profession || !prefsReady || lensDecided.current || studyField) return;
    const f = fieldByCode(profession);
    if (!f) return;
    lensDecided.current = true;
    const urlTemplateArea = templateId ? AREA_TEMPLATES.find((x) => x.id === templateId)?.area : undefined;
    if ((form.area && form.area !== f.area) || (urlTemplateArea && urlTemplateArea !== f.area)) return;
    setStudyField(profession);
    setLens({ fromProfession: true, confirmed: false });
    setForm((cur) => (cur.area ? cur : { ...cur, area: f.area, type: cur.type || AREA_DEFAULT_TYPE[f.area], accessClass: AREA_DEFAULT_ACCESS[f.area] && cur.accessClass === "INTERNO" ? AREA_DEFAULT_ACCESS[f.area]! : cur.accessClass }));
  }, [profession, prefsReady, studyField, form.area, templateId]);

  useEffect(() => {
    let alive = true;
    api.get<{ id: string }>("/api/me").then((u) => {
      if (!alive) return;
      setMe(u.id);
      if (initial) {
        const f = fromView(initial);
        setForm((cur) => (JSON.stringify(cur) === baseline ? f : cur));
        setBaseline(JSON.stringify(f));
      }
    }).catch((e) => {
      // sem sessão ou sem API: avisa já no topo do criador que salvar exige conta (o envio continua mostrando o erro)
      if (alive && (!(e instanceof ApiError) || e.status === 401 || e.status === 0)) setNoSession(true);
    });
    return () => { alive = false; };
  }, []); // uma vez por montagem: a visão inicial e a linha de base já estão no estado

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const extensionKeys = useMemo(() => (form.area ? AREA_EXTENSIONS[form.area] : []), [form.area]);
  const draft = useMemo(() => toDraft(form), [form]);
  /** área escolhida configura o formulário: tipo mais comum da área (se ainda vazio) e acesso recomendado */
  const chooseArea = useCallback((area: WorkArea | "") => setForm((f) => ({
    ...f, area,
    type: f.type || (area ? AREA_DEFAULT_TYPE[area] : ""),
    accessClass: area && AREA_DEFAULT_ACCESS[area] && f.accessClass === "INTERNO" ? AREA_DEFAULT_ACCESS[area]! : f.accessClass,
  })), []);
  const chooseField = useCallback((code: string | null) => {
    // escolha explícita (seletor, modelo da URL, plano): a lente deixa de ser só uma sugestão da profissão
    lensDecided.current = true;
    setLens({ fromProfession: false, confirmed: false });
    setStudyField(code);
    try {
      if (fieldMemoryKey && code) window.localStorage.setItem(fieldMemoryKey, code);
      else if (fieldMemoryKey) window.localStorage.removeItem(fieldMemoryKey);
    } catch { /* armazenamento indisponível */ }
    const area = fieldByCode(code)?.area;
    if (area) setForm((f) => (f.area ? f : { ...f, area, type: f.type || AREA_DEFAULT_TYPE[area] }));
  }, [fieldMemoryKey]);
  const useTemplate = useCallback((tpl: TaskTemplate) => {
    setForm((f) => fromDraft(applyTemplate(toDraft(f), tpl), f));
    setErrors({});
    // usar um modelo do campo confirma a lente sugerida pela profissão
    if (tpl.origin === "CAMPO") setLens((l) => (l.fromProfession ? { ...l, confirmed: true } : l));
  }, []);
  const confirmLens = useCallback(() => setLens((l) => ({ ...l, confirmed: true })), []);
  // descartar o rascunho volta o criador ao estado inicial (a profissão preferida, se houver, volta a sugerir o campo)
  const discardDraft = useCallback(() => {
    discardTaskDraft(draftId);
    setDraftOrigin(null);
    setForm(empty);
    setErrors({});
    setStudyField(null);
    setLens({ fromProfession: false, confirmed: false });
    lensDecided.current = false;
  }, [draftId]);
  /** a lente vai para a tarefa? sugestão da profissão só depois de confirmada (ou de usar um modelo do campo) */
  const recordLens = Boolean(studyField) && (!lens.fromProfession || lens.confirmed);
  const fix = useCallback((q: QuickFix) => setForm((f) => {
    switch (q.kind) {
      case "ADD_CRITERION": return f.criteria.some((c) => c.text === q.text) ? f : { ...f, criteria: [...f.criteria, { text: q.text, done: false }] };
      case "ADD_DELIVERABLE": return f.deliverables.some((d) => d.text === q.text) ? f : { ...f, deliverables: [...f.deliverables, { text: q.text }] };
      case "ADD_REFERENCE": return f.references.some((r) => r.url === q.url) ? f : { ...f, references: [...f.references, { label: q.label, url: q.url }] };
      case "SET_EXTENSION": return { ...f, extensions: { ...f.extensions, [q.key]: q.value } };
      case "SET_ACCESS": return { ...f, accessClass: q.accessClass, visibility: f.visibility === "EMPRESA" || f.visibility === "PUBLICA" ? "DEPARTAMENTO" : f.visibility };
    }
  }), []);
  const hasContent = Boolean(form.title.trim() || form.objective.trim() || form.descriptionMd.trim() || form.deliverables.length || form.criteria.length);

  const setExtra = <K extends keyof TaskExtra>(k: K, v: TaskExtra[K]) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));
  const setLegal = (patch: Partial<LegalChoice>) => setForm((f) => ({ ...f, legal: { ...f.legal, ...patch } }));

  // catálogo de prazos legais: só quando a pessoa liga o prazo legal no criador
  useEffect(() => {
    if (!form.legal.enabled || rules || mode !== "create") return;
    let alive = true;
    legalDeadlinesApi.rules().then((r) => { if (alive) setRules(r); }).catch(() => { if (alive) setRulesError(true); });
    return () => { alive = false; };
  }, [form.legal.enabled, rules, mode]);

  // foco no primeiro campo com erro, depois de a tela mostrar as mensagens
  useEffect(() => {
    if (!focusReq || !formRef.current) return;
    const box = formRef.current.querySelector<HTMLElement>(`[data-field="${focusReq.field}"]`);
    const target = box?.matches("input,select,textarea,button") ? box : box?.querySelector<HTMLElement>("input,select,textarea,button,[role=checkbox],[tabindex]");
    if (target) {
      target.scrollIntoView?.({ block: "center" });
      target.focus();
    } else if (box) focusSection(sectionOfFieldDom(box));
  }, [focusReq]);

  const values: TaskFormValues = {
    title: form.title, type: form.type, category: form.category, objective: form.objective, descriptionMd: form.descriptionMd, dueAt: form.dueAt,
    accessClass: form.accessClass, visibility: form.visibility, deliverables: form.deliverables, criteria: form.criteria, references: form.references,
    otherExtensions: bodyExtensions(false), extra: form.extra, legal: mode === "create" ? form.legal : emptyLegal(), format: form.format,
  };
  const progress = sectionProgress({ ...values, area: form.area, responsibleId: form.responsibleId, hasAreaFields: extensionKeys.length > 0, files: files.length }, errors);
  const shownSections = TASK_SECTIONS.filter((s) => s !== "area" || extensionKeys.length > 0);

  /** extensões além das reservadas: as da área escolhida, a lente e a tarefa-guia (com `withReserved`, também as do Acervo; o formato vai nas colunas próprias) */
  function bodyExtensions(withReserved: boolean): Record<string, string> {
    const extensions = Object.fromEntries(extensionKeys.map((k) => [k, form.extensions[k] ?? ""]).filter(([, v]) => (v ?? "").trim()));
    if (recordLens && studyField) extensions[STUDY_FIELD_KEY] = studyField;
    if (recordLens && form.extensions[GUIDED_TASK_KEY]) extensions[GUIDED_TASK_KEY] = form.extensions[GUIDED_TASK_KEY];
    return withReserved ? { ...extensions, ...packExtra(form.extra) } : extensions;
  }

  function body(draft?: boolean): TaskRequest {
    return {
      title: form.title, type: form.type || undefined, category: form.category || undefined, area: form.area || undefined, objective: form.objective || undefined,
      descriptionMd: form.descriptionMd || undefined, priority: form.priority, dueAt: form.dueAt || undefined,
      responsibleId: form.responsibleId || undefined, accessClass: form.accessClass, visibility: form.visibility,
      deliverables: form.deliverables.filter((d) => d.text.trim()), acceptanceCriteria: form.criteria.filter((c) => c.text.trim()),
      references: form.references.filter((r) => r.url.trim()), extensions: bodyExtensions(true), ...formatToRequest(form.format), draft, version,
    };
  }

  /** depois de criar: prazo legal (rota própria, com a versão nova) e anexos; falhas aqui não desfazem a tarefa, só avisam */
  async function afterCreate(saved: TaskView): Promise<TaskView> {
    let current = saved;
    if (form.legal.enabled && form.legal.ruleId && form.legal.baseDate && saved.id && saved.version !== undefined) {
      try {
        current = await tasksApi.setLegalDeadline(saved.id, { ruleId: form.legal.ruleId, startDate: form.legal.baseDate, version: saved.version });
      } catch (err) {
        toast({ title: t("taskForm.legal.failed"), description: describeError(err), tone: "aviso" });
      }
    }
    let failed = 0;
    for (const [i, f] of files.entries()) {
      setFileStatus((s) => ({ ...s, [i]: "enviando" }));
      try {
        if (saved.id) await attachmentsApi.upload(saved.id, f, f.name);
        setFileStatus((s) => ({ ...s, [i]: "enviado" }));
      } catch {
        failed += 1;
        setFileStatus((s) => ({ ...s, [i]: "erro" }));
      }
    }
    if (failed) toast({ title: t("taskForm.files.failed", { n: failed }), tone: "aviso" });
    return current;
  }

  async function submit(e: FormEvent, opts: { draft?: boolean; another?: boolean } = {}) {
    e.preventDefault();
    const found = validateTaskForm(values, { today, draft: opts.draft });
    const local: Record<string, string> = Object.fromEntries(Object.entries(found).map(([k, key]) => [k, t(key as string)]));
    setErrors(local);
    const first = firstErrorField(local);
    if (first) {
      setFocusReq((r) => ({ field: first, n: (r?.n ?? 0) + 1 }));
      return;
    }
    setBusy(true);
    setConflict(false);
    try {
      let saved = mode === "create" ? await tasksApi.create(body(opts.draft)) : await tasksApi.update(initial!.id!, body());
      if (mode === "create") saved = await afterCreate(saved);
      setVersion(saved.version);
      try {
        if (fieldMemoryKey && studyField && recordLens) window.localStorage.setItem(fieldMemoryKey, studyField);
      } catch { /* armazenamento indisponível */ }
      // a tarefa existe: o rascunho entregue pela outra tela não serve mais
      if (draftId && draftOrigin) {
        discardTaskDraft(draftId);
        setDraftOrigin(null);
      }
      if (opts.another && mode === "create") {
        // "salvar e criar outra": mantém o enquadramento (tipo, categoria, área, acesso) e limpa o resto
        const next: FormState = {
          ...emptyForm(), type: form.type, category: form.category, area: form.area, accessClass: form.accessClass, visibility: form.visibility,
          extra: { ...emptyExtra(), accessReason: form.accessClass === "SIGILOSO" ? form.extra.accessReason : "" },
        };
        setForm(next);
        setBaseline(JSON.stringify(next));
        setFiles([]);
        setFileStatus({});
        setErrors({});
        toast({ title: t("taskForm.createdAnother", { title: saved.title ?? form.title }), tone: "sucesso" });
        setFocusReq((r) => ({ field: "title", n: (r?.n ?? 0) + 1 }));
        return;
      }
      setBaseline(JSON.stringify(form));
      toast({ title: t(mode === "create" ? "tasks.form.created" : "tasks.form.saved"), tone: "sucesso" });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors(err.fields);
        const f = firstErrorField(err.fields);
        if (f) setFocusReq((r) => ({ field: f, n: (r?.n ?? 0) + 1 }));
      } else if (err instanceof ApiError && err.status === 409 && err.code === "EDICAO_CONCORRENTE") setConflict(true);
      else toast({ title: t("tasks.form.saveFailed"), description: describeError(err), tone: "erro" });
    } finally {
      setBusy(false);
    }
  }

  async function reloadServer() {
    if (!initial?.id) return;
    const fresh = await tasksApi.get(initial.id);
    const f = fromView(fresh);
    setForm(f);
    setBaseline(JSON.stringify(f));
    setVersion(fresh.version);
    setConflict(false);
  }

  const addFiles = (picked: File[]) => {
    if (!picked.length) return;
    // tipo que o servidor recusa não entra (aviso com as alternativas aceitas); acima do teto também não
    const { ok, refused } = splitPicked(picked, form.format);
    const big = ok.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const msgs = [
      refused.length ? t("criador2.files.refused", { names: refused.map((f) => f.name).join(", "), types: acceptedAlternatives(form.format).join(", ") }) : "",
      big.length ? t("taskForm.files.tooBig", { names: big.map((f) => f.name).join(", ") }) : "",
    ].filter(Boolean);
    setFileError(msgs.length ? msgs.join(" ") : null);
    setFileStatus({});
    setFiles((cur) => [...cur, ...ok.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)].slice(0, 20));
  };
  const askedLabel = form.format.family ? `${t(`taskForm.fmt.familyName.${form.format.family}`)} (${askedCodes(form.format)})` : "";
  const dueWarn = dueDateWarning(form.dueAt, form.extra.startAt, today);
  const addCriteria = (texts: string[]) => setForm((f) => ({
    ...f, criteria: [...f.criteria, ...texts.filter((x) => !f.criteria.some((c) => c.text === x)).map((text) => ({ text, done: false }))],
  }));

  const err = (k: string) => errors[k];
  const errorCount = Object.values(errors).filter(Boolean).length;
  const rule = rules?.find((r) => r.id === form.legal.ruleId);
  const legalPreview = rule && form.legal.baseDate && /^\d{4}-\d{2}-\d{2}$/.test(form.legal.baseDate) ? legalDueDate(form.legal.baseDate, rule.days ?? 0, !!rule.businessDays) : null;
  const sortedRules = useMemo(() => [...(rules ?? [])].sort((a, b) => Number(b.category === form.category) - Number(a.category === form.category)), [rules, form.category]);
  const suggested = suggestEffort(form.extra.estimatedHours);
  const external = form.extra.origin !== "INTERNA";
  const toggleTag = <T extends string>(list: T[], v: T, on: boolean) => (on ? [...list, v].slice(0, MAX_TAGS) : list.filter((x) => x !== v));
  return (
    <div className="grid items-start gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
    <div className="min-w-0 lg:sticky lg:top-[var(--ws-space-4)] lg:order-2 lg:max-h-[calc(100dvh-var(--ws-space-8))] lg:overflow-auto">
      <TaskAssist
        draft={draft} fieldCode={studyField} onFieldChange={chooseField} onAreaChange={chooseArea} onApplyTemplate={useTemplate} onFix={fix} hasContent={hasContent}
        templateId={mode === "create" ? templateId : null}
        lens={lens.fromProfession && studyField === profession ? { confirmed: lens.confirmed, onConfirm: confirmLens } : null}
        professionCode={profession}
      />
    </div>
    <form ref={formRef} className="grid min-w-0 gap-[var(--ws-space-4)]" onSubmit={(e) => submit(e)} noValidate data-testid="task-form" aria-busy={busy}>
      {noSession ? (
        <div role="status" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="task-no-session">
          <p className="font-semibold"><span aria-hidden>! </span>{t("criador2.noSession.title")}</p>
          <p>{t("criador2.noSession.body")}</p>
          <p><Link href={`/login?next=${encodeURIComponent(mode === "create" ? "/tasks/new" : `/tasks/${initial?.id ?? ""}/edit`)}`}>{t("criador2.noSession.signIn")}</Link></p>
        </div>
      ) : null}
      {draftOrigin ? (
        <div role="status" className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-info bg-ws-info-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="task-draft-origin" data-origin={draftOrigin.kind}>
          <p><span className="font-semibold">{t("career.draft.from", { origin: draftOrigin.label })}</span>{draftOrigin.ref ? <span className="text-ws-text-muted"> · {draftOrigin.ref}</span> : null}</p>
          <p className="text-ws-text-muted">{t("career.draft.review")}</p>
          <div><Button size="sm" variant="ghost" onClick={discardDraft} data-testid="task-draft-discard">{t("career.draft.discard")}</Button></div>
        </div>
      ) : draftMissing ? (
        <p role="status" className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="task-draft-missing">{t("career.draft.missing")}</p>
      ) : null}
      {/* RF20.CA07/RF34: trazer de uma conta conectada (Google, Microsoft) ou de um link (inclusive iCloud) em vez de digitar */}
      {mode === "create" ? <ImportFrom hasDraft={hasContent} /> : null}
      {conflict ? (
        <div role="alert" className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="task-conflict">
          <p>{t("tasks.form.conflict")}</p>
          <div><Button size="sm" variant="ghost" onClick={() => void reloadServer()}>{t("tasks.form.reload")}</Button></div>
        </div>
      ) : null}

      <TaskFormNav sections={shownSections} states={progress.states} done={progress.done} total={progress.total} percent={progress.percent} />
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("taskForm.requiredNote")}</p>
      {errorCount ? (
        <div role="alert" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="task-errors">
          {t(errorCount === 1 ? "taskForm.errorsOne" : "taskForm.errorsMany", { n: errorCount })}
        </div>
      ) : null}

      <FormSection id="ident" n={shownSections.indexOf("ident") + 1}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div data-field="title" className="md:col-span-2">
            <Field label={t("tasks.form.title")} required error={err("title")}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} aria-required value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />}
            </Field>
          </div>
          <div data-field="type">
            <Field label={t("tasks.form.type")} required error={err("type")} hint={t("taskForm.typeHint")}>
              {({ id, describedBy, invalid }) => (
                <FileTypeSelect
                  id={id} describedBy={describedBy} invalid={invalid} value={form.type} onChange={(v) => set("type", v as TaskTypeName)} testId="task-type"
                  placeholder={t("tasks.form.choose")} fieldLabel={t("tasks.form.type")}
                  options={TASK_TYPE_NAMES.map((v) => ({ value: v, label: t(`social.taskType.${v}`) }))} iconOf={(v) => ({ type: v as TaskTypeName })}
                />
              )}
            </Field>
          </div>
          <div data-field="priority">
            <Field label={t("tasks.form.priority")}>
              {({ id }) => <Select id={id} value={form.priority} onChange={(e) => set("priority", e.target.value as PriorityName)} options={PRIORITIES.map((v) => ({ value: v, label: t(`tasks.priority.${v}`) }))} />}
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection id="goal" n={shownSections.indexOf("goal") + 1}>
        <div className="grid gap-3">
          <div data-field="objective">
            <Field label={t("tasks.form.objective")} hint={t("tasks.form.objectiveHint")} error={err("objective")}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={form.objective} maxLength={500} onChange={(e) => set("objective", e.target.value)} />}
            </Field>
          </div>
          <div data-field="descriptionMd">
            <Field label={t("tasks.form.description")} hint={t("taskForm.descriptionHint")} error={err("descriptionMd")}>
              {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={5} value={form.descriptionMd} onChange={(e) => set("descriptionMd", e.target.value)} />}
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection id="frame" n={shownSections.indexOf("frame") + 1} hint={t("taskForm.frameHint")}>
        <div className="grid gap-3 md:grid-cols-2">
          <div data-field="category">
            <Field label={t("taskForm.category")} hint={t("taskForm.categoryHint")}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.category} onChange={(e) => set("category", e.target.value as TaskCategoryName | "")}
                options={[{ value: "", label: t("taskForm.noCategory") }, ...TASK_CATEGORIES.map((c) => ({ value: c, label: t(`social.category.${c}`) }))]} />}
            </Field>
          </div>
          <div data-field="subcategory">
            <Field label={t("taskForm.subcategory")} hint={t("taskForm.subcategoryHint")} error={err("subcategory")}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={form.extra.subcategory} maxLength={80} disabled={!form.category && !form.extra.subcategory} onChange={(e) => setExtra("subcategory", e.target.value)} />}
            </Field>
          </div>
          <TagGroup<NatureTagName> field="natures" legend={t("taskForm.natures")} hint={t("taskForm.maxTwoHint")} error={err("natures")} all={NATURE_TAGS}
            selected={form.extra.natures} label={(v) => t(`taskForm.nature.${v}`)} onToggle={(v, on) => setExtra("natures", toggleTag(form.extra.natures, v, on))} />
          <TagGroup<ProcessTagName> field="processes" legend={t("taskForm.processes")} hint={t("taskForm.maxTwoHint")} error={err("processes")} all={PROCESS_TAGS}
            selected={form.extra.processes} label={(v) => t(`taskForm.process.${v}`)} onToggle={(v, on) => setExtra("processes", toggleTag(form.extra.processes, v, on))} />
          <div data-field="area">
            <Field label={t("tasks.form.area")} hint={t("tasks.form.areaHint")}>
              {({ id, describedBy }) => (
                <Select id={id} aria-describedby={describedBy} value={form.area} onChange={(e) => chooseArea(e.target.value as WorkArea | "")}
                  options={[{ value: "", label: t("tasks.form.noArea") }, ...WORK_AREAS.map((v) => ({ value: v, label: t(`tasks.area.${v}`) }))]} />
              )}
            </Field>
          </div>
          <p className="self-end text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="task-study-field">
            {studyField ? t("taskForm.studyFieldIs", { field: fieldByCode(studyField)?.label[locale === "en" || locale === "es" ? locale : "pt-BR"] ?? studyField }) : t("taskForm.studyFieldNone")}
          </p>
        </div>
      </FormSection>

      <FormSection id="people" n={shownSections.indexOf("people") + 1}>
        <div className="grid gap-3">
          <div data-field="responsibleId">
            <Checkbox checked={!!me && form.responsibleId === me} onCheckedChange={(v) => set("responsibleId", v && me ? me : "")} label={t("tasks.form.responsibleMe")} hint={t("tasks.form.responsibleHint")} disabled={!me} />
            {form.responsibleId && me && form.responsibleId !== me ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="responsible-other">{t("tasks.form.responsibleOther")}</p> : null}
            {err("responsibleId") ? <p role="alert" className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{err("responsibleId")}</p> : null}
          </div>
          <div data-field="participants">
            <ListEditor
              bare title={t("taskForm.participants")} hint={t("taskForm.participantsHint")} error={err("participants")} addLabel={t("taskForm.addParticipant")}
              items={form.extra.participants} onChange={(v) => setExtra("participants", v)} make={() => ""} testId="participants"
              render={(p, update, label) => <Input aria-label={label} value={p} maxLength={120} onChange={(e) => update(e.target.value)} />}
            />
          </div>
        </div>
      </FormSection>

      <FormSection id="dates" n={shownSections.indexOf("dates") + 1}>
        <div className="grid gap-3 md:grid-cols-2">
          <div data-field="startAt">
            <Field label={t("taskForm.startAt")} error={err("startAt")}>
              {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={form.extra.startAt} onChange={(e) => setExtra("startAt", e.target.value)} />}
            </Field>
          </div>
          <div data-field="dueAt">
            <Field label={t("tasks.form.dueAt")} error={err("dueAt")}>
              {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={form.dueAt} onChange={(e) => set("dueAt", e.target.value)} />}
            </Field>
            {dueWarn && !err("dueAt") ? (
              <p role="status" className="mt-1 rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-2 py-1 text-[length:var(--ws-text-caption)]" data-testid="due-warning" data-kind={dueWarn}>
                <span aria-hidden>! </span>{t(dueWarn === "PASSADO" ? "criador2.due.past" : "criador2.due.beforeStart", { date: formatIsoDate(form.dueAt, intl), start: form.extra.startAt ? formatIsoDate(form.extra.startAt, intl) : "" })}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 md:col-span-2" data-testid="task-legal">
            {mode === "create" ? (
              <>
                <Checkbox checked={form.legal.enabled} onCheckedChange={(v) => setLegal({ enabled: v })} label={t("taskForm.legal.enable")} hint={t("taskForm.legal.enableHint")} />
                {form.legal.enabled ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {rulesError ? <p role="alert" className="text-[length:var(--ws-text-caption)] text-ws-danger-ink md:col-span-2">{t("tasks.deadline.loadRulesError")}</p> : null}
                    <div data-field="legalRule" className="md:col-span-2">
                      <Field label={t("tasks.deadline.rule")} hint={t("tasks.deadline.ruleHint")} required error={err("legalRule")}>
                        {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={form.legal.ruleId} onChange={(e) => setLegal({ ruleId: e.target.value })}
                          options={[{ value: "", label: rules ? t("tasks.deadline.choose") : t("taskForm.legal.loading") }, ...sortedRules.map((r) => ({ value: r.id ?? "", label: `${r.subcategory ?? t(`social.category.${r.category ?? "OUTRO"}`)} — ${t("tasks.deadline.days", { n: r.days ?? 0, kind: t(r.businessDays ? "tasks.deadline.businessDays" : "tasks.deadline.calendarDays") })}` }))]} />}
                      </Field>
                    </div>
                    <div data-field="legalBase">
                      <Field label={t("tasks.deadline.start")} hint={t("tasks.deadline.startHint")} required error={err("legalBase")}>
                        {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={form.legal.baseDate} onChange={(e) => setLegal({ baseDate: e.target.value })} />}
                      </Field>
                    </div>
                    <p className="self-end text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="task-legal-preview">
                      {legalPreview ? <><span aria-hidden>⚖ </span>{t("tasks.deadline.preview", { date: formatIsoDate(legalPreview, intl) })}</> : null}
                    </p>
                    {rule?.legalBasis ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted md:col-span-2">{rule.legalBasis}</p> : null}
                  </div>
                ) : null}
              </>
            ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("taskForm.legal.inDetail")}</p>}
          </div>
          <div data-field="effortSize">
            <Field label={t("taskForm.effortSize")} hint={suggested ? t("taskForm.effortSuggested", { size: t(`taskForm.effort.${suggested}`) }) : t("taskForm.effortHint")}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.extra.effortSize} onChange={(e) => setExtra("effortSize", e.target.value as EffortSizeName | "")}
                options={[{ value: "", label: t("taskForm.unspecified") }, ...EFFORT_SIZES.map((v) => ({ value: v, label: t(`taskForm.effort.${v}`) }))]} />}
            </Field>
          </div>
          <div data-field="estimatedHours">
            <Field label={t("taskForm.estimatedHours")} error={err("estimatedHours")}>
              {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={form.extra.estimatedHours} maxLength={8} onChange={(e) => setExtra("estimatedHours", e.target.value)} />}
            </Field>
          </div>
          <div data-field="amount">
            <Field label={t("taskForm.amount")} hint={t("taskForm.amountHint")} error={err("amount")}>
              {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={form.extra.amount} maxLength={20} onChange={(e) => setExtra("amount", e.target.value)} />}
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection id="deliver" n={shownSections.indexOf("deliver") + 1}>
        <div className="grid gap-4">
          <div data-field="format">
            <FormatPicker value={form.format} onChange={(f) => set("format", f)} onAddCriteria={addCriteria} error={err("format")} testId="task-format" />
          </div>
          <div data-field="deliverables">
            <ListEditor
              bare title={t("tasks.form.deliverables")} hint={t("tasks.form.deliverablesHint")} error={err("deliverables")} addLabel={t("tasks.form.addDeliverable")}
              items={form.deliverables} onChange={(v) => set("deliverables", v)} make={() => ({ text: "" })} testId="deliverables"
              render={(d, update, label) => <Input aria-label={label} value={d.text} maxLength={300} onChange={(e) => update({ text: e.target.value })} />}
            />
          </div>
          <div data-field="acceptanceCriteria">
            <ListEditor
              bare title={t("tasks.form.criteria")} hint={t("tasks.form.criteriaHint")} error={err("acceptanceCriteria")} addLabel={t("tasks.form.addCriterion")}
              items={form.criteria} onChange={(v) => set("criteria", v)} make={() => ({ text: "", done: false })} testId="criteria"
              render={(c, update, label) => (
                <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                  <Input aria-label={label} value={c.text} maxLength={300} onChange={(e) => update({ ...c, text: e.target.value })} />
                  <Checkbox checked={c.done} onCheckedChange={(v) => update({ ...c, done: v })} label={t("tasks.form.criterionDone")} />
                </div>
              )}
            />
          </div>
        </div>
      </FormSection>

      <FormSection id="refs" n={shownSections.indexOf("refs") + 1}>
        <div className="grid gap-4">
          <div data-field="references">
            <ListEditor
              bare title={t("tasks.form.references")} hint={t("tasks.form.referencesHint")} error={err("references")} addLabel={t("tasks.form.addReference")}
              items={form.references} onChange={(v) => set("references", v)} make={() => ({ label: "", url: "" })} testId="references"
              render={(r, update, label) => (
                <div className="grid items-center gap-2 sm:grid-cols-[auto_1fr_2fr]">
                  <FileTypeIcon url={r.url || "https://"} size={26} />
                  <Input aria-label={t("tasks.form.referenceLabel", { n: label })} placeholder={t("tasks.form.referenceLabelPh")} value={r.label} maxLength={300} onChange={(e) => update({ ...r, label: e.target.value })} />
                  <Input aria-label={t("tasks.form.referenceUrl", { n: label })} type="url" placeholder="https://" value={r.url} maxLength={500} onChange={(e) => update({ ...r, url: e.target.value })} />
                </div>
              )}
            />
          </div>
          {mode === "create" ? (
            <div className="grid gap-2" data-testid="task-files">
              <FileDrop label={t("taskForm.files.label")} hint={t("taskForm.files.hint")} error={fileError ?? undefined} disabled={busy} onFiles={addFiles} testId="task-files-drop" />
              {files.length ? (
                <ul className="grid gap-1" aria-live="polite">
                  {files.map((f, i) => {
                    const advice = adviseFile({ name: f.name, type: f.type }, form.format);
                    const st = fileStatus[i];
                    return (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-file={f.name} data-status={st ?? "pendente"}>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="[overflow-wrap:anywhere]">{f.name}</span>
                          <AttachmentFormat a={{ fileName: f.name, mimeType: f.type }} asked={form.format} />
                          {advice.mismatch ? (
                            <span role="status" className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-1 text-[length:var(--ws-text-caption)]" data-testid="file-format-advice">
                              <span aria-hidden>! </span>{t("criador2.files.mismatch", { asked: askedLabel, got: advice.got })}
                            </span>
                          ) : null}
                          {st ? <span className={cn("text-[length:var(--ws-text-caption)]", st === "erro" ? "text-ws-danger-ink" : "text-ws-text-muted")} data-testid="file-upload-status">{t(`criador2.upload.${st}`)}</span> : null}
                        </span>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFiles((cur) => cur.filter((_, j) => j !== i)); setFileStatus({}); }} aria-label={t("tasks.form.remove", { item: f.name })}>×</Button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("taskForm.files.inDetail")}</p>}
        </div>
      </FormSection>

      <FormSection id="access" n={shownSections.indexOf("access") + 1}>
        <div className="grid gap-3 md:grid-cols-2">
          <div data-field="accessClass">
            <Field label={t("tasks.form.accessClass")} hint={t("tasks.form.accessClassHint")}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.accessClass} onChange={(e) => set("accessClass", e.target.value as AccessClassName)} options={ACCESS_CLASSES.map((v) => ({ value: v, label: t(`social.access.${v}`) }))} />}
            </Field>
          </div>
          <div data-field="visibility">
            <Field label={t("tasks.form.visibility")} hint={form.accessClass === "SIGILOSO" ? t("tasks.form.sigilosoHint") : undefined} error={err("visibility")}>
              {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={form.visibility} onChange={(e) => set("visibility", e.target.value as VisibilityName)} options={VISIBILITIES.map((v) => ({ value: v, label: t(`social.visibility.${v}`) }))} />}
            </Field>
          </div>
          {form.accessClass === "SIGILOSO" || form.accessClass === "RESTRITO" || form.extra.accessReason ? (
            <div data-field="accessReason" className="md:col-span-2">
              <Field label={t("taskForm.accessReason")} required={form.accessClass === "SIGILOSO"} hint={t("taskForm.accessReasonHint")} error={err("accessReason")}>
                {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} aria-required={form.accessClass === "SIGILOSO"} rows={2} maxLength={500} value={form.extra.accessReason} onChange={(e) => setExtra("accessReason", e.target.value)} />}
              </Field>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection id="origin" n={shownSections.indexOf("origin") + 1}>
        <div className="grid gap-3 md:grid-cols-2">
          <div data-field="origin">
            <Field label={t("taskForm.origin")} hint={t("taskForm.originHint")}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.extra.origin} onChange={(e) => setExtra("origin", e.target.value as TaskOriginName)}
                options={TASK_ORIGINS.map((v) => ({ value: v, label: t(`taskForm.originKind.${v}`) }))} />}
            </Field>
          </div>
          <div data-field="docSituation">
            <Field label={t("taskForm.docSituation")}>
              {({ id }) => <Select id={id} value={form.extra.docSituation} onChange={(e) => setExtra("docSituation", e.target.value as DocSituationName | "")}
                options={[{ value: "", label: t("taskForm.unspecified") }, ...DOC_SITUATIONS.map((v) => ({ value: v, label: t(`taskForm.situation.${v}`) }))]} />}
            </Field>
          </div>
          {external ? (
            <>
              <div data-field="sender">
                <Field label={t(`taskForm.sender.${form.extra.origin}`)} required error={err("sender")}>
                  {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} aria-required value={form.extra.sender} maxLength={200} onChange={(e) => setExtra("sender", e.target.value)} />}
                </Field>
              </div>
              <div data-field="document">
                <Field label={t("taskForm.document")} hint={t("taskForm.documentHint")} required error={err("document")}>
                  {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} aria-required value={form.extra.document} maxLength={200} onChange={(e) => setExtra("document", e.target.value)} />}
                </Field>
              </div>
            </>
          ) : null}
          <div data-field="protocol">
            <Field label={t("taskForm.protocol")} hint={t("taskForm.protocolHint")} error={err("protocol")}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={form.extra.protocol} maxLength={60} onChange={(e) => setExtra("protocol", e.target.value)} />}
            </Field>
          </div>
          <div data-field="receivedAt">
            <Field label={t("taskForm.receivedAt")} error={err("receivedAt")}>
              {({ id, describedBy, invalid }) => <Input id={id} type="date" max={today} aria-describedby={describedBy} invalid={invalid} value={form.extra.receivedAt} onChange={(e) => setExtra("receivedAt", e.target.value)} />}
            </Field>
          </div>
        </div>
      </FormSection>

      {extensionKeys.length ? (
        <Card as="section" id={sectionDomId("area")} tabIndex={-1} title={`${shownSections.indexOf("area") + 1}. ${t("tasks.form.areaFields", { area: t(`tasks.area.${form.area}`) })}`} data-testid="area-fields" data-section-card="area"
          className="scroll-mt-[var(--ws-space-4)] focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.form.areaFieldsHint")}</p>
          <div data-field="extensions">{err("extensions") ? <p role="alert" className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{err("extensions")}</p> : null}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {extensionKeys.map((k) => (
              <Field key={k} label={t(`tasks.ext.${k}`)}>
                {({ id }) => (
                  <div className="flex items-center gap-2">
                    {k === "format" && kindOfExtension(form.extensions[k]) ? <FileTypeIcon extension={form.extensions[k]} size={28} /> : null}
                    <Input id={id} value={form.extensions[k] ?? ""} maxLength={500} onChange={(e) => set("extensions", { ...form.extensions, [k]: e.target.value })} />
                  </div>
                )}
              </Field>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="sticky bottom-0 z-[1] flex flex-wrap items-center gap-2 border-t border-ws-border bg-ws-surface-0 py-3">
        <Button type="submit" variant="primary" disabled={busy} data-testid="task-submit">{t(mode === "create" ? "tasks.form.create" : "tasks.form.save")}</Button>
        {mode === "create" ? <Button variant="default" disabled={busy} onClick={(e) => void submit(e as unknown as FormEvent, { another: true })} data-testid="task-save-another">{t("taskForm.saveAnother")}</Button> : null}
        {mode === "create" ? <Button variant="ghost" disabled={busy} onClick={(e) => void submit(e as unknown as FormEvent, { draft: true })} data-testid="task-draft">{t("tasks.form.saveDraft")}</Button> : null}
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite" data-testid="task-dirty">
          {busy ? t("tasks.form.saving") : dirty ? t("tasks.form.unsaved") : mode === "edit" ? t("tasks.form.allSaved") : ""}
        </span>
      </div>
    </form>
    </div>
  );
}

function FormSection({ id, n, hint, children }: { id: TaskSectionId; n: number; hint?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Card as="section" id={sectionDomId(id)} tabIndex={-1} title={`${n}. ${t(`taskForm.section.${id}`)}`} data-section-card={id}
      className="scroll-mt-[var(--ws-space-4)] focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
      {hint ? <p className="mb-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p> : null}
      {children}
    </Card>
  );
}

/** Seção do campo dentro do formulário (para focar a seção quando o campo não tem controle focável). */
function sectionOfFieldDom(el: HTMLElement): string {
  const card = el.closest<HTMLElement>("[data-section-card]");
  return card?.dataset.sectionCard ?? "ident";
}

function TagGroup<T extends string>({ field, legend, hint, error, all, selected, label, onToggle }: {
  field: string; legend: string; hint: string; error?: string; all: readonly T[]; selected: readonly T[]; label: (v: T) => string; onToggle: (v: T, on: boolean) => void;
}) {
  const errId = `${field}-err`;
  const hintId = `${field}-hint`;
  const full = selected.length >= MAX_TAGS;
  return (
    <fieldset data-field={field} aria-describedby={[hintId, error ? errId : ""].filter(Boolean).join(" ")} aria-invalid={error ? true : undefined} className="grid gap-1">
      <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{legend}</legend>
      <p id={hintId} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p>
      <div className="grid grid-cols-2 gap-x-3">
        {all.map((v) => {
          const on = selected.includes(v);
          return <Checkbox key={v} checked={on} disabled={!on && full} onCheckedChange={(x) => onToggle(v, x)} label={label(v)} />;
        })}
      </div>
      {error ? <p id={errId} role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
    </fieldset>
  );
}

function ListEditor<T>({ title, hint, error, addLabel, items, onChange, make, render, testId, bare }: {
  title: string; hint: string; error?: string; addLabel: string; items: T[]; onChange: (v: T[]) => void; make: () => T;
  render: (item: T, update: (v: T) => void, label: string) => ReactNode; testId: string; bare?: boolean;
}) {
  const { t } = useI18n();
  const content = (
    <>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p>
      {error ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink" role="alert">{error}</p> : null}
      <ol className="grid gap-2" data-testid={testId}>
        {items.map((item, i) => {
          const label = `${title} ${i + 1}`;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto] items-start gap-2">
              {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), label)}
              <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("tasks.form.remove", { item: label })}>×</Button>
            </li>
          );
        })}
      </ol>
      <div><Button size="sm" variant="ghost" onClick={() => onChange([...items, make()])}>+ {addLabel}</Button></div>
    </>
  );
  if (!bare) return <Card title={title}>{content}</Card>;
  return (
    <div className={cn("grid gap-2")}>
      <h3 className="text-[length:var(--ws-text-body)] font-semibold">{title}</h3>
      {content}
    </div>
  );
}

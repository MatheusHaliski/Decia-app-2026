"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input, LoadingState, Select } from "@/components/ui";
import { evaluateAiAction, personalPolicy } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { ingestClassesFor, memoryAccessFor } from "@/lib/memory/access";
import { composeAnswer, type MemoryAnswer } from "@/lib/memory/answer";
import { parseSpan } from "@/lib/memory/citation";
import { docAllowed, MAX_QUERY_LENGTH } from "@/lib/memory/engine";
import { memoryFacets, type FacetSelection } from "@/lib/memory/explore";
import { MEMORY_KINDS, type MemoryKind } from "@/lib/memory/search";
import { demoMemoryRepository, type MemoryRepository } from "@/lib/memory/store";
import type { MemoryQueryOptions } from "@/lib/memory/types";
import { useMemoryRepository } from "@/lib/memory/useMemory";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { VIEWER_DEMO_USER } from "@/lib/social/fixtures";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { accessKey, kindKey } from "./labels";
import { MemoryAnswerPanel } from "./MemoryAnswer";
import { MemoryExplorer } from "./MemoryExplorer";
import { MemoryIngest } from "./MemoryIngest";
import { MemoryReader } from "./MemoryReader";
import { MemoryResults } from "./MemoryResults";

const RESULTS_K = 8;
const ALL = "*";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/**
 * Memória Institucional (RF33): pergunta em linguagem natural → trechos exatos com citação, pontuação e o porquê; resposta da
 * IA ✦ montada só com os trechos (ou "sem fonte"); explorador por unidade, tipo e exercício; leitor com o trecho destacado;
 * ingestão local. Tudo sobre o índice DEMO da aba e SEMPRE filtrado pelo que o perfil pode ler.
 */
export function MemoryWorkspace({ repo = demoMemoryRepository() }: { repo?: MemoryRepository }) {
  const { t } = useI18n();
  const { profile, user } = useViewer();
  const { prefs } = usePreferences();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const { version } = useMemoryRepository(repo);

  const initialQ = params.get("q");
  const [question, setQuestion] = useState(initialQ ?? "");
  const [submitted, setSubmitted] = useState<string | null>(initialQ?.trim() ? initialQ.trim().slice(0, MAX_QUERY_LENGTH) : null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<FacetSelection>({});
  const [twoPerDoc, setTwoPerDoc] = useState(false);
  const [answer, setAnswer] = useState<{ question: string; value: MemoryAnswer } | null>(null);

  const access = useMemo(() => memoryAccessFor(profile, user), [profile, user]);
  const viewerId = VIEWER_DEMO_USER[profile];
  const accessOpts = useMemo<MemoryQueryOptions>(() => ({ readable: access.readable, restrictedTo: access.restrictedTo, viewerId }), [access, viewerId]);
  const opts = useMemo<MemoryQueryOptions>(
    () => ({ ...accessOpts, k: RESULTS_K, kinds: selection.kind ? [selection.kind] : undefined, department: selection.department ?? null, year: selection.year ?? null, perDoc: twoPerDoc ? 2 : 1 }),
    [accessOpts, selection, twoPerDoc],
  );
  // `version` muda quando o acervo muda (ingestão, decisão encerrada no DECIA): refaz busca e contagens
  const result = useMemo(() => (mounted && submitted ? repo.search(submitted, opts) : null), [mounted, submitted, opts, repo, version]);
  const docs = useMemo(() => (mounted ? repo.documents() : []), [mounted, repo, version]);
  const facets = useMemo(() => memoryFacets(docs, accessOpts, selection), [docs, accessOpts, selection]);
  const filteredDocs = useMemo(
    () => docs.filter((d) => docAllowed(d, { ...accessOpts, kinds: selection.kind ? [selection.kind] : undefined, department: selection.department ?? null, year: selection.year ?? null })),
    [docs, accessOpts, selection],
  );

  const ai = evaluateAiAction(personalPolicy(prefs.aiAutonomyDefault), "RESPONDER", { requestedByUser: true });
  const allowedIngest = ingestClassesFor(access, profile);

  const docId = params.get("doc");
  const readerDoc = docId && mounted ? repo.get(docId) : undefined;
  const readable = readerDoc && docAllowed(readerDoc, accessOpts) ? readerDoc : null;
  const span = readable ? parseSpan(params.get("trecho"), readable.body.length) : null;

  const setUrl = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) if (v === null) next.delete(k); else next.set(k, v);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const validate = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return t("memory.ask.error.EMPTY");
    if (trimmed.length > MAX_QUERY_LENGTH) return t("memory.ask.error.LONG", { max: MAX_QUERY_LENGTH });
    return null;
  };

  const runSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const problem = validate(question);
    setError(problem);
    if (problem) return null;
    const q = question.trim();
    setSubmitted(q);
    setUrl({ q });
    return q;
  };

  const askAi = () => {
    const q = runSearch();
    if (!q || !ai.ok) return;
    setAnswer({ question: q, value: composeAnswer(q, repo.search(q, opts).hits) });
  };

  const readableLabel = access.readable.map((c) => t(accessKey(c))).join(", ");
  const departments = [...new Set(docs.filter((d) => docAllowed(d, accessOpts)).map((d) => d.department).filter((d): d is string => !!d))].sort();
  const years = [...new Set(docs.filter((d) => docAllowed(d, accessOpts)).map((d) => d.year).filter((y): y is number => y !== null))].sort();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]">
      <Card as="section" aria-labelledby="memory-ask-title" className="grid gap-3">
        <h2 id="memory-ask-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("memory.ask.title")}</h2>
        <form onSubmit={runSearch} className="grid gap-3" role="search" aria-label={t("memory.ask.title")}>
          <Field label={t("memory.ask.label")} hint={t("memory.ask.hint", { max: MAX_QUERY_LENGTH })} error={error ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} leading="buscar" aria-describedby={describedBy} invalid={invalid} value={question} placeholder={t("memory.ask.placeholder")} maxLength={MAX_QUERY_LENGTH + 50} onChange={(e) => setQuestion(e.target.value)} data-testid="memory-question" />
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("memory.filter.kind")}>
              {({ id }) => (
                <Select id={id} value={selection.kind ?? ALL} onChange={(e) => setSelection((s) => ({ ...s, kind: e.target.value === ALL ? null : (e.target.value as MemoryKind) }))}
                  options={[{ value: ALL, label: t("memory.filter.all") }, ...MEMORY_KINDS.map((k) => ({ value: k, label: t(kindKey(k)) }))]} />
              )}
            </Field>
            <Field label={t("memory.filter.department")}>
              {({ id }) => (
                <Select id={id} value={selection.department ?? ALL} onChange={(e) => setSelection((s) => ({ ...s, department: e.target.value === ALL ? null : e.target.value }))}
                  options={[{ value: ALL, label: t("memory.filter.all") }, ...departments.map((d) => ({ value: d, label: d }))]} />
              )}
            </Field>
            <Field label={t("memory.filter.year")}>
              {({ id }) => (
                <Select id={id} value={selection.year != null ? String(selection.year) : ALL} onChange={(e) => setSelection((s) => ({ ...s, year: e.target.value === ALL ? null : Number(e.target.value) }))}
                  options={[{ value: ALL, label: t("memory.filter.all") }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />
              )}
            </Field>
          </div>
          <Checkbox checked={twoPerDoc} onCheckedChange={setTwoPerDoc} label={t("memory.filter.perDoc")} hint={t("memory.filter.perDocHint")} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" icon="buscar" data-testid="memory-search">{t("memory.ask.submit")}</Button>
            <Button variant="spark" onClick={askAi} disabled={!ai.ok} data-testid="memory-ask-ai">{t("memory.ask.ai")}</Button>
          </div>
          {!ai.ok ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.answer.disabled")}</p> : null}
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="memory-access-note">
            {t("memory.ask.access", { classes: readableLabel })}
            {access.restrictedTo?.length ? ` ${t("memory.ask.accessScoped", { dept: access.restrictedTo.join(", ") })}` : ""}
          </p>
        </form>
      </Card>

      {docId ? (mounted ? <MemoryReader doc={readable} span={span} onClose={() => setUrl({ doc: null, trecho: null })} /> : <LoadingState />) : null}

      {answer ? <MemoryAnswerPanel answer={answer.value} stale={answer.question !== submitted} /> : null}

      {!mounted ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <MemoryResults query={submitted} hits={result?.hits ?? []} />
          <div className="grid content-start gap-[var(--ws-space-4)]">
            <MemoryExplorer facets={facets} selection={selection} onSelect={setSelection} docs={filteredDocs} />
            {allowedIngest.length ? (
              <MemoryIngest repo={repo} allowed={allowedIngest} addedBy={viewerId} defaultDepartment={user.departmentAcronym} />
            ) : (
              <Card tone="soft" padding="sm" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("memory.ingest.visitor")}</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
/**
 * Busca de pessoas (RF17, sub-aba PESSOAS de `/search`; auditoria 17/10/2026) sobre `GET /api/people`. O texto vai para a URL (`?q=`)
 * para compartilhar e voltar; a busca espera ~250 ms de pausa na digitação, cancela a anterior e descarta resposta fora de ordem.
 * Estados: menos de 2 caracteres (dica, sem chamar a API), carregando, vazio, erro com "tentar de novo" e sem sessão (Entrar).
 * O servidor só devolve contas ativas da empresa de quem busca, sem a própria pessoa, até 20.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, EmptyState, ErrorState, Field, Input, LoadingState } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { loginUrl } from "@/lib/auth/next";
import { useI18n } from "@/lib/i18n/useI18n";
import { normalizeQuery, peopleApi, PEOPLE_MAX_RESULTS, PEOPLE_MIN_QUERY, type PersonView } from "@/lib/people/client";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";
import { PersonResultCard } from "./PersonResultCard";

export const PEOPLE_SEARCH_DEBOUNCE_MS = 250;

type Phase =
  | { kind: "hint" }
  | { kind: "loading" }
  | { kind: "results"; q: string; people: PersonView[] }
  | { kind: "error"; message: string }
  | { kind: "signin" };

function PeopleSearchInner() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const urlQ = search.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  /** consulta já "assentada" (depois do debounce) */
  const [query, setQuery] = useState(() => normalizeQuery(urlQ).q);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "hint" });
  /** último `q` que esta tela escreveu na URL (para distinguir da navegação voltar/avançar) */
  const written = useRef(urlQ);
  const seq = useRef(0);

  const session = useOptionalCurrentUser();
  // com a sessão real (fora do laboratório) sabemos antes de chamar a API se há alguém logado
  const sessionState = session && !labMode() ? session.status : "unknown";

  // URL → campo: voltar/avançar ou link compartilhado com outro `?q=`
  useEffect(() => {
    if (urlQ === written.current) return;
    written.current = urlQ;
    setText(urlQ);
    setQuery(normalizeQuery(urlQ).q);
  }, [urlQ]);

  // campo → consulta + URL, depois da pausa na digitação
  useEffect(() => {
    const handle = setTimeout(() => {
      const { q } = normalizeQuery(text);
      setQuery(q);
      if (q === normalizeQuery(written.current).q) return;
      written.current = q;
      const next = new URLSearchParams(search.toString());
      if (q) next.set("q", q); else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, PEOPLE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [text, search, pathname, router]);

  // consulta → API (cancela a anterior; resposta de uma consulta antiga é descartada)
  useEffect(() => {
    const { q, searchable } = normalizeQuery(query);
    const id = ++seq.current;
    if (!searchable) { setPhase({ kind: "hint" }); return; }
    if (sessionState === "loading") { setPhase({ kind: "loading" }); return; }
    if (sessionState === "anonymous") { setPhase({ kind: "signin" }); return; }
    const ctrl = new AbortController();
    setPhase({ kind: "loading" });
    peopleApi.search(q, PEOPLE_MAX_RESULTS, ctrl.signal).then(
      (people) => {
        if (id !== seq.current || ctrl.signal.aborted) return;
        setPhase({ kind: "results", q, people: (people ?? []).filter((p) => !!p.username).slice(0, PEOPLE_MAX_RESULTS) });
      },
      (e: unknown) => {
        if (id !== seq.current || ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) setPhase({ kind: "signin" });
        else setPhase({ kind: "error", message: describeError(e) });
      },
    );
    return () => ctrl.abort();
  }, [query, attempt, sessionState]);

  const count = phase.kind === "results" ? phase.people.length : null;
  const status = phase.kind === "loading" ? t("search.people.loading")
    : count === null ? ""
    : count === 0 ? t("search.people.emptyTitle")
    : t(count === 1 ? "search.people.countOne" : "search.people.countMany", { n: count });
  const backHere = `${pathname || "/search"}${search.toString() ? `?${search.toString()}` : ""}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-3)]" data-testid="people-search">
      <Field label={t("search.people.label")} hint={t("search.people.fieldHint")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="search"
            leading="buscar"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("search.people.placeholder")}
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            data-testid="people-search-input"
          />
        )}
      </Field>
      {/* anúncio educado do total e do "carregando" para leitor de tela; o total também aparece na tela */}
      <p role="status" aria-live="polite" data-testid="people-search-status"
        className={count ? "text-[length:var(--ws-text-caption)] text-ws-text-muted" : "sr-only"}>
        {status}
      </p>
      {phase.kind === "hint" ? (
        <EmptyState compact title={t("search.people.hintTitle")} description={t("search.people.hint", { min: PEOPLE_MIN_QUERY })} />
      ) : phase.kind === "loading" ? (
        <LoadingState label={t("search.people.loading")} />
      ) : phase.kind === "signin" ? (
        <EmptyState
          title={t("search.people.signInTitle")}
          description={t("search.people.signInHint")}
          action={<Button variant="primary" href={loginUrl(backHere)} data-testid="people-search-sign-in">{t("nav.login")}</Button>}
        />
      ) : phase.kind === "error" ? (
        <ErrorState title={t("search.people.error")} description={phase.message} onRetry={() => setAttempt((n) => n + 1)} />
      ) : phase.people.length === 0 ? (
        <EmptyState compact title={t("search.people.emptyTitle")} description={t("search.people.emptyHint")} />
      ) : (
        <ul role="list" aria-label={t("search.people.listLabel")} className="grid gap-[var(--ws-space-2)] sm:grid-cols-2" data-testid="people-results">
          {phase.people.map((p) => <li key={p.id ?? p.username} className="min-w-0"><PersonResultCard person={p} query={phase.q} /></li>)}
        </ul>
      )}
    </div>
  );
}

export function PeopleSearch() {
  // useSearchParams pede Suspense nas páginas pré-renderizadas
  return <Suspense fallback={<LoadingState />}><PeopleSearchInner /></Suspense>;
}

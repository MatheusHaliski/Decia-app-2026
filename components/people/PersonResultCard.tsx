"use client";
/**
 * Card de pessoa na busca (RF17, aba PESSOAS; ANATOMIA_CARDS §16, prancha `pessoa-resultado`). Dados reais de `GET /api/people`
 * (`PersonView`): avatar (foto quando houver, senão iniciais), nome, @usuário e cargo, com o termo buscado em destaque. O card inteiro
 * é um link para `/u/{username}`. Não há variante "perfil restrito": o que a pessoa não pode ver nem aparece (404 no domínio).
 * Lotação (departamento/empresa), contadores e "Seguir" ficam para quando a busca devolver esses dados.
 */
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { Link } from "@/components/ui";
import type { PersonView } from "@/lib/people/client";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Destaca (sublinhado + negrito) as ocorrências do termo, sem diferenciar maiúsculas. */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1
        ? <mark key={i} className="bg-transparent font-bold text-inherit underline decoration-ws-accent underline-offset-2">{part}</mark>
        : part))}
    </>
  );
}

export const personHref = (username: string) => `/u/${encodeURIComponent(username)}`;

export function PersonResultCard({ person, query }: { person: PersonView; query?: string }) {
  const username = person.username ?? "";
  const name = person.name?.trim() || username;
  const job = person.jobTitle?.trim();
  return (
    <Link
      href={personHref(username)}
      variant="plain"
      data-testid="person-result"
      className="flex min-w-0 items-center gap-[var(--ws-space-3)] rounded-[var(--ws-radius-lg)]! border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] transition-colors hover:border-ws-accent hover:bg-ws-surface-2"
    >
      {/* o nome já está no texto do link; a foto/iniciais são decorativas aqui */}
      <span aria-hidden className="shrink-0"><ProfileAvatar name={name} src={person.avatarUrl} size={48} /></span>
      <span className="grid min-w-0 gap-0.5">
        <span className="font-semibold leading-snug [overflow-wrap:anywhere]" data-testid="person-result-name"><Highlight text={name} query={query} /></span>
        <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]" data-testid="person-result-handle">
          @<Highlight text={username} query={query} />
          {job ? <> · <Highlight text={job} query={query} /></> : null}
        </span>
      </span>
    </Link>
  );
}

"use client";
/**
 * Seguir pessoas com a API real (RF16.CA01; auditoria Onda 1): `GET/PUT/DELETE /api/people/{id}/follow`. O botão mostra o estado do
 * servidor ("Seguir" / "Seguindo", `aria-pressed`) e só muda depois da resposta; os contadores contam só vínculos ativos. Seguir a si
 * mesmo não aparece (o servidor também recusa).
 */
import { useCallback, useEffect, useState } from "react";
import { Button, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { peopleApi, type FollowView } from "@/lib/people/client";

export interface FollowState {
  view: FollowView | null;
  busy: boolean;
  toggle: () => void;
}

export function useFollow(personId: string | undefined): FollowState {
  const { t } = useI18n();
  const { toast } = useToast();
  const [view, setView] = useState<FollowView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!personId) return;
    const ctrl = new AbortController();
    setView(null);
    peopleApi.followStatus(personId, ctrl.signal).then((v) => { if (!ctrl.signal.aborted) setView(v); }, () => { /* sem contadores */ });
    return () => ctrl.abort();
  }, [personId]);

  const toggle = useCallback(() => {
    if (!personId || !view || busy || view.self) return;
    setBusy(true);
    (view.following ? peopleApi.unfollow(personId) : peopleApi.follow(personId))
      .then((v) => {
        setView(v);
        toast({ title: t(v.following ? "people.follow.toastFollowing" : "people.follow.toastUnfollowed") });
      })
      .catch((e: unknown) => toast({ title: t("people.follow.error"), description: e instanceof ApiError ? e.message : describeError(e), tone: "erro" }))
      .finally(() => setBusy(false));
  }, [personId, view, busy, toast, t]);

  return { view, busy, toggle };
}

export function FollowPersonButton({ name, state }: { name: string; state: FollowState }) {
  const { t } = useI18n();
  const { view, busy, toggle } = state;
  if (!view || view.self) return null;
  return (
    <Button
      size="sm"
      variant={view.following ? "default" : "primary"}
      aria-pressed={!!view.following}
      aria-label={t(view.following ? "people.follow.unfollowAria" : "people.follow.followAria", { name })}
      disabled={busy}
      onClick={toggle}
      data-testid="follow-person"
    >
      {t(view.following ? "social.follow.following" : "social.follow.follow")}
    </Button>
  );
}

/** "Seguidores" e "Seguindo" (só vínculos ativos); traço enquanto carrega. */
export function FollowCounters({ view }: { view: FollowView | null }) {
  const { t, intl } = useI18n();
  const fmt = new Intl.NumberFormat(intl);
  const items = [
    { key: "followers", label: t("profile.counter.followers"), value: view?.followers },
    { key: "following", label: t("profile.counter.following"), value: view?.followingCount },
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-x-4 text-center" data-testid="follow-counters">
      {items.map((c) => (
        <div key={c.key} className="min-w-0" data-counter={c.key}>
          <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{c.label}</dt>
          <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">
            {typeof c.value === "number" ? fmt.format(c.value) : <><span aria-hidden>—</span><span className="sr-only">{t("ownProfile.counterLoading")}</span></>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

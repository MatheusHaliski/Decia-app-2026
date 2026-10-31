"use client";
/**
 * Seguir departamento ou empresa com a API real (RF14.CA04, RF15.CA05): mesmo padrão de `FollowPerson` — o botão mostra o estado do
 * servidor ("Seguir" / "Seguindo", `aria-pressed`) e só muda depois da resposta; o contador conta só vínculos ativos.
 */
import { useCallback, useEffect, useState } from "react";
import { Button, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { institutionApi } from "@/lib/institutional/client";
import type { FollowView } from "@/lib/people/client";

export type FollowTarget = { kind: "department"; slug: string; company?: string | null } | { kind: "company"; slug: string };

export interface InstitutionFollowState {
  view: FollowView | null;
  busy: boolean;
  toggle: () => void;
}

const calls = (t: FollowTarget) => t.kind === "department"
  ? {
    status: (signal?: AbortSignal) => institutionApi.departmentFollow(t.slug, t.company, signal),
    follow: () => institutionApi.followDepartment(t.slug, t.company),
    unfollow: () => institutionApi.unfollowDepartment(t.slug, t.company),
  }
  : {
    status: (signal?: AbortSignal) => institutionApi.companyFollow(t.slug, signal),
    follow: () => institutionApi.followCompany(t.slug),
    unfollow: () => institutionApi.unfollowCompany(t.slug),
  };

/** Estado de seguir o alvo; enquanto carrega (ou se falhar) `view` é nulo e o botão não aparece. */
export function useInstitutionFollow(target: FollowTarget): InstitutionFollowState {
  const { t } = useI18n();
  const { toast } = useToast();
  const [view, setView] = useState<FollowView | null>(null);
  const [busy, setBusy] = useState(false);
  const company = target.kind === "department" ? target.company ?? null : null;
  const { kind, slug } = target;

  useEffect(() => {
    const ctrl = new AbortController();
    setView(null);
    const c = calls(kind === "department" ? { kind, slug, company } : { kind, slug });
    c.status(ctrl.signal).then((v) => { if (!ctrl.signal.aborted) setView(v); }, () => { /* sem estado: o botão não aparece */ });
    return () => ctrl.abort();
  }, [kind, slug, company]);

  const toggle = useCallback(() => {
    if (!view || busy) return;
    const c = calls(kind === "department" ? { kind, slug, company } : { kind, slug });
    setBusy(true);
    (view.following ? c.unfollow() : c.follow())
      .then((v) => {
        setView(v);
        toast({ title: t(v.following ? "social.institution.follow.toastFollowing" : "social.institution.follow.toastUnfollowed") });
      })
      .catch((e: unknown) => toast({ title: t("people.follow.error"), description: e instanceof ApiError ? e.message : describeError(e), tone: "erro" }))
      .finally(() => setBusy(false));
  }, [view, busy, kind, slug, company, toast, t]);

  return { view, busy, toggle };
}

export function FollowInstitutionButton({ name, state }: { name: string; state: InstitutionFollowState }) {
  const { t } = useI18n();
  const { view, busy, toggle } = state;
  if (!view) return null;
  return (
    <Button
      size="sm"
      variant={view.following ? "default" : "primary"}
      aria-pressed={!!view.following}
      aria-label={t(view.following ? "people.follow.unfollowAria" : "people.follow.followAria", { name })}
      disabled={busy}
      onClick={toggle}
      data-testid="follow-institution"
    >
      {t(view.following ? "social.follow.following" : "social.follow.follow")}
    </Button>
  );
}
